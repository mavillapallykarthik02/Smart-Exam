import "dotenv/config";
import process from "node:process";

const requiredEnvironmentVariables = ["MONGODB_URI", "JWT_SECRET", "FIELD_ENCRYPTION_KEY"];

for (const variable of requiredEnvironmentVariables) {
    if (!process.env[variable]) {
        throw new Error(`Missing required environment variable: ${variable}`);
    }
}

if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
}
if (!/^[\da-f]{64}$/iu.test(process.env.FIELD_ENCRYPTION_KEY)) {
    throw new Error("FIELD_ENCRYPTION_KEY must be a 64-character hexadecimal key.");
}

export const config = {
    port: Number(process.env.PORT || 5000),
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    fieldEncryptionKey: process.env.FIELD_ENCRYPTION_KEY,
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    gmailUser: process.env.GMAIL_USER || "",
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
    gmailFrom: process.env.GMAIL_FROM || "",
    nodeEnv: process.env.NODE_ENV || "development",
    sessionCookieName: "smartexam_session",
    sessionCookieMaxAge: 24 * 60 * 60 * 1000
};
