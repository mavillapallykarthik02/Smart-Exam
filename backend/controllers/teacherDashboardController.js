import { getTeacherDashboard } from "../services/teacherDashboardService.js";
import { listTeacherStudents } from "../services/teacherStudentService.js";
import { sendSuccess } from "../utils/apiResponse.js";

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
