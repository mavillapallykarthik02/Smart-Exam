import process from "node:process";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { config } from "../config/env.js";
import "../models/Branch.js";
import { User } from "../models/User.js";

function migrationError(message) {
    return new Error(`Student ID migration stopped: ${message}`);
}

function createStudentId(branchCode, year, sequence) {
    const prefix = (branchCode || "STU").replace(/[^A-Z0-9]/gu, "").slice(0, 8) || "STU";
    return `${prefix}${year}${String(sequence).padStart(3, "0")}`;
}

export async function migrateStudentIds({ currentYear = new Date().getFullYear() } = {}) {
    const students = await User.find({ role: "student" })
        .select("_id studentId branch createdAt")
        .populate("branch", "code")
        .sort({ createdAt: 1, _id: 1 })
        .lean();
    const idsInUse = new Set();

    for (const student of students) {
        if (!student.studentId) continue;
        if (typeof student.studentId !== "string") {
            throw migrationError(`student ${student._id} has a non-text Student ID.`);
        }
        const normalizedId = student.studentId.trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/u.test(normalizedId)) {
            throw migrationError(`student ${student._id} has an invalid existing Student ID.`);
        }
        if (idsInUse.has(normalizedId)) {
            throw migrationError(`duplicate existing Student ID "${normalizedId}" must be resolved before migration.`);
        }
        idsInUse.add(normalizedId);
    }

    const updates = [];
    const sequencesByPrefix = new Map();
    for (const student of students) {
        if (student.studentId) {
            const normalizedId = student.studentId.trim().toUpperCase();
            if (student.studentId !== normalizedId) {
                updates.push({
                    updateOne: {
                        filter: { _id: student._id },
                        update: { $set: { studentId: normalizedId } }
                    }
                });
            }
            continue;
        }

        const prefix = (student.branch?.code || "STU")
            .replace(/[^A-Z0-9]/giu, "")
            .toUpperCase()
            .slice(0, 8) || "STU";
        let sequence = sequencesByPrefix.get(prefix) || 1;
        let studentId = createStudentId(prefix, currentYear, sequence);
        while (idsInUse.has(studentId)) {
            sequence += 1;
            studentId = createStudentId(prefix, currentYear, sequence);
        }
        sequencesByPrefix.set(prefix, sequence + 1);
        idsInUse.add(studentId);
        updates.push({
            updateOne: {
                filter: {
                    _id: student._id,
                    role: "student",
                    $or: [
                        { studentId: { $exists: false } },
                        { studentId: null },
                        { studentId: "" }
                    ]
                },
                update: { $set: { studentId } }
            }
        });
    }

    if (updates.length) {
        await User.bulkWrite(updates, { ordered: true });
    }
    await User.collection.createIndex(
        { studentId: 1 },
        {
            unique: true,
            partialFilterExpression: {
                role: "student",
                studentId: { $type: "string" }
            }
        }
    );
    return { migrated: updates.length, students: students.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await mongoose.connect(config.mongodbUri);
        const result = await migrateStudentIds();
        console.info(`Student ID migration complete: updated ${result.migrated} of ${result.students} students.`);
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}
