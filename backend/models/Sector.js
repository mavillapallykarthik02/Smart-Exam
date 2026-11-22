import mongoose from "mongoose";

const sectorSchema = new mongoose.Schema(
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
        description: {
            type: String,
            trim: true,
            maxlength: 1000,
            default: ""
        },
        isActive: {
            type: Boolean,
            default: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    },
    { timestamps: true }
);

sectorSchema.pre("validate", function normalizeSectorName() {
    this.normalizedName = this.name.trim().toLocaleLowerCase("en");
});

sectorSchema.index(
    { institutionKey: 1, normalizedName: 1 },
    { unique: true }
);

export const Sector = mongoose.model("Sector", sectorSchema);
