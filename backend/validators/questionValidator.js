import { body, param } from "express-validator";
import { QUESTION_CONTENT_METHODS, QUESTION_TYPES } from "../models/Question.js";

const questionFields = [
    body("questionType").optional().isIn(QUESTION_TYPES)
        .withMessage(`Question type must be one of: ${QUESTION_TYPES.join(", ")}.`),
    body("text")
        .isString().withMessage("Question text is required.")
        .bail().trim().isLength({ min: 1, max: 10000 })
        .withMessage("Question text must be 10000 characters or fewer."),
    body("title").optional().isString().trim().isLength({ max: 160 })
        .withMessage("Question title must be 160 characters or fewer."),
    body("instructions").optional().isString().trim().isLength({ max: 5000 })
        .withMessage("Question instructions must be 5000 characters or fewer."),
    body("contentMethods").optional().isArray({ min: 1, max: 3 })
        .withMessage("Select at least one question content method."),
    body("contentMethods").optional().custom((methods) => new Set(methods).size === methods.length)
        .withMessage("Question content methods must be unique."),
    body("contentMethods.*").isIn(QUESTION_CONTENT_METHODS)
        .withMessage(`Question content methods must be one of: ${QUESTION_CONTENT_METHODS.join(", ")}.`),
    body("englishContent").optional().isString().isLength({ max: 10000 })
        .withMessage("English question content must be 10000 characters or fewer."),
    body("equationSource").optional().isString().isLength({ max: 20000 })
        .withMessage("Equation source must be 20000 characters or fewer."),
    body("equationEntries").optional().isArray({ max: 100 })
        .withMessage("Equation entries must be an array containing no more than 100 items."),
    body("drawingPages").optional().isArray({ max: 20 })
        .withMessage("Drawing pages must be an array containing no more than 20 items."),
    body("imageUrl").optional().isString().trim().isLength({ max: 2048 })
        .withMessage("Question image URL must be 2048 characters or fewer."),
    body("expectedAnswer").optional().isString().isLength({ max: 20000 })
        .withMessage("Expected answer must be 20000 characters or fewer."),
    body("markingScheme").optional().isString().isLength({ max: 10000 })
        .withMessage("Marking scheme must be 10000 characters or fewer."),
    body("evaluationInstructions").optional().isString().isLength({ max: 5000 })
        .withMessage("Evaluation instructions must be 5000 characters or fewer."),
    body("marks").isFloat({ min: 0.01, max: 100000 })
        .withMessage("Marks must be greater than zero and no greater than 100000."),
    body("explanation").optional().isString().trim().isLength({ max: 5000 })
        .withMessage("Explanation must be 5000 characters or fewer."),
    body("options").custom((value, { req }) => {
        if (req.body.questionType !== "MCQ") {
            return value === undefined || (Array.isArray(value) && value.length === 0);
        }
        return Array.isArray(value) && value.length >= 2 && value.length <= 6 &&
            value.every((option) => (
                option && typeof option.key === "string" && option.key.trim().length > 0 &&
                typeof option.text === "string" && option.text.trim().length > 0
            )) &&
            new Set(value.map((option) => option.key.trim())).size === value.length;
    }).withMessage("MCQ questions require 2 to 6 options with unique keys and non-empty text."),
    body("correctAnswer").custom((value, { req }) => {
        if (req.body.questionType !== "MCQ") return value === undefined;
        return typeof value === "string" &&
            (req.body.options || []).some((option) => option.key.trim() === value.trim());
    }).withMessage("Select one of the provided options as the correct answer."),
    body("options.*.key").optional().isString().trim().isLength({ min: 1, max: 5 })
        .withMessage("Option keys must contain 1 to 5 characters."),
    body("options.*.text").optional().isString().trim().isLength({ min: 1, max: 2000 })
        .withMessage("Option text must contain 1 to 2000 characters.")
];

export const validateQuestionList = [
    param("testId").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId.")
];
export const validateQuestionCreate = [
    param("testId").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId."),
    ...questionFields
];
export const validateQuestionUpdate = [
    param("testId").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId."),
    param("questionId").isMongoId().withMessage("Question ID must be a valid MongoDB ObjectId."),
    ...questionFields
];
export const validateQuestionDelete = [
    param("testId").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId."),
    param("questionId").isMongoId().withMessage("Question ID must be a valid MongoDB ObjectId.")
];
export const validateQuestionReorder = [
    param("testId").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId."),
    body("questions").isArray({ min: 1, max: 500 })
        .withMessage("Questions must be an array containing 1 to 500 positions."),
    body("questions.*.questionId").isMongoId()
        .withMessage("Every question ID must be valid."),
    body("questions.*.position").isInt({ min: 1, max: 500 })
        .withMessage("Every position must be from 1 to 500.")
];
