import {
    getAttempt,
    recordSecurityEvent,
    saveAnswer,
    startAttempt,
    submitAttempt
} from "../services/attemptService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function postAttempt(request, response) {
    const attempt = await startAttempt(request.body.testId, request.user);
    return sendSuccess(response, { attempt }, "Exam attempt started.", 201);
}

export async function getAttemptById(request, response) {
    const attempt = await getAttempt(request.params.id, request.user.id);
    return sendSuccess(response, { attempt });
}

export async function putAttemptAnswer(request, response) {
    const answer = await saveAnswer(
        request.params.id,
        request.params.questionId,
        request.body,
        request.user.id
    );
    return sendSuccess(response, { answer }, "Answer saved.");
}

export async function postAttemptSecurityEvent(request, response) {
    const event = await recordSecurityEvent(
        request.params.id,
        request.body.eventType,
        request.user.id
    );
    return sendSuccess(response, { event }, "Security event recorded.", 201);
}

export async function postAttemptSubmit(request, response) {
    const attempt = await submitAttempt(request.params.id, request.user.id);
    return sendSuccess(response, { attempt }, "Exam submitted.");
}
