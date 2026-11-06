import { apiRequest } from "./api";

export async function listAdminTeachers() {
    const { teachers } = await apiRequest("/admin/teachers");
    return teachers;
}

export async function listAdminBranches() {
    const { branches } = await apiRequest("/branches");
    return branches;
}

export async function listAdminSubjects() {
    const { subjects } = await apiRequest("/subjects");
    return subjects;
}

export async function createAdminBranch(branch) {
    const { branch: createdBranch } = await apiRequest("/admin/branches", {
        method: "POST",
        body: branch
    });
    return createdBranch;
}

export async function listClassIncharges() {
    const { assignments } = await apiRequest("/admin/class-incharges");
    return assignments;
}

export async function listAdminTeacherAssignments() {
    const { assignments } = await apiRequest("/admin/teacher-assignments");
    return assignments;
}

export async function assignTeacherSubject(assignment) {
    return apiRequest("/admin/teacher-assignments", {
        method: "POST",
        body: assignment
    });
}

export async function setTeacherAssignmentStatus(id, isActive) {
    return apiRequest(`/admin/teacher-assignments/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { isActive }
    });
}

export async function reviewTeacher(id, verificationStatus, reason = "") {
    return apiRequest(`/admin/teachers/${encodeURIComponent(id)}/verification`, {
        method: "PATCH",
        body: { verificationStatus, reason }
    });
}

export async function updateTeacherStaffRole(id, staffRole) {
    return apiRequest(`/admin/teachers/${encodeURIComponent(id)}/staff-role`, {
        method: "PATCH",
        body: { staffRole }
    });
}

export async function assignClassIncharge(assignment) {
    return apiRequest("/admin/class-incharges", {
        method: "PUT",
        body: assignment
    });
}

export async function setClassInchargeStatus(id, isActive) {
    return apiRequest(`/admin/class-incharges/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { isActive }
    });
}
