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
    const alreadyExists = await User.exists({
        role: "admin",
        $or: [
            { usernameLookup: createLookupHash(username) },
            { emailLookup: createLookupHash(email) }
        ]
    });
    if (alreadyExists) {
        throw new Error("An administrator with this username or email already exists.");
    }

    await User.create({
        name,
        username,
        email,
        mobile: "",
        passwordHash: await bcrypt.hash(password, 12),
        role: "admin",
        institution: INSTITUTION.name,
        institutionKey: INSTITUTION_KEY,
        accountStatus: "active"
    });
    console.info("Administrator account created.");
} finally {
    await mongoose.disconnect();
}
