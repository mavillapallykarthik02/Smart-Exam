import { listAssignmentsForTeacher } from "../services/adminService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getMyAssignments(request, response) {
    return sendSuccess(response, {
        assignments: await listAssignmentsForTeacher(request.user.id)
    });
}
