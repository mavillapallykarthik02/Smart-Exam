import mongoose from "mongoose";
import { QUESTION_CONTENT_METHODS } from "./Question.js";

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
            maxlength: 5,
            default: ""
        },
        textResponse: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: ""
        },
        selectedMethods: {
            type: [String],
            enum: QUESTION_CONTENT_METHODS,
            validate: {
                validator: (methods) => methods.length > 0 && new Set(methods).size === methods.length,
                message: "Select at least one unique answer method."
            },
            default: ["ENGLISH"]
        },
        englishResponse: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: ""
        },
        equationSource: {
            type: String,
            trim: true,
            maxlength: 20000,
            default: ""
        },
        equationEntries: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
        },
        drawingPages: {
            type: [mongoose.Schema.Types.Mixed],
            default: []
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
