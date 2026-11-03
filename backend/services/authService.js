import bcrypt from "bcryptjs";
import { Branch } from "../models/Branch.js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";
import { INSTITUTION, INSTITUTION_KEY } from "../config/institution.js";
import { normalizeInstitution } from "../utils/institution.js";
import { createLookupHash } from "../utils/fieldEncryption.js";

const passwordHashCost = 12;

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
        teacherId: user.teacherId,
        accountStatus: user.accountStatus
    };
}

export async function registerUser(role, input) {
    const passwordHash = await bcrypt.hash(input.password, passwordHashCost);
    const institutionKey = INSTITUTION_KEY;
    let branch;
    const teacherId = role === "teacher" ? input.teacherId.trim().toUpperCase() : undefined;
    if (role === "student") {
        const studentId = input.studentId.trim().toUpperCase();
        if (await User.exists({
            role: "student",
            institutionKey,
            studentIdLookup: createLookupHash(studentId)
        })) {
            const error = new Error("Student ID already exists.");
            error.statusCode = 409;
            error.field = "studentId";
            throw error;
        }
        branch = await Branch.findOne({
            _id: input.branch,
            isActive: true,
            institutionKey
        }).select("_id");
        if (!branch) {
            const error = new Error("Select an active Government Polytechnic, Masab Tank branch.");
            error.statusCode = 400;
            throw error;
        }
    } else if (await User.exists({
        role: "teacher",
        teacherIdLookup: createLookupHash(teacherId)
    })) {
        const error = new Error("Teacher ID is already registered.");
        error.statusCode = 409;
        error.field = "teacherId";
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
        ...(role === "student"
            ? {
                studentId: input.studentId.trim().toUpperCase(),
                branch: branch._id,
                year: input.year
            }
            : { teacherId })
    });
    if (role === "student") {
        await user.populate("branch", "name code");
    }

    return serializeUser(user);
}

export async function authenticateUser(role, identifier, password) {
    const user = await User.findOne({
        role,
        accountStatus: "active",
        institutionKey: INSTITUTION_KEY,
        $or: [
            { usernameLookup: createLookupHash(identifier) },
            { emailLookup: createLookupHash(identifier) },
            ...(role === "student"
                ? [{ studentIdLookup: createLookupHash(identifier) }]
                : [])
        ]
    }).select("+passwordHash").populate("branch", "name code");

    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
        return null;
    }

    return {
        user: serializeUser(user),
        token: generateToken(user.id)
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
        : ["name", "username", "email", "mobile", "institution", "branch", "year"];
    const updates = Object.fromEntries(
        Object.entries(changes).filter(([field]) => allowedFields.includes(field))
    );

    if (Object.keys(updates).length === 0) {
        const error = new Error("Provide at least one profile field to update.");
        error.statusCode = 400;
        throw error;
    }

    if (user.role === "student" && updates.branch) {
        const branch = await Branch.findOne({
            _id: updates.branch,
            isActive: true,
            institutionKey: normalizeInstitution(user.institution)
        }).select("_id");
        if (!branch) {
            const error = new Error("Select an active branch belonging to your institute.");
            error.statusCode = 400;
            throw error;
        }
        updates.branch = branch._id;
    }
    Object.assign(user, updates);
    await user.save();
    if (user.role === "student") await user.populate("branch", "name code");
    return serializeUser(user);
}
