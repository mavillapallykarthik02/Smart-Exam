import {
    createBranch,
    deactivateBranch,
    getBranchById,
    listBranchSubjects,
    listBranches,
    setBranchStatus,
    updateBranch
} from "../services/branchService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getBranches(request, response) {
    const branches = await listBranches(request.user);
    return sendSuccess(response, { branches });
}

export async function getBranch(request, response) {
    const branch = await getBranchById(request.params.id, request.user);
    return sendSuccess(response, { branch });
}

export async function postBranch(request, response) {
    const branch = await createBranch(request.body, request.user.id);
    return sendSuccess(response, { branch }, "Branch created successfully.", 201);
}

export async function putBranch(request, response) {
    const branch = await updateBranch(request.params.id, request.body, request.user.id);
    return sendSuccess(response, { branch }, "Branch updated successfully.");
}

export async function patchBranchStatus(request, response) {
    const branch = await setBranchStatus(request.params.id, request.body.isActive, request.user.id);
    return sendSuccess(response, { branch }, "Branch status updated successfully.");
}

export async function deleteBranch(request, response) {
    const branch = await deactivateBranch(request.params.id, request.user.id);
    return sendSuccess(response, { branch }, "Branch deactivated successfully.");
}

export async function getSubjectsForBranch(request, response) {
    const subjects = await listBranchSubjects(request.params.branchId, request.user);
    return sendSuccess(response, { subjects });
}
