import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "password-recovery-integration-test-secret";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let mongoose;
let User;
let requestPasswordReset;
let resetPassword;
let institution;
let institutionKey;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [database, mongooseModule, userModule, authService, institutionModule] = await Promise.all([
        import("../config/database.js"),
        import("mongoose"),
        import("../models/User.js"),
        import("../services/authService.js"),
        import("../config/institution.js")
    ]);
    mongoose = mongooseModule.default;
    User = userModule.User;
    requestPasswordReset = authService.requestPasswordReset;
    resetPassword = authService.resetPassword;
    institution = institutionModule.INSTITUTION;
    institutionKey = institutionModule.INSTITUTION_KEY;
    await database.connectDatabase();
});

after(async () => {
    if (mongoose) await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
});

test("password reset emails carry a single-use token and passwords are re-hashed", async () => {
    const initialPassword = "initial-test-password";
    const user = await User.create({
        name: "Recovery Teacher",
        username: "recoveryteacher",
        email: "recoveryteacher@example.test",
        mobile: "1000000011",
        passwordHash: await bcrypt.hash(initialPassword, 4),
        role: "teacher",
        institution: institution.name,
        institutionKey,
        teacherId: "RESET001",
        departmentName: "Computer Science",
        branchName: "Computer Science",
        designation: "Lecturer"
    });

    let email;
    await requestPasswordReset("teacher", user.email, async (message) => {
        email = message;
    });
    assert.equal(email.to, user.email);
    const resetUrl = new URL(email.resetUrl);
    assert.equal(resetUrl.pathname, "/password-reset/teacher");
    const token = resetUrl.searchParams.get("token");
    assert.match(token, /^[\da-f]{64}$/u);

    const storedUser = await User.findById(user.id)
        .select("+passwordResetTokenHash +passwordResetExpires +passwordHash");
    assert.notEqual(storedUser.passwordResetTokenHash, token);
    assert.ok(storedUser.passwordResetExpires > new Date());

    await assert.rejects(
        resetPassword("student", token, "updated-test-password"),
        { statusCode: 400 }
    );
    await resetPassword("teacher", token, "updated-test-password");

    const updatedUser = await User.findById(user.id).select("+passwordHash");
    assert.notEqual(updatedUser.passwordHash, storedUser.passwordHash);
    assert.equal(await bcrypt.compare("updated-test-password", updatedUser.passwordHash), true);
    assert.equal(updatedUser.passwordResetTokenHash, undefined);
    await assert.rejects(
        resetPassword("teacher", token, "another-test-password"),
        { statusCode: 400 }
    );
});
