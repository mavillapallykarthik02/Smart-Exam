import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { Subject } from "../models/Subject.js";
import { User } from "../models/User.js";
import { normalizeInstitution } from "../utils/institution.js";
import { INSTITUTION_KEY } from "../config/institution.js";
import { Sector } from "../models/Sector.js";

const COLLEGE_NAME = "Government Polytechnic - 001";
const COLLEGE_LOCATION = "Masab Tank, Hyderabad";

function notFound(message) {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function serializeBranch(branch, user) {
    return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        description: branch.description,
        sector: branch.sector ? {
            id: branch.sector.id || branch.sector.toString(),
            name: branch.sector.name || "",
        } : null,
        sectorId: branch.sector?.id || branch.sector?.toString() || "",
        collegeName: COLLEGE_NAME,
        location: COLLEGE_LOCATION,
        isArchived: branch.isArchived,
        isActive: branch.isActive,
        canManage: user?.role === "teacher" &&
            branch.createdBy?.toString() === user.id,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt
    };
}

export async function listBranches(user) {
    const filter = {
        institutionKey: INSTITUTION_KEY
    };
    if (user.role === "student") {
        filter.isActive = true;
    } else if (user.role !== "admin") {
        filter.$or = [
            { isActive: true },
            { createdBy: user.id }
        ];
    }
    const branches = await Branch.find(filter)
        .populate("sector", "name")
        .sort({ name: 1 });
    return branches.map((branch) => serializeBranch(branch, user));
}

export async function getBranchById(id, user) {
    const filter = {
        _id: id,
        institutionKey: INSTITUTION_KEY
    };
    if (user.role === "student") {
        filter.isActive = true;
    } else if (user.role !== "admin") {
        filter.$or = [
            { isActive: true },
            { createdBy: user.id }
        ];
    }

    const branch = await Branch.findOne(filter).populate("sector", "name");
    if (!branch) {
        throw notFound("Branch not found.");
    }
    return serializeBranch(branch, user);
}

export async function createBranch(input, teacherId) {
    const teacher = await User.findOne({ _id: teacherId, role: "teacher" })
        .select("institution");
    if (!teacher) {
        throw notFound("Teacher not found.");
    }
    const institutionKey = normalizeInstitution(teacher.institution);
    const normalizedName = input.name.trim().toLocaleLowerCase("en");
    const code = input.code.trim().toUpperCase();
    const existingBranch = await Branch.findOne({
        institutionKey,
        $or: [{ normalizedName }, { code }]
    }).select("name code");
    if (existingBranch) {
        const duplicateName = existingBranch.name.toLocaleLowerCase("en") === normalizedName;
        const error = new Error(duplicateName
            ? `The branch "${existingBranch.name}" already exists. Select it instead of creating a duplicate.`
            : `Branch code "${code}" is already in use. Select the existing branch or enter a unique code.`);
        error.statusCode = 409;
        error.field = duplicateName ? "name" : "code";
        throw error;
    }

    const branch = await Branch.create({
        name: input.name,
        code: input.code,
        institutionKey,
        description: input.description || "",
        createdBy: teacherId
    });
    return serializeBranch(branch, { role: "teacher", id: teacherId });
}

export async function createBranchForAdmin(input, teacherId) {
    if (input.sector) {
        const sector = await Sector.findOne({
            _id: input.sector,
            institutionKey: INSTITUTION_KEY,
            isActive: true
        }).select("_id");
        if (!sector) throw notFound("Active sector not found.");
    }
    const institutionKey = INSTITUTION_KEY;
    const normalizedName = input.name.trim().toLocaleLowerCase("en");
    const code = input.code.trim().toUpperCase();
    const existingBranch = await Branch.findOne({
        institutionKey,
        $or: [{ normalizedName }, { code }]
    }).select("name code");
    if (existingBranch) {
        const duplicateName = existingBranch.name.toLocaleLowerCase("en") === normalizedName;
        const error = new Error(duplicateName
            ? `The branch "${existingBranch.name}" already exists.`
            : `Branch code "${code}" is already in use.`);
        error.statusCode = 409;
        throw error;
    }
    const branch = await Branch.create({
        name: input.name,
        code,
        institutionKey,
        description: input.description || "",
        sector: input.sector || null,
        collegeName: COLLEGE_NAME,
        location: COLLEGE_LOCATION,
        createdBy: teacherId
    });
    return serializeBranch(await branch.populate("sector", "name"), { role: "admin" });
}

export async function updateBranch(id, input, teacherId) {
    const branch = await Branch.findOne({ _id: id, createdBy: teacherId });
    if (!branch) {
        throw notFound("Branch not found.");
    }

    branch.name = input.name;
    branch.code = input.code;
    branch.description = input.description || "";
    await branch.save();
    return serializeBranch(branch, { role: "teacher", id: teacherId });
}

export async function setBranchStatus(id, isActive, teacherId) {
    const branch = await Branch.findOne({ _id: id, createdBy: teacherId });
    if (!branch) {
        throw notFound("Branch not found.");
    }

    branch.isActive = isActive;
    await branch.save();
    return serializeBranch(branch, { role: "teacher", id: teacherId });
}

export async function deactivateBranch(id, teacherId) {
    const branch = await Branch.findOne({ _id: id, createdBy: teacherId });
    if (!branch) {
        throw notFound("Branch not found.");
    }

    branch.isActive = false;
    await branch.save();
    return serializeBranch(branch, { role: "teacher", id: teacherId });
}

export async function listBranchSubjects(branchId, user) {
    if (!mongoose.isValidObjectId(branchId)) {
        const error = new Error("Branch ID must be a valid MongoDB ObjectId.");
        error.statusCode = 400;
        throw error;
    }

    const branch = await Branch.findOne({
        _id: branchId,
        institutionKey: normalizeInstitution(user.institution),
        ...(user.role === "student"
            ? {
                isActive: true,
                _id: user.branch?._id || user.branch
            }
            : {})
    });
    if (!branch) {
        throw notFound("Branch not found.");
    }

    const filter = { branch: branch._id };
    if (user.role === "student") {
        filter.isActive = true;
    }
    const subjects = await Subject.find(filter)
        .populate("branch", "name code isActive")
        .sort({ name: 1 });

    return subjects.map((subject) => ({
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        branch: subject.branch ? {
            id: subject.branch.id,
            name: subject.branch.name,
            code: subject.branch.code,
            isActive: subject.branch.isActive
        } : null,
        isActive: subject.isActive,
        createdAt: subject.createdAt,
        updatedAt: subject.updatedAt
    }));
}
