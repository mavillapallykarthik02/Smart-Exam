import "dotenv/config";
import process from "node:process";

const requiredEnvironmentVariables = ["MONGODB_URI", "JWT_SECRET", "FIELD_ENCRYPTION_KEY"];
const nodeEnv = process.env.NODE_ENV || "development";
const isProduction = nodeEnv === "production";

function normalizeClientOrigin(origin) {
    try {
        const parsedOrigin = new URL(origin);
        if (
            !["http:", "https:"].includes(parsedOrigin.protocol) ||
            parsedOrigin.username ||
            parsedOrigin.password ||
            parsedOrigin.pathname !== "/" ||
            parsedOrigin.search ||
            parsedOrigin.hash
        ) {
            return null;
        }
        return parsedOrigin.origin;
    } catch {
        return null;
    }
}

const configuredClientOrigins = (process.env.CLIENT_ORIGIN || "")
    .split(",")
    .map((origin) => normalizeClientOrigin(origin.trim()))
    .filter((origin) => origin && (!isProduction || !/^https?:\/\/localhost(?::|$)/iu.test(origin)));
const defaultClientOrigins = isProduction
    ? [
        "https://smart-exam-theta.vercel.app",
        "https://smart-exam-gptm.vercel.app",
        "https://smart-exam1.vercel.app"
    ]
    : ["http://localhost:5173"];
const clientOrigins = [...new Set([...defaultClientOrigins, ...configuredClientOrigins])];
const smartExamPreviewOriginPattern =
    /^https:\/\/smart-exam-[a-z0-9-]+-smart-exam1\.vercel\.app$/iu;

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
    clientOrigin: configuredClientOrigins[0] || defaultClientOrigins[0],
    clientOrigins,
    gmailUser: process.env.GMAIL_USER || "",
    gmailAppPassword: process.env.GMAIL_APP_PASSWORD || "",
    gmailFrom: process.env.GMAIL_FROM || "",
    nodeEnv,
    sessionCookieName: "smartexam_session",
    sessionCookieMaxAge: 24 * 60 * 60 * 1000
};

export function isAllowedClientOrigin(origin) {
    const normalizedOrigin = normalizeClientOrigin(origin);
    return Boolean(
        normalizedOrigin &&
        (clientOrigins.includes(normalizedOrigin) || smartExamPreviewOriginPattern.test(normalizedOrigin))
    );
}
