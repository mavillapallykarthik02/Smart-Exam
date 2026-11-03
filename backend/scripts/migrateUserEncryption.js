import process from "node:process";
import { pathToFileURL } from "node:url";
import mongoose from "mongoose";
import { config } from "../config/env.js";
import {
    createLookupHash,
    createNameSearchTokens,
    decryptField,
    encryptField
} from "../utils/fieldEncryption.js";
import { isSupportedInstitution } from "../utils/institution.js";

const protectedFields = ["name", "studentId", "username", "email", "mobile", "teacherId"];

export async function migrateUserEncryption() {
    const users = mongoose.connection.collection("users");
    const records = await users.find({}).toArray();
    for (const record of records) {
        if (!isSupportedInstitution(record.institution)) {
            throw new Error(
                `User ${record._id} is not associated with Government Polytechnic, Masab Tank; resolve institution ownership before encryption.`
            );
        }
    }
    const operations = records.map((record) => {
        const values = Object.fromEntries(protectedFields.map((field) => [
            field,
            typeof record[field] === "string" ? decryptField(record[field]) : record[field]
        ]));
        const set = {
            ...Object.fromEntries(protectedFields
                .filter((field) => typeof values[field] === "string")
                .map((field) => [field, encryptField(values[field])])),
            ...(values.email ? { emailLookup: createLookupHash(values.email) } : {}),
            ...(values.username ? { usernameLookup: createLookupHash(values.username) } : {}),
            ...(values.mobile ? { mobileLookup: createLookupHash(values.mobile) } : { mobileLookup: "" }),
            ...(values.studentId ? { studentIdLookup: createLookupHash(values.studentId) } : {}),
            ...(values.teacherId ? { teacherIdLookup: createLookupHash(values.teacherId) } : {}),
            ...(values.name ? { nameSearchTokens: createNameSearchTokens(values.name) } : {})
        };
        return {
            updateOne: {
                filter: { _id: record._id },
                update: { $set: set }
            }
        };
    });

    if (operations.length) await users.bulkWrite(operations, { ordered: true });

    for (const index of await users.indexes()) {
        if (
            index.name !== "_id_" &&
            [
                "email",
                "username",
                "studentId",
                "teacherId",
                "emailLookup",
                "usernameLookup",
                "studentIdLookup",
                "teacherIdLookup"
            ].some((field) => index.key[field])
        ) {
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
    await users.createIndex(
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
    await users.createIndex(
        { usernameLookup: 1 },
        {
            name: "usernameLookup_1",
            unique: true,
            partialFilterExpression: { usernameLookup: { $type: "string" } }
        }
    );
    await users.createIndex(
        { emailLookup: 1 },
        {
            name: "emailLookup_1",
            unique: true,
            partialFilterExpression: { emailLookup: { $type: "string" } }
        }
    );

    for (const collectionName of ["subjects", "tests"]) {
        const collection = mongoose.connection.collection(collectionName);
        const records = await collection.find({ teacherId: { $type: "string" } })
            .project({ _id: 1, teacherId: 1 })
            .toArray();
        const updates = records
            .filter((record) => !record.teacherId.startsWith("enc:v1:"))
            .map((record) => ({
                updateOne: {
                    filter: { _id: record._id },
                    update: { $set: { teacherId: encryptField(record.teacherId) } }
                }
            }));
        if (updates.length) await collection.bulkWrite(updates, { ordered: true });
    }

    return { migratedUsers: operations.length, users: records.length };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    try {
        await mongoose.connect(config.mongodbUri);
        const result = await migrateUserEncryption();
        console.info(
            `User field encryption complete: protected ${result.migratedUsers} of ${result.users} user records.`
        );
    } catch (error) {
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await mongoose.disconnect();
    }
}
