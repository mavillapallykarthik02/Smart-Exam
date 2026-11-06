import mongoose from "mongoose";

const institutionConfigurationSchema = new mongoose.Schema(
    {
        key: {
            type: String,
            required: true,
            unique: true,
            immutable: true,
            default: "target"
        },
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150,
            default: "Government Polytechnic, Mahabubnagar"
        },
        instituteCode: {
            type: String,
            trim: true,
            maxlength: 30,
            default: ""
        },
        collegeCode: {
            type: String,
            trim: true,
            maxlength: 30,
            default: ""
        },
        location: {
            type: String,
            trim: true,
            maxlength: 200,
            default: ""
        },
        affiliation: {
            type: String,
            trim: true,
            maxlength: 150,
            default: "SBTET Telangana"
        },
        verificationStatus: {
            type: String,
            enum: ["PENDING", "VERIFIED"],
            default: "PENDING",
            required: true
        },
        sourceUrl: {
            type: String,
            trim: true,
            maxlength: 2048,
            default: ""
        },
        sourceTitle: {
            type: String,
            trim: true,
            maxlength: 300,
            default: ""
        },
        lastVerifiedAt: {
            type: Date,
            default: null
        },
        updatedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            default: null
        }
    },
    { timestamps: true }
);

export const InstitutionConfiguration = mongoose.model(
    "InstitutionConfiguration",
    institutionConfigurationSchema
);
