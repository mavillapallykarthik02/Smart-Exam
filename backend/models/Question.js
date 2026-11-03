import mongoose from "mongoose";

export const QUESTION_TYPES = Object.freeze(["DESCRIPTIVE"]);

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
            required: true,
            default: "DESCRIPTIVE"
        },
        text: {
            type: String,
            required: true,
            trim: true,
            minlength: 1,
            maxlength: 10000
        },
        marks: {
            type: Number,
            required: true,
            min: 0.01,
            max: 100000
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
