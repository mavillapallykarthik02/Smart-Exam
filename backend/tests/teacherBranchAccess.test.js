import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "teacher-branch-access-integration-secret";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let mongoose;
let app;
let User;
let Branch;
let institution;
let institutionKey;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [application, database, mongooseModule, userModule, branchModule, institutionModule] =
        await Promise.all([
            import("../app.js"),
            import("../config/database.js"),
            import("mongoose"),
            import("../models/User.js"),
            import("../models/Branch.js"),
            import("../config/institution.js")
        ]);
    app = application.default;
    mongoose = mongooseModule.default;
    User = userModule.User;
    Branch = branchModule.Branch;
    institution = institutionModule.INSTITUTION;
    institutionKey = institutionModule.INSTITUTION_KEY;
    await database.connectDatabase();
});

after(async () => {
    if (mongoose) await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
});

test("branch approval grants a teacher student management access to that branch", async () => {
    const anonymousSession = await request(app).get("/api/auth/me");
    assert.equal(anonymousSession.status, 200, JSON.stringify(anonymousSession.body));
    assert.equal(anonymousSession.body.data.user, null);

    const passwordHash = await bcrypt.hash("secure-test-password", 4);
    const collegeAdmin = await User.create({
        name: "College Admin",
        username: "branch-access-college-admin",
        email: "branch-access-college-admin@example.test",
        passwordHash,
        role: "admin",
        institution: institution.name,
        institutionKey,
        accountStatus: "active"
    });
    const branch = await Branch.create({
        name: "Branch Access Test",
        code: "BAT",
        institutionKey,
        createdBy: collegeAdmin._id,
        isActive: true
    });
    const branchAdmin = await User.create({
        name: "Branch Admin",
        username: "branch-access-admin",
        email: "branch-access-admin@example.test",
        passwordHash,
        role: "branch_admin",
        administratorId: "BRACCESS001",
        institution: institution.name,
        institutionKey,
        branch: branch._id,
        accountStatus: "active",
        verificationStatus: "APPROVED"
    });
    branch.branchAdministrator = branchAdmin._id;
    await branch.save();
    const archivedBranch = await Branch.create({
        name: "Archived Branch Access Test",
        code: "ABAT",
        institutionKey,
        createdBy: collegeAdmin._id,
        isActive: true,
        isArchived: true
    });
    const availableBranches = await request(app).get("/api/branches/available");
    assert.equal(availableBranches.status, 200, JSON.stringify(availableBranches.body));
    assert.equal(
        availableBranches.body.data.branches.some((item) => item.id === archivedBranch.id),
        false
    );

    await User.create({
        name: "Branch Access Teacher",
        username: "branch-access-teacher",
        email: "branch-access-teacher@example.test",
        passwordHash,
        role: "teacher",
        teacherId: "BRACCESST001",
        institution: institution.name,
        institutionKey,
        accountStatus: "active",
        verificationStatus: "APPROVED"
    });
    const student = await User.create({
        name: "Branch Access Student",
        username: "branch-access-student",
        email: "branch-access-student@example.test",
        passwordHash,
        role: "student",
        studentId: "24001-BAT-001",
        institution: institution.name,
        institutionKey,
        branch: branch._id,
        year: "1-1",
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1,
        accountStatus: "pending"
    });

    const teacher = request.agent(app);
    const branchAdministrator = request.agent(app);
    assert.equal((await teacher.post("/api/auth/teacher/login").send({
        identifier: "branch-access-teacher",
        password: "secure-test-password"
    })).status, 200);
    assert.equal((await branchAdministrator.post("/api/auth/branch_admin/login").send({
        identifier: "branch-access-admin",
        password: "secure-test-password"
    })).status, 200);

    const branchRequest = await teacher.post(`/api/branches/${branch.id}/request`);
    assert.equal(branchRequest.status, 201, JSON.stringify(branchRequest.body));
    assert.equal(branchRequest.body.data.request.status, "PENDING");
    const teacherRequests = await teacher.get("/api/branches/requests");
    assert.equal(teacherRequests.status, 200, JSON.stringify(teacherRequests.body));
    assert.equal(teacherRequests.body.data.requests.length, 1);
    assert.equal(teacherRequests.body.data.requests[0].branch.id, branch.id);
    const requestList = await branchAdministrator.get("/api/branch-admin/branch-requests");
    assert.equal(requestList.status, 200, JSON.stringify(requestList.body));
    assert.equal(requestList.body.data.requests.length, 1);
    assert.equal(requestList.body.data.requests[0].teacher.username, "branch-access-teacher");

    const review = await branchAdministrator.patch(
        `/api/branch-admin/branch-requests/${branchRequest.body.data.request.id}/status`
    ).send({ status: "APPROVED" });
    assert.equal(review.status, 200, JSON.stringify(review.body));

    const approvals = await teacher.get(
        `/api/teacher/students/approvals?status=pending&branch=${branch.id}`
    );
    assert.equal(approvals.status, 200, JSON.stringify(approvals.body));
    assert.equal(approvals.body.data.students[0].id, student.id);

    const approval = await teacher.patch(`/api/teacher/students/${student.id}/approve`).send({});
    assert.equal(approval.status, 200, JSON.stringify(approval.body));
    const managedStudents = await teacher.get(`/api/teacher/students?branch=${branch.id}`);
    assert.equal(managedStudents.status, 200, JSON.stringify(managedStudents.body));
    assert.equal(managedStudents.body.data.students[0].id, student.id);
});
