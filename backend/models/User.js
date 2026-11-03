import mongoose from "mongoose";
import {
    createLookupHash,
    createNameSearchTokens,
    decryptField,
    encryptField
} from "../utils/fieldEncryption.js";

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
            minlength: 3,
            maxlength: 30,
            required() {
                return this.role === "student";
            }
        },
        username: {
            type: String,
            required: true,
            minlength: 3,
            maxlength: 32
        },
        email: {
            type: String,
            required: true,
            maxlength: 254
        },
        mobile: {
            type: String,
            maxlength: 30,
            default: ""
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
        institutionKey: {
            type: String,
            required: true,
            select: false
        },
        emailLookup: {
            type: String,
            select: false
        },
        usernameLookup: {
            type: String,
            select: false
        },
        mobileLookup: {
            type: String,
            select: false
        },
        studentIdLookup: {
            type: String,
            select: false
        },
        teacherIdLookup: {
            type: String,
            select: false
        },
        nameSearchTokens: {
            type: [String],
            select: false
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
            match: /^[A-Z0-9][A-Z0-9_-]{2,39}$/,
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

const encryptedFields = ["name", "studentId", "username", "email", "mobile", "teacherId"];

userSchema.post("init", function decryptProfileFields(user) {
    for (const field of encryptedFields) {
        if (typeof user[field] === "string") user[field] = decryptField(user[field]);
    }
});

userSchema.pre("save", function encryptProfileFields() {
    this.name = this.name.trim();
    this.username = this.username.trim().toLowerCase();
    this.email = this.email.trim().toLowerCase();
    this.mobile = this.mobile.trim();
    if (this.studentId) this.studentId = this.studentId.trim().toUpperCase();
    if (this.teacherId) this.teacherId = this.teacherId.trim().toUpperCase();
    this.nameSearchTokens = createNameSearchTokens(this.name);
    this.emailLookup = createLookupHash(this.email);
    this.usernameLookup = createLookupHash(this.username);
    this.mobileLookup = createLookupHash(this.mobile);
    if (this.studentId) this.studentIdLookup = createLookupHash(this.studentId);
    if (this.teacherId) this.teacherIdLookup = createLookupHash(this.teacherId);
    for (const field of encryptedFields) {
        if (typeof this[field] === "string") this[field] = encryptField(this[field]);
    }
});

userSchema.post("save", function decryptSavedProfileFields(user) {
    for (const field of encryptedFields) {
        if (typeof user[field] === "string") user[field] = decryptField(user[field]);
    }
});

userSchema.index(
    { teacherIdLookup: 1 },
    {
        name: "teacherIdLookup_1",
        unique: true,
        partialFilterExpression: {
            role: "teacher",
            teacherIdLookup: { $type: "string" }
        }
    }
);
userSchema.index(
    { institutionKey: 1, studentIdLookup: 1 },
    {
        name: "institutionKey_1_studentIdLookup_1",
        unique: true,
        partialFilterExpression: {
            role: "student",
            studentIdLookup: { $type: "string" }
        }
    }
);
userSchema.index(
    { usernameLookup: 1 },
    {
        name: "usernameLookup_1",
        unique: true,
        partialFilterExpression: { usernameLookup: { $type: "string" } }
    }
);
userSchema.index(
    { emailLookup: 1 },
    {
        name: "emailLookup_1",
        unique: true,
        partialFilterExpression: { emailLookup: { $type: "string" } }
    }
);
userSchema.index({ role: 1, branch: 1, accountStatus: 1 });

export const User = mongoose.model("User", userSchema);
