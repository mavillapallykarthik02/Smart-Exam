import { getSubjectById, listSubjects } from "../services/subjectService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export async function getSubjects(request, response) {
    const subjects = await listSubjects({
        role: request.user.role,
        branchId: request.query.branch,
        teacherId: request.user.role === "teacher" ? request.user.id : undefined,
        studentBranchId: request.user.branch?._id || request.user.branch,
        academicBatch: request.user.academicBatch,
        studyYear: request.user.studyYear,
        semester: request.user.semester
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
