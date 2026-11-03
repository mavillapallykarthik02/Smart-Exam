import { apiRequest } from "./api";

function toSubjectView(subject) {
    return {
        ...subject,
        branchCode: subject.branch?.code || "",
        branchName: subject.branch?.name || "",
        status: subject.isActive ? "Active" : "Inactive"
    };
}

export async function listSubjects(branchId) {
    const query = branchId
        ? `?branch=${encodeURIComponent(branchId)}`
        : "";
    const { subjects } = await apiRequest(`/subjects${query}`);
    return subjects.map(toSubjectView);
}

export async function listStudentSubjects(branchId) {
    const query = branchId ? `?branch=${encodeURIComponent(branchId)}` : "";
    const { subjects } = await apiRequest(`/student/subjects${query}`);
    return subjects.map(toSubjectView);
}

export async function getStudentSubjectDetails(subjectId) {
    const { subject } = await apiRequest(
        `/student/subjects/${encodeURIComponent(subjectId)}`
    );
    return subject;
}

export async function createSubject(details) {
    const { subject } = await apiRequest("/subjects", {
        method: "POST",
        body: details
    });
    return toSubjectView(subject);
}

export async function updateSubject(id, details) {
    const { subject } = await apiRequest(`/subjects/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: details
    });
    return toSubjectView(subject);
}

export async function setSubjectStatus(id, isActive) {
    const { subject } = await apiRequest(`/subjects/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { isActive }
    });
    return toSubjectView(subject);
}

export async function deactivateSubject(id) {
    const { subject } = await apiRequest(`/subjects/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return toSubjectView(subject);
}
