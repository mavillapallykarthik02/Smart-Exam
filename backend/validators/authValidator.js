import { body } from "express-validator";
import { isSupportedInstitution } from "../utils/institution.js";

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

export const validateStudentRegistration = [
    body("studentId")
        .trim()
        .isLength({ min: 3, max: 30 })
        .withMessage("Student ID must be between 3 and 30 characters.")
        .matches(/^[A-Za-z0-9][A-Za-z0-9-]*$/)
        .withMessage("Student ID may contain letters, numbers, and hyphens, and must start with a letter or number."),
    requiredText("name", "Name", 100),
    username(),
    email(),
    body("mobile")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 30 })
        .withMessage("Mobile number must be 30 characters or fewer."),
    password(),
    body("branch")
        .isMongoId()
        .withMessage("Select a valid active branch."),
    body("institution")
        .custom(isSupportedInstitution)
        .withMessage("Registration is limited to Government Polytechnic, Masab Tank."),
    requiredText("year", "Year / semester", 20)
];

export const validateTeacherRegistration = [
    requiredText("name", "Name", 100),
    username(),
    email(),
    body("mobile")
        .optional({ checkFalsy: true })
        .trim()
        .isLength({ max: 30 })
        .withMessage("Mobile number must be 30 characters or fewer."),
    password(),
    body("institution")
        .custom(isSupportedInstitution)
        .withMessage("Registration is limited to Government Polytechnic, Masab Tank."),
    body("teacherId")
        .trim()
        .isLength({ min: 3, max: 40 })
        .withMessage("Teacher ID must be between 3 and 40 characters.")
        .matches(/^[A-Za-z0-9][A-Za-z0-9_-]*$/)
        .withMessage("Teacher ID may contain letters, numbers, hyphens and underscores.")
        .toUpperCase(),
    body("confirmTeacherId")
        .trim()
        .custom((value, { req }) => (
            typeof value === "string" &&
            value.trim().toUpperCase() === req.body.teacherId?.trim().toUpperCase()
        ))
        .withMessage("Teacher IDs do not match.")
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
    body("branch").optional().isMongoId()
        .withMessage("Branch must be a valid branch ID."),
    body("year").optional().trim().isLength({ min: 1, max: 20 })
        .withMessage("Year / semester must be 20 characters or fewer.")
];
