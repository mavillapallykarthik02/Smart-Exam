import {
    createStudentEnrollment,
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
import {
    createAdminSector,
    listAdminSectors,
    updateAdminBranch,
    setAdminBranchStatus,
    deleteAdminBranch,
    listAdminBranchAdministrators,
    setBranchAdministratorStatus,
    listAdminBranchPerformance
} from "../services/adminService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function postBranch(request, response) {
    const branch = await createBranchForAdmin(request.body, request.user.id);
    return sendSuccess(response, { branch }, "Branch created successfully.", 201);
}

export async function postStudentEnrollment(request, response) {
    const enrollment = await createStudentEnrollment(request.body, request.user.id);
    return sendSuccess(response, { enrollment }, "Student enrollment created successfully.", 201);
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
    const adminId = request.user?.id || "000000000000000000000000";
    return sendSuccess(response, {
        teacher: await setTeacherVerificationStatus(
            request.params.id,
            request.body.verificationStatus,
            adminId,
            request.body.reason || ""
        )
    }, "Teacher verification status updated.");
}

export async function getSectors(_request, response) {
    return sendSuccess(response, { sectors: await listAdminSectors() });
}

export async function postSector(request, response) {
    const sector = await createAdminSector(request.body, request.user.id);
    return sendSuccess(response, { sector }, "Sector created successfully.", 201);
}

export async function putBranch(request, response) {
    const branch = await updateAdminBranch(request.params.id, request.body);
    return sendSuccess(response, { branch }, "Branch updated successfully.");
}

export async function patchBranchStatus(request, response) {
    const branch = await setAdminBranchStatus(request.params.id, request.body);
    return sendSuccess(response, { branch }, "Branch status updated successfully.");
}

export async function deleteBranch(request, response) {
    await deleteAdminBranch(request.params.id);
    return sendSuccess(response, null, "Branch permanently deleted.");
}

export async function getBranchAdministrators(_request, response) {
    return sendSuccess(response, {
        administrators: await listAdminBranchAdministrators()
    });
}

export async function patchBranchAdministratorStatus(request, response) {
    const administrator = await setBranchAdministratorStatus(
        request.params.id,
        request.body.status,
        request.user.id,
        request.body.reason || ""
    );
    return sendSuccess(response, { administrator }, "Branch Administrator status updated.");
}

export async function getBranchPerformance(_request, response) {
    return sendSuccess(response, {
        branches: await listAdminBranchPerformance()
    });
}
