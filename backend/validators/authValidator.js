import { body, param, query } from "express-validator";
import { isSupportedInstitution } from "../utils/institution.js";
import { isValidTeacherId, normalizeTeacherId } from "../utils/teacherValidation.js";

const requiredText = (field, label, maxLength = 150) =>
    body(field)
        .trim()
        .notEmpty()
        .withMessage(`${label} is required.`)
        .bail()
        .isLength({ max: maxLength })
        .withMessage(`${label} must be ${maxLength} characters or fewer.`);

const username = () =>
    body("username")
        .trim()
        .isLength({ min: 3, max: 32 })
        .withMessage("Username must be between 3 and 32 characters.")
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage("Username may contain letters, numbers, dots, underscores and hyphens.");

const email = () =>
    body("email")
        .trim()
        .isEmail()
        .withMessage("Enter a valid email address.")
        .normalizeEmail();

const password = () =>
    body("password")
        .isString()
        .isLength({ min: 8, max: 128 })
        .withMessage("Password must be between 8 and 128 characters.");

const mobile = () =>
    body("mobile")
        .trim()
        .isLength({ min: 7, max: 30 })
        .withMessage("Enter a mobile number between 7 and 30 characters.")
        .matches(/^[+\d][\d\s().-]{5,28}\d$/u)
        .withMessage("Enter a valid mobile number.");

export const validateStudentRegistration = [
    body("studentId")
        .trim()
        .notEmpty()
        .withMessage("Student ID is required.")
        .isLength({ min: 3, max: 30 })
        .withMessage("Student ID must be between 3 and 30 characters."),
    body("branchId")
        .trim()
        .notEmpty()
        .withMessage("Select a branch for registration."),
    body("academicBatch")
        .trim()
        .notEmpty()
        .withMessage("Academic batch is required.")
        .matches(/^(\d{4})-(\d{4})$/u)
        .withMessage("Enter a valid academic batch such as 2026-2029."),
    body("studyYear")
        .isInt({ min: 1, max: 3 })
        .withMessage("Course year must be between 1 and 3."),
    body("semester")
        .isInt({ min: 1, max: 6 })
        .withMessage("Semester must be between 1 and 6."),
    requiredText("name", "Name", 100),
    username(),
    email(),
    mobile(),
    password(),
    body("institution")
        .custom(isSupportedInstitution)
        .withMessage("Registration is limited to Government Polytechnic, Masab Tank."),
];

export const validateTeacherRegistration = [
    requiredText("name", "Name", 100),
    username(),
    email(),
    mobile(),
    password(),
    body("institution")
        .custom(isSupportedInstitution)
        .withMessage("Registration is limited to Government Polytechnic, Masab Tank."),
    body("teacherId")
        .trim()
        .customSanitizer(normalizeTeacherId)
        .custom((value) => isValidTeacherId(value))
        .withMessage("Teacher ID must be 3–40 characters using letters, numbers, hyphens, or underscores."),
    body("confirmTeacherId")
        .trim()
        .customSanitizer(normalizeTeacherId)
        .custom((value, { req }) => normalizeTeacherId(value) === normalizeTeacherId(req.body.teacherId))
        .withMessage("Teacher IDs do not match."),
    requiredText("departmentName", "Department", 120),
    body("branchId")
        .optional({ values: "falsy" })
        .isMongoId()
        .withMessage("Select a valid active branch."),
    requiredText("branchName", "Branch", 120),
    requiredText("designation", "Designation", 100)
];

export const validateLogin = [
    body("identifier")
        .trim()
        .notEmpty()
        .withMessage("Enter your username or email address.")
        .isLength({ max: 254 })
        .withMessage("Username or email address is too long."),
    body("password")
        .isString()
        .notEmpty()
        .withMessage("Password is required.")
];

const validatePasswordResetRole = param("role")
    .isIn(["student", "teacher", "admin"])
    .withMessage("Choose a valid account type.");

export const validatePasswordResetRequest = [
    validatePasswordResetRole,
    body("email")
        .trim()
        .isEmail()
        .withMessage("Enter a valid email address.")
        .normalizeEmail()
];

export const validatePasswordReset = [
    validatePasswordResetRole,
    body("token")
        .isString()
        .isLength({ min: 64, max: 64 })
        .isHexadecimal()
        .withMessage("The password reset link is invalid or expired."),
    body("password")
        .isString()
        .isLength({ min: 8, max: 128 })
        .withMessage("Password must be between 8 and 128 characters.")
];

export const validateEnrollmentPreview = [
    query("pin").trim().matches(/^\d{5}-[A-Z]{2,6}-\d{3}$/iu)
        .withMessage("Enter a valid Polytechnic PIN in the format 24001-CS-097.")
];

export const validateProfileUpdate = [
    body("studentId").not().exists()
        .withMessage("Student ID cannot be changed."),
    body("name").optional().trim().isLength({ min: 1, max: 100 })
        .withMessage("Name must be between 1 and 100 characters."),
    body("username").optional().trim().isLength({ min: 3, max: 32 })
        .withMessage("Username must be between 3 and 32 characters.")
        .matches(/^[a-zA-Z0-9._-]+$/)
        .withMessage("Username may contain letters, numbers, dots, underscores and hyphens."),
    body("email").optional().trim().isEmail().withMessage("Enter a valid email address.").normalizeEmail(),
    body("mobile").optional().trim().isLength({ min: 1, max: 30 })
        .withMessage("Mobile number must be 30 characters or fewer."),
    body("institution").optional().trim().isLength({ min: 1, max: 150 })
        .withMessage("Institution must be 150 characters or fewer."),
    body("teacherId").not().exists()
        .withMessage("Teacher ID cannot be changed."),
    body("branch").not().exists()
        .withMessage("Branch is assigned by the institution and cannot be changed."),
    body("year").not().exists()
        .withMessage("Academic placement is assigned by the institution and cannot be changed."),
    body("academicBatch").not().exists()
        .withMessage("Academic placement is assigned by the institution and cannot be changed."),
    body("studyYear").not().exists()
        .withMessage("Academic placement is assigned by the institution and cannot be changed."),
    body("semester").not().exists()
        .withMessage("Academic placement is assigned by the institution and cannot be changed.")
];
