import { Branch } from "../models/Branch.js";
import { ClassTeacherAssignment } from "../models/ClassTeacherAssignment.js";
import { User } from "../models/User.js";
import { INSTITUTION_KEY } from "../config/institution.js";

const staffRoles = ["class_teacher", "hod", "principal", "guest_lecturer"];

function resourceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function validateCohort({ academicBatch, studyYear, semester }) {
    const [start, end] = academicBatch.split("-").map(Number);
    if (!/^\d{4}-\d{4}$/u.test(academicBatch) || start >= end) {
        throw resourceError(400, "Academic batch must use a valid YYYY-YYYY range.");
    }
    if (Math.ceil(Number(semester) / 2) !== Number(studyYear)) {
        throw resourceError(400, "Semester must belong to the selected year of study.");
    }
}

function serializeAssignment(assignment) {
    return {
        id: assignment.id,
        teacher: assignment.teacher,
        branch: assignment.branch,
        academicBatch: assignment.academicBatch,
        studyYear: assignment.studyYear,
        semester: assignment.semester,
        isActive: assignment.isActive,
        assignedAt: assignment.createdAt
    };
}

export async function listClassTeacherAssignments() {
    const assignments = await ClassTeacherAssignment.find()
        .populate("teacher", "name teacherId staffRole accountStatus")
        .populate("branch", "name code")
        .sort({ branch: 1, academicBatch: 1, studyYear: 1, semester: 1 });
    return assignments.map(serializeAssignment);
}

export async function assignClassTeacher(input, adminId) {
    validateCohort(input);
    const [teacher, branch] = await Promise.all([
        User.findOne({
            _id: input.teacher,
            role: "teacher",
            accountStatus: "active",
            institutionKey: INSTITUTION_KEY,
            $or: [
                { verificationStatus: "APPROVED" },
                { verificationStatus: { $exists: false } }
            ]
        }),
        Branch.findOne({
            _id: input.branch,
            institutionKey: INSTITUTION_KEY,
            isActive: true
        }).select("_id")
    ]);
    if (!teacher) throw resourceError(404, "Active teacher not found.");
    if (!branch) throw resourceError(404, "Active branch not found.");

    const classFilter = {
        branch: branch.id,
        academicBatch: input.academicBatch,
        studyYear: input.studyYear,
        semester: input.semester
    };
    const previousAssignment = await ClassTeacherAssignment.findOne(classFilter).select("teacher");
    teacher.staffRole = "class_teacher";
    await teacher.save();
    let assignment;
    try {
        assignment = await ClassTeacherAssignment.findOneAndUpdate(
            classFilter,
            {
                $set: {
                    teacher: teacher.id,
                    assignedBy: adminId,
                    isActive: true
                },
                $setOnInsert: {
                    branch: branch.id,
                    academicBatch: input.academicBatch,
                    studyYear: input.studyYear,
                    semester: input.semester
                }
            },
            { new: true, upsert: true, runValidators: true }
        )
            .populate("teacher", "name teacherId staffRole accountStatus")
            .populate("branch", "name code");
    } catch (error) {
        if (error.code === 11000) {
            throw resourceError(409, "A class incharge is already assigned to this class.");
        }
        throw error;
    }
    if (previousAssignment?.teacher.toString() !== teacher.id &&
        previousAssignment &&
        !await ClassTeacherAssignment.exists({
            teacher: previousAssignment.teacher,
            isActive: true
        })) {
        await User.updateOne(
            { _id: previousAssignment.teacher, role: "teacher", staffRole: "class_teacher" },
            { $set: { staffRole: "guest_lecturer" } }
        );
    }
    return serializeAssignment(assignment);
}

