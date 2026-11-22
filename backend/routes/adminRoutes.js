import { Router } from "express";
import {
    getAssignments,
    getClassIncharges,
    getTeachers,
    patchAssignmentStatus,
    patchClassInchargeStatus,
    patchTeacherStaffRole,
    patchTeacherVerification,
    postAssignment,
    postBranch,
    postStudentEnrollment,
    putClassIncharge,
    getSectors,
    postSector,
    putBranch,
    patchBranchStatus,
    getBranchAdministrators,
    patchBranchAdministratorStatus,
    getBranchPerformance
} from "../controllers/adminController.js";
import {
    getTargetInstitution,
    putTargetInstitution
} from "../controllers/institutionConfigurationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { validateInstitutionConfiguration } from "../validators/institutionConfigurationValidator.js";
import {
    validateAdminBranchCreate,
    validateBranchId,
    validateBranchStatus
} from "../validators/branchValidator.js";
import {
    validateAssignmentStatus,
    validateClassIncharge,
    validateClassInchargeStatus,
    validateStudentEnrollment,
    validateTeacherAssignment,
    validateTeacherStaffRole,
    validateTeacherVerification
} from "../validators/adminValidator.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.patch(
    "/teachers/:id/verification",
    authenticate,
    allowRoles("admin"),
    validateTeacherVerification,
    validateRequest,
    asyncHandler(patchTeacherVerification)
);

router.use(authenticate, allowRoles("admin"));
router.get("/sectors", asyncHandler(getSectors));
router.post("/sectors", validateRequest, asyncHandler(postSector));
router.put("/branches/:id", validateBranchId, validateRequest, asyncHandler(putBranch));
router.patch("/branches/:id/status", validateBranchStatus, validateRequest, asyncHandler(patchBranchStatus));
router.get("/branch-admins", asyncHandler(getBranchAdministrators));
router.patch("/branch-admins/:id/status", asyncHandler(patchBranchAdministratorStatus));
router.get("/branch-performance", asyncHandler(getBranchPerformance));
router.post(
    "/student-enrollments",
    validateStudentEnrollment,
    validateRequest,
    asyncHandler(postStudentEnrollment)
);
router.get("/target-institution", asyncHandler(getTargetInstitution));
router.put(
    "/target-institution",
    validateInstitutionConfiguration,
    validateRequest,
    asyncHandler(putTargetInstitution)
);
router.post(
    "/branches",
    validateAdminBranchCreate,
    validateRequest,
    asyncHandler(postBranch)
);
router.get("/teacher-assignments", asyncHandler(getAssignments));
router.post(
    "/teacher-assignments",
    validateTeacherAssignment,
    validateRequest,
    asyncHandler(postAssignment)
);
router.patch(
    "/teacher-assignments/:id/status",
    validateAssignmentStatus,
    validateRequest,
    asyncHandler(patchAssignmentStatus)
);
router.get("/teachers", asyncHandler(getTeachers));
router.patch(
    "/teachers/:id/staff-role",
    validateTeacherStaffRole,
    validateRequest,
    asyncHandler(patchTeacherStaffRole)
);
router.get("/class-incharges", asyncHandler(getClassIncharges));
router.put(
    "/class-incharges",
    validateClassIncharge,
    validateRequest,
    asyncHandler(putClassIncharge)
);
router.patch(
    "/class-incharges/:id/status",
    validateClassInchargeStatus,
    validateRequest,
    asyncHandler(patchClassInchargeStatus)
);

export default router;
