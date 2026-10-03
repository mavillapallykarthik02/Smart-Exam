import mongoose from "mongoose";

export const QUESTION_TYPES = Object.freeze(["MCQ", "TYPING"]);

const optionSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 1,
            maxlength: 2
        },
        text: {
            type: String,
            required: true,
            trim: true,
            maxlength: 2000
        }
    },
    { _id: false }
);

const questionSchema = new mongoose.Schema(
    {
        test: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Test",
            required: true
        },
        position: {
            type: Number,
            required: true,
            min: 1
        },
        questionType: {
            type: String,
            enum: QUESTION_TYPES,
            required: true
        },
        text: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 10000
        },
        options: {
            type: [optionSchema],
            default: []
        },
        correctAnswer: {
            type: String,
            trim: true,
            maxlength: 2000,
            default: ""
        },
        expectedAnswer: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: ""
        },
        marks: {
            type: Number,
            required: true,
            min: 0.01,
            max: 100000
        },
        negativeMarks: {
            type: Number,
            min: 0,
            max: 100000,
            default: 0
        },
        explanation: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        }
    },
    { timestamps: true }
);

questionSchema.index({ test: 1, position: 1 }, { unique: true });
questionSchema.index({ test: 1, createdAt: 1 });

export const Question = mongoose.model("Question", questionSchema);
