import { getTeacherDashboard } from "../services/teacherDashboardService.js";
import { listTeacherStudents } from "../services/teacherStudentService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import { serializeUser } from "../services/authService.js";
import { listSubjects } from "../services/subjectService.js";

export async function getDashboard(request, response) {
    const dashboard = await getTeacherDashboard(request.user._id);
    return sendSuccess(response, { dashboard });
}

export async function getStudents(request, response) {
    const result = await listTeacherStudents(request.user._id, {
        page: Number(request.query.page || 1),
        limit: Number(request.query.limit || 10),
        search: request.query.search || "",
        branch: request.query.branch || "",
        status: request.query.status || ""
    });
    return sendSuccess(response, result);
}

export async function getProfile(request, response) {
    return sendSuccess(response, { user: serializeUser(request.user) });
}

export async function getTeacherSubjects(request, response) {
    const subjects = await listSubjects({
        role: "teacher",
        branchId: request.query.branch,
        teacherId: request.user._id
    });
    return sendSuccess(response, { subjects });
}
