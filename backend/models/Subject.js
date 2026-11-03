import mongoose from "mongoose";

const subjectSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            minlength: 2,
            maxlength: 120
        },
        normalizedName: {
            type: String,
            required: true,
            select: false
        },
        code: {
            type: String,
            required: true,
            trim: true,
            uppercase: true,
            minlength: 2,
            maxlength: 20
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required: true,
            index: true
        },
        isActive: {
            type: Boolean,
            default: true,
            required: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

subjectSchema.pre("validate", function normalizeSubjectName() {
    if (this.name) {
        this.normalizedName = this.name.trim().toLocaleLowerCase("en");
    }
    if (this.code) {
        this.code = this.code.trim().toUpperCase();
    }
});

subjectSchema.index({ createdBy: 1, branch: 1, code: 1 }, { unique: true });
subjectSchema.index({ createdBy: 1, branch: 1, normalizedName: 1 }, { unique: true });
subjectSchema.index({ isActive: 1, branch: 1 });
subjectSchema.index({ createdBy: 1 });

export const Subject = mongoose.model("Subject", subjectSchema);
