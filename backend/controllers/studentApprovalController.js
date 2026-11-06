import {
    listClassTeacherStudents,
    updateStudentApprovalStatus
} from "../services/studentApprovalService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getClassTeacherStudents(request, response) {
    const result = await listClassTeacherStudents(request.user.id, {
        page: Number(request.query.page || 1),
        limit: Number(request.query.limit || 10),
        search: request.query.search || "",
        status: request.query.status || ""
    });
    return sendSuccess(response, result);
}

function updateStatus(action, message) {
    return async function handleStatusUpdate(request, response) {
        const student = await updateStudentApprovalStatus(
            request.params.id,
            request.user.id,
            action,
            request.body.reason || ""
        );
        return sendSuccess(response, { student }, message);
    };
}

export const approveStudent = updateStatus("approve", "Student approved.");
export const rejectStudent = updateStatus("reject", "Student registration rejected.");
export const suspendStudent = updateStatus("suspend", "Student account suspended.");
export const reactivateStudent = updateStatus("reactivate", "Student account reactivated.");
