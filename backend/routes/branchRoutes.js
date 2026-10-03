import { Router } from "express";
import {
    deleteBranch,
    getBranch,
    getBranches,
    getSubjectsForBranch,
    patchBranchStatus,
    postBranch,
    putBranch
} from "../controllers/branchController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { listBranches } from "../services/branchService.js";
import { sendSuccess } from "../utils/apiResponse.js";
import {
    validateBranchCreate,
    validateBranchId,
    validateBranchStatus,
    validateBranchSubjects,
    validateBranchUpdate
} from "../validators/branchValidator.js";

const router = Router();

router.get(
    "/available",
    asyncHandler(async (_request, response) => {
        const branches = await listBranches({ role: "student" });
        return sendSuccess(response, { branches });
    })
);

router.use(authenticate);
router.get("/", asyncHandler(getBranches));
router.post(
    "/",
    allowRoles("teacher"),
    validateBranchCreate,
    validateRequest,
    asyncHandler(postBranch)
);
router.get(
    "/:branchId/subjects",
    validateBranchSubjects,
    validateRequest,
    asyncHandler(getSubjectsForBranch)
);
router.get(
    "/:id",
    validateBranchId,
    validateRequest,
    asyncHandler(getBranch)
);
router.put(
    "/:id",
    allowRoles("teacher"),
    validateBranchUpdate,
    validateRequest,
    asyncHandler(putBranch)
);
router.patch(
    "/:id/status",
    allowRoles("teacher"),
    validateBranchStatus,
    validateRequest,
    asyncHandler(patchBranchStatus)
);
router.delete(
    "/:id",
    allowRoles("teacher"),
    validateBranchId,
    validateRequest,
    asyncHandler(deleteBranch)
);

export default router;
