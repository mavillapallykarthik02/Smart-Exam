import { Router } from "express";
import {
    getProctoringEvents,
    getRiskSummary,
    getStoredRiskSummary
} from "../controllers/proctoringController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, allowRoles("teacher"));
router.get("/events", asyncHandler(getProctoringEvents));
router.post("/risk-summary", asyncHandler(getRiskSummary));
router.get("/risk-summary", asyncHandler(getStoredRiskSummary));

export default router;
