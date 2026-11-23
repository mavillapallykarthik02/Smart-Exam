import { Router } from "express";
import {
    getSubject,
    getSubjects
} from "../controllers/subjectController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateSubjectBranchFilter,
    validateSubjectId
} from "../validators/subjectValidator.js";

const router = Router();

router.use(authenticate);
router.get(
    "/",
    allowRoles("teacher", "student"),
    validateSubjectBranchFilter,
    validateRequest,
    asyncHandler(getSubjects)
);
router.get(
    "/:id",
    allowRoles("teacher", "student"),
    validateSubjectId,
    validateRequest,
    asyncHandler(getSubject)
);
export default router;
