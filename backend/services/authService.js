import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "node:crypto";
import { Branch } from "../models/Branch.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { INSTITUTION, INSTITUTION_KEY } from "../config/institution.js";
import { normalizeInstitution } from "../utils/institution.js";
import { createLookupHash } from "../utils/fieldEncryption.js";
import { normalizeTeacherId } from "../utils/teacherValidation.js";
import { sendPasswordResetEmail } from "./emailService.js";
import { config } from "../config/env.js";

const passwordHashCost = 12;
const passwordResetLifetimeMs = 60 * 60 * 1000;

function hashPasswordResetToken(token) {
    return createHash("sha256").update(token).digest("hex");
}

export function serializeUser(user) {
    const branch = user.branch && typeof user.branch === "object"
        ? user.branch
        : null;
    return {
        id: user.id,
        studentId: user.studentId,
        name: user.name,
        username: user.username,
        email: user.email,
        mobile: user.mobile,
        role: user.role,
        institution: user.institution,
        branch: branch?.name || "",
        branchId: branch?.id || user.branch?.toString() || "",
        year: user.year,
        academicBatch: user.academicBatch,
        studyYear: user.studyYear,
        semester: user.semester,
        teacherId: user.teacherId,
        staffRole: user.staffRole,
        departmentName: user.departmentName,
        branchName: user.branchName,
        designation: user.designation,
        verificationStatus: user.verificationStatus,
        accountStatus: user.accountStatus
    };
}

export async function registerUser(role, input) {
    const passwordHash = await bcrypt.hash(input.password, passwordHashCost);
    const institutionKey = INSTITUTION_KEY;
    const teacherId = role === "teacher" ? normalizeTeacherId(input.teacherId) : undefined;

    if (role === "student") {
        const studentId = String(input.studentId || "").trim();
        if (!studentId) {
            const error = new Error("Student ID is required.");
            error.statusCode = 400;
            error.field = "studentId";
            throw error;
        }
        if (await User.exists({
            role: "student",
            institutionKey,
            studentIdLookup: createLookupHash(studentId)
        })) {
            const error = new Error("This student ID is already registered.");
            error.statusCode = 409;
            error.field = "studentId";
            throw error;
        }

        const branchId = input.branchId || input.branch;
        if (!branchId) {
            const error = new Error("Select a valid branch for registration.");
            error.statusCode = 400;
            error.field = "branchId";
            throw error;
        }

        const branch = await Branch.findOne({
            _id: branchId,
            institutionKey: INSTITUTION_KEY,
            isActive: true
        });
        if (!branch) {
            const error = new Error("The selected branch is not available for registration.");
            error.statusCode = 400;
            error.field = "branchId";
            throw error;
        }

        const academicBatch = String(input.academicBatch || "").trim();
        const studyYear = Number(input.studyYear ?? 1);
        const semester = Number(input.semester ?? 1);
        if (!academicBatch || !/^(\d{4})-(\d{4})$/u.test(academicBatch)) {
            const error = new Error("Enter a valid academic batch such as 2026-2029.");
            error.statusCode = 400;
            error.field = "academicBatch";
            throw error;
        }
        if (!Number.isInteger(studyYear) || studyYear < 1 || studyYear > 3) {
            const error = new Error("Course year must be between 1 and 3.");
            error.statusCode = 400;
            error.field = "studyYear";
            throw error;
        }
        if (!Number.isInteger(semester) || semester < 1 || semester > 6) {
            const error = new Error("Semester must be between 1 and 6.");
            error.statusCode = 400;
            error.field = "semester";
            throw error;
        }

        const user = await User.create({
            name: input.name,
            username: input.username,
            email: input.email,
            mobile: input.mobile,
            passwordHash,
            role,
            institution: INSTITUTION.name,
            institutionKey,
            accountStatus: "pending",
            studentId,
            branch: branch._id,
            year: `${studyYear}-${semester - ((studyYear - 1) * 2)}`,
            academicBatch,
            studyYear,
            semester
        });
        await user.populate("branch", "name code");
        return serializeUser(user);
    }

    if (await User.exists({
        role: "teacher",
        teacherIdLookup: createLookupHash(teacherId)
    })) {
        const error = new Error("Teacher ID is already registered.");
        error.statusCode = 409;
        error.field = "teacherId";
        throw error;
    }

    let branchName = input.branchName;
    if (input.branchId) {
        const branch = await Branch.findOne({
            _id: input.branchId,
            institutionKey: INSTITUTION_KEY,
            isActive: true
        }).select("name");
        if (!branch) {
            const error = new Error("The selected branch is not available for registration.");
            error.statusCode = 400;
            error.field = "branchId";
            throw error;
        }
        branchName = branch.name;
    }

    const user = await User.create({
        name: input.name,
        username: input.username,
        email: input.email,
        mobile: input.mobile,
        passwordHash,
        role,
        institution: INSTITUTION.name,
        institutionKey,
        verificationStatus: "PENDING",
        teacherId,
        departmentName: input.departmentName,
        branchName,
        designation: input.designation
    });

    return serializeUser(user);
}

