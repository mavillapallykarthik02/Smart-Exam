import { StudentTeacherConnection } from "../models/StudentTeacherConnection.js";
import { User } from "../models/User.js";
import { createLookupHash } from "../utils/fieldEncryption.js";

function resourceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function serializeConnection(connection) {
    const teacher = connection.teacher;
    return {
        id: connection.id,
        teacher: {
            id: teacher.id,
            name: teacher.name,
            teacherId: teacher.teacherId,
            institution: teacher.institution
        },
        connectedAt: connection.connectedAt,
        status: connection.status
    };
}

export async function connectStudentToTeacher(studentId, teacherIdInput) {
    const teacherId = teacherIdInput.trim().toUpperCase();
    const teacher = await User.findOne({
        role: "teacher",
        accountStatus: "active",
        teacherIdLookup: createLookupHash(teacherId)
    }).select("_id name teacherId institution");
    if (!teacher) {
        throw resourceError(404, "No active teacher was found with that Teacher ID.");
    }

    let connection = await StudentTeacherConnection.findOne({
        student: studentId,
        teacher: teacher._id
    });
    if (connection?.status === "active") {
        throw resourceError(409, "You are already connected to this teacher.");
    }

    if (connection) {
        connection.status = "active";
        connection.connectedAt = new Date();
        connection.disconnectedAt = null;
        await connection.save();
    } else {
        try {
            connection = await StudentTeacherConnection.create({
                student: studentId,
                teacher: teacher._id
            });
        } catch (error) {
            if (error.code !== 11000) throw error;
            throw resourceError(409, "You are already connected to this teacher.");
        }
    }
    await connection.populate("teacher", "name teacherId institution");
    return serializeConnection(connection);
}

export async function listStudentTeacherConnections(studentId) {
    const connections = await StudentTeacherConnection.find({
        student: studentId,
        status: "active"
    })
        .populate("teacher", "name teacherId institution")
        .sort({ connectedAt: 1, _id: 1 });
    return connections.map(serializeConnection);
}

export async function disconnectStudentFromTeacher(studentId, teacherIdInput) {
    const teacher = await User.findOne({
        role: "teacher",
        teacherIdLookup: createLookupHash(teacherIdInput.trim().toUpperCase())
    }).select("_id");
    if (!teacher) {
        throw resourceError(404, "Teacher not found.");
    }
    const connection = await StudentTeacherConnection.findOneAndUpdate(
        { student: studentId, teacher: teacher._id, status: "active" },
        { $set: { status: "disconnected", disconnectedAt: new Date() } },
        { new: true }
    ).populate("teacher", "name teacherId institution");
    if (!connection) {
        throw resourceError(404, "Active teacher connection not found.");
    }
    return serializeConnection(connection);
}

export async function getActiveTeacherIds(studentId) {
    const connectedTeacherIds = await StudentTeacherConnection.find({
        student: studentId,
        status: "active"
    }).distinct("teacher");
    return User.find({
        _id: { $in: connectedTeacherIds },
        role: "teacher",
        accountStatus: "active"
    }).distinct("_id");
}
