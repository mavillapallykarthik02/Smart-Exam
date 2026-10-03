import bcrypt from "bcryptjs";
import { Branch } from "../models/Branch.js";
import { User } from "../models/User.js";
import { generateToken } from "../utils/generateToken.js";

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
    let branch;
    if (role === "student") {
        const studentId = input.studentId.trim().toUpperCase();
        if (await User.exists({ role: "student", studentId })) {
            const error = new Error("Student ID already exists.");
            error.statusCode = 409;
            error.field = "studentId";
            throw error;
        }
        branch = await Branch.findOne({ _id: input.branch, isActive: true }).select("_id");
        if (!branch) {
            const error = new Error("Select an active branch.");
            error.statusCode = 400;
            throw error;
        }
    }
    const user = await User.create({
        name: input.name,
        username: input.username,
        email: input.email,
        mobile: input.mobile,
        passwordHash,
        role,
        institution: input.institution,
        ...(role === "student"
            ? {
                studentId: input.studentId.trim().toUpperCase(),
                branch: branch._id,
                year: input.year
            }
            : { teacherId: input.teacherId })
    });
    if (role === "student") {
        await user.populate("branch", "name code");
    }

    return {
        user: serializeUser(user),
        token: generateToken(user.id)
    };
}

export async function authenticateUser(role, identifier, password) {
    const user = await User.findOne({
        role,
        accountStatus: "active",
        $or: [
            { username: identifier.toLowerCase() },
            { email: identifier.toLowerCase() }
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
    const allowedFields = user.role === "teacher"
        ? ["name", "username", "email", "mobile", "institution", "teacherId"]
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
        const branch = await Branch.findOne({ _id: updates.branch, isActive: true }).select("_id");
        if (!branch) {
            const error = new Error("Select an active branch.");
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
