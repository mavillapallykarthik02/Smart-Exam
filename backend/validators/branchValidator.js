import { body, param, query } from "express-validator";

const validateBranchFields = [
    body("name")
        .isString()
        .withMessage("Branch name is required.")
        .bail()
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage("Branch name must be between 2 and 120 characters."),
    body("code")
        .isString()
        .withMessage("Branch code is required.")
        .bail()
        .trim()
        .isLength({ min: 2, max: 12 })
        .withMessage("Branch code must be between 2 and 12 characters.")
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Branch code may contain letters, numbers, hyphens and underscores."),
    body("description")
        .optional({ values: "null" })
        .isString()
        .withMessage("Description must be text.")
        .bail()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must be 1000 characters or fewer.")
];

export const validateBranchCreate = validateBranchFields;
export const validateAdminBranchCreate = [
    body("sector").optional({ values: "falsy" }).isMongoId().withMessage("Select a valid sector."),
    body("collegeName").optional({ values: "null" }).isString().trim().isLength({ max: 150 }),
    body("location").optional({ values: "null" }).isString().trim().isLength({ max: 200 }),
    ...validateBranchFields
];
export const validateBranchUpdate = [
    param("id").isMongoId().withMessage("Branch ID must be a valid MongoDB ObjectId."),
    ...validateBranchFields
];
export const validateBranchId = [
    param("id").isMongoId().withMessage("Branch ID must be a valid MongoDB ObjectId.")
];
export const validateBranchStatus = [
    param("id").isMongoId().withMessage("Branch ID must be a valid MongoDB ObjectId."),
    body("isActive").optional().isBoolean({ strict: true })
        .withMessage("isActive must be a boolean."),
    body("isArchived").optional().isBoolean({ strict: true })
        .withMessage("isArchived must be a boolean.")
];
export const validateBranchSubjects = [
    param("branchId").isMongoId().withMessage("Branch ID must be a valid MongoDB ObjectId.")
];
export const validateAvailableBranches = [
    query("institution").optional().isString().trim().isLength({ min: 1, max: 150 })
        .withMessage("Institution must be between 1 and 150 characters.")
];
