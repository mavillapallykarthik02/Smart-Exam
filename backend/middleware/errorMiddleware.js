import { sendError } from "../utils/apiResponse.js";

export function notFoundMiddleware(_request, response) {
    return sendError(response, 404, "The requested resource was not found.");
}

export function errorMiddleware(error, _request, response, next) {
    if (response.headersSent) {
        return next(error);
    }

    if (error.name === "ValidationError") {
        const errors = Object.values(error.errors).map((item) => ({
            field: item.path,
            message: item.message
        }));
        return sendError(response, 400, "Please review the submitted information.", errors);
    }

    if (error.code === 11000) {
        const keys = Object.keys(error.keyPattern || {});
        const field = keys.includes("studentId")
            ? "studentId"
            : keys.includes("normalizedName")
            ? "name"
            : keys.includes("code")
                ? "code"
                : keys[0] || "value";
        const label = field === "studentId" ? "Student ID" : field === "code" ? "code" : field;
        const message = field === "studentId" ? "Student ID already exists." : `A record with this ${label} already exists.`;
        return sendError(response, 409, message, [
            { field, message: field === "studentId" ? message : `This ${label} is already in use.` }
        ]);
    }

    if (error.type === "entity.parse.failed") {
        return sendError(response, 400, "The request body must contain valid JSON.");
    }

    if (error.type === "entity.too.large") {
        return sendError(response, 413, "The request body is too large.");
    }

    const statusCode = Number.isInteger(error.statusCode) ? error.statusCode : 500;
    if (statusCode === 409 && error.field === "studentId") {
        return sendError(response, statusCode, error.message, [
            { field: error.field, message: error.message }
        ]);
    }
    const message = statusCode >= 500
        ? "An unexpected server error occurred."
        : error.message;

    if (statusCode >= 500) {
        console.error(error);
    }

    return sendError(response, statusCode, message);
}
