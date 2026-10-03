import { Router } from "express";
import {
    getBranches,
    getDashboard,
    getProgress,
    getSubjects,
    getTests
} from "../controllers/studentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateStudentSubjects } from "../validators/studentValidator.js";
import { getResults } from "../controllers/resultController.js";
import { validateResultList } from "../validators/resultValidator.js";

const router = Router();

router.use(authenticate, allowRoles("student"));
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/progress", asyncHandler(getProgress));
router.get("/results", validateResultList, validateRequest, asyncHandler(getResults));
router.get("/branches", asyncHandler(getBranches));
router.get("/subjects", validateStudentSubjects, validateRequest, asyncHandler(getSubjects));
router.get("/tests", asyncHandler(getTests));

export default router;
