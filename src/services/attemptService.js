import { apiRequest } from "./api";

export async function startAttempt(testId) {
    const { attempt } = await apiRequest("/attempts", {
        method: "POST",
        body: { testId }
    });
    return attempt;
}

export async function getAttempt(id) {
    const { attempt } = await apiRequest(`/attempts/${encodeURIComponent(id)}`);
    return attempt;
}

export async function saveAttemptAnswer(attemptId, questionId, response) {
    const { answer } = await apiRequest(
        `/attempts/${encodeURIComponent(attemptId)}/answers/${encodeURIComponent(questionId)}`,
        { method: "PUT", body: response }
    );
    return answer;
}

export async function submitAttempt(id) {
    const { attempt } = await apiRequest(`/attempts/${encodeURIComponent(id)}/submit`, {
        method: "POST"
    });
    return attempt;
}
