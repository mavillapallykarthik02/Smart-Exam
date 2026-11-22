import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "branch-admin-integration-test-secret";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let mongoose;
let User;
let Branch;
let registerUser;
let authenticateUser;
let institution;
let institutionKey;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [database, mongooseModule, userModule, branchModule, authService, institutionModule] =
        await Promise.all([
            import("../config/database.js"),
            import("mongoose"),
            import("../models/User.js"),
            import("../models/Branch.js"),
            import("../services/authService.js"),
            import("../config/institution.js")
        ]);
    mongoose = mongooseModule.default;
    User = userModule.User;
    Branch = branchModule.Branch;
    registerUser = authService.registerUser;
    authenticateUser = authService.authenticateUser;
    institution = institutionModule.INSTITUTION;
    institutionKey = institutionModule.INSTITUTION_KEY;
    await database.connectDatabase();
});

after(async () => {
    if (mongoose) await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
});

test("branch administrator registration remains pending and cannot log in", async () => {
    const collegeAdmin = await User.create({
        name: "College Administrator",
        username: "collegeadmin",
        email: "collegeadmin@example.test",
        passwordHash: await bcrypt.hash("college-admin-password", 4),
        role: "admin",
        institution: institution.name,
        institutionKey,
        accountStatus: "active"
    });
    const branch = await Branch.create({
        name: "Computer Engineering",
        code: "CM",
        institutionKey,
        createdBy: collegeAdmin._id,
        isActive: true
    });

    const registered = await registerUser("branch_admin", {
        name: "Pending Branch Admin",
        username: "pendingbranchadmin",
        email: "pendingbranchadmin@example.test",
        mobile: "9876543210",
        password: "secure-password",
        confirmPassword: "secure-password",
        institution: institution.name,
        branchId: branch.id,
        branchName: branch.name,
        branchCode: branch.code,
        administratorId: "BADMIN001",
        confirmAdministratorId: "BADMIN001"
    });

    assert.equal(registered.role, "branch_admin");
    assert.equal(registered.verificationStatus, "PENDING");
    assert.equal(registered.accountStatus, "pending");
    await assert.rejects(
        authenticateUser("branch_admin", "pendingbranchadmin", "secure-password"),
        /awaiting College Administrator approval/u
    );

    const stored = await User.findById(registered.id);
    assert.equal(stored.role, "branch_admin");
    assert.equal(stored.verificationStatus, "PENDING");
    assert.equal(stored.branch.toString(), branch.id);
});
