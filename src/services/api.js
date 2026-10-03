const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "/api";

export class ApiError extends Error {
    constructor(message, status, errors = []) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.errors = errors;
    }
}

export async function apiRequest(path, options = {}) {
    const headers = new Headers(options.headers);
    let body = options.body;

    if (body !== undefined && !(body instanceof FormData)) {
        headers.set("Content-Type", "application/json");
        body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers,
        body,
        credentials: "include"
    });
    const payload = await response.json().catch(() => null);

    if (!response.ok) {
        throw new ApiError(
            payload?.message || "The request could not be completed.",
            response.status,
            payload?.errors || []
        );
    }

    if (!payload?.success) {
        throw new ApiError("The server returned an invalid response.", response.status);
    }

    return payload.data;
}
