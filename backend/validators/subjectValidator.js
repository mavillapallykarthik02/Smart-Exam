import { body, param, query } from "express-validator";

const validateSubjectFields = [
    body("name")
        .isString()
        .withMessage("Subject name is required.")
        .bail()
        .trim()
        .isLength({ min: 2, max: 120 })
        .withMessage("Subject name must be between 2 and 120 characters."),
    body("code")
        .isString()
        .withMessage("Subject code is required.")
        .bail()
        .trim()
        .isLength({ min: 2, max: 20 })
        .withMessage("Subject code must be between 2 and 20 characters.")
        .matches(/^[a-zA-Z0-9_-]+$/)
        .withMessage("Subject code may contain letters, numbers, hyphens and underscores."),
    body("branch")
        .isMongoId()
        .withMessage("A valid branch ID is required."),
    body("description")
        .optional({ values: "null" })
        .isString()
        .withMessage("Description must be text.")
        .bail()
        .trim()
        .isLength({ max: 1000 })
        .withMessage("Description must be 1000 characters or fewer.")
];

export const validateSubjectCreate = validateSubjectFields;
export const validateSubjectUpdate = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId."),
    ...validateSubjectFields
];
export const validateSubjectId = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId.")
];
export const validateSubjectStatus = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId."),
    body("isActive")
        .isBoolean({ strict: true })
        .withMessage("isActive must be a boolean.")
];
export const validateSubjectBranchFilter = [
    query("branch")
        .optional()
        .isMongoId()
        .withMessage("Branch filter must be a valid MongoDB ObjectId.")
];
