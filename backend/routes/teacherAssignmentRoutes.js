import { Router } from "express";
import { getMyAssignments } from "../controllers/teacherAssignmentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";

const router = Router();

router.use(authenticate, allowRoles("teacher"));
router.get("/", asyncHandler(getMyAssignments));

export default router;
