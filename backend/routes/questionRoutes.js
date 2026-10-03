import { Router } from "express";
import {
    getQuestions,
    patchQuestionOrder,
    postQuestion,
    putQuestion,
    removeQuestion
} from "../controllers/questionController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateQuestionCreate,
    validateQuestionDelete,
    validateQuestionList,
    validateQuestionReorder,
    validateQuestionUpdate
} from "../validators/questionValidator.js";

const router = Router({ mergeParams: true });

router.use(authenticate, allowRoles("teacher"));
router.get(
    "/",
    validateQuestionList,
    validateRequest,
    asyncHandler(getQuestions)
);
router.post(
    "/",
    validateQuestionCreate,
    validateRequest,
    asyncHandler(postQuestion)
);
router.patch(
    "/order",
    validateQuestionReorder,
    validateRequest,
    asyncHandler(patchQuestionOrder)
);
router.put(
    "/:questionId",
    validateQuestionUpdate,
    validateRequest,
    asyncHandler(putQuestion)
);
router.delete(
    "/:questionId",
    validateQuestionDelete,
    validateRequest,
    asyncHandler(removeQuestion)
);

export default router;
