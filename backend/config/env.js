import "dotenv/config";

const requiredEnvironmentVariables = ["MONGODB_URI", "JWT_SECRET"];

for (const variable of requiredEnvironmentVariables) {
    if (!process.env[variable]) {
        throw new Error(`Missing required environment variable: ${variable}`);
    }
}

if (process.env.JWT_SECRET.length < 32) {
    throw new Error("JWT_SECRET must contain at least 32 characters.");
}

export const config = {
    port: Number(process.env.PORT || 5000),
    mongodbUri: process.env.MONGODB_URI,
    jwtSecret: process.env.JWT_SECRET,
    clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",
    nodeEnv: process.env.NODE_ENV || "development",
    sessionCookieName: "smartexam_session",
    sessionCookieMaxAge: 24 * 60 * 60 * 1000
};
