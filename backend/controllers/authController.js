import { config } from "../config/env.js";
import {
    authenticateUser,
    registerUser,
    serializeUser,
    updateUserProfile
} from "../services/authService.js";
import { sendError, sendSuccess } from "../utils/apiResponse.js";

function setSessionCookie(response, token) {
    response.cookie(config.sessionCookieName, token, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "strict",
        path: "/api",
        maxAge: config.sessionCookieMaxAge
    });
}

function clearSessionCookie(response) {
    response.clearCookie(config.sessionCookieName, {
        httpOnly: true,
        secure: config.nodeEnv === "production",
        sameSite: "strict",
        path: "/api"
    });
}

export async function register(request, response, role) {
    const user = await registerUser(role, request.body);
    return sendSuccess(response, { user }, "Account created successfully.", 201);
}

export async function login(request, response, role) {
    const result = await authenticateUser(role, request.body.identifier, request.body.password);

    if (!result) {
        return sendError(response, 401, "The username/email or password is incorrect.");
    }

    setSessionCookie(response, result.token);
    return sendSuccess(response, { user: result.user }, "Signed in successfully.");
}

export function getCurrentUser(request, response) {
    return sendSuccess(response, { user: serializeUser(request.user) });
}

export async function updateCurrentUser(request, response) {
    const user = await updateUserProfile(request.user, request.body);
    return sendSuccess(response, { user }, "Account details updated successfully.");
}

export function logout(_request, response) {
    clearSessionCookie(response);
    return sendSuccess(response, null, "Signed out successfully.");
}