export async function authenticateUser(role, identifier, password) {
    const user = await User.findOne({
        role,
        institutionKey: INSTITUTION_KEY,
        $or: [
            { usernameLookup: createLookupHash(identifier) },
            { emailLookup: createLookupHash(identifier) },
            ...(role === "student"
                ? [{ studentIdLookup: createLookupHash(identifier) }]
                : role === "teacher"
                    ? [{ teacherIdLookup: createLookupHash(normalizeTeacherId(identifier)) }]
                    : [])
        ]
    }).select("+passwordHash").populate("branch", "name code");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return null;
    }

    if (role === "student") {
        const statusMessages = {
            pending: "Your registration is waiting for class incharge approval.",
            rejected: "Your registration has been rejected. Contact your class incharge.",
            suspended: "Your account is currently suspended.",
            inactive: "Your account is inactive. Contact your institution."
        };
        if (!["active", "approved"].includes(user.accountStatus)) {
            const error = new Error(
                statusMessages[user.accountStatus] || "Your account is not authorized to sign in."
            );
            error.statusCode = 403;
            throw error;
        }
    } else {
        if (role === "teacher" && user.verificationStatus !== "APPROVED") {
            const error = new Error(
                user.verificationStatus === "REJECTED"
                    ? `Your teacher registration was not approved.${user.verificationReason ? ` ${user.verificationReason}` : ""}`
                    : "Your teacher registration is waiting for administrator verification."
            );
            error.statusCode = 403;
            throw error;
        }
        if (user.accountStatus !== "active") {
            const error = new Error("This account is inactive. Contact your institution administrator.");
            error.statusCode = 403;
            throw error;
        }
    }

    return {
        user: serializeUser(user),
        token: generateToken(user.id)
    };
}

export async function requestPasswordReset(role, email, sendEmail = sendPasswordResetEmail) {
    const user = await User.findOne({
        role,
        institutionKey: INSTITUTION_KEY,
        emailLookup: createLookupHash(email)
    });
    if (!user) return;

    const token = randomBytes(32).toString("hex");
    const tokenHash = hashPasswordResetToken(token);
    user.passwordResetTokenHash = tokenHash;
    user.passwordResetExpires = new Date(Date.now() + passwordResetLifetimeMs);
    await user.save();

    const resetUrl = new URL(`/password-reset/${role}`, config.clientOrigin);
    resetUrl.searchParams.set("token", token);
    try {
        await sendEmail({
            to: user.email,
            resetUrl: resetUrl.toString(),
            role
        });
    } catch (error) {
        await User.updateOne(
            { _id: user._id, passwordResetTokenHash: tokenHash },
            { $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 } }
        );
        throw error;
    }
}

export async function resetPassword(role, token, password) {
    const passwordHash = await bcrypt.hash(password, passwordHashCost);
    const user = await User.findOneAndUpdate(
        {
            role,
            institutionKey: INSTITUTION_KEY,
            passwordResetTokenHash: hashPasswordResetToken(token),
            passwordResetExpires: { $gt: new Date() }
        },
        {
            $set: { passwordHash },
            $unset: { passwordResetTokenHash: 1, passwordResetExpires: 1 }
        },
        { new: true, runValidators: true }
    ).select("_id");

    if (!user) {
        const error = new Error("The password reset link is invalid or expired.");
        error.statusCode = 400;
        throw error;
    }
}

export async function getStudentEnrollmentPreview(pin) {
    const normalizedPin = pin.trim().toUpperCase();
    const enrollment = await StudentEnrollment.findOne({
        institutionKey: INSTITUTION_KEY,
        pinLookup: createLookupHash(normalizedPin),
        status: "AVAILABLE"
    }).populate("branch", "name code isActive");
    if (!enrollment || !enrollment.branch?.isActive) {
        const error = new Error("No available enrollment matches this Polytechnic PIN.");
        error.statusCode = 404;
        throw error;
    }
    return {
        branch: enrollment.branch.name,
        branchCode: enrollment.branch.code,
        academicBatch: enrollment.academicBatch,
        studyYear: enrollment.studyYear,
        semester: enrollment.semester
    };
}

export async function updateUserProfile(user, changes) {
    if (
        changes.institution &&
        normalizeInstitution(changes.institution) !== normalizeInstitution(user.institution)
    ) {
        const error = new Error("Institute affiliation is fixed to Government Polytechnic, Masab Tank.");
        error.statusCode = 409;
        error.field = "institution";
        throw error;
    }
    const allowedFields = user.role === "teacher"
        ? ["name", "username", "email", "mobile", "institution"]
        : ["name", "username", "email", "mobile", "institution"];
    const updates = Object.fromEntries(
        Object.entries(changes).filter(([field]) => allowedFields.includes(field))
    );

    if (Object.keys(updates).length === 0) {
        const error = new Error("Provide at least one profile field to update.");
        error.statusCode = 400;
        throw error;
    }

    Object.assign(user, updates);
    await user.save();
    if (user.role === "student") await user.populate("branch", "name code");
    return serializeUser(user);
}
