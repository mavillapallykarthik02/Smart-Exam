import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDatabase() {
    await mongoose.connect(config.mongodbUri);
    await repairBranchIndexes();
    console.info("Connected to MongoDB.");
}

async function repairBranchIndexes() {
    const collections = await mongoose.connection.db
        .listCollections({ name: "branches" }, { nameOnly: true })
        .toArray();
    if (collections.length === 0) {
        return;
    }

    const branches = mongoose.connection.collection("branches");
    await branches.updateMany(
        { branchAdministrator: null },
        { $unset: { branchAdministrator: "" } }
    );

    const indexes = await branches.indexes();
    const administratorIndex = indexes.find((index) =>
        index.name === "institutionKey_1_branchAdministrator_1"
    );
    if (administratorIndex && !administratorIndex.partialFilterExpression) {
        await branches.dropIndex(administratorIndex.name);
    }

    const repairedIndexes = await branches.indexes();
    if (!repairedIndexes.some((index) =>
        index.name === "institutionKey_1_branchAdministrator_1"
    )) {
        await branches.createIndex(
            { institutionKey: 1, branchAdministrator: 1 },
            {
                name: "institutionKey_1_branchAdministrator_1",
                unique: true,
                partialFilterExpression: {
                    branchAdministrator: { $type: "objectId" }
                }
            }
        );
    }
}

export async function disconnectDatabase() {
    await mongoose.disconnect();
}
