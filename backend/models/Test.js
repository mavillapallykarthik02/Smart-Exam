import mongoose from "mongoose";

export const TEST_TYPES = Object.freeze(["DESCRIPTIVE"]);
export const TEST_STATUSES = Object.freeze(["DRAFT", "PUBLISHED", "ARCHIVED"]);

const testSchema = new mongoose.Schema(
    {
        title: {
            type: String,
            required: true,
            trim: true,
            minlength: 3,
            maxlength: 160
        },
        description: {
            type: String,
            trim: true,
            maxlength: 3000,
            default: ""
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true
        },
        subject: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Subject",
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },
        duration: {
            type: Number,
            required: true,
            min: 1,
            max: 600
        },
        testType: {
            type: String,
            enum: TEST_TYPES,
            required: true
        },
        status: {
            type: String,
            enum: TEST_STATUSES,
            default: "DRAFT",
            required: true
        },
        totalQuestions: {
            type: Number,
            required: true,
            min: 1,
            max: 500
        },
        totalMarks: {
            type: Number,
            required: true,
            min: 0.01,
            max: 100000
        },
        passingPercentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100,
            default: 40
        },
        instructions: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        },
        publishedAt: {
            type: Date,
            default: null
        }
    },
    { timestamps: true }
);

testSchema.index({ createdBy: 1, status: 1, updatedAt: -1 });
testSchema.index({ branch: 1, subject: 1, status: 1 });
testSchema.index({ subject: 1, status: 1, createdAt: -1 });

export const Test = mongoose.model("Test", testSchema);