export async function setClassTeacherAssignmentStatus(id, isActive) {
    const existing = await ClassTeacherAssignment.findById(id).select("teacher");
    if (!existing) throw resourceError(404, "Class incharge assignment not found.");
    if (isActive) {
        const teacher = await User.findOne({
            _id: existing.teacher,
            role: "teacher",
            accountStatus: "active",
            institutionKey: INSTITUTION_KEY,
            $or: [
                { verificationStatus: "APPROVED" },
                { verificationStatus: { $exists: false } }
            ]
        });
        if (!teacher) throw resourceError(409, "Only an active teacher can be assigned as class incharge.");
        teacher.staffRole = "class_teacher";
        await teacher.save();
    }
    const assignment = await ClassTeacherAssignment.findByIdAndUpdate(
        id,
        { $set: { isActive } },
        { new: true, runValidators: true }
    );
    if (!isActive && !await ClassTeacherAssignment.exists({
        teacher: assignment.teacher,
        isActive: true
    })) {
        await User.updateOne(
            { _id: assignment.teacher, role: "teacher", staffRole: "class_teacher" },
            { $set: { staffRole: "guest_lecturer" } }
        );
    }
    return { id: assignment.id, isActive: assignment.isActive };
}

export async function listTeachersForAdmin() {
    const teachers = await User.find({ role: "teacher" })
        .select("name teacherId username email staffRole accountStatus verificationStatus verificationReason departmentName branchName designation createdAt")
        .sort({ name: 1, _id: 1 });
    return teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        username: teacher.username,
        email: teacher.email,
        staffRole: teacher.staffRole || "guest_lecturer",
        accountStatus: teacher.accountStatus,
        verificationStatus: teacher.verificationStatus || "APPROVED",
        verificationReason: teacher.verificationReason || "",
        departmentName: teacher.departmentName || "",
        branchName: teacher.branchName || "",
        designation: teacher.designation || "",
        createdAt: teacher.createdAt
    }));
}

export async function setTeacherVerificationStatus(id, verificationStatus, adminId, reason = "") {
    if (!["APPROVED", "REJECTED"].includes(verificationStatus)) {
        throw resourceError(400, "Teacher verification status must be APPROVED or REJECTED.");
    }
    if (verificationStatus === "REJECTED" && reason.trim().length < 3) {
        throw resourceError(400, "Provide a rejection reason between 3 and 500 characters.");
    }
    const now = new Date();
    const teacher = await User.findOneAndUpdate(
        { _id: id, role: "teacher" },
        {
            $set: {
                verificationStatus,
                verificationReviewedBy: adminId,
                verificationReviewedAt: now,
                verificationReason: verificationStatus === "REJECTED" ? reason.trim() : ""
            },
            $push: {
                verificationHistory: {
                    $each: [{
                        status: verificationStatus,
                        actor: adminId,
                        reason: verificationStatus === "REJECTED" ? reason.trim() : "",
                        at: now
                    }],
                    $slice: -100
                }
            }
        },
        { new: true, runValidators: true }
    ).select("name teacherId verificationStatus verificationReason");
    if (!teacher) throw resourceError(404, "Teacher not found.");
    return {
        id: teacher.id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        verificationStatus: teacher.verificationStatus,
        verificationReason: teacher.verificationReason
    };
}

export async function setTeacherStaffRole(id, staffRole) {
    if (!staffRoles.includes(staffRole)) {
        throw resourceError(400, "Select a valid staff role.");
    }
    if (staffRole !== "class_teacher" && await ClassTeacherAssignment.exists({
        teacher: id,
        isActive: true
    })) {
        throw resourceError(409, "Reassign or deactivate this teacher's class incharge assignments first.");
    }
    if (staffRole === "class_teacher" && !await User.exists({
        _id: id,
        role: "teacher",
        accountStatus: "active",
        $or: [
            { verificationStatus: "APPROVED" },
            { verificationStatus: { $exists: false } }
        ]
    })) {
        throw resourceError(409, "Verify and activate this teacher before assigning the class teacher role.");
    }
    const teacher = await User.findOneAndUpdate(
        { _id: id, role: "teacher" },
        { $set: { staffRole } },
        { new: true, runValidators: true }
    ).select("name teacherId staffRole accountStatus");
    if (!teacher) throw resourceError(404, "Teacher not found.");
    return {
        id: teacher.id,
        name: teacher.name,
        teacherId: teacher.teacherId,
        staffRole: teacher.staffRole
    };
}
