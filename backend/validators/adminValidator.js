import { body, param } from "express-validator";

const cohortFields = [
    body("academicBatch").trim().matches(/^\d{4}-\d{4}$/u)
        .withMessage("Academic batch must use the YYYY-YYYY format."),
    body("studyYear").isInt({ min: 1, max: 3 })
        .withMessage("Year of study must be from 1 to 3."),
    body("semester").isInt({ min: 1, max: 6 })
        .withMessage("Semester must be from 1 to 6.")
];

export const validateStudentEnrollment = [
    body("pin").trim().isLength({ min: 3, max: 30 })
        .withMessage("Polytechnic PIN must be between 3 and 30 characters.")
        .matches(/^[A-Za-z0-9][A-Za-z0-9-]*$/u)
        .withMessage("Polytechnic PIN may contain letters, numbers, and hyphens."),
    body("branch").isMongoId().withMessage("Select a valid branch."),
    ...cohortFields
];

export const validateTeacherAssignment = [
    body("teacher").isMongoId().withMessage("Select a valid teacher."),
    body("subject").isMongoId().withMessage("Select a valid subject."),
    body("branch").optional().isMongoId().withMessage("Branch must be a valid ID."),
    ...cohortFields
];

export const validateAssignmentStatus = [
    param("id").isMongoId().withMessage("Assignment ID must be a valid ID."),
    body("isActive").isBoolean().withMessage("isActive must be true or false.")
];

export const validateEnrollmentId = [
    param("id").isMongoId().withMessage("Enrollment ID must be a valid ID.")
];

export const validateClassIncharge = [
    body("teacher").isMongoId().withMessage("Select a valid teacher."),
    body("branch").isMongoId().withMessage("Select a valid branch."),
    ...cohortFields
];

export const validateClassInchargeStatus = [
    param("id").isMongoId().withMessage("Assignment ID must be a valid ID."),
    body("isActive").isBoolean().withMessage("isActive must be true or false.")
];

export const validateTeacherStaffRole = [
    param("id").isMongoId().withMessage("Teacher ID must be a valid ID."),
    body("staffRole").isIn(["class_teacher", "hod", "principal", "guest_lecturer"])
        .withMessage("Select a valid teacher role.")
];

export const validateTeacherVerification = [
    param("id").isMongoId().withMessage("Teacher ID must be a valid ID."),
    body("verificationStatus").isIn(["APPROVED", "REJECTED"])
        .withMessage("Verification status must be APPROVED or REJECTED."),
    body("reason").if((_value, { req }) => req.body.verificationStatus === "REJECTED")
        .trim().isLength({ min: 3, max: 500 })
        .withMessage("Provide a rejection reason between 3 and 500 characters.")
];
