import { apiRequest } from "./api";

export async function getBranchAdminOverview() {
    const { overview } = await apiRequest("/branch-admin/overview");
    return overview;
}

export async function listBranchAdminTeachers() {
    const { teachers } = await apiRequest("/branch-admin/teachers");
    return teachers;
}

export async function reviewBranchAdminTeacher(id, verificationStatus, reason = "") {
    const { teacher } = await apiRequest(`/branch-admin/teachers/${encodeURIComponent(id)}/verification`, {
        method: "PATCH",
        body: { verificationStatus, reason },
        toast: false
    });
    return teacher;
}

export async function getBranchAdminTeacherDetails(id) {
    const { details } = await apiRequest(`/branch-admin/teachers/${encodeURIComponent(id)}/details`);
    return details;
}

export async function listBranchAdminStudents() {
    const { students } = await apiRequest("/branch-admin/students");
    return students;
}

export async function listBranchAdminStudentPerformance() {
    const { students } = await apiRequest("/branch-admin/performance");
    return students;
}

export async function listBranchAdminBranchRequests() {
    const { requests } = await apiRequest("/branch-admin/branch-requests");
    return requests;
}

export async function reviewBranchAdminBranchRequest(id, status, reason = "") {
    const { request } = await apiRequest(
        `/branch-admin/branch-requests/${encodeURIComponent(id)}/status`,
        {
            method: "PATCH",
            body: { status, reason },
            toast: false
        }
    );
    return request;
}
