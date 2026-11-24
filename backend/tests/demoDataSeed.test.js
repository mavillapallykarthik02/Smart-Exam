import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "demo-data-seed-integration-test-secret";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let mongoose;
let User;
let Branch;
let Subject;
let ClassTeacherAssignment;
let TeacherAssignment;
let TeacherBranchRequest;
let seedDemoData;
let demoPassword;
let demoBatch;
let institution;
let institutionKey;
let createLookupHash;
let authenticateUser;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [
        mongooseModule,
        userModule,
        branchModule,
        subjectModule,
        classAssignmentModule,
        teacherAssignmentModule,
        teacherRequestModule,
        seedModule,
        institutionModule,
        database,
        encryptionModule,
        authService
    ] = await Promise.all([
        import("mongoose"),
        import("../models/User.js"),
        import("../models/Branch.js"),
        import("../models/Subject.js"),
        import("../models/ClassTeacherAssignment.js"),
        import("../models/TeacherAssignment.js"),
        import("../models/TeacherBranchRequest.js"),
        import("../scripts/seedDemoData.js"),
        import("../config/institution.js"),
        import("../config/database.js"),
        import("../utils/fieldEncryption.js"),
        import("../services/authService.js")
    ]);
    mongoose = mongooseModule.default;
    User = userModule.User;
    Branch = branchModule.Branch;
    Subject = subjectModule.Subject;
    ClassTeacherAssignment = classAssignmentModule.ClassTeacherAssignment;
    TeacherAssignment = teacherAssignmentModule.TeacherAssignment;
    TeacherBranchRequest = teacherRequestModule.TeacherBranchRequest;
    seedDemoData = seedModule.seedDemoData;
    demoPassword = seedModule.DEMO_PASSWORD;
    demoBatch = seedModule.DEMO_BATCH;
    institution = institutionModule.INSTITUTION;
    institutionKey = institutionModule.INSTITUTION_KEY;
    createLookupHash = encryptionModule.createLookupHash;
    authenticateUser = authService.authenticateUser;
    await database.connectDatabase();
    await User.create({
        name: "Demo Seed Test Administrator",
        username: "demo-seed-test-admin",
        email: "demo-seed-test-admin@example.test",
        passwordHash: await bcrypt.hash("test-admin-password", 4),
        role: "admin",
        institution: institution.name,
        institutionKey,
        accountStatus: "active"
    });
});

after(async () => {
    if (mongoose) await mongoose.disconnect();
    if (memoryServer) await memoryServer.stop();
});

test("demo seeding creates six mapped branches and remains safe to rerun", async () => {
    await seedDemoData();
    await seedDemoData();

    assert.equal(await Branch.countDocuments({ institutionKey }), 6);
    assert.equal(await Subject.countDocuments(), 6);
    assert.equal(await User.countDocuments({ role: "branch_admin" }), 6);
    assert.equal(await User.countDocuments({ role: "teacher" }), 30);
    assert.equal(await User.countDocuments({ role: "student" }), 60);
    assert.equal(await TeacherBranchRequest.countDocuments({ status: "APPROVED" }), 30);
    assert.equal(await TeacherAssignment.countDocuments({ isActive: true }), 30);
    assert.equal(await ClassTeacherAssignment.countDocuments({ isActive: true }), 30);

    const branch = await Branch.findOne({ code: "DCS" });
    const teacher = await User.findOne({
        usernameLookup: createLookupHash("dcs.teacher01")
    }).select("+passwordHash");
    const students = await User.find({
        role: "student",
        branch: branch._id,
        academicBatch: demoBatch,
        studyYear: 1,
        semester: 1
    });
    assert.equal(students.length, 2);
    assert.equal(teacher.staffRole, "class_teacher");
    assert.equal(await bcrypt.compare(demoPassword, teacher.passwordHash), true);

    const approvedStudents = await User.find({
        role: "student",
        accountStatus: "approved"
    }).select("branch academicBatch studyYear semester");
    const studentsPerCohort = new Map();
    for (const student of approvedStudents) {
        const key = [
            student.branch.toString(),
            student.academicBatch,
            student.studyYear,
            student.semester
        ].join(":");
        studentsPerCohort.set(key, (studentsPerCohort.get(key) || 0) + 1);
    }

    const classAssignments = await ClassTeacherAssignment.find()
        .populate("teacher", "staffRole");
    for (const assignment of classAssignments) {
        const key = [
            assignment.branch.toString(),
            assignment.academicBatch,
            assignment.studyYear,
            assignment.semester
        ].join(":");
        assert.equal(studentsPerCohort.get(key), 2);
        assert.equal(assignment.teacher.staffRole, "class_teacher");
    }
    assert.equal(
        (await authenticateUser("student", "dcs.student01", demoPassword)).user.role,
        "student"
    );
});
