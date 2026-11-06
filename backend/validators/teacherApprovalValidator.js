import { body, param, query } from "express-validator";

export const validateApprovalList = [
    query("page").optional().isInt({ min: 1, max: 100000 })
        .withMessage("Page must be a positive integer."),
    query("limit").optional().isInt({ min: 1, max: 100 })
        .withMessage("Page size must be from 1 to 100."),
    query("search").optional().isString().trim().isLength({ max: 100 })
        .withMessage("Search must be 100 characters or fewer."),
    query("status").optional().isIn(["pending", "approved", "rejected", "suspended"])
        .withMessage("Select a valid student status.")
];

export const validateStudentApprovalAction = [
    param("id").isMongoId().withMessage("Student ID must be a valid ID."),
    body("reason").optional().isString().trim().isLength({ max: 500 })
        .withMessage("Reason must be 500 characters or fewer.")
];

export const validateStudentRejection = [
    param("id").isMongoId().withMessage("Student ID must be a valid ID."),
    body("reason").trim().isLength({ min: 3, max: 500 })
        .withMessage("Provide a rejection reason between 3 and 500 characters.")
];
