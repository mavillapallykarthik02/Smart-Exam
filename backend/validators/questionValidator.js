import { body, param } from "express-validator";
import { QUESTION_TYPES } from "../models/Question.js";

const questionFields = [
    body("questionType").optional().isIn(QUESTION_TYPES)
        .withMessage(`Question type must be one of: ${QUESTION_TYPES.join(", ")}.`),
    body("text")
        .isString().withMessage("Question text is required.")
        .bail().trim().isLength({ min: 1, max: 10000 })
        .withMessage("Question text must be 10000 characters or fewer."),
    body("marks").isFloat({ min: 0.01, max: 100000 })
        .withMessage("Marks must be greater than zero and no greater than 100000."),
    body("explanation").optional().isString().trim().isLength({ max: 5000 })
        .withMessage("Explanation must be 5000 characters or fewer."),
    body("options").custom((value) => value === undefined || (Array.isArray(value) && value.length === 0))
        .withMessage("Descriptive questions do not have answer options."),
    body("correctAnswer").not().exists()
        .withMessage("Descriptive questions do not have an answer key."),
    body("expectedAnswer").not().exists()
        .withMessage("Descriptive questions are evaluated manually.")
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
