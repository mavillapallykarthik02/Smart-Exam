import { body, param } from "express-validator";

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
        if (!Object.hasOwn(body, "textResponse")) {
            throw new Error("Provide a descriptive text response.");
        }
        return true;
    }),
    body("selectedOption").not().exists()
        .withMessage("Descriptive examinations do not accept selected options."),
    body("textResponse").optional().isString().trim().isLength({ max: 10000 })
        .withMessage("Response must be 10000 characters or fewer.")
];
