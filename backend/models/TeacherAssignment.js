import mongoose from "mongoose";

const teacherAssignmentSchema = new mongoose.Schema(
    {
        teacher: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
            immutable: true
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true,
            immutable: true
        },
        academicBatch: {
            type: String,
            required: true,
            trim: true,
            maxlength: 20,
            immutable: true
        },
        studyYear: {
            type: Number,
            required: true,
            min: 1,
            max: 3,
            immutable: true
        },
        semester: {
            type: Number,
            required: true,
            min: 1,
            max: 6,
            immutable: true
        },
        assignedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true
        }
    },
    { timestamps: true }
);

teacherAssignmentSchema.index(
    { teacher: 1, subject: 1, academicBatch: 1, studyYear: 1, semester: 1 },
    { unique: true }
);
teacherAssignmentSchema.index({ branch: 1, academicBatch: 1, studyYear: 1, semester: 1 });

export const TeacherAssignment = mongoose.model("TeacherAssignment", teacherAssignmentSchema);
