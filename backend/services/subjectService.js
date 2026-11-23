import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { Subject } from "../models/Subject.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { User } from "../models/User.js";
import { TeacherBranchRequest } from "../models/TeacherBranchRequest.js";

function notFound(message) {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function serializeSubject(subject, assignedTeacher = null) {
    const branch = subject.branch;
    return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        branch: branch && typeof branch === "object" && branch.name
            ? {
                id: branch.id,
                name: branch.name,
                code: branch.code,
                isActive: branch.isActive
            }
            : String(branch),
        isActive: subject.isActive,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt,
        teacher: assignedTeacher || (subject.createdBy?.role === "teacher"
            ? {
                id: subject.createdBy.id,
                name: subject.createdBy.name,
                teacherId: subject.createdBy.teacherId,
                institution: subject.createdBy.institution
            }
            : null)
    };
}

export async function listSubjects({
    role,
    branchId,
    teacherId,
    studentBranchId,
    academicBatch,
    studyYear,
    semester
}) {
    const filter = {};
    const assignedTeacherBySubject = new Map();

    if (role === "student") {
        filter.isActive = true;
        filter.branch = studentBranchId
            ? studentBranchId
            : { $in: [] };
        filter.isDeleted = { $ne: true };
        if (studentBranchId && !await Branch.exists({
            _id: studentBranchId,
            isActive: true
        })) {
            throw notFound("Your assigned branch is inactive.");
        }
        const approvedBranchTeachers = await TeacherBranchRequest.find({
            branch: studentBranchId,
            status: "APPROVED"
        }).distinct("teacher");
        const activeTeachers = await User.find({
            _id: { $in: approvedBranchTeachers },
            role: "teacher",
            accountStatus: "active",
            verificationStatus: "APPROVED"
        }).distinct("_id");
        const assignments = await TeacherAssignment.find({
            teacher: { $in: activeTeachers },
            branch: studentBranchId,
            academicBatch,
            studyYear: Number(studyYear),
            semester: Number(semester),
            isActive: true
        }).select("subject teacher").populate("teacher", "name teacherId institution");
        for (const assignment of assignments) {
            if (assignment.teacher) {
                assignedTeacherBySubject.set(assignment.subject.toString(), {
                    id: assignment.teacher.id,
                    name: assignment.teacher.name,
                    teacherId: assignment.teacher.teacherId,
                    institution: assignment.teacher.institution
                });
            }
        }
        if (branchId && branchId !== studentBranchId?.toString()) {
            throw notFound("Subjects are only available for your assigned branch.");
        }
    } else if (role === "teacher") {
        filter.isActive = true;
        filter.isDeleted = { $ne: true };
        const approvedBranches = await TeacherBranchRequest.find({
            teacher: teacherId,
            status: "APPROVED"
        }).distinct("branch");
        const branchIsApproved = !branchId || approvedBranches.some((id) =>
            id.toString() === branchId
        );
        const assignments = branchIsApproved
            ? await TeacherAssignment.find({
                teacher: teacherId,
                branch: branchId || { $in: approvedBranches },
                isActive: true
            }).select("subject").lean()
            : [];
        filter._id = { $in: assignments.map((assignment) => assignment.subject) };
    }

    if (branchId) {
        if (!mongoose.isValidObjectId(branchId)) {
            const error = new Error("Branch ID must be a valid MongoDB ObjectId.");
            error.statusCode = 400;
            throw error;
        }
        if (role === "student") {
            const branch = await Branch.findOne({ _id: branchId, isActive: true }).select("_id");
            if (!branch) {
                throw notFound("Branch not found.");
            }
        }
        filter.branch = branchId;
    }

    const subjects = await Subject.find(filter)
        .populate("branch", "name code isActive")
        .populate("createdBy", "name teacherId institution role")
        .sort({ name: 1 });
    const visibleSubjects = role === "teacher"
        ? subjects.filter((subject) => subject.branch?.isActive)
        : subjects;
    const serialized = visibleSubjects.map((subject) =>
        serializeSubject(subject, assignedTeacherBySubject.get(subject.id) || null)
    );
    if (role === "teacher") {
        const assignments = await TeacherAssignment.find({
            teacher: teacherId,
            subject: { $in: visibleSubjects.map((subject) => subject._id) },
            isActive: true
        }).sort({ studyYear: 1, semester: 1 }).lean();
        for (const subject of serialized) {
            const assignment = assignments.find((item) =>
                item.subject.toString() === subject.id
            );
            if (assignment) {
                subject.academicBatch = assignment.academicBatch;
                subject.studyYear = assignment.studyYear;
                subject.semester = assignment.semester;
            }
        }
    }
    return serialized;
}

export async function getSubjectById(id, role, userId) {
    const filter = { _id: id };
    if (role === "student") {
        filter.isActive = true;
        filter.branch = userId;
    } else if (role === "teacher") {
        filter.isActive = true;
        filter.isDeleted = { $ne: true };
        const approvedBranches = await TeacherBranchRequest.find({
            teacher: userId,
            status: "APPROVED"
        }).distinct("branch");
        const assignments = await TeacherAssignment.find({
            teacher: userId,
            branch: { $in: approvedBranches },
            subject: id,
            isActive: true
        }).select("_id");
        if (assignments.length === 0) throw notFound("Subject not assigned to this teacher.");
    }
    const subject = await Subject.findOne(filter)
        .populate("branch", "name code isActive")
        .populate("createdBy", "name teacherId institution role");
    if (!subject || (["student", "teacher"].includes(role) && !subject.branch?.isActive)) {
        throw notFound("Subject not found.");
    }
    return serializeSubject(subject);
}
