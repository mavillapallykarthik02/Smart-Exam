import mongoose from "mongoose";

export const ATTEMPT_STATUSES = Object.freeze([
    "IN_PROGRESS",
    "SUBMITTED",
    "TIMED_OUT"
]);

const attemptSchema = new mongoose.Schema(
    {
        student: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Test",
            required: true
        },
        startedAt: {
            type: Date,
            required: true
        },
        expiresAt: {
            type: Date,
            required: true
        },
        submittedAt: {
            type: Date,
            default: null
        },
        status: {
            type: String,
            enum: ATTEMPT_STATUSES,
            default: "IN_PROGRESS",
            required: true
        }
    },
    { timestamps: true }
);

attemptSchema.index({ student: 1, test: 1 }, { unique: true });
attemptSchema.index({ student: 1, status: 1, startedAt: -1 });

export const Attempt = mongoose.model("Attempt", attemptSchema);
