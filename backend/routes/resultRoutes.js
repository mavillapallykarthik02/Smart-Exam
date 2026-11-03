import { Router } from "express";
import {
    evaluateAnswer,
    getResultById,
    getResults,
    publishEvaluatedResult
} from "../controllers/resultController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateAnswerEvaluation,
    validateResultId,
    validateResultList,
    validateResultPublish
} from "../validators/resultValidator.js";

const router = Router();

router.use(authenticate, allowRoles("student", "teacher"));
router.get("/", validateResultList, validateRequest, asyncHandler(getResults));
router.patch(
    "/:id/answers/:questionId",
    allowRoles("teacher"),
    validateAnswerEvaluation,
    validateRequest,
    asyncHandler(evaluateAnswer)
);
router.post(
    "/:id/publish",
    allowRoles("teacher"),
    validateResultPublish,
    validateRequest,
    asyncHandler(publishEvaluatedResult)
);
router.get("/:id", validateResultId, validateRequest, asyncHandler(getResultById));

export default router;
