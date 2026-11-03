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
        textResponse: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: ""
        },
        feedback: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        },
        marksAwarded: {
            type: Number,
            default: null
        },
        evaluationStatus: {
            type: String,
            enum: ["PENDING", "EVALUATED"],
            default: "PENDING",
            required: true
        }
    },
    { timestamps: true }
);

answerSchema.index({ attempt: 1, question: 1 }, { unique: true });

export const Answer = mongoose.model("Answer", answerSchema);
