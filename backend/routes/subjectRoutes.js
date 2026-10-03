import { Router } from "express";
import {
    deleteSubject,
    getSubject,
    getSubjects,
    patchSubjectStatus,
    postSubject,
    putSubject
} from "../controllers/subjectController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateSubjectBranchFilter,
    validateSubjectCreate,
    validateSubjectId,
    validateSubjectStatus,
    validateSubjectUpdate
} from "../validators/subjectValidator.js";

const router = Router();

router.use(authenticate);
router.get(
    "/",
    validateSubjectBranchFilter,
    validateRequest,
    asyncHandler(getSubjects)
);
router.post(
    "/",
    allowRoles("teacher"),
    validateSubjectCreate,
    validateRequest,
    asyncHandler(postSubject)
);
router.get(
    "/:id",
    validateSubjectId,
    validateRequest,
    asyncHandler(getSubject)
);
router.put(
    "/:id",
    allowRoles("teacher"),
    validateSubjectUpdate,
    validateRequest,
    asyncHandler(putSubject)
);
router.patch(
    "/:id/status",
    allowRoles("teacher"),
    validateSubjectStatus,
    validateRequest,
    asyncHandler(patchSubjectStatus)
);
router.delete(
    "/:id",
    allowRoles("teacher"),
    validateSubjectId,
    validateRequest,
    asyncHandler(deleteSubject)
);

export default router;
