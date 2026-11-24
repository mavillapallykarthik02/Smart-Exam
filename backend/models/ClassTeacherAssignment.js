import mongoose from "mongoose";

const classTeacherAssignmentSchema = new mongoose.Schema(
    {
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },
        academicBatch: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20
        },
        studyYear: {
            type: Number,
            required: true,
            min: 1,
            max: 3
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 6
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true
        }
    },
    { timestamps: true }
);

classTeacherAssignmentSchema.index(
    { branch: 1, academicBatch: 1, studyYear: 1, semester: 1 },
    { unique: true }
);
classTeacherAssignmentSchema.index({ teacher: 1, isActive: 1 });

export const ClassTeacherAssignment = mongoose.model(
    "ClassTeacherAssignment",
    classTeacherAssignmentSchema
);
