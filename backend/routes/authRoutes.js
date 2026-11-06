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
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import {
    validateLogin,
    validateProfileUpdate,
    validateEnrollmentPreview,
    validatePasswordReset,
    validatePasswordResetRequest,
    validateStudentRegistration,
    validateTeacherRegistration
} from "../validators/authValidator.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.post(
    "/:role/forgot-password",
    validatePasswordResetRequest,
    validateRequest,
    asyncHandler(requestPasswordReset)
);
router.post(
    "/:role/reset-password",
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
    validateStudentRegistration,
    validateRequest,
    asyncHandler((request, response) => register(request, response, "student"))
);
router.post(
    "/teacher/register",
    validateTeacherRegistration,
    validateRequest,
    asyncHandler((request, response) => register(request, response, "teacher"))
);
router.post(
    "/student/login",
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "student"))
);
router.post(
    "/teacher/login",
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "teacher"))
);
router.post(
    "/admin/login",
    validateLogin,
    validateRequest,
    asyncHandler((request, response) => login(request, response, "admin"))
);

router.get("/me", authenticate, getCurrentUser);
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
