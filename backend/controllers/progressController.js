import { getStudentProgress } from "../services/progressService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getProgress(request, response) {
    const progress = await getStudentProgress(request.user.id);
    return sendSuccess(response, { progress });
}
