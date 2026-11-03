import process from "node:process";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { config } from "../config/env.js";
import "../models/Branch.js";
import { User } from "../models/User.js";
import { normalizeInstitution } from "../utils/institution.js";
import {
    createLookupHash,
    decryptField,
    encryptField,
    isEncryptedField
} from "../utils/fieldEncryption.js";

function migrationError(message) {
    return new Error(`Student ID migration stopped: ${message}`);
}

function createStudentId(branchCode, year, sequence) {
    const prefix = (branchCode || "STU").replace(/[^A-Z0-9]/gu, "").slice(0, 8) || "STU";
    return `${prefix}${year}${String(sequence).padStart(3, "0")}`;
}

export async function migrateStudentIds({ currentYear = new Date().getFullYear() } = {}) {
    const students = await User.find({ role: "student" })
        .select("_id studentId branch createdAt institution +institutionKey")
        .populate("branch", "code")
        .sort({ createdAt: 1, _id: 1 })
        .lean();
    const idsInUse = new Set();
    const institutionKeyFor = (student) => (
        student.institutionKey || normalizeInstitution(student.institution)
    );
    const scopedId = (student, id) => `${institutionKeyFor(student)}:${id}`;

    for (const student of students) {
        const studentIdValue = typeof student.studentId === "string"
            ? decryptField(student.studentId)
            : student.studentId;
        if (!studentIdValue) continue;
        if (typeof studentIdValue !== "string") {
            throw migrationError(`student ${student._id} has a non-text Student ID.`);
        }
        const normalizedId = studentIdValue.trim().toUpperCase();
        if (!/^[A-Z0-9][A-Z0-9-]{2,29}$/u.test(normalizedId)) {
            throw migrationError(`student ${student._id} has an invalid existing Student ID.`);
        }
        if (idsInUse.has(scopedId(student, normalizedId))) {
            throw migrationError(`duplicate existing Student ID "${normalizedId}" must be resolved before migration.`);
        }
        idsInUse.add(scopedId(student, normalizedId));
    }

    const updates = [];
    const sequencesByPrefix = new Map();
    for (const student of students) {
        const studentIdValue = typeof student.studentId === "string"
            ? decryptField(student.studentId)
            : student.studentId;
        if (studentIdValue) {
            const normalizedId = studentIdValue.trim().toUpperCase();
            if (studentIdValue !== normalizedId || !isEncryptedField(student.studentId)) {
                updates.push({
                    updateOne: {
                        filter: { _id: student._id },
                        update: {
                            $set: {
                                studentId: encryptField(normalizedId),
                                studentIdLookup: createLookupHash(normalizedId)
                            }
                        }
                    }
                });
            }
            continue;
        }

        const institutionKey = institutionKeyFor(student);
        const prefix = (student.branch?.code || "STU")
            .replace(/[^A-Z0-9]/giu, "")
            .toUpperCase()
            .slice(0, 8) || "STU";
        const sequenceKey = `${institutionKey}:${prefix}`;
        let sequence = sequencesByPrefix.get(sequenceKey) || 1;
        let studentId = createStudentId(prefix, currentYear, sequence);
        while (idsInUse.has(`${institutionKey}:${studentId}`)) {
            sequence += 1;
            studentId = createStudentId(prefix, currentYear, sequence);
        }
        sequencesByPrefix.set(sequenceKey, sequence + 1);
        idsInUse.add(`${institutionKey}:${studentId}`);
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
                update: {
                    $set: {
                        studentId: encryptField(studentId),
                        studentIdLookup: createLookupHash(studentId)
                    }
                }
            }
        });
    }

    if (updates.length) {
        await User.bulkWrite(updates, { ordered: true });
    }
    const indexes = await User.collection.indexes();
    for (const index of indexes) {
        if (
            index.name !== "_id_" &&
            (index.key.studentId || index.key.studentIdLookup)
        ) {
            await User.collection.dropIndex(index.name);
        }
    }
    await User.collection.createIndex(
        { institutionKey: 1, studentIdLookup: 1 },
        {
            name: "institutionKey_1_studentIdLookup_1",
            unique: true,
            partialFilterExpression: {
                role: "student",
                studentIdLookup: { $type: "string" }
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
