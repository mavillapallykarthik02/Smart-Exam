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
    putClassIncharge
} from "../controllers/adminController.js";
import {
    getTargetInstitution,
    putTargetInstitution
} from "../controllers/institutionConfigurationController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { validateInstitutionConfiguration } from "../validators/institutionConfigurationValidator.js";
import { validateAdminBranchCreate } from "../validators/branchValidator.js";
import {
    validateAssignmentStatus,
    validateClassIncharge,
    validateClassInchargeStatus,
    validateTeacherAssignment,
    validateTeacherStaffRole,
    validateTeacherVerification
} from "../validators/adminValidator.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, allowRoles("admin"));
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
router.patch(
    "/teachers/:id/verification",
    validateTeacherVerification,
    validateRequest,
    asyncHandler(patchTeacherVerification)
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
