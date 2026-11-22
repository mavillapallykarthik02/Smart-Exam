import { body, param } from "express-validator";
import { SECURITY_EVENT_TYPES } from "../utils/securityEventTypes.js";
import { QUESTION_CONTENT_METHODS } from "../models/Question.js";

export const validateAttemptStart = [
    body("testId").isMongoId().withMessage("Test ID must be a valid MongoDB ObjectId.")
];

export const validateAttemptId = [
    param("id").isMongoId().withMessage("Attempt ID must be a valid MongoDB ObjectId.")
];

export const validateAnswerSave = [
    ...validateAttemptId,
    param("questionId").isMongoId()
        .withMessage("Question ID must be a valid MongoDB ObjectId."),
    body().custom((body) => {
        const supportedFields = [
            "textResponse",
            "selectedOption",
            "selectedMethods",
            "englishResponse",
            "equationSource",
            "equationEntries",
            "drawingPages"
        ];
        if (!supportedFields.some((field) => Object.hasOwn(body, field))) {
            throw new Error("Provide a descriptive answer field.");
        }
        return true;
    }),
    body("selectedOption").optional().isString().trim().isLength({ max: 5 })
        .withMessage("Selected option must be a valid option key."),
    body("textResponse").optional().isString().trim().isLength({ max: 10000 })
        .withMessage("Response must be 10000 characters or fewer."),
    body("selectedMethods").optional().isArray({ min: 1, max: 3 })
        .withMessage("Select at least one answer method."),
    body("selectedMethods").optional().custom((methods) => new Set(methods).size === methods.length)
        .withMessage("Answer methods must be unique."),
    body("selectedMethods.*").optional().isIn(QUESTION_CONTENT_METHODS)
        .withMessage(`Answer methods must be one of: ${QUESTION_CONTENT_METHODS.join(", ")}.`),
    body("englishResponse").optional().isString().isLength({ max: 10000 })
        .withMessage("English answer must be 10000 characters or fewer."),
    body("equationSource").optional().isString().isLength({ max: 20000 })
        .withMessage("Equation source must be 20000 characters or fewer."),
    body("equationEntries").optional().isArray({ max: 100 })
        .withMessage("Equation entries must be an array containing no more than 100 items."),
    body("drawingPages").optional().isArray({ max: 20 })
        .withMessage("Drawing pages must be an array containing no more than 20 items.")
];

export const validateSecurityEvent = [
    ...validateAttemptId,
    body("eventType").isIn(SECURITY_EVENT_TYPES)
        .withMessage("Security event type is not supported.")
];
