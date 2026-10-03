import { body, param, query } from "express-validator";
import { TEST_STATUSES, TEST_TYPES } from "../models/Test.js";

const testFields = [
    body("title")
        .isString().withMessage("Test title is required.")
        .bail().trim().isLength({ min: 3, max: 160 })
        .withMessage("Test title must be between 3 and 160 characters."),
    body("description")
        .optional().isString().withMessage("Description must be text.")
        .bail().trim().isLength({ max: 3000 })
        .withMessage("Description must be 3000 characters or fewer."),
    body("branch").isMongoId().withMessage("Select a valid branch."),
    body("subject").isMongoId().withMessage("Select a valid subject."),
    body("duration").isInt({ min: 1, max: 600 })
        .withMessage("Duration must be from 1 to 600 minutes."),
    body("testType").isIn(TEST_TYPES)
        .withMessage(`Test type must be one of: ${TEST_TYPES.join(", ")}.`),
    body("totalQuestions").isInt({ min: 1, max: 500 })
        .withMessage("Question count must be from 1 to 500."),
    body("totalMarks").isFloat({ min: 0.01, max: 100000 })
        .withMessage("Total marks must be greater than zero and no greater than 100000."),
    body("passingPercentage").optional().isFloat({ min: 0, max: 100 })
        .withMessage("Passing percentage must be from 0 to 100."),
    body("instructions")
        .optional().isString().withMessage("Instructions must be text.")
        .bail().trim().isLength({ max: 5000 })
        .withMessage("Instructions must be 5000 characters or fewer.")
];

export const validateTestCreate = testFields;
export const validateTestUpdate = [
    param("id").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId."),
    ...testFields
];
export const validateTestId = [
    param("id").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId.")
];
export const validateTestStatus = [
    param("id").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId."),
    body("status").isIn(TEST_STATUSES).withMessage("Invalid test status.")
];
export const validateTestList = [
    query("status").optional().isIn(TEST_STATUSES).withMessage("Invalid test status filter."),
    query("branch").optional().isMongoId().withMessage("Branch filter must be a valid ID."),
    query("subject").optional().isMongoId().withMessage("Subject filter must be a valid ID."),
    query("search").optional().isString().trim().isLength({ max: 100 })
        .withMessage("Search must be 100 characters or fewer.")
];
