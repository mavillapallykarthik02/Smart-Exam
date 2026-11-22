import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "branch-deletion-integration-test-secret";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let mongoose;
let app;
let User;
let Branch;
let Subject;
let institution;
let institutionKey;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [application, database, mongooseModule, userModule, branchModule, subjectModule, institutionModule] =
        await Promise.all([
            import("../app.js"),
            import("../config/database.js"),
            import("mongoose"),
            import("../models/User.js"),
            import("../models/Branch.js"),
            import("../models/Subject.js"),
            import("../config/institution.js")
        ]);
    app = application.default;
    mongoose = mongooseModule.default;
    User = userModule.User;
    Branch = branchModule.Branch;
    Subject = subjectModule.Subject;
    institution = institutionModule.INSTITUTION;
    institutionKey = institutionModule.INSTITUTION_KEY;
    await database.connectDatabase();
});

after(async () => {
    if (mongoose) await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
});

test("college admins can permanently delete unreferenced branches but not branches with academic records", async () => {
    const admin = await User.create({
        name: "College Administrator",
        username: "branchdeleteadmin",
        email: "branchdeleteadmin@example.test",
        mobile: "",
        passwordHash: await bcrypt.hash("branch-delete-password", 4),
        role: "admin",
        institution: institution.name,
        institutionKey,
        accountStatus: "active"
    });
    const adminSession = request.agent(app);
    const login = await adminSession.post("/api/auth/admin/login").send({
        identifier: "branchdeleteadmin",
        password: "branch-delete-password"
    });
    assert.equal(login.status, 200, JSON.stringify(login.body));

    const unreferencedBranch = await Branch.create({
        name: "Unreferenced Branch",
        code: "UNREF",
        institutionKey,
        createdBy: admin.id
    });
    const unauthenticatedDelete = await request(app)
        .delete(`/api/admin/branches/${unreferencedBranch.id}`);
    assert.equal(unauthenticatedDelete.status, 401);

    const deleted = await adminSession.delete(`/api/admin/branches/${unreferencedBranch.id}`);
    assert.equal(deleted.status, 200, JSON.stringify(deleted.body));
    assert.equal(await Branch.exists({ _id: unreferencedBranch.id }), null);

    const referencedBranch = await Branch.create({
        name: "Referenced Branch",
        code: "REFBR",
        institutionKey,
        createdBy: admin.id
    });
    await Subject.create({
        name: "Linked Subject",
        code: "LINK",
        branch: referencedBranch.id,
        createdBy: admin.id
    });

    const blockedDelete = await adminSession.delete(`/api/admin/branches/${referencedBranch.id}`);
    assert.equal(blockedDelete.status, 409, JSON.stringify(blockedDelete.body));
    assert.match(blockedDelete.body.message, /academic records/u);
    assert.ok(await Branch.exists({ _id: referencedBranch.id }));
});