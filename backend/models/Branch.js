import mongoose from "mongoose";

const branchSchema = new mongoose.Schema(
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
        institutionKey: {
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
            maxlength: 12
        },
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
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

branchSchema.pre("validate", function normalizeBranchName() {
    if (this.name) {
        this.normalizedName = this.name.trim().toLocaleLowerCase("en");
    }
    if (this.code) {
        this.code = this.code.trim().toUpperCase();
    }
});

branchSchema.index({ institutionKey: 1, code: 1 }, { unique: true });
branchSchema.index({ institutionKey: 1, normalizedName: 1 }, { unique: true });
branchSchema.index({ isActive: 1, name: 1 });
branchSchema.index({ createdBy: 1 });

export const Branch = mongoose.model("Branch", branchSchema);
