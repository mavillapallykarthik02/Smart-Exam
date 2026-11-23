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

export async function listBranchAdminSubjects() {
    const { subjects } = await apiRequest("/branch-admin/subjects");
    return subjects;
}

export async function createBranchAdminSubject(details) {
    const { subject } = await apiRequest("/branch-admin/subjects", {
        method: "POST",
        body: details
    });
    return subject;
}

export async function updateBranchAdminSubject(id, details) {
    const { subject } = await apiRequest(`/branch-admin/subjects/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: details
    });
    return subject;
}

export async function deleteBranchAdminSubject(id, destinationSubjectId) {
    return apiRequest(`/branch-admin/subjects/${encodeURIComponent(id)}`, {
        method: "DELETE",
        body: destinationSubjectId ? { destinationSubjectId } : {}
    });
}

export async function setBranchAdminSubjectStatus(id, isActive) {
    const { subject } = await apiRequest(
        `/branch-admin/subjects/${encodeURIComponent(id)}/status`,
        {
            method: "PATCH",
            body: { isActive }
        }
    );
    return subject;
}

export async function assignBranchAdminSubject(id, assignment) {
    const { assignment: result } = await apiRequest(
        `/branch-admin/subjects/${encodeURIComponent(id)}/assignments`,
        {
            method: "POST",
            body: assignment
        }
    );
    return result;
}

export async function updateBranchAdminAssignment(id, teacher) {
    const { assignment } = await apiRequest(
        `/branch-admin/assignments/${encodeURIComponent(id)}`,
        {
            method: "PATCH",
            body: { teacher }
        }
    );
    return assignment;
}

export async function setBranchAdminAssignmentStatus(id, isActive) {
    const { assignment } = await apiRequest(
        `/branch-admin/assignments/${encodeURIComponent(id)}/status`,
        {
            method: "PATCH",
            body: { isActive }
        }
    );
    return assignment;
}
