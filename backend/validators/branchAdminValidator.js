import { body, param } from "express-validator";

const subjectFields = [
    body("name").isString().trim().isLength({ min: 2, max: 120 })
        .withMessage("Subject name must be between 2 and 120 characters."),
    body("code").isString().trim().isLength({ min: 2, max: 20 })
        .withMessage("Subject code must be between 2 and 20 characters.")
        .bail()
        .matches(/^[a-zA-Z0-9_-]+$/u)
        .withMessage("Subject code may contain letters, numbers, hyphens and underscores."),
    body("description").optional({ values: "null" }).isString().trim().isLength({ max: 1000 })
        .withMessage("Description must be 1000 characters or fewer.")
];

const cohortFields = [
    body("academicBatch").isString().trim().matches(/^\d{4}-\d{4}$/u)
        .withMessage("Academic batch must use the YYYY-YYYY format."),
    body("studyYear").isInt({ min: 1, max: 3 })
        .withMessage("Year of study must be from 1 to 3."),
    body("semester").isInt({ min: 1, max: 6 })
        .withMessage("Semester must be from 1 to 6.")
];

export const validateBranchAdminSubjectCreate = subjectFields;
export const validateBranchAdminSubjectUpdate = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId."),
    ...subjectFields
];
export const validateBranchAdminSubjectId = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId.")
];
export const validateBranchAdminSubjectDelete = [
    ...validateBranchAdminSubjectId,
    body("destinationSubjectId").optional().isMongoId()
        .withMessage("Choose a valid destination subject.")
];
export const validateBranchAdminSubjectStatus = [
    ...validateBranchAdminSubjectId,
    body("isActive").isBoolean({ strict: true }).withMessage("isActive must be a boolean.")
];
export const validateBranchAdminSubjectAssignment = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId."),
    body("teacher").isMongoId().withMessage("Select a valid teacher."),
    ...cohortFields
];
export const validateBranchAdminAssignmentStatus = [
    param("id").isMongoId().withMessage("Assignment ID must be a valid MongoDB ObjectId."),
    body("isActive").isBoolean({ strict: true }).withMessage("isActive must be a boolean.")
];
export const validateBranchAdminAssignmentUpdate = [
    param("id").isMongoId().withMessage("Assignment ID must be a valid MongoDB ObjectId."),
    body("teacher").isMongoId().withMessage("Select a valid teacher.")
];
