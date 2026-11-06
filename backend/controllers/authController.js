import { config } from "../config/env.js";
import {
    authenticateUser,
    requestPasswordReset as requestPasswordResetForUser,
    registerUser,
    resetPassword as resetUserPassword,
    serializeUser,
    getStudentEnrollmentPreview,
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
    const message = role === "student"
        ? "Registration submitted successfully. Waiting for class incharge approval."
        : "Registration submitted successfully. Waiting for administrator verification.";
    return sendSuccess(response, { user }, message, 201);
}

export async function previewStudentEnrollment(request, response) {
    const preview = await getStudentEnrollmentPreview(request.query.pin);
    return sendSuccess(response, { enrollment: preview });
}

export async function login(request, response, role) {
    let result;
    try {
        result = await authenticateUser(role, request.body.identifier, request.body.password);
    } catch (error) {
        clearSessionCookie(response);
        throw error;
    }

    if (!result) {
        clearSessionCookie(response);
        return sendError(response, 401, "The username/email or password is incorrect.");
    }

    setSessionCookie(response, result.token);
    return sendSuccess(response, { user: result.user }, "Signed in successfully.");
}

export async function requestPasswordReset(request, response) {
    await requestPasswordResetForUser(request.params.role, request.body.email);
    return sendSuccess(
        response,
        null,
        "If an account exists for that email, a password reset link has been sent."
    );
}

export async function resetPassword(request, response) {
    await resetUserPassword(
        request.params.role,
        request.body.token,
        request.body.password
    );
    return sendSuccess(response, null, "Password updated. You can now sign in.");
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
