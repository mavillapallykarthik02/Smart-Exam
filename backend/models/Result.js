import mongoose from "mongoose";

const resultSchema = new mongoose.Schema(
    {
        attempt: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attempt",
            required: true,
            unique: true
        },
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
        totalMarks: {
            type: Number,
            required: true,
            min: 0
        },
        obtainedMarks: {
            type: Number,
            required: true
        },
        percentage: {
            type: Number,
            required: true,
            min: 0,
            max: 100
        },
        correctAnswers: {
            type: Number,
            required: true,
            min: 0
        },
        incorrectAnswers: {
            type: Number,
            required: true,
            min: 0
        },
        unanswered: {
            type: Number,
            required: true,
            min: 0
        },
        passed: {
            type: Boolean,
            required: true
        },
        submittedAt: {
            type: Date,
            required: true
        }
    },
    { timestamps: true }
);

resultSchema.index({ student: 1, submittedAt: -1 });
resultSchema.index({ test: 1, submittedAt: -1 });

export const Result = mongoose.model("Result", resultSchema);
