import { param, query } from "express-validator";

export const validateResultList = [
    query("page").optional().isInt({ min: 1, max: 100000 })
        .withMessage("Page must be a positive integer."),
    query("limit").optional().isInt({ min: 1, max: 100 })
        .withMessage("Page size must be from 1 to 100."),
    query("search").optional().isString().trim().isLength({ max: 100 })
        .withMessage("Search must be 100 characters or fewer."),
    query("status").optional().isIn(["PASSED", "FAILED"])
        .withMessage("Status must be PASSED or FAILED."),
    query("date").optional().isDate({ format: "YYYY-MM-DD", strictMode: true })
        .withMessage("Date must use YYYY-MM-DD format.")
];

export const validateResultId = [
    param("id").isMongoId().withMessage("Result ID must be a valid MongoDB ObjectId.")
];
