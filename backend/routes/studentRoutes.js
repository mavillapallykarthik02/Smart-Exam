import { Router } from "express";
import {
    getBranches,
    getConnectedTeachers,
    getDashboard,
    getProgress,
    getSubjects,
    getSubjectDetails,
    getTests,
    postConnectTeacher,
    deleteTeacherConnection
} from "../controllers/studentController.js";
import { authenticate } from "../middleware/authMiddleware.js";
import { allowRoles } from "../middleware/roleMiddleware.js";
import { validateRequest } from "../middleware/validationMiddleware.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
    validateConnectTeacher,
    validateDisconnectTeacher,
    validateStudentSubjectId,
    validateStudentSubjects
} from "../validators/studentValidator.js";
import { getResults } from "../controllers/resultController.js";
import { validateResultList } from "../validators/resultValidator.js";

const router = Router();

router.use(authenticate, allowRoles("student"));
router.get("/dashboard", asyncHandler(getDashboard));
router.get("/progress", asyncHandler(getProgress));
router.get("/results", validateResultList, validateRequest, asyncHandler(getResults));
router.get("/branches", asyncHandler(getBranches));
router.post("/connect-teacher", validateConnectTeacher, validateRequest, asyncHandler(postConnectTeacher));
router.get("/connected-teachers", asyncHandler(getConnectedTeachers));
router.delete(
    "/disconnect-teacher/:teacherId",
    validateDisconnectTeacher,
    validateRequest,
    asyncHandler(deleteTeacherConnection)
);
router.get("/subjects", validateStudentSubjects, validateRequest, asyncHandler(getSubjects));
router.get(
    "/subjects/:id",
    validateStudentSubjectId,
    validateRequest,
    asyncHandler(getSubjectDetails)
);
router.get("/tests", asyncHandler(getTests));

export default router;
