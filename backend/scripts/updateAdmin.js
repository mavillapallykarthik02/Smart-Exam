import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import process from "node:process";
import { config } from "../config/env.js";
import { INSTITUTION, INSTITUTION_KEY } from "../config/institution.js";
import { User } from "../models/User.js";
import { createLookupHash } from "../utils/fieldEncryption.js";

const name = process.env.ADMIN_NAME?.trim();
const username = process.env.ADMIN_USERNAME?.trim().toLowerCase();
const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD;

if (!name || !username || !email || !password || password.length < 12) {
    throw new Error(
        "Set ADMIN_NAME, ADMIN_USERNAME, ADMIN_EMAIL, and ADMIN_PASSWORD (at least 12 characters)."
    );
}

await mongoose.connect(config.mongodbUri);
try {
    const administrator = await User.findOne({
        role: "admin",
        institutionKey: INSTITUTION_KEY
    }).select("+passwordHash");

    if (!administrator) {
        throw new Error("No College Administrator account exists to update.");
    }

    const duplicate = await User.findOne({
        _id: { $ne: administrator._id },
        $or: [
            { usernameLookup: createLookupHash(username) },
            { emailLookup: createLookupHash(email) }
        ]
    }).select("_id");

    if (duplicate) {
        throw new Error("The new username or email is already assigned to another account.");
    }

    administrator.name = name;
    administrator.username = username;
    administrator.email = email;
    administrator.passwordHash = await bcrypt.hash(password, 12);
    administrator.institution = INSTITUTION.name;
    administrator.institutionKey = INSTITUTION_KEY;
    administrator.accountStatus = "active";
    await administrator.save();

    console.info("College Administrator credentials updated.");
} finally {
    await mongoose.disconnect();
}
