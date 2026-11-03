import { getResult, listResults } from "../services/resultService.js";
import { publishResult, saveAnswerEvaluation } from "../services/evaluationService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getResults(request, response) {
    const resultPage = await listResults(request.user, {
        page: Number(request.query.page || 1),
        limit: Number(request.query.limit || 25),
        search: request.query.search || "",
        status: request.query.status || "",
        date: request.query.date || ""
    });
    return sendSuccess(response, resultPage);
}

export async function getResultById(request, response) {
    const result = await getResult(request.params.id, request.user);
    return sendSuccess(response, { result });
}

export async function evaluateAnswer(request, response) {
    const evaluation = await saveAnswerEvaluation(
        request.params.id,
        request.params.questionId,
        request.user,
        request.body
    );
    return sendSuccess(response, { evaluation }, "Answer evaluation saved.");
}

export async function publishEvaluatedResult(request, response) {
    const result = await publishResult(request.params.id, request.user);
    return sendSuccess(response, { result }, "Result published.");
}
