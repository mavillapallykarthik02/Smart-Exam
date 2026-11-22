import mongoose from "mongoose";

export const TEACHER_BRANCH_REQUEST_STATUSES = Object.freeze([
    "PENDING",
    "APPROVED",
    "REJECTED"
]);

const teacherBranchRequestSchema = new mongoose.Schema(
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
        status: {
            type: String,
            enum: TEACHER_BRANCH_REQUEST_STATUSES,
            default: "PENDING",
            required: true
        },
        reason: {
            type: String,
            trim: true,
            maxlength: 500,
            default: ""
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        reviewedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

teacherBranchRequestSchema.index(
    { teacher: 1, branch: 1 },
    { unique: true }
);
teacherBranchRequestSchema.index({ branch: 1, status: 1, createdAt: -1 });

export const TeacherBranchRequest = mongoose.model(
    "TeacherBranchRequest",
    teacherBranchRequestSchema
);
