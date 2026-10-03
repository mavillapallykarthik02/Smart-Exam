import { apiRequest } from "./api";

function toTestView(test) {
    return {
        ...test,
        branchId: test.branch?.id || "",
        branch: test.branch?.code || "",
        branchName: test.branch?.name || "",
        subjectId: test.subject?.id || "",
        subjectName: test.subject?.name || "",
        subjectCode: test.subject?.code || "",
        questions: test.totalQuestions,
        type: test.testType,
        status: test.status === "PUBLISHED"
            ? "Published"
            : test.status === "ARCHIVED"
                ? "Archived"
                : "Draft"
    };
}

export async function listTests(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
    });
    const suffix = params.size ? `?${params.toString()}` : "";
    const { tests } = await apiRequest(`/tests${suffix}`);
    return tests.map(toTestView);
}

export async function listStudentTests() {
    const { tests } = await apiRequest("/student/tests");
    return tests.map(toTestView);
}

export async function getTest(id) {
    const { test } = await apiRequest(`/tests/${encodeURIComponent(id)}`);
    return toTestView(test);
}

export async function createTest(details) {
    const { test } = await apiRequest("/tests", { method: "POST", body: details });
    return toTestView(test);
}

export async function updateTest(id, details) {
    const { test } = await apiRequest(`/tests/${encodeURIComponent(id)}`, {
        method: "PUT",
        body: details
    });
    return toTestView(test);
}

export async function setTestStatus(id, status) {
    const { test } = await apiRequest(`/tests/${encodeURIComponent(id)}/status`, {
        method: "PATCH",
        body: { status }
    });
    return toTestView(test);
}

export async function archiveTest(id) {
    const { test } = await apiRequest(`/tests/${encodeURIComponent(id)}`, {
        method: "DELETE"
    });
    return toTestView(test);
}
