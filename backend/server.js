import process from "node:process";
import app from "./app.js";
import { connectDatabase } from "./config/database.js";
import { config } from "./config/env.js";
import { expireDueAttempts } from "./services/attemptService.js";

try {
    await connectDatabase();
    const expiryInterval = setInterval(() => {
        expireDueAttempts().catch((error) => {
            console.error("Unable to expire due exam attempts.", error);
        });
    }, 5000);
    expiryInterval.unref();
    app.listen(config.port, () => {
        console.info(`SmartExam API listening on port ${config.port}.`);
    });
} catch (error) {
    console.error("Unable to start SmartExam API.", error);
    process.exitCode = 1;
}
