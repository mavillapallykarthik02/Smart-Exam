import { query } from "express-validator";

export const validateTeacherStudentList = [
    query("page").optional().isInt({ min: 1, max: 100000 })
        .withMessage("Page must be a positive integer."),
    query("limit").optional().isInt({ min: 1, max: 100 })
        .withMessage("Page size must be from 1 to 100."),
    query("search").optional().isString().trim().isLength({ max: 100 })
        .withMessage("Search must be 100 characters or fewer."),
    query("branch").optional().isMongoId()
        .withMessage("Branch filter must be a valid ID."),
    query("status").optional().isIn(["active", "inactive", "suspended"])
        .withMessage("Status must be active, inactive, or suspended.")
];
