import {
    createTeacherAssignment,
    listTeacherAssignments,
    setTeacherAssignmentStatus
} from "../services/adminService.js";
import {
    assignClassTeacher,
    listClassTeacherAssignments,
    listTeachersForAdmin,
    setClassTeacherAssignmentStatus,
    setTeacherStaffRole,
    setTeacherVerificationStatus
} from "../services/classTeacherService.js";
import { createBranchForAdmin } from "../services/branchService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function postBranch(request, response) {
    const branch = await createBranchForAdmin(request.body, request.body.teacher);
    return sendSuccess(response, { branch }, "Branch created successfully.", 201);
}

export async function getAssignments(_request, response) {
    return sendSuccess(response, { assignments: await listTeacherAssignments() });
}

export async function postAssignment(request, response) {
    const assignment = await createTeacherAssignment(request.body, request.user.id);
    return sendSuccess(response, { assignment: { id: assignment.id } }, "Teacher assignment created.", 201);
}

export async function patchAssignmentStatus(request, response) {
    return sendSuccess(response, {
        assignment: await setTeacherAssignmentStatus(request.params.id, request.body.isActive)
    }, "Teacher assignment status updated.");
}

export async function getClassIncharges(_request, response) {
    return sendSuccess(response, {
        assignments: await listClassTeacherAssignments()
    });
}

export async function putClassIncharge(request, response) {
    const assignment = await assignClassTeacher(request.body, request.user.id);
    return sendSuccess(response, { assignment }, "Class incharge assigned successfully.");
}

export async function patchClassInchargeStatus(request, response) {
    return sendSuccess(response, {
        assignment: await setClassTeacherAssignmentStatus(
            request.params.id,
            request.body.isActive
        )
    }, "Class incharge assignment status updated.");
}

export async function getTeachers(_request, response) {
    return sendSuccess(response, { teachers: await listTeachersForAdmin() });
}

export async function patchTeacherStaffRole(request, response) {
    return sendSuccess(response, {
        teacher: await setTeacherStaffRole(request.params.id, request.body.staffRole)
    }, "Teacher role updated.");
}

export async function patchTeacherVerification(request, response) {
    return sendSuccess(response, {
        teacher: await setTeacherVerificationStatus(
            request.params.id,
            request.body.verificationStatus,
            request.user.id,
            request.body.reason || ""
        )
    }, "Teacher verification status updated.");
}
