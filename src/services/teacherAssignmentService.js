import { apiRequest } from "./api";

export async function listTeacherAssignments() {
    const { assignments } = await apiRequest("/teacher/assignments");
    return assignments;
}
