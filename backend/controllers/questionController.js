import {
    createQuestion,
    deleteQuestion,
    listQuestions,
    reorderQuestions,
    updateQuestion
} from "../services/questionService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getQuestions(request, response) {
    const questions = await listQuestions(request.params.testId, request.user.id);
    return sendSuccess(response, { questions });
}

export async function postQuestion(request, response) {
    const question = await createQuestion(
        request.params.testId,
        request.body,
        request.user.id
    );
    return sendSuccess(response, { question }, "Question created successfully.", 201);
}

export async function putQuestion(request, response) {
    const question = await updateQuestion(
        request.params.testId,
        request.params.questionId,
        request.body,
        request.user.id
    );
    return sendSuccess(response, { question }, "Question updated successfully.");
}

export async function removeQuestion(request, response) {
    const question = await deleteQuestion(
        request.params.testId,
        request.params.questionId,
        request.user.id
    );
    return sendSuccess(response, { question }, "Question deleted successfully.");
}

export async function patchQuestionOrder(request, response) {
    const questions = await reorderQuestions(
        request.params.testId,
        request.body.questions,
        request.user.id
    );
    return sendSuccess(response, { questions }, "Question order updated successfully.");
}
