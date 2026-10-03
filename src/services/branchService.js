import { apiRequest } from "./api";

function toBranchView(branch) {
    return {
        ...branch,
        status: branch.isActive ? "Active" : "Inactive"
    };
}

export async function listBranches() {
    const { branches } = await apiRequest("/branches");
    return branches.map(toBranchView);
}

export async function listAvailableBranches() {
    const { branches } = await apiRequest("/branches/available");
    return branches.map(toBranchView);
}

export async function listStudentBranches() {
    const { branches } = await apiRequest("/student/branches");
    return branches.map(toBranchView);
}

export async function createBranch(details) {
    const { branch } = await apiRequest("/branches", {
        method: "POST",
        body: details
    });
    return toBranchView(branch);
}

export async function updateBranch(id, details) {
    const { branch } = await apiRequest(`/branches/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: details
    });
    return toBranchView(branch);
}

export async function setBranchStatus(id, isActive) {
    const { branch } = await apiRequest(`/branches/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { isActive }
    });
    return toBranchView(branch);
}

export async function deactivateBranch(id) {
    const { branch } = await apiRequest(`/branches/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return toBranchView(branch);
}
