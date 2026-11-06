import { Router } from "express";
import {
    getAttemptById,
    postAttempt,
    postAttemptSecurityEvent,
    postAttemptSubmit,
    putAttemptAnswer
} from "../controllers/attemptController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateAttemptId,
    validateAttemptStart,
    validateAnswerSave,
    validateSecurityEvent
} from "../validators/attemptValidator.js";

const router = Router();

router.use(authenticate, allowRoles("student"));
router.post("/", validateAttemptStart, validateRequest, asyncHandler(postAttempt));
router.get("/:id", validateAttemptId, validateRequest, asyncHandler(getAttemptById));
router.put(
    "/:id/answers/:questionId",
    validateAnswerSave,
    validateRequest,
    asyncHandler(putAttemptAnswer)
);
router.post(
    "/:id/security-events",
    validateSecurityEvent,
    validateRequest,
    asyncHandler(postAttemptSecurityEvent)
);
router.post(
    "/:id/submit",
    validateAttemptId,
    validateRequest,
    asyncHandler(postAttemptSubmit)
);

export default router;
