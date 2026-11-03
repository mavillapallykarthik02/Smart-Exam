import { Router } from "express";
import {
    getDashboard,
    getProfile,
    getStudents,
    getTeacherSubjects
} from "../controllers/teacherDashboardController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateTeacherStudentList } from "../validators/teacherStudentValidator.js";
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
router.get("/students", validateTeacherStudentList, validateRequest, asyncHandler(getStudents));

export default router;
