export function sendSuccess(response, data, message = "Request completed.", statusCode = 200) {
    return response.status(statusCode).json({
        success: true,
        message,
        data
    });
}

export function sendError(response, statusCode, message, errors = []) {
    return response.status(statusCode).json({
        success: false,
        message,
        errors
    });
}
