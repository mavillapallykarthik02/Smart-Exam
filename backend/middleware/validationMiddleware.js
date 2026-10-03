import { validationResult } from "express-validator";
import { sendError } from "../utils/apiResponse.js";

export function validateRequest(request, response, next) {
    const validationErrors = validationResult(request);

    if (validationErrors.isEmpty()) {
        return next();
    }

    const errors = validationErrors.array().map(({ path, msg }) => ({
        field: path,
        message: msg
    }));

    return sendError(response, 400, "Please review the submitted information.", errors);
}
