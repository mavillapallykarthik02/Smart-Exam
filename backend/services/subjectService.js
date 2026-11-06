import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { Subject } from "../models/Subject.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { User } from "../models/User.js";
import { INSTITUTION_KEY } from "../config/institution.js";

function notFound(message) {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function serializeSubject(subject) {
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
        teacher: subject.createdBy && typeof subject.createdBy === "object"
            ? {
                id: subject.createdBy.id,
                name: subject.createdBy.name,
                teacherId: subject.createdBy.teacherId,
                institution: subject.createdBy.institution
            }
            : null
    };
}

async function requireActiveBranch(branchId, teacherId) {
    if (!mongoose.isValidObjectId(branchId)) {
        const error = new Error("Branch ID must be a valid MongoDB ObjectId.");
        error.statusCode = 400;
        throw error;
    }

    const teacher = await User.findOne({ _id: teacherId, role: "teacher" })
        .select("institution");
    const branch = teacher
        ? await Branch.findOne({
            _id: branchId,
            isActive: true,
            institutionKey: INSTITUTION_KEY
        })
        : null;
    if (!branch) {
        throw notFound("The selected branch does not exist or is inactive.");
    }
    return branch;
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

    if (role === "student") {
        filter.isActive = true;
        filter.branch = studentBranchId
            ? studentBranchId
            : { $in: [] };
        if (studentBranchId && !await Branch.exists({
            _id: studentBranchId,
            isActive: true
        })) {
            throw notFound("Your assigned branch is inactive.");
        }
        const activeTeachers = await User.find({
            role: "teacher",
            accountStatus: "active"
        }).distinct("_id");
        const assignments = await TeacherAssignment.find({
            teacher: { $in: activeTeachers },
            branch: studentBranchId,
            academicBatch,
            studyYear: Number(studyYear),
            semester: Number(semester),
            isActive: true
        }).select("subject").lean();
        filter._id = { $in: assignments.map((assignment) => assignment.subject) };
        if (branchId && branchId !== studentBranchId?.toString()) {
            throw notFound("Subjects are only available for your assigned branch.");
        }
    } else if (teacherId) {
        filter.createdBy = teacherId;
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
        .populate("createdBy", "name teacherId institution")
        .sort({ name: 1 });
    return subjects.map(serializeSubject);
}

export async function getSubjectById(id, role, userId, student) {
    const filter = { _id: id };
    if (role === "student") {
        filter.isActive = true;
        filter.branch = userId;
        const activeTeachers = await User.find({
            role: "teacher",
            accountStatus: "active"
        }).distinct("_id");
        const assignments = await TeacherAssignment.find({
            teacher: { $in: activeTeachers },
            branch: userId,
            academicBatch: student?.academicBatch,
            studyYear: Number(student?.studyYear),
            semester: Number(student?.semester),
            isActive: true
        }).select("subject").lean();
        filter._id = { $in: assignments.map((assignment) => assignment.subject) };
    } else if (userId) {
        filter.createdBy = userId;
    }
    const subject = await Subject.findOne(filter)
        .populate("branch", "name code isActive")
        .populate("createdBy", "name teacherId institution");
    if (!subject || (role === "student" && (
        !subject.branch?.isActive
    ))) {
        throw notFound("Subject not found.");
    }
    return serializeSubject(subject);
}

export async function createSubject(input, teacherId) {
    await requireActiveBranch(input.branch, teacherId);
    const subject = await Subject.create({
        name: input.name,
        code: input.code,
        description: input.description || "",
        branch: input.branch,
        createdBy: teacherId
    });
    await subject.populate("branch", "name code isActive");
    await subject.populate("createdBy", "name teacherId institution");
    return serializeSubject(subject);
}

export async function updateSubject(id, input, teacherId) {
    const subject = await Subject.findOne({ _id: id, createdBy: teacherId });
    if (!subject) {
        throw notFound("Subject not found.");
    }

    await requireActiveBranch(input.branch, teacherId);
    subject.name = input.name;
    subject.code = input.code;
    subject.description = input.description || "";
    subject.branch = input.branch;
    await subject.save();
    await subject.populate("branch", "name code isActive");
    await subject.populate("createdBy", "name teacherId institution");
    return serializeSubject(subject);
}

export async function setSubjectStatus(id, isActive, teacherId) {
    const subject = await Subject.findOne({ _id: id, createdBy: teacherId });
    if (!subject) {
        throw notFound("Subject not found.");
    }

    if (isActive) {
        await requireActiveBranch(subject.branch, teacherId);
    }
    subject.isActive = isActive;
    await subject.save();
    await subject.populate("branch", "name code isActive");
    await subject.populate("createdBy", "name teacherId institution");
    return serializeSubject(subject);
}

export async function deactivateSubject(id, teacherId) {
    return setSubjectStatus(id, false, teacherId);
}
