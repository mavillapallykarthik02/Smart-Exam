import { apiRequest } from "./api";

export async function getTeacherDashboard() {
    const { dashboard } = await apiRequest("/teacher/dashboard");
    return dashboard;
}

export async function listTeacherStudents(filters = {}) {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
            params.set(key, value);
        }
    });
    const query = params.size ? `?${params.toString()}` : "";
    return apiRequest(`/teacher/students${query}`);
}
