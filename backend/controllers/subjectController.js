import {
    createSubject,
    deactivateSubject,
    getSubjectById,
    listSubjects,
    setSubjectStatus,
    updateSubject
} from "../services/subjectService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getSubjects(request, response) {
    const subjects = await listSubjects({
        role: request.user.role,
        branchId: request.query.branch,
        teacherId: request.user.id,
        studentBranchId: request.user.branch?._id || request.user.branch
    });
    return sendSuccess(response, { subjects });
}

export async function getSubject(request, response) {
    const subject = await getSubjectById(
        request.params.id,
        request.user.role,
        request.user.role === "student"
            ? request.user.branch?._id?.toString() || request.user.branch?.toString()
            : request.user.id
    );
    return sendSuccess(response, { subject });
}

export async function postSubject(request, response) {
    const subject = await createSubject(request.body, request.user.id);
    return sendSuccess(response, { subject }, "Subject created successfully.", 201);
}

export async function putSubject(request, response) {
    const subject = await updateSubject(request.params.id, request.body, request.user.id);
    return sendSuccess(response, { subject }, "Subject updated successfully.");
}

export async function patchSubjectStatus(request, response) {
    const subject = await setSubjectStatus(request.params.id, request.body.isActive, request.user.id);
    return sendSuccess(response, { subject }, "Subject status updated successfully.");
}

export async function deleteSubject(request, response) {
    const subject = await deactivateSubject(request.params.id, request.user.id);
    return sendSuccess(response, { subject }, "Subject deactivated successfully.");
}
