import mongoose from "mongoose";

export const QUESTION_TYPES = Object.freeze(["DESCRIPTIVE", "MCQ"]);
export const QUESTION_CONTENT_METHODS = Object.freeze(["ENGLISH", "EQUATION", "DRAW"]);

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
        options: {
            type: [{
                key: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 5
                },
                text: {
                    type: String,
                    required: true,
                    trim: true,
                    maxlength: 2000
                }
            }],
            default: []
        },
        correctAnswer: {
            type: String,
            trim: true,
            default: ""
        },
        title: {
            type: String,
            trim: true,
            maxlength: 160,
            default: ""
        },
        instructions: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
        },
        contentMethods: {
            type: [String],
            enum: QUESTION_CONTENT_METHODS,
            validate: {
                validator: (methods) => methods.length > 0 && new Set(methods).size === methods.length,
                message: "Select at least one unique question content method."
            },
            default: ["ENGLISH"]
        },
        englishContent: {
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
        imageUrl: {
            type: String,
            trim: true,
            maxlength: 2048,
            default: ""
        },
        expectedAnswer: {
            type: String,
            trim: true,
            maxlength: 20000,
            default: ""
        },
        markingScheme: {
            type: String,
            trim: true,
            maxlength: 10000,
            default: ""
        },
        evaluationInstructions: {
            type: String,
            trim: true,
            maxlength: 5000,
            default: ""
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
