import { INSTITUTION_KEY } from "../config/institution.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { TeacherBranchRequest } from "../models/TeacherBranchRequest.js";
import { Test } from "../models/Test.js";
import { User } from "../models/User.js";

function referenceId(value) {
    return value?._id || value;
}

async function activeApprovedTeacherExists(teacherId) {
    return User.exists({
        _id: teacherId,
        role: "teacher",
        accountStatus: "active",
        verificationStatus: "APPROVED",
        institutionKey: INSTITUTION_KEY
    });
}

export async function listTeacherManagedTestIds(teacherId) {
    if (!await activeApprovedTeacherExists(teacherId)) return [];
    const approvedBranches = await TeacherBranchRequest.find({
        teacher: teacherId,
        status: "APPROVED"
    }).distinct("branch");
    if (approvedBranches.length === 0) return [];

    const assignments = await TeacherAssignment.find({
        teacher: teacherId,
        branch: { $in: approvedBranches },
        isActive: true
    }).select("branch subject academicBatch studyYear semester").lean();
    if (assignments.length === 0) return [];

    return Test.distinct("_id", {
        $or: assignments.map((assignment) => ({
            branch: assignment.branch,
            subject: assignment.subject,
            academicBatch: assignment.academicBatch,
            studyYear: assignment.studyYear,
            semester: assignment.semester
        }))
    });
}

export async function teacherCanManageTest(teacherId, test) {
    if (!test || !await activeApprovedTeacherExists(teacherId)) return false;
    const branchId = referenceId(test.branch);
    const subjectId = referenceId(test.subject);
    const [branchRequest, assignment] = await Promise.all([
        TeacherBranchRequest.exists({
            teacher: teacherId,
            branch: branchId,
            status: "APPROVED"
        }),
        TeacherAssignment.exists({
            teacher: teacherId,
            branch: branchId,
            subject: subjectId,
            academicBatch: test.academicBatch,
            studyYear: Number(test.studyYear),
            semester: Number(test.semester),
            isActive: true
        })
    ]);
    return Boolean(branchRequest && assignment);
}

export async function hasApprovedTeacherAssignmentForTest(test) {
    if (!test) return false;
    const branchId = referenceId(test.branch);
    const subjectId = referenceId(test.subject);
    const assignments = await TeacherAssignment.find({
        branch: branchId,
        subject: subjectId,
        academicBatch: test.academicBatch,
        studyYear: Number(test.studyYear),
        semester: Number(test.semester),
        isActive: true
    }).select("teacher").lean();
    if (assignments.length === 0) return false;

    const assignedTeacherIds = assignments.map((assignment) => assignment.teacher);
    const branchApprovedTeacherIds = await TeacherBranchRequest.find({
        teacher: { $in: assignedTeacherIds },
        branch: branchId,
        status: "APPROVED"
    }).distinct("teacher");
    if (branchApprovedTeacherIds.length === 0) return false;

    return Boolean(await User.exists({
        _id: { $in: branchApprovedTeacherIds },
        role: "teacher",
        accountStatus: "active",
        verificationStatus: "APPROVED",
        institutionKey: INSTITUTION_KEY
    }));
}
