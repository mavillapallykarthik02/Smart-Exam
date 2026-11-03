import {
    getStudentBranches,
    getStudentDashboard,
    getStudentSubjects,
    getStudentTests
} from "../services/studentService.js";
import { getStudentProgress } from "../services/progressService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
    connectStudentToTeacher,
    disconnectStudentFromTeacher,
    listStudentTeacherConnections
} from "../services/studentTeacherService.js";
import { getStudentSubjectDetails } from "../services/studentService.js";

export async function getDashboard(request, response) {
    const dashboard = await getStudentDashboard(request.user);
    return sendSuccess(response, { dashboard });
}

export async function getProgress(request, response) {
    const progress = await getStudentProgress(request.user._id);
    return sendSuccess(response, { progress });
}

export async function getBranches(request, response) {
    const branches = await getStudentBranches(request.user);
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

export async function postConnectTeacher(request, response) {
    const connection = await connectStudentToTeacher(request.user._id, request.body.teacherId);
    return sendSuccess(response, { connection }, "Successfully connected to Teacher!", 201);
}

export async function getConnectedTeachers(request, response) {
    const connections = await listStudentTeacherConnections(request.user._id);
    return sendSuccess(response, { connections });
}

export async function deleteTeacherConnection(request, response) {
    const connection = await disconnectStudentFromTeacher(
        request.user._id,
        request.params.teacherId
    );
    return sendSuccess(response, { connection }, "Teacher connection removed.");
}

export async function getSubjectDetails(request, response) {
    const subject = await getStudentSubjectDetails(request.params.id, request.user);
    return sendSuccess(response, { subject });
}
