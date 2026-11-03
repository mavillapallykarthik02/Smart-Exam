import { apiRequest } from "./api";

export async function listResults(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, value);
    });
    const query = params.size ? `?${params.toString()}` : "";
    return apiRequest(`/results${query}`);
}

export async function listStudentResults(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") params.set(key, value);
    });
    const query = params.size ? `?${params.toString()}` : "";
    return apiRequest(`/student/results${query}`);
}

export async function getResult(id) {
    const { result } = await apiRequest(`/results/${encodeURIComponent(id)}`);
    return result;
}

export async function saveAnswerEvaluation(resultId, questionId, evaluation) {
    const { evaluation: savedEvaluation } = await apiRequest(
        `/results/${encodeURIComponent(resultId)}/answers/${encodeURIComponent(questionId)}`,
        { method: "PATCH", body: evaluation }
    );
    return savedEvaluation;
}

export async function publishResult(resultId) {
    const { result } = await apiRequest(`/results/${encodeURIComponent(resultId)}/publish`, {
        method: "POST"
    });
    return result;
}
