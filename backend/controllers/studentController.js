import {
    getStudentBranches,
    getStudentDashboard,
    getStudentSubjects,
    getStudentTests
} from "../services/studentService.js";
import { getStudentProgress } from "../services/progressService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getDashboard(request, response) {
    const dashboard = await getStudentDashboard(request.user);
    return sendSuccess(response, { dashboard });
}

export async function getProgress(request, response) {
    const progress = await getStudentProgress(request.user._id);
    return sendSuccess(response, { progress });
}

export async function getBranches(_request, response) {
    const branches = await getStudentBranches();
    return sendSuccess(response, { branches });
}

export async function getSubjects(request, response) {
    const subjects = await getStudentSubjects(request.user);
    return sendSuccess(response, { subjects });
}

export async function getTests(request, response) {
    const tests = await getStudentTests(request.user, {});
    return sendSuccess(response, { tests });
}
