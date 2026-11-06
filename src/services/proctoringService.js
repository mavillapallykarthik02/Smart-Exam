import { apiRequest } from "./api";

export async function getProctoringEvents() {
    const { dashboard } = await apiRequest("/proctoring/events");
    return dashboard;
}

export default { getProctoringEvents };
