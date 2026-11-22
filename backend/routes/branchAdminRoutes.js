import { Router } from "express";
import mongoose from "mongoose";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";
import {
    getBranchAdminOverview,
    getBranchTeacherDetails,
    getBranchStudentPerformance,
    listBranchStudents,
    listBranchTeachers,
    setBranchTeacherVerification
} from "../services/branchAdminService.js";

const router = Router();
router.use(authenticate, allowRoles("branch_admin"));

router.get("/overview", asyncHandler(async (request, response) => {
    return sendSuccess(response, { overview: await getBranchAdminOverview(request.user) });
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

router.get("/students", asyncHandler(async (request, response) => {
    return sendSuccess(response, { students: await listBranchStudents(request.user) });
}));

router.get("/performance", asyncHandler(async (request, response) => {
    return sendSuccess(response, { students: await getBranchStudentPerformance(request.user) });
}));

export default router;
