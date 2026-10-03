import { sendError } from "../utils/apiResponse.js";

export function allowRoles(...roles) {
    return function checkRole(request, response, next) {
        if (!request.user || !roles.includes(request.user.role)) {
            return sendError(response, 403, "You do not have permission to perform this action.");
        }

        return next();
    };
}
