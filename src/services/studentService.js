import { apiRequest } from "./api";

export async function getStudentDashboard() {
    const { dashboard } = await apiRequest("/student/dashboard");
    return dashboard;
}
