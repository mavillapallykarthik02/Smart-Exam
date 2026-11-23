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
