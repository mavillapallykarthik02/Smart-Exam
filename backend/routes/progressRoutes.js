import { Router } from "express";
import { getProgress } from "../controllers/progressController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.get("/", authenticate, allowRoles("student"), asyncHandler(getProgress));

export default router;
