import { param, query } from "express-validator";

export const validateSubjectId = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId.")
];
export const validateSubjectBranchFilter = [
    query("branch")
        .optional()
        .isMongoId()
        .withMessage("Branch filter must be a valid MongoDB ObjectId.")
];
