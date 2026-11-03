import { apiRequest } from "./api";

export async function listConnectedTeachers() {
    const { connections } = await apiRequest("/student/connected-teachers");
    return connections;
}

export async function connectToTeacher(teacherId) {
    const { connection } = await apiRequest("/student/connect-teacher", {
        method: "POST",
        body: { teacherId }
    });
    return connection;
}

export async function disconnectFromTeacher(teacherId) {
    const { connection } = await apiRequest(
        `/student/disconnect-teacher/${encodeURIComponent(teacherId)}`,
        { method: "DELETE" }
    );
    return connection;
}
