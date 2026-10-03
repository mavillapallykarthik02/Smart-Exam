import { body, param } from "express-validator";
import { QUESTION_TYPES } from "../models/Question.js";

const questionFields = [
    body("questionType").isIn(QUESTION_TYPES)
        .withMessage(`Question type must be one of: ${QUESTION_TYPES.join(", ")}.`),
    body("text")
        .isString().withMessage("Question text is required.")
        .bail().trim().isLength({ min: 1, max: 10000 })
        .withMessage("Question text must be 10000 characters or fewer."),
    body("marks").isFloat({ min: 0.01, max: 100000 })
        .withMessage("Marks must be greater than zero and no greater than 100000."),
    body("negativeMarks").optional().isFloat({ min: 0, max: 100000 })
        .withMessage("Negative marks must be from 0 to 100000."),
    body("explanation").optional().isString().trim().isLength({ max: 5000 })
        .withMessage("Explanation must be 5000 characters or fewer."),
    body("options").custom((options, { req }) => {
        if (req.body.questionType !== "MCQ") {
            if (options !== undefined && (!Array.isArray(options) || options.length !== 0)) {
                throw new Error("Typing questions must not include options.");
            }
            return true;
        }
        if (!Array.isArray(options) || options.length < 2 || options.length > 8) {
            throw new Error("MCQ questions must have between 2 and 8 options.");
        }
        const keys = options.map((option) => String(option?.key || "").trim().toUpperCase());
        const texts = options.map((option) => String(option?.text || "").trim());
        if (keys.some((key) => !/^[A-H]$/.test(key)) || new Set(keys).size !== keys.length) {
            throw new Error("Each option must have a unique key from A to H.");
        }
        if (texts.some((text) => !text || text.length > 2000)) {
            throw new Error("Each option needs text of 2000 characters or fewer.");
        }
        return true;
    }),
    body("correctAnswer").custom((answer, { req }) => {
        if (req.body.questionType === "MCQ") {
            const keys = Array.isArray(req.body.options)
                ? req.body.options.map((option) => String(option?.key || "").toUpperCase())
                : [];
            if (!keys.includes(String(answer || "").trim().toUpperCase())) {
                throw new Error("Correct answer must match one of the option keys.");
            }
        } else if (answer !== undefined && answer !== "") {
            throw new Error("Typing questions must use expectedAnswer instead of correctAnswer.");
        }
        return true;
    }),
    body("expectedAnswer").custom((answer, { req }) => {
        if (req.body.questionType === "TYPING") {
            if (typeof answer !== "string" || !answer.trim() || answer.length > 10000) {
                throw new Error("Typing questions need an expected answer of 10000 characters or fewer.");
            }
        } else if (answer !== undefined && answer !== "") {
            throw new Error("MCQ questions must use correctAnswer instead of expectedAnswer.");
        }
        return true;
    })
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
