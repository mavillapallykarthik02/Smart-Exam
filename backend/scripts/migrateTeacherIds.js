import process from "node:process";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { config } from "../config/env.js";
import {
    createLookupHash,
    decryptField,
    encryptField,
    isEncryptedField
} from "../utils/fieldEncryption.js";

function createLegacyTeacherId(userId, suffix = 0) {
    const tail = userId.toString().slice(-8).toUpperCase();
    return `LEGACY-${tail}${suffix ? `-${suffix}` : ""}`;
}

export async function migrateTeacherIds() {
    const users = mongoose.connection.collection("users");
    const subjects = mongoose.connection.collection("subjects");
    const teachers = await users.find({ role: "teacher" })
        .project({ _id: 1, teacherId: 1, teacherIdLookup: 1 })
        .sort({ createdAt: 1, _id: 1 })
        .toArray();
    const teacherIds = new Set();
    const updates = [];

    for (const teacher of teachers) {
        const storedId = typeof teacher.teacherId === "string"
            ? decryptField(teacher.teacherId)
            : "";
        const existingId = typeof storedId === "string"
            ? storedId.trim().toUpperCase()
            : "";
        let teacherId = existingId;
        if (
            !/^[A-Z0-9][A-Z0-9_-]{2,39}$/u.test(existingId) ||
            teacherIds.has(existingId)
        ) {
            let suffix = 0;
            teacherId = createLegacyTeacherId(teacher._id, suffix);
            while (teacherIds.has(teacherId)) {
                suffix += 1;
                teacherId = createLegacyTeacherId(teacher._id, suffix);
            }
        }
        teacherIds.add(teacherId);
        const teacherIdLookup = createLookupHash(teacherId);
        const alreadyEncrypted = isEncryptedField(teacher.teacherId);
        if (
            storedId !== teacherId ||
            !alreadyEncrypted ||
            teacher.teacherIdLookup !== teacherIdLookup
        ) {
            updates.push({
                updateOne: {
                    filter: { _id: teacher._id, role: "teacher" },
                    update: {
                        $set: {
                            teacherId: alreadyEncrypted && storedId === teacherId
                                ? teacher.teacherId
                                : encryptField(teacherId),
                            teacherIdLookup
                        }
                    }
                }
            });
        }
    }

    if (updates.length) {
        await users.bulkWrite(updates, { ordered: true });
    }

    const subjectOwners = await subjects.find({})
        .project({ _id: 1, createdBy: 1 })
        .toArray();
    const teacherObjectIds = new Set(
        teachers.map((teacher) => teacher._id.toString())
    );
    const unassignedSubjectIds = subjectOwners
        .filter((subject) => !subject.createdBy || !teacherObjectIds.has(subject.createdBy.toString()))
        .map((subject) => subject._id.toString());
    if (unassignedSubjectIds.length) {
        throw new Error(
            `Subject ownership requires manual assignment before migration: ${unassignedSubjectIds.join(", ")}`
        );
    }

    const userIndexes = await users.indexes();
    for (const index of userIndexes) {
        if (index.key.teacherId && (
            index.name === "teacherId_1" ||
            index.key.institutionKey
        )) {
            await users.dropIndex(index.name);
        } else if (index.key.teacherIdLookup) {
            await users.dropIndex(index.name);
        }
    }
    await users.createIndex(
        { teacherIdLookup: 1 },
        {
            name: "teacherIdLookup_1",
            unique: true,
            partialFilterExpression: {
                role: "teacher",
                teacherIdLookup: { $type: "string" }
            }
        }
    );

    const subjectIndexes = await subjects.indexes();
    for (const index of subjectIndexes) {
        if (
            index.unique &&
            index.key.branch &&
            (index.key.code || index.key.normalizedName) &&
            !index.key.createdBy
        ) {
            await subjects.dropIndex(index.name);
        }
    }
    await subjects.createIndex(
        { createdBy: 1, branch: 1, code: 1 },
        { unique: true }
    );
    await subjects.createIndex(
        { createdBy: 1, branch: 1, normalizedName: 1 },
        { unique: true }
    );

    return {
        migratedTeachers: updates.length,
        teachers: teachers.length,
        subjects: subjectOwners.length,
        unassignedSubjectIds
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await mongoose.connect(config.mongodbUri);
        const result = await migrateTeacherIds();
        console.info(
            `Teacher ID migration complete: updated ${result.migratedTeachers} of ${result.teachers} teachers; validated ${result.subjects} subject assignments.`
        );
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}
