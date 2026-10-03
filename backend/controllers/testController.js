import {
    archiveTest,
    createTest,
    getTestById,
    listTests,
    setTestStatus,
    updateTest
} from "../services/testService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getTests(request, response) {
    const tests = await listTests({
        user: request.user,
        filters: {
            status: request.query.status,
            branch: request.query.branch,
            subject: request.query.subject,
            search: request.query.search
        }
    });
    return sendSuccess(response, { tests });
}

export async function getTest(request, response) {
    const test = await getTestById(request.params.id, request.user);
    return sendSuccess(response, { test });
}

export async function postTest(request, response) {
    const test = await createTest(request.body, request.user.id);
    return sendSuccess(response, { test }, "Test created successfully.", 201);
}

export async function putTest(request, response) {
    const test = await updateTest(request.params.id, request.body, request.user.id);
    return sendSuccess(response, { test }, "Test updated successfully.");
}

export async function patchTestStatus(request, response) {
    const test = await setTestStatus(request.params.id, request.body.status, request.user.id);
    return sendSuccess(response, { test }, "Test status updated successfully.");
}

export async function deleteTest(request, response) {
    const test = await archiveTest(request.params.id, request.user.id);
    return sendSuccess(response, { test }, "Test archived successfully.");
}
