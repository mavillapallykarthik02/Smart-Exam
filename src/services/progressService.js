import { apiRequest } from "./api";

export async function getProgress() {
    const { progress } = await apiRequest("/student/progress");
    return progress;
}
