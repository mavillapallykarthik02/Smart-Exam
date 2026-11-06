import mongoose from "mongoose";

const studentEnrollmentSchema = new mongoose.Schema(
    {
        pinLookup: {
            type: String,
            required: true,
            immutable: true
        },
        institutionKey: {
            type: String,
            required: true,
            immutable: true
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
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
        status: {
            type: String,
            enum: ["AVAILABLE", "CLAIMED", "REVOKED"],
            default: "AVAILABLE",
            required: true
        },
        claimedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            immutable: true
        }
    },
    { timestamps: true }
);

studentEnrollmentSchema.index(
    { institutionKey: 1, pinLookup: 1 },
    { unique: true }
);
studentEnrollmentSchema.index({ branch: 1, academicBatch: 1, studyYear: 1, semester: 1 });

export const StudentEnrollment = mongoose.model("StudentEnrollment", studentEnrollmentSchema);
