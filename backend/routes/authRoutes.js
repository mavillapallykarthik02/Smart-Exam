import { Router } from "express";
import {
    getCurrentUser,
    login,
    logout,
    previewStudentEnrollment,
    register,
    requestPasswordReset,
    resetPassword,
    updateCurrentUser
} from "../controllers/authController.js";
import { authenticate, authenticateOptional } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
    validateLogin,
    validateProfileUpdate,
    validateEnrollmentPreview,
    validatePasswordReset,
    validatePasswordResetRequest,
    validateStudentRegistration,
    validateTeacherRegistration,
    validateBranchAdminRegistration
} from "../validators/authValidator.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { authRateLimit } from "../middleware/rateLimitMiddleware.js";

const router = Router();

router.post(
    "/:role/forgot-password",
    authRateLimit,
    validatePasswordResetRequest,
    validateRequest,
    asyncHandler(requestPasswordReset)
);
router.post(
    "/:role/reset-password",
    authRateLimit,
    validatePasswordReset,
    validateRequest,
    asyncHandler(resetPassword)
);
router.get(
    "/student/enrollment-preview",
    validateEnrollmentPreview,
    validateRequest,
    asyncHandler(previewStudentEnrollment)
);
router.post(
    "/student/register",
    authRateLimit,
    validateStudentRegistration,
    validateRequest,
    asyncHandler((request, response) => register(request, response, "student"))
);
router.post(
    "/teacher/register",
    authRateLimit,
    validateTeacherRegistration,
    validateRequest,
    asyncHandler((request, response) => register(request, response, "teacher"))
);
router.post(
    "/branch_admin/register",
    authRateLimit,
    validateBranchAdminRegistration,
    validateRequest,
    asyncHandler((request, response) => register(request, response, "branch_admin"))
);
router.post(
    "/student/login",
    authRateLimit,
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "student"))
);
router.post(
    "/teacher/login",
    authRateLimit,
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "teacher"))
);
router.post(
    "/branch_admin/login",
    authRateLimit,
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "branch_admin"))
);
router.post(
    "/admin/login",
    authRateLimit,
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "admin"))
);

router.get("/me", authenticateOptional, getCurrentUser);
router.put(
    "/me",
    authenticate,
    validateProfileUpdate,
    validateRequest,
    asyncHandler((request, response) => updateCurrentUser(request, response))
);
router.post("/logout", logout);

router.get("/student", authenticate, allowRoles("student"), getCurrentUser);
router.get("/teacher", authenticate, allowRoles("teacher"), getCurrentUser);

export default router;
