import mongoose from "mongoose";

const answerSchema = new mongoose.Schema(
    {
        attempt: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Attempt",
            required: true
        },
        question: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Question",
            required: true
        },
        selectedOption: {
            type: String,
            trim: true,
            uppercase: true,
            default: ""
        },
        textResponse: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: ""
        },
        marksAwarded: {
            type: Number,
            default: null
        },
        isCorrect: {
            type: Boolean,
            default: null
        },
        evaluationStatus: {
            type: String,
            enum: ["PENDING", "EVALUATED", "NOT_AUTO_GRADED"],
            default: "PENDING",
            required: true
        }
    },
    { timestamps: true }
);

answerSchema.index({ attempt: 1, question: 1 }, { unique: true });

export const Answer = mongoose.model("Answer", answerSchema);
