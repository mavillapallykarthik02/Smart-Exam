import rateLimit from "express-rate-limit";
import { sendError } from "../utils/apiResponse.js";

export const authRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: "draft-8",
    legacyHeaders: false,
    handler(_request, response) {
        return sendError(
            response,
            429,
            "Too many authentication attempts. Please try again later."
        );
    }
});
