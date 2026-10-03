import { Router } from "express";
import { getResultById, getResults } from "../controllers/resultController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateResultId, validateResultList } from "../validators/resultValidator.js";

const router = Router();

router.use(authenticate, allowRoles("student", "teacher"));
router.get("/", validateResultList, validateRequest, asyncHandler(getResults));
router.get("/:id", validateResultId, validateRequest, asyncHandler(getResultById));

export default router;
