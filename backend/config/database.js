import mongoose from "mongoose";
import { config } from "./env.js";

export async function connectDatabase() {
    await mongoose.connect(config.mongodbUri);
    console.info("Connected to MongoDB.");
}

export async function disconnectDatabase() {
    await mongoose.disconnect();
}
