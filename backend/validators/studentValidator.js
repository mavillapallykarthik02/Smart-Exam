import { query } from "express-validator";

export const validateStudentSubjects = [
    query("branch").optional().isMongoId()
        .withMessage("Branch filter must be a valid MongoDB ObjectId.")
];
