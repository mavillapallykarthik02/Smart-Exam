import { Router } from "express";
import {
    deleteTest,
    getTest,
    getTests,
    patchTestStatus,
    postTest,
    putTest
} from "../controllers/testController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateTestCreate,
    validateTestId,
    validateTestList,
    validateTestStatus,
    validateTestUpdate
} from "../validators/testValidator.js";
import questionRoutes from "./questionRoutes.js";

const router = Router();

router.use(authenticate);
router.use("/:testId/questions", questionRoutes);
router.get("/", validateTestList, validateRequest, asyncHandler(getTests));
router.post(
    "/",
    allowRoles("teacher"),
    validateTestCreate,
    validateRequest,
    asyncHandler(postTest)
);
router.get("/:id", validateTestId, validateRequest, asyncHandler(getTest));
router.put(
    "/:id",
    allowRoles("teacher"),
    validateTestUpdate,
    validateRequest,
    asyncHandler(putTest)
);
router.patch(
    "/:id/status",
    allowRoles("teacher"),
    validateTestStatus,
    validateRequest,
    asyncHandler(patchTestStatus)
);
router.delete(
    "/:id",
    allowRoles("teacher"),
    validateTestId,
    validateRequest,
    asyncHandler(deleteTest)
);

export default router;
