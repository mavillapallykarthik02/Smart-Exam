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

    let response;
    try {
        response = await fetch(`${API_BASE_URL}${path}`, {
            ...options,
            headers,
            body,
            credentials: "include"
        });
    } catch (error) {
        if (error instanceof TypeError) {
            throw new ApiError(
                "Unable to reach the SmartExam server. Start the backend and try again.",
                0
            );
        }
        throw error;
    }
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

export async function getStudentEnrollmentPreview(pin) {
    const query = new URLSearchParams({ pin });
    const { enrollment } = await apiRequest(`/auth/student/enrollment-preview?${query}`);
    return enrollment;
}

export async function requestPasswordReset(role, email) {
    await apiRequest(`/auth/${encodeURIComponent(role)}/forgot-password`, {
        method: "POST",
        body: { email }
    });
}

export async function resetPassword(role, token, password) {
    await apiRequest(`/auth/${encodeURIComponent(role)}/reset-password`, {
        method: "POST",
        body: { token, password }
    });
}
