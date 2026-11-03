import process from "node:process";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { config } from "../config/env.js";
import { Branch } from "../models/Branch.js";
import { User } from "../models/User.js";
import { normalizeInstitution } from "../utils/institution.js";

export async function migrateBranchInstitutions() {
    const legacyUsers = await User.find({
        $or: [
            { institutionKey: { $exists: false } },
            { institutionKey: "" }
        ]
    }).select("_id institution").lean();
    const userUpdates = legacyUsers.map((user) => {
        if (!user.institution?.trim()) {
            throw new Error(`User ${user._id} has no institute affiliation to migrate.`);
        }
        return {
            updateOne: {
                filter: { _id: user._id },
                update: {
                    $set: { institutionKey: normalizeInstitution(user.institution) }
                }
            }
        };
    });
    if (userUpdates.length) {
        await User.bulkWrite(userUpdates, { ordered: true });
    }

    const legacyBranches = await Branch.find({
        $or: [
            { institutionKey: { $exists: false } },
            { institutionKey: "" }
        ]
    }).select("_id createdBy").lean();
    const ownerIds = [...new Set(legacyBranches.map((branch) => branch.createdBy.toString()))];
    const owners = await User.find({ _id: { $in: ownerIds }, role: "teacher" })
        .select("_id institution")
        .lean();
    const institutionByOwner = new Map(owners.map((owner) => [
        owner._id.toString(),
        owner.institution
    ]));
    const updates = legacyBranches.map((branch) => {
        const institution = institutionByOwner.get(branch.createdBy.toString());
        if (!institution?.trim()) {
            throw new Error(
                `Branch ${branch._id} cannot be assigned to an institute: its teacher is missing or has no institution.`
            );
        }
        return {
            updateOne: {
                filter: { _id: branch._id },
                update: {
                    $set: { institutionKey: normalizeInstitution(institution) }
                }
            }
        };
    });
    if (updates.length) {
        await Branch.bulkWrite(updates, { ordered: true });
    }

    const indexes = await Branch.collection.indexes();
    for (const legacyIndexName of ["code_1", "normalizedName_1"]) {
        if (indexes.some((index) => index.name === legacyIndexName)) {
            await Branch.collection.dropIndex(legacyIndexName);
        }
    }
    await Branch.collection.createIndex(
        { institutionKey: 1, code: 1 },
        { unique: true }
    );
    await Branch.collection.createIndex(
        { institutionKey: 1, normalizedName: 1 },
        { unique: true }
    );

    const userIndexes = await User.collection.indexes();
    for (const index of userIndexes) {
        if (
            index.name === "studentId_1" ||
            (index.key.teacherId && index.key.institutionKey)
        ) {
            await User.collection.dropIndex(index.name);
        }
    }
    await User.collection.createIndex(
        { institutionKey: 1, studentId: 1 },
        {
            unique: true,
            partialFilterExpression: {
                role: "student",
                studentId: { $type: "string" }
            }
        }
    );
    await User.collection.createIndex(
        { teacherId: 1 },
        {
            unique: true,
            partialFilterExpression: {
                role: "teacher",
                teacherId: { $type: "string" }
            }
        }
    );

    const subjectIndexes = await mongoose.connection.collection("subjects").indexes();
    const subjects = mongoose.connection.collection("subjects");
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
        migratedUsers: userUpdates.length,
        users: await User.countDocuments(),
        migratedBranches: updates.length,
        branches: await Branch.countDocuments()
    };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await mongoose.connect(config.mongodbUri);
        const result = await migrateBranchInstitutions();
        console.info(
            `Institute migration complete: updated ${result.migratedUsers} of ${result.users} users and ${result.migratedBranches} of ${result.branches} branches.`
        );
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}
