import { Router } from "express";
import {
    getDashboard,
    getProfile,
    getStudents,
    getTeacherSubjects
} from "../controllers/teacherDashboardController.js";
import {
    approveStudent,
    getClassTeacherStudents,
    reactivateStudent,
    rejectStudent,
    suspendStudent
} from "../controllers/studentApprovalController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateTeacherStudentList } from "../validators/teacherStudentValidator.js";
import {
    validateApprovalList,
    validateStudentApprovalAction,
    validateStudentRejection
} from "../validators/teacherApprovalValidator.js";
import { validateSubjectBranchFilter } from "../validators/subjectValidator.js";

const router = Router();

router.use(authenticate, allowRoles("teacher"));
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/profile", asyncHandler(getProfile));
router.get(
    "/subjects",
    validateSubjectBranchFilter,
    validateRequest,
    asyncHandler(getTeacherSubjects)
);
router.get(
    "/students/approvals",
    validateApprovalList,
    validateRequest,
    asyncHandler(getClassTeacherStudents)
);
router.patch(
    "/students/:id/approve",
    validateStudentApprovalAction,
    validateRequest,
    asyncHandler(approveStudent)
);
router.patch(
    "/students/:id/reject",
    validateStudentRejection,
    validateRequest,
    asyncHandler(rejectStudent)
);
router.patch(
    "/students/:id/suspend",
    validateStudentApprovalAction,
    validateRequest,
    asyncHandler(suspendStudent)
);
router.patch(
    "/students/:id/reactivate",
    validateStudentApprovalAction,
    validateRequest,
    asyncHandler(reactivateStudent)
);
router.get("/students", validateTeacherStudentList, validateRequest, asyncHandler(getStudents));

export default router;
