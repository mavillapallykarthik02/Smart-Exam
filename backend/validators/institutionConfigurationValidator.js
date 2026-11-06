import { body } from "express-validator";

const editableFields = [
    "name",
    "instituteCode",
    "collegeCode",
    "location",
    "affiliation",
    "verificationStatus",
    "sourceUrl",
    "sourceTitle",
    "lastVerifiedAt"
];

export const validateInstitutionConfiguration = [
    body().custom((value) =>
        value && typeof value === "object" &&
        editableFields.some((field) => Object.hasOwn(value, field))
    ).withMessage("Provide at least one institution configuration field."),
    body().custom((value) =>
        value && typeof value === "object" &&
        Object.keys(value).every((field) => editableFields.includes(field))
    ).withMessage("Only institution configuration fields may be updated."),
    body("name").optional().isString().trim().isLength({ min: 2, max: 150 })
        .withMessage("Institution name must be between 2 and 150 characters."),
    body("instituteCode").optional().isString().trim().isLength({ max: 30 })
        .withMessage("Institute code must be 30 characters or fewer."),
    body("collegeCode").optional().isString().trim().isLength({ max: 30 })
        .withMessage("College code must be 30 characters or fewer."),
    body("location").optional().isString().trim().isLength({ max: 200 })
        .withMessage("Location must be 200 characters or fewer."),
    body("affiliation").optional().isString().trim().isLength({ max: 150 })
        .withMessage("Affiliation must be 150 characters or fewer."),
    body("verificationStatus").optional().isIn(["PENDING", "VERIFIED"])
        .withMessage("Verification status must be PENDING or VERIFIED."),
    body("sourceUrl").optional({ nullable: true }).isURL({
        protocols: ["http", "https"],
        require_protocol: true
    }).withMessage("Source URL must be a valid HTTP or HTTPS URL."),
    body("sourceTitle").optional().isString().trim().isLength({ min: 1, max: 300 })
        .withMessage("Source title must be between 1 and 300 characters."),
    body("lastVerifiedAt").optional({ nullable: true }).isISO8601().toDate()
        .withMessage("Verification date must be a valid ISO-8601 date.")
];
