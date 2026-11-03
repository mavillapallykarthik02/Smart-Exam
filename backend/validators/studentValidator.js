import { body, param, query } from "express-validator";

const teacherIdPattern = /^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/;

export const validateStudentSubjects = [
    query("branch").optional().isMongoId()
        .withMessage("Branch filter must be a valid MongoDB ObjectId.")
];

export const validateConnectTeacher = [
    body("teacherId")
        .isString()
        .withMessage("Teacher ID is required.")
        .bail()
        .trim()
        .isLength({ min: 3, max: 40 })
        .withMessage("Teacher ID must be between 3 and 40 characters.")
        .matches(teacherIdPattern)
        .withMessage("Teacher ID may contain letters, numbers, hyphens and underscores.")
];

export const validateDisconnectTeacher = [
    param("teacherId")
        .isString()
        .trim()
        .isLength({ min: 3, max: 40 })
        .withMessage("Teacher ID must be between 3 and 40 characters.")
        .matches(teacherIdPattern)
        .withMessage("Teacher ID may contain letters, numbers, hyphens and underscores.")
];

export const validateStudentSubjectId = [
    param("id").isMongoId().withMessage("Subject ID must be a valid MongoDB ObjectId.")
];
