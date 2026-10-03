import { apiRequest } from "./api";

export async function listQuestions(testId) {
    const { questions } = await apiRequest(
        `/tests/${encodeURIComponent(testId)}/questions`
    );
    return questions;
}

export async function createQuestion(testId, details) {
    const { question } = await apiRequest(
        `/tests/${encodeURIComponent(testId)}/questions`,
        { method: "POST", body: details }
    );
    return question;
}

export async function updateQuestion(testId, questionId, details) {
    const { question } = await apiRequest(
        `/tests/${encodeURIComponent(testId)}/questions/${encodeURIComponent(questionId)}`,
        { method: "PUT", body: details }
    );
    return question;
}

export async function deleteQuestion(testId, questionId) {
    return apiRequest(
        `/tests/${encodeURIComponent(testId)}/questions/${encodeURIComponent(questionId)}`,
        { method: "DELETE" }
    );
}

export async function reorderQuestions(testId, questions) {
    const result = await apiRequest(
        `/tests/${encodeURIComponent(testId)}/questions/order`,
        { method: "PATCH", body: { questions } }
    );
    return result.questions;
}
