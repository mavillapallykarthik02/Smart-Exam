import jwt from "jsonwebtoken";
import { config } from "../config/env.js";
import { User } from "../models/User.js";
import { sendError } from "../utils/apiResponse.js";
import { INSTITUTION_KEY } from "../config/institution.js";

export async function authenticate(request, response, next) {
    const token = request.cookies[config.sessionCookieName];

    if (!token) {
        return sendError(response, 401, "Please sign in to continue.");
    }

    try {
        const payload = jwt.verify(token, config.jwtSecret);
        const user = await User.findById(payload.sub)
            .select("+institutionKey")
            .populate("branch", "name code");

        if (
            !user ||
            user.accountStatus !== "active" ||
            user.institutionKey !== INSTITUTION_KEY
        ) {
            return sendError(response, 401, "Your session is no longer active.");
        }

        request.user = user;
        return next();
    } catch (error) {
        if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
            return sendError(response, 401, "Your session has expired. Please sign in again.");
        }
        return next(error);
    }
}
