import mongoose from "mongoose";

const studentTeacherConnectionSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        connectedAt: {
            type: Date,
            required: true,
            default: Date.now
        },
        disconnectedAt: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ["active", "disconnected"],
            default: "active",
            required: true
        }
    },
    { timestamps: true }
);

studentTeacherConnectionSchema.index(
    { student: 1, teacher: 1 },
    { unique: true }
);
studentTeacherConnectionSchema.index({ student: 1, status: 1, connectedAt: -1 });
studentTeacherConnectionSchema.index({ teacher: 1, status: 1 });

export const StudentTeacherConnection = mongoose.model(
    "StudentTeacherConnection",
    studentTeacherConnectionSchema
);
