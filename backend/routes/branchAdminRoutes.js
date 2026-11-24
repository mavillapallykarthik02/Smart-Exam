import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
    createBranchAdminSubject,
    createBranchTeacherAssignment,
    getBranchAdminOverview,
    getBranchTeacherDetails,
    getBranchStudentPerformance,
    listBranchAdminSubjects,
    listBranchAdminSubjectTeachers,
    listBranchStudents,
    listBranchTeachers,
    listBranchTeacherRequests,
    reviewBranchTeacherRequest,
    deleteBranchAdminSubject,
    setBranchAdminSubjectStatus,
    setBranchTeacherAssignmentStatus,
    setBranchTeacherVerification,
    updateBranchTeacherAssignment,
    updateBranchAdminSubject
    ,
    deleteBranchTeacherRequest,
    deleteBranchTeacher
} from "../services/branchAdminService.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
    validateBranchAdminAssignmentStatus,
    validateBranchAdminAssignmentUpdate,
    validateBranchAdminSubjectAssignment,
    validateBranchAdminSubjectCreate,
    validateBranchAdminSubjectDelete,
    validateBranchAdminSubjectStatus,
    validateBranchAdminSubjectUpdate
} from "../validators/branchAdminValidator.js";

const router = Router();
router.use(authenticate, allowRoles("branch_admin"));

router.get("/overview", asyncHandler(async (request, response) => {
    return sendSuccess(response, { overview: await getBranchAdminOverview(request.user) });
}));

router.get("/branch-requests", asyncHandler(async (request, response) => {
    return sendSuccess(response, {
        requests: await listBranchTeacherRequests(request.user)
    });
}));

router.patch("/branch-requests/:id/status", asyncHandler(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return sendError(response, 400, "Branch request ID is invalid.");
    }
    const branchRequest = await reviewBranchTeacherRequest(
        request.user,
        request.params.id,
        request.body.status,
        request.body.reason || ""
    );
    return sendSuccess(response, { request: branchRequest }, "Branch request updated.");
}));

router.delete("/branch-requests/:id", asyncHandler(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return sendError(response, 400, "Branch request ID is invalid.");
    }
    await deleteBranchTeacherRequest(request.user, request.params.id);
    return sendSuccess(response, null, "Branch request deleted.");
}));

router.get("/teachers", asyncHandler(async (request, response) => {
    return sendSuccess(response, { teachers: await listBranchTeachers(request.user) });
}));

router.get("/teachers/:id/details", asyncHandler(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return sendError(response, 400, "Teacher ID is invalid.");
    }
    return sendSuccess(response, {
        details: await getBranchTeacherDetails(request.user, request.params.id)
    });
}));

router.patch("/teachers/:id/verification", asyncHandler(async (request, response) => {
    const teacher = await setBranchTeacherVerification(
        request.user,
        request.params.id,
        request.body.verificationStatus,
        request.body.reason || ""
    );
    return sendSuccess(response, { teacher }, "Teacher verification status updated.");
}));

router.delete("/teachers/:id", asyncHandler(async (request, response) => {
    if (!mongoose.isValidObjectId(request.params.id)) {
        return sendError(response, 400, "Teacher ID is invalid.");
    }
    await deleteBranchTeacher(request.user, request.params.id);
    return sendSuccess(response, null, "Teacher deleted.");
}));

router.get("/subjects", asyncHandler(async (request, response) => {
    return sendSuccess(response, { subjects: await listBranchAdminSubjects(request.user) });
}));

router.get("/subject-teachers", asyncHandler(async (request, response) => {
    return sendSuccess(response, { teachers: await listBranchAdminSubjectTeachers(request.user) });
}));

router.post(
    "/subjects",
    validateBranchAdminSubjectCreate,
    validateRequest,
    asyncHandler(async (request, response) => {
        const subject = await createBranchAdminSubject(request.user, request.body);
        return sendSuccess(
            response,
            { subject },
            "Subject created and published. Assign a teacher and class for student access.",
            201
        );
    })
);

router.put(
    "/subjects/:id",
    validateBranchAdminSubjectUpdate,
    validateRequest,
    asyncHandler(async (request, response) => {
        const subject = await updateBranchAdminSubject(request.user, request.params.id, request.body);
        return sendSuccess(response, { subject }, "Subject updated successfully.");
    })
);

router.delete(
    "/subjects/:id",
    validateBranchAdminSubjectDelete,
    validateRequest,
    asyncHandler(async (request, response) => {
        const transfer = await deleteBranchAdminSubject(
            request.user,
            request.params.id,
            request.body?.destinationSubjectId
        );
        return sendSuccess(
            response,
            { transfer },
            request.body?.destinationSubjectId
                ? "Subject data transferred; source subject deleted."
                : "Subject deleted successfully."
        );
    })
);

router.patch(
    "/subjects/:id/status",
    validateBranchAdminSubjectStatus,
    validateRequest,
    asyncHandler(async (request, response) => {
        const subject = await setBranchAdminSubjectStatus(
            request.user,
            request.params.id,
            request.body.isActive
        );
        return sendSuccess(response, { subject }, "Subject publication status updated.");
    })
);

router.post(
    "/subjects/:id/assignments",
    validateBranchAdminSubjectAssignment,
    validateRequest,
    asyncHandler(async (request, response) => {
        const assignment = await createBranchTeacherAssignment(
            request.user,
            request.params.id,
            request.body
        );
        return sendSuccess(response, { assignment }, "Subject assigned to teacher.", 201);
    })
);

router.patch(
    "/assignments/:id",
    validateBranchAdminAssignmentUpdate,
    validateRequest,
    asyncHandler(async (request, response) => {
        const assignment = await updateBranchTeacherAssignment(
            request.user,
            request.params.id,
            request.body.teacher
        );
        return sendSuccess(response, { assignment }, "Assigned teacher updated.");
    })
);

router.patch(
    "/assignments/:id/status",
    validateBranchAdminAssignmentStatus,
    validateRequest,
    asyncHandler(async (request, response) => {
        const assignment = await setBranchTeacherAssignmentStatus(
            request.user,
            request.params.id,
            request.body.isActive
        );
        return sendSuccess(response, { assignment }, "Teacher assignment status updated.");
    })
);

router.get("/students", asyncHandler(async (request, response) => {
    return sendSuccess(response, { students: await listBranchStudents(request.user) });
}));

router.get("/performance", asyncHandler(async (request, response) => {
    return sendSuccess(response, { students: await getBranchStudentPerformance(request.user) });
}));

export default router;
