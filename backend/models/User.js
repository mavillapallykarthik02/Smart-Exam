import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100
        },
        studentId: {
            type: String,
            trim: true,
            uppercase: true,
            minlength: 3,
            maxlength: 30,
            required() {
                return this.role === "student";
            }
        },
        username: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            minlength: 3,
            maxlength: 32
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true,
            maxlength: 254
        },
        mobile: {
            type: String,
            required: true,
            trim: true,
            maxlength: 30
        },
        passwordHash: {
            type: String,
            required: true,
            select: false
        },
        role: {
            type: String,
            required: true,
            enum: ["student", "teacher"],
            immutable: true
        },
        institution: {
            type: String,
            required: true,
            trim: true,
            maxlength: 150
        },
        branch: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Branch",
            required() {
                return this.role === "student";
            }
        },
        year: {
            type: String,
            trim: true,
            maxlength: 20,
            required() {
                return this.role === "student";
            }
        },
        teacherId: {
            type: String,
            trim: true,
            uppercase: true,
            maxlength: 40,
            required() {
                return this.role === "teacher";
            }
        },
        accountStatus: {
            type: String,
            enum: ["active", "inactive", "suspended"],
            default: "active",
            required: true
        }
    },
    {
        timestamps: true,
        toJSON: {
            transform(_document, result) {
                delete result.passwordHash;
                delete result.__v;
                return result;
            }
        }
    }
);

userSchema.index(
    { teacherId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            role: "teacher",
            teacherId: { $type: "string" }
        }
    }
);
userSchema.index(
    { studentId: 1 },
    {
        unique: true,
        partialFilterExpression: {
            role: "student",
            studentId: { $type: "string" }
        }
    }
);
userSchema.index({ role: 1, branch: 1, accountStatus: 1, name: 1 });

export const User = mongoose.model("User", userSchema);
