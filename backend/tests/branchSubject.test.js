import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "branch-subject-integration-test-secret-32";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let app;
let mongoose;
let AttemptModel;
let BranchModel;
let ResultModel;
let UserModel;
let expireAttempts;
let migrateBranchInstitutions;
let migrateTeacherIds;
let migrateStudentIds;
let migrateUserEncryption;

const classAssignment = {
    academicBatch: "2024-2027",
    studyYear: 1,
    semester: 1
};

function activeExamWindow() {
    return {
        startAt: new Date(Date.now() - 5 * 60_000).toISOString(),
        endAt: new Date(Date.now() + 2 * 60 * 60_000).toISOString()
    };
}

function examWindowOffsets(startMinutes, endMinutes) {
    return {
        startAt: new Date(Date.now() + startMinutes * 60_000).toISOString(),
        endAt: new Date(Date.now() + endMinutes * 60_000).toISOString()
    };
}

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [{ default: application }, database, mongooseModule, attemptModule, branchModule, resultModule, attemptService, userModule, migrationModule, instituteMigrationModule, teacherIdMigrationModule, encryptionMigrationModule] = await Promise.all([
        import("../app.js"),
        import("../config/database.js"),
        import("mongoose"),
        import("../models/Attempt.js"),
        import("../models/Branch.js"),
        import("../models/Result.js"),
        import("../services/attemptService.js"),
        import("../models/User.js"),
        import("../scripts/migrateStudentIds.js"),
        import("../scripts/migrateBranchInstitutions.js"),
        import("../scripts/migrateTeacherIds.js"),
        import("../scripts/migrateUserEncryption.js")
    ]);
    app = application;
    mongoose = mongooseModule.default;
    AttemptModel = attemptModule.Attempt;
    BranchModel = branchModule.Branch;
    ResultModel = resultModule.Result;
    UserModel = userModule.User;
    expireAttempts = attemptService.expireDueAttempts;
    migrateStudentIds = migrationModule.migrateStudentIds;
    migrateBranchInstitutions = instituteMigrationModule.migrateBranchInstitutions;
    migrateTeacherIds = teacherIdMigrationModule.migrateTeacherIds;
    migrateUserEncryption = encryptionMigrationModule.migrateUserEncryption;
    await database.connectDatabase();
});

after(async () => {
    if (mongoose) {
        await mongoose.disconnect();
    }
    if (memoryServer) {
        await memoryServer.stop();
    }
});

test("authenticated teachers manage branches and subjects; students are read-only", async () => {
    assert.equal((await request(app).get("/api/branches")).status, 401);
    assert.equal((await request(app).post("/api/branches").send({
        name: "Unauthenticated",
        code: "NOAUTH"
    })).status, 401);

    const teacher = request.agent(app);
    const student = request.agent(app);
    const admin = request.agent(app);

    const teacherDetails = {
        name: "Test Teacher",
        username: "phase4teacher",
        email: "phase4teacher@example.test",
        mobile: "1000000001",
        password: "secure-test-password",
        institution: "Government Polytechnic, Masab Tank",
        departmentName: "Computer Science",
        branchName: "Computer Science and Engineering",
        designation: "Lecturer",
        teacherId: "P4T001",
        confirmTeacherId: "P4T001"
    };
    const studentDetails = {
        studentId: "24001-CSE-097",
        name: "Test Student",
        username: "phase4student",
        email: "phase4student@example.test",
        mobile: "1000000002",
        password: "secure-test-password",
        institution: "Government Polytechnic, Masab Tank",
    };

    const teacherRegistration = await teacher.post("/api/auth/teacher/register").send(teacherDetails);
    assert.equal(teacherRegistration.status, 201, JSON.stringify(teacherRegistration.body));
    assert.equal(teacherRegistration.headers["set-cookie"], undefined);
    assert.equal(teacherRegistration.body.data.user.teacherId, "P4T001");
    const storedTeacher = await UserModel.collection.findOne({
        _id: new mongoose.Types.ObjectId(teacherRegistration.body.data.user.id)
    });
    assert.match(storedTeacher.name, /^enc:v1:/u);
    assert.match(storedTeacher.email, /^enc:v1:/u);
    assert.match(storedTeacher.teacherId, /^enc:v1:/u);
    assert.notEqual(storedTeacher.passwordHash, teacherDetails.password);
    assert.match(storedTeacher.passwordHash, /^\$2[aby]\$/u);
    const mismatchedTeacherId = await request(app).post("/api/auth/teacher/register").send({
        ...teacherDetails,
        username: "mismatchedteacher",
        email: "mismatchedteacher@example.test",
        teacherId: "MISMATCH001",
        confirmTeacherId: "MISMATCH002"
    });
    assert.equal(mismatchedTeacherId.status, 400);
    const duplicateTeacherId = await request(app).post("/api/auth/teacher/register").send({
        ...teacherDetails,
        username: "duplicateteacherid",
        email: "duplicateteacherid@example.test"
    });
    assert.equal(duplicateTeacherId.status, 409);
    assert.equal(duplicateTeacherId.body.errors[0].field, "teacherId");
    await teacher.post("/api/auth/logout");
    const teacherLogin = await teacher.post("/api/auth/teacher/login").send({
        identifier: teacherDetails.username,
        password: teacherDetails.password
    });
    assert.equal(teacherLogin.status, 403);
    assert.match(teacherLogin.body.message, /waiting for administrator verification/u);
    assert.match(teacherLogin.headers["set-cookie"][0], /Expires=Thu, 01 Jan 1970/u);
    const verificationWithoutReason = await admin.patch(
        `/api/admin/teachers/${teacherRegistration.body.data.user.id}/verification`
    ).send({ verificationStatus: "REJECTED" });
    assert.equal(verificationWithoutReason.status, 400);
    const teacherVerification = await admin.patch(
        `/api/admin/teachers/${teacherRegistration.body.data.user.id}/verification`
    ).send({ verificationStatus: "APPROVED" });
    assert.equal(teacherVerification.status, 200, JSON.stringify(teacherVerification.body));
    const approvedTeacherLogin = await teacher.post("/api/auth/teacher/login").send({
        identifier: teacherDetails.username,
        password: teacherDetails.password
    });
    assert.equal(approvedTeacherLogin.status, 200, JSON.stringify(approvedTeacherLogin.body));
    assert.equal(approvedTeacherLogin.body.data.user.role, "teacher");
    assert.equal(approvedTeacherLogin.body.data.user.verificationStatus, "APPROVED");
    assert.equal("passwordHash" in approvedTeacherLogin.body.data.user, false);
    await teacher.post("/api/auth/logout");
    const teacherIdLogin = await teacher.post("/api/auth/teacher/login").send({
        identifier: "p4t001",
        password: teacherDetails.password
    });
    assert.equal(teacherIdLogin.status, 200, JSON.stringify(teacherIdLogin.body));
    assert.equal(teacherIdLogin.body.data.user.teacherId, "P4T001");
    const profileUpdate = await teacher.put("/api/auth/me").send({
        name: "Updated Test Teacher",
        role: "student",
        accountStatus: "inactive"
    });
    assert.equal(profileUpdate.status, 200, JSON.stringify(profileUpdate.body));
    assert.equal(profileUpdate.body.data.user.name, "Updated Test Teacher");
    assert.equal(profileUpdate.body.data.user.role, "teacher");
    assert.equal(profileUpdate.body.data.user.accountStatus, "active");
    assert.equal((await teacher.put("/api/auth/me").send({
        institution: "Another Polytechnic"
    })).status, 409);
    assert.equal((await teacher.put("/api/auth/me").send({
        teacherId: "CHANGED001"
    })).status, 400);
    assert.equal((await teacher.get("/api/teacher/profile")).body.data.user.teacherId, "P4T001");

    const branchResponse = await teacher.post("/api/branches").send({
        name: "Computer Science",
        code: "CSE",
        description: "Computer science and software engineering."
    });
    assert.equal(branchResponse.status, 201, JSON.stringify(branchResponse.body));
    assert.equal(branchResponse.body.success, true);
    const branchId = branchResponse.body.data.branch.id;
    await UserModel.create({
        name: "Integration Administrator",
        username: "integrationadmin",
        email: "integrationadmin@example.test",
        passwordHash: await bcrypt.hash("secure-admin-test-password", 12),
        role: "admin",
        institution: "Government Polytechnic, Masab Tank",
        institutionKey: "government polytechnic, masab tank"
    });
    const adminLogin = await admin.post("/api/auth/admin/login").send({
        identifier: "integrationadmin",
        password: "secure-admin-test-password"
    });
    assert.equal(adminLogin.status, 200, JSON.stringify(adminLogin.body));
    const targetInstitution = await admin.get("/api/admin/target-institution");
    assert.equal(targetInstitution.status, 200);
    assert.equal(targetInstitution.body.data.institution.name, "Government Polytechnic, Mahabubnagar");
    assert.equal(targetInstitution.body.data.institution.verificationStatus, "PENDING");
    assert.equal(targetInstitution.body.data.institution.collegeCode, "");
    assert.equal((await request(app).get("/api/admin/target-institution")).status, 401);
    assert.equal((await teacher.get("/api/admin/target-institution")).status, 403);
    const unverifiedInstitutionUpdate = await admin.put("/api/admin/target-institution")
        .send({ location: "Mahabubnagar, Telangana" });
    assert.equal(unverifiedInstitutionUpdate.status, 200);
    assert.equal(
        unverifiedInstitutionUpdate.body.data.institution.verificationStatus,
        "PENDING"
    );
    const verificationWithoutSource = await admin.put("/api/admin/target-institution")
        .send({ verificationStatus: "VERIFIED" });
    assert.equal(verificationWithoutSource.status, 400);
    const targetConfigWithUnknownField = await admin.put("/api/admin/target-institution")
        .send({ institutionKey: "another-tenant" });
    assert.equal(targetConfigWithUnknownField.status, 400);
    const verifiedTargetConfig = await admin.put("/api/admin/target-institution").send({
        name: "Government Polytechnic, Mahabubnagar",
        verificationStatus: "VERIFIED",
        sourceUrl: "https://example.test/college-record",
        sourceTitle: "Synthetic integration-test source",
        lastVerifiedAt: new Date().toISOString()
    });
    assert.equal(verifiedTargetConfig.status, 200, JSON.stringify(verifiedTargetConfig.body));
    const changedVerifiedIdentity = await admin.put("/api/admin/target-institution")
        .send({ location: "Mahabubnagar, Telangana, India" });
    assert.equal(changedVerifiedIdentity.status, 200);
    assert.equal(changedVerifiedIdentity.body.data.institution.verificationStatus, "PENDING");
    assert.equal(changedVerifiedIdentity.body.data.institution.lastVerifiedAt, null);
    const publicBranches = await request(app)
        .get("/api/branches/available?institution=Government%20Polytechnic%2C%20Masab%20Tank");
    assert.equal(publicBranches.status, 200);
    assert.deepEqual(
        publicBranches.body.data.branches.map((branch) => branch.id),
        [branchId]
    );
    assert.deepEqual(
        (await request(app).get("/api/branches/available?institution=Another%20Institute"))
            .body.data.branches,
        []
    );
    const studentEnrollment = await admin.post("/api/admin/student-enrollments").send({
        pin: studentDetails.studentId,
        branch: branchId,
        ...classAssignment
    });
    assert.equal(studentEnrollment.status, 201, JSON.stringify(studentEnrollment.body));
    assert.equal((await admin.post("/api/admin/student-enrollments").send({
        pin: studentDetails.studentId,
        branch: branchId,
        ...classAssignment
    })).status, 409);
    assert.equal((await admin.post("/api/admin/student-enrollments").send({
        pin: "24001-MATH-001",
        branch: branchId,
        ...classAssignment
    })).status, 400);
    for (const pin of ["24001-CSE-098", "24001-CSE-099", "24001-CSE-100"]) {
        const enrollment = await admin.post("/api/admin/student-enrollments").send({
            pin,
            branch: branchId,
            ...classAssignment
        });
        assert.equal(enrollment.status, 201, JSON.stringify(enrollment.body));
    }
    const semesterTwoEnrollment = await admin.post("/api/admin/student-enrollments").send({
        pin: "24001-CSE-102",
        branch: branchId,
        ...classAssignment,
        semester: 2
    });
    assert.equal(semesterTwoEnrollment.status, 201, JSON.stringify(semesterTwoEnrollment.body));

    const invalidBranchRegistration = await request(app)
        .post("/api/auth/student/register")
        .send({
            ...studentDetails,
            studentId: "24001-CSE-111",
            username: "invalidbranch",
            email: "invalidbranch@example.test"
        });
    assert.equal(invalidBranchRegistration.status, 400);
    const invalidStudentId = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        username: "invalidstudentid",
        email: "invalidstudentid@example.test",
        studentId: "bad id"
    });
    assert.equal(invalidStudentId.status, 400);

    const studentRegistration = await student.post("/api/auth/student/register").send(studentDetails);
    assert.equal(studentRegistration.status, 201, JSON.stringify(studentRegistration.body));
    assert.equal(studentRegistration.headers["set-cookie"], undefined);
    assert.equal(studentRegistration.body.data.user.branchId, branchId);
    assert.equal(studentRegistration.body.data.user.branch, "Computer Science");
    assert.equal(studentRegistration.body.data.user.studentId, "24001-CSE-097");
    assert.equal(studentRegistration.body.data.user.academicBatch, classAssignment.academicBatch);
    assert.equal(studentRegistration.body.data.user.studyYear, classAssignment.studyYear);
    assert.equal(studentRegistration.body.data.user.semester, classAssignment.semester);
    assert.equal(studentRegistration.body.data.user.accountStatus, "pending");
    const storedStudent = await UserModel.collection.findOne({
        _id: new mongoose.Types.ObjectId(studentRegistration.body.data.user.id)
    });
    assert.match(storedStudent.studentId, /^enc:v1:/u);
    assert.match(storedStudent.mobile, /^enc:v1:/u);
    const duplicateStudentId = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-cse-097",
        username: "differentstudent",
        email: "differentstudent@example.test"
    });
    assert.equal(duplicateStudentId.status, 409);
    assert.equal(duplicateStudentId.body.message, "Polytechnic PIN already exists.");
    const duplicateUsername = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-CSE-098",
        email: "different-email@example.test"
    });
    assert.equal(duplicateUsername.status, 409);
    assert.equal(duplicateUsername.body.errors[0].field, "username");
    assert.equal(duplicateUsername.body.errors[0].message, "This username is already taken.");
    const duplicateEmail = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-CSE-099",
        username: "differentusername"
    });
    assert.equal(duplicateEmail.status, 409);
    assert.equal(duplicateEmail.body.errors[0].field, "email");
    assert.equal(duplicateEmail.body.errors[0].message, "This email address is already registered.");
    const pendingStudentLogin = await student.post("/api/auth/student/login").send({
        identifier: studentDetails.email,
        password: studentDetails.password
    });
    assert.equal(pendingStudentLogin.status, 403);
    assert.match(pendingStudentLogin.body.message, /waiting for class incharge approval/u);
    const classInchargeAssignment = await admin.put("/api/admin/class-incharges").send({
        teacher: teacherRegistration.body.data.user.id,
        branch: branchId,
        ...classAssignment
    });
    assert.equal(classInchargeAssignment.status, 200, JSON.stringify(classInchargeAssignment.body));
    assert.equal(classInchargeAssignment.body.data.assignment.teacher.staffRole, "class_teacher");
    const secondTeacher = request.agent(app);
    const secondTeacherRegistration = await secondTeacher
        .post("/api/auth/teacher/register")
        .send({
            ...teacherDetails,
            username: "phase4teacher2",
            email: "phase4teacher2@example.test",
            teacherId: "P4T002",
            confirmTeacherId: "P4T002"
        });
    assert.equal(secondTeacherRegistration.status, 201);
    assert.equal((await admin.patch(
        `/api/admin/teachers/${secondTeacherRegistration.body.data.user.id}/verification`
    ).send({ verificationStatus: "APPROVED" })).status, 200);
    const secondClassIncharge = await admin.put("/api/admin/class-incharges").send({
        teacher: secondTeacherRegistration.body.data.user.id,
        branch: branchId,
        academicBatch: "2025-2028",
        studyYear: 1,
        semester: 1
    });
    assert.equal(secondClassIncharge.status, 200, JSON.stringify(secondClassIncharge.body));
    const unrelatedTeacher = request.agent(app);
    const unrelatedTeacherLogin = await unrelatedTeacher.post("/api/auth/teacher/login").send({
        identifier: "P4T002",
        password: teacherDetails.password
    });
    assert.equal(unrelatedTeacherLogin.status, 200);
    const crossClassApproval = await unrelatedTeacher.patch(
        `/api/teacher/students/${studentRegistration.body.data.user.id}/approve`
    ).send({});
    assert.equal(crossClassApproval.status, 404);
    const pendingApprovalList = await teacher.get("/api/teacher/students/approvals?status=pending");
    assert.equal(pendingApprovalList.status, 200, JSON.stringify(pendingApprovalList.body));
    assert.equal(pendingApprovalList.body.data.summary.pending, 1);
    assert.equal((await admin.get("/api/teacher/students/approvals")).status, 403);
    const approvedStudent = await teacher.patch(
        `/api/teacher/students/${studentRegistration.body.data.user.id}/approve`
    ).send({});
    assert.equal(approvedStudent.status, 200, JSON.stringify(approvedStudent.body));
    assert.equal(approvedStudent.body.data.student.accountStatus, "approved");
    const studentLogin = await student.post("/api/auth/student/login").send({
        identifier: studentDetails.email,
        password: studentDetails.password
    });
    assert.equal(studentLogin.status, 200, JSON.stringify(studentLogin.body));
    const initialConnections = await student.get("/api/student/connected-teachers");
    assert.equal(initialConnections.status, 200);
    assert.equal(initialConnections.body.data.connections.length, 0);
    assert.equal((await student.get("/api/student/profile")).status, 200);
    assert.equal((await student.get("/api/student/account-status")).body.data.accountStatus, "approved");
    const suspendedStudent = await teacher.patch(
        `/api/teacher/students/${studentRegistration.body.data.user.id}/suspend`
    ).send({ reason: "Identity verification required." });
    assert.equal(suspendedStudent.status, 200, JSON.stringify(suspendedStudent.body));
    assert.equal(suspendedStudent.body.data.student.accountStatus, "suspended");
    assert.equal((await student.get("/api/student/dashboard")).status, 403);
    const reactivatedStudent = await teacher.patch(
        `/api/teacher/students/${studentRegistration.body.data.user.id}/reactivate`
    ).send({});
    assert.equal(reactivatedStudent.status, 200, JSON.stringify(reactivatedStudent.body));
    assert.equal(reactivatedStudent.body.data.student.accountStatus, "approved");
    assert.equal((await student.get("/api/student/dashboard")).status, 200);
    const rejectedStudentDetails = {
        ...studentDetails,
        studentId: "24001-CSE-098",
        username: "rejectedstudent",
        email: "rejectedstudent@example.test"
    };
    const rejectedStudentRegistration = await request(app)
        .post("/api/auth/student/register")
        .send(rejectedStudentDetails);
    assert.equal(rejectedStudentRegistration.status, 201);
    const rejectedStudent = await teacher.patch(
        `/api/teacher/students/${rejectedStudentRegistration.body.data.user.id}/reject`
    ).send({ reason: "The submitted identity information does not match." });
    assert.equal(rejectedStudent.status, 200, JSON.stringify(rejectedStudent.body));
    assert.equal(rejectedStudent.body.data.student.accountStatus, "rejected");
    const rejectedStudentLogin = await request(app)
        .post("/api/auth/student/login")
        .send({
            identifier: rejectedStudentDetails.email,
            password: rejectedStudentDetails.password
        });
    assert.equal(rejectedStudentLogin.status, 403);
    assert.match(rejectedStudentLogin.body.message, /has been rejected/u);
    const noReasonRejection = await teacher.patch(
        `/api/teacher/students/${rejectedStudentRegistration.body.data.user.id}/reject`
    ).send({});
    assert.equal(noReasonRejection.status, 400);
    assert.equal((await student.post("/api/student/connect-teacher").send({
        teacherId: "UNKNOWN001"
    })).status, 404);
    const teacherConnection = await student.post("/api/student/connect-teacher").send({
        teacherId: "p4t001"
    });
    assert.equal(teacherConnection.status, 201, JSON.stringify(teacherConnection.body));
    assert.equal(teacherConnection.body.data.connection.teacher.name, "Updated Test Teacher");
    assert.equal(teacherConnection.body.data.connection.teacher.teacherId, "P4T001");
    assert.equal((await student.post("/api/student/connect-teacher").send({
        teacherId: "P4T001"
    })).status, 409);
    assert.equal(studentLogin.body.data.user.role, "student");
    assert.equal(studentLogin.body.data.user.studentId, "24001-CSE-097");
    const studentIdLogin = await request(app).post("/api/auth/student/login").send({
        identifier: "24001-CSE-097",
        password: studentDetails.password
    });
    assert.equal(studentIdLogin.status, 200, JSON.stringify(studentIdLogin.body));
    const protectedStudentIdUpdate = await student.put("/api/auth/me").send({
        studentId: "ALTERED2026"
    });
    assert.equal(protectedStudentIdUpdate.status, 400);
    assert.equal((await student.put("/api/auth/me").send({
        branch: "000000000000000000000001",
        academicBatch: "2025-2028",
        studyYear: 2,
        semester: 3
    })).status, 400);
    assert.equal((await student.get("/api/auth/me")).body.data.user.studentId, "24001-CSE-097");
    assert.equal((await student.post("/api/admin/student-enrollments").send({})).status, 403);

    const duplicateBranchCode = await teacher.post("/api/branches").send({
        name: "Information Technology",
        code: "CSE"
    });
    assert.equal(duplicateBranchCode.status, 409);
    assert.match(duplicateBranchCode.body.message, /already in use/u);

    const duplicateBranchName = await teacher.post("/api/branches").send({
        name: "computer science",
        code: "CS2"
    });
    assert.equal(duplicateBranchName.status, 409);
    assert.match(duplicateBranchName.body.message, /Select it instead of creating a duplicate/u);

    const updatedBranch = await teacher.put(`/api/branches/${branchId}`).send({
        name: "Computer Science and Engineering",
        code: "CSE",
        description: "Updated branch."
    });
    assert.equal(updatedBranch.status, 200);
    assert.equal(updatedBranch.body.data.branch.name, "Computer Science and Engineering");

    const deactivatedBranch = await teacher.patch(`/api/branches/${branchId}/status`)
        .send({ isActive: false });
    assert.equal(deactivatedBranch.body.data.branch.isActive, false);
    assert.equal((await request(app).get("/api/branches/available")).body.data.branches.length, 0);
    assert.equal((await student.get("/api/branches")).body.data.branches.length, 0);

    const reactivatedBranch = await teacher.patch(`/api/branches/${branchId}/status`)
        .send({ isActive: true });
    assert.equal(reactivatedBranch.body.data.branch.isActive, true);

    const badBranchStatus = await teacher.get("/api/branches/not-an-object-id");
    assert.equal(badBranchStatus.status, 400);
    const missingBranch = await teacher.get("/api/branches/000000000000000000000001");
    assert.equal(missingBranch.status, 404);

    const subjectResponse = await teacher.post("/api/subjects").send({
        name: "Programming Fundamentals",
        code: "CS101",
        description: "Introductory programming.",
        branch: branchId
    });
    assert.equal(subjectResponse.status, 201);
    const subjectId = subjectResponse.body.data.subject.id;
    assert.equal(subjectResponse.body.data.subject.branch.id, branchId);
    assert.equal(subjectResponse.body.data.subject.teacher.teacherId, "P4T001");
    const teacherAssignment = await admin.post("/api/admin/teacher-assignments").send({
        teacher: teacherRegistration.body.data.user.id,
        subject: subjectId,
        branch: branchId,
        ...classAssignment
    });
    assert.equal(teacherAssignment.status, 201, JSON.stringify(teacherAssignment.body));
    assert.equal((await teacher.post("/api/tests").send({
        ...classAssignment,
        ...activeExamWindow(),
        semester: 2,
        title: "Unassigned Class Test",
        branch: branchId,
        subject: subjectId,
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    })).status, 403);

    const duplicateSubject = await teacher.post("/api/subjects").send({
        name: "Programming Basics",
        code: "CS101",
        branch: branchId
    });
    assert.equal(duplicateSubject.status, 409);

    const missingSubjectBranch = await teacher.post("/api/subjects").send({
        name: "Orphan Subject",
        code: "ORPHAN",
        branch: "000000000000000000000001"
    });
    assert.equal(missingSubjectBranch.status, 404);

    const updatedSubject = await teacher.put(`/api/subjects/${subjectId}`).send({
        name: "Advanced Programming Fundamentals",
        code: "CS101",
        description: "Updated subject.",
        branch: branchId
    });
    assert.equal(updatedSubject.status, 200);
    assert.equal(updatedSubject.body.data.subject.name, "Advanced Programming Fundamentals");

    assert.equal((await teacher.get(`/api/branches/${branchId}/subjects`)).body.data.subjects.length, 1);
    assert.equal((await student.get(`/api/subjects?branch=${branchId}`)).body.data.subjects.length, 1);
    const branchSubjects = await student.get("/api/student/subjects");
    assert.equal(branchSubjects.status, 200);
    assert.equal(branchSubjects.body.data.subjects.length, 1);
    assert.equal(branchSubjects.body.data.subjects[0].teacher.teacherId, "P4T001");
    assert.equal((await student.get(`/api/student/subjects/${subjectId}`)).status, 200);

    const deactivatedSubject = await teacher.patch(`/api/subjects/${subjectId}/status`)
        .send({ isActive: false });
    assert.equal(deactivatedSubject.body.data.subject.isActive, false);
    assert.equal((await student.get(`/api/subjects?branch=${branchId}`)).body.data.subjects.length, 0);

    await teacher.patch(`/api/subjects/${subjectId}/status`).send({ isActive: true });
    assert.equal((await student.get("/api/branches")).body.data.branches.length, 1);

    const testResponse = await teacher.post("/api/tests").send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Phase 5 Integration Test",
        description: "Test-owned integration fixture.",
        branch: branchId,
        subject: subjectId,
        duration: 45,
        testType: "DESCRIPTIVE",
        totalQuestions: 2,
        totalMarks: 10,
        passingPercentage: 50,
        instructions: "Read each question carefully."
    });
    assert.equal(testResponse.status, 201, JSON.stringify(testResponse.body));
    const testId = testResponse.body.data.test.id;
    assert.equal(testResponse.body.data.test.status, "DRAFT");
    assert.equal((await student.get("/api/tests")).body.data.tests.length, 0);
    assert.equal((await student.get(`/api/tests/${testId}`)).status, 404);
    assert.equal((await student.get(`/api/tests/${testId}/questions`)).status, 403);

    const cannotPublishWithoutQuestions = await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "PUBLISHED" });
    assert.equal(cannotPublishWithoutQuestions.status, 409);

    const questionDetails = {
        questionType: "DESCRIPTIVE",
        text: "Explain the core concept.",
        marks: 5
    };
    const questionOne = await teacher.post(`/api/tests/${testId}/questions`)
        .send(questionDetails);
    assert.equal(questionOne.status, 201, JSON.stringify(questionOne.body));
    const questionOneId = questionOne.body.data.question.id;
    const invalidQuestion = await teacher.post(`/api/tests/${testId}/questions`)
        .send({
            ...questionDetails,
            questionType: "MCQ",
            options: [
                { key: "A", text: "Option A" },
                { key: "B", text: "Option B" }
            ],
            correctAnswer: "A"
        });
    assert.equal(invalidQuestion.status, 400);
    const typingQuestionDetails = {
        questionType: "DESCRIPTIVE",
        text: "Explain the concept with an example.",
        marks: 5
    };
    const questionTwo = await teacher.post(`/api/tests/${testId}/questions`)
        .send(typingQuestionDetails);
    assert.equal(questionTwo.status, 201);
    const questionTwoId = questionTwo.body.data.question.id;
    const updateQuestion = await teacher.put(`/api/tests/${testId}/questions/${questionTwoId}`)
        .send({ ...typingQuestionDetails, text: "Updated question text" });
    assert.equal(updateQuestion.status, 200);
    assert.equal((await teacher.get(`/api/tests/${testId}/questions`)).body.data.questions.length, 2);

    const reordered = await teacher.patch(`/api/tests/${testId}/questions/order`)
        .send({ questions: [
            { questionId: questionTwoId, position: 1 },
            { questionId: questionOneId, position: 2 }
        ] });
    assert.equal(reordered.status, 200, JSON.stringify(reordered.body));
    assert.equal(reordered.body.data.questions[0].id, questionTwoId);

    const invalidTestAssignment = await teacher.post("/api/tests").send({
        title: "Invalid Assignment",
        branch: branchId,
        subject: "000000000000000000000001",
        duration: 20,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(invalidTestAssignment.status, 400);

    const publishedTest = await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "PUBLISHED" });
    assert.equal(publishedTest.status, 200, JSON.stringify(publishedTest.body));
    assert.ok(publishedTest.body.data.test.publishedAt);
    assert.equal((await student.get("/api/tests")).body.data.tests.length, 1);
    assert.equal((await student.get(`/api/tests/${testId}`)).body.data.test.id, testId);
    assert.equal((await student.get(`/api/tests/${testId}/questions`)).status, 403);

    await secondTeacher.post("/api/auth/teacher/login").send({
        identifier: "phase4teacher2",
        password: teacherDetails.password
    });
    const secondTeacherSubject = await secondTeacher.post("/api/subjects").send({
        name: "Programming Fundamentals",
        code: "CS101",
        branch: branchId
    });
    assert.equal(secondTeacherSubject.status, 201, JSON.stringify(secondTeacherSubject.body));
    assert.notEqual(secondTeacherSubject.body.data.subject.id, subjectId);
    assert.equal(secondTeacherSubject.body.data.subject.teacher.teacherId, "P4T002");
    assert.equal((await admin.post("/api/admin/teacher-assignments").send({
        teacher: secondTeacherRegistration.body.data.user.id,
        subject: subjectId,
        branch: branchId,
        ...classAssignment
    })).status, 403);
    const secondTeacherAssignment = await admin.post("/api/admin/teacher-assignments").send({
        teacher: secondTeacherRegistration.body.data.user.id,
        subject: secondTeacherSubject.body.data.subject.id,
        branch: branchId,
        ...classAssignment
    });
    assert.equal(secondTeacherAssignment.status, 201, JSON.stringify(secondTeacherAssignment.body));
    const secondTeacherSubjectList = await secondTeacher.get("/api/teacher/subjects");
    assert.equal(secondTeacherSubjectList.status, 200);
    assert.equal(secondTeacherSubjectList.body.data.subjects.length, 1);
    assert.equal(secondTeacherSubjectList.body.data.subjects[0].id, secondTeacherSubject.body.data.subject.id);
    const secondTeacherTest = await secondTeacher.post("/api/tests").send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Teacher Two Draft Test",
        branch: branchId,
        subject: secondTeacherSubject.body.data.subject.id,
        duration: 20,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(secondTeacherTest.status, 201, JSON.stringify(secondTeacherTest.body));
    assert.equal((await secondTeacher.get("/api/tests")).body.data.tests.length, 1);
    assert.equal((await secondTeacher.get(`/api/tests/${testId}`)).status, 404);
    assert.equal((await student.get("/api/student/subjects")).body.data.subjects.length, 2);
    const secondTeacherConnection = await student.post("/api/student/connect-teacher").send({
        teacherId: "P4T002"
    });
    assert.equal(secondTeacherConnection.status, 201, JSON.stringify(secondTeacherConnection.body));
    const connectedSubjectsAfterSecondTeacher = await student.get("/api/student/subjects");
    assert.equal(connectedSubjectsAfterSecondTeacher.body.data.subjects.length, 2);
    const secondSubjectDetails = await student.get(
        `/api/student/subjects/${secondTeacherSubject.body.data.subject.id}`
    );
    assert.equal(secondSubjectDetails.status, 200);
    assert.equal(secondSubjectDetails.body.data.subject.tests.length, 0);
    const disconnectedTeacher = await student.delete("/api/student/disconnect-teacher/P4T002");
    assert.equal(disconnectedTeacher.status, 200);
    assert.equal((await student.get("/api/student/subjects")).body.data.subjects.length, 2);
    assert.equal((await student.get(`/api/student/subjects/${secondTeacherSubject.body.data.subject.id}`))
        .status, 200);
    const reconnectedTeacher = await student.post("/api/student/connect-teacher").send({
        teacherId: "P4T002"
    });
    assert.equal(reconnectedTeacher.status, 201);
    assert.equal(
        reconnectedTeacher.body.data.connection.id,
        secondTeacherConnection.body.data.connection.id
    );
    const otherInstituteTeacher = request.agent(app);
    const otherInstituteRegistration = await otherInstituteTeacher
        .post("/api/auth/teacher/register")
        .send({
            ...teacherDetails,
            username: "otherinstituteteacher",
            email: "otherinstituteteacher@example.test",
            institution: "Another Polytechnic",
            teacherId: "P4T003",
            confirmTeacherId: "P4T003"
        });
    assert.equal(otherInstituteRegistration.status, 400);
    assert.deepEqual(
        (await request(app).get("/api/branches/available?institution=Another%20Polytechnic"))
            .body.data.branches,
        []
    );
    assert.equal((await otherInstituteTeacher.post("/api/auth/teacher/login").send({
        identifier: "otherinstituteteacher",
        password: teacherDetails.password
    })).status, 401);
    const crossInstituteStudent = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-CSE-103",
        username: "crossinstitutestudent",
        email: "crossinstitutestudent@example.test",
        institution: "Another Polytechnic",
        branch: branchId
    });
    assert.equal(crossInstituteStudent.status, 400);
    assert.equal((await secondTeacher.get(`/api/tests/${testId}`)).status, 404);
    const sharedBranches = await secondTeacher.get("/api/branches");
    assert.equal(sharedBranches.status, 200);
    assert.equal(
        sharedBranches.body.data.branches.find((branch) => branch.id === branchId).canManage,
        false
    );
    const emptyTeacherDashboard = await secondTeacher.get("/api/teacher/dashboard");
    assert.equal(emptyTeacherDashboard.status, 200);
    assert.equal(emptyTeacherDashboard.body.data.dashboard.branches, 1);
    assert.equal(emptyTeacherDashboard.body.data.dashboard.tests.total, 1);
    assert.equal(emptyTeacherDashboard.body.data.dashboard.results.attempts, 0);
    assert.equal((await secondTeacher.get("/api/teacher/students")).body.data.summary.totalStudents, 3);
    assert.equal((await secondTeacher.put(`/api/tests/${testId}`).send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Unauthorized edit",
        branch: branchId,
        subject: subjectId,
        duration: 20,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    })).status, 404);

    assert.equal((await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "DRAFT" })).status, 200);
    const updatedTest = await teacher.put(`/api/tests/${testId}`).send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Updated Phase 5 Test",
        description: "Updated fixture.",
        branch: branchId,
        subject: subjectId,
        duration: 50,
        testType: "DESCRIPTIVE",
        totalQuestions: 2,
        totalMarks: 10,
        passingPercentage: 45,
        instructions: "Updated instructions."
    });
    assert.equal(updatedTest.status, 200);
    assert.equal(updatedTest.body.data.test.totalQuestions, 2);
    assert.equal(updatedTest.body.data.test.status, "DRAFT");
    assert.equal((await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "PUBLISHED" })).status, 200);
    const attemptStart = await student.post("/api/attempts").send({ testId });
    assert.equal(attemptStart.status, 201, JSON.stringify(attemptStart.body));
    const attemptId = attemptStart.body.data.attempt.id;
    const attemptOwner = await AttemptModel.findById(attemptId).populate("student", "studentId");
    assert.equal(attemptOwner.student.id, studentLogin.body.data.user.id);
    assert.equal(attemptOwner.student.studentId, "24001-CSE-097");
    const attemptQuestions = attemptStart.body.data.attempt.questions;
    assert.equal(attemptQuestions.length, 2);
    assert.equal(
        Date.parse(attemptStart.body.data.attempt.expiresAt) -
            Date.parse(attemptStart.body.data.attempt.startedAt),
        50 * 60_000
    );
    const resumedAttempt = await student.post("/api/attempts").send({ testId });
    assert.equal(resumedAttempt.status, 201);
    assert.equal(resumedAttempt.body.data.attempt.id, attemptId);
    assert.equal((await request(app).get("/api/proctoring/events")).status, 401);
    assert.equal((await student.get("/api/proctoring/events")).status, 403);
    const recordedSecurityEvent = await student.post(
        `/api/attempts/${attemptId}/security-events`
    ).send({ eventType: "tabSwitch" });
    assert.equal(recordedSecurityEvent.status, 201, JSON.stringify(recordedSecurityEvent.body));
    assert.equal(recordedSecurityEvent.body.data.event.type, "tabSwitch");
    const storedAttempt = await AttemptModel.findById(attemptId);
    assert.equal(storedAttempt.securityEvents.length, 1);
    assert.equal(storedAttempt.securityEvents[0].type, "tabSwitch");
    assert.equal((await student.post(
        `/api/attempts/${attemptId}/security-events`
    ).send({ eventType: "not-an-event" })).status, 400);
    const proctoringDashboard = await teacher.get("/api/proctoring/events");
    assert.equal(proctoringDashboard.status, 200, JSON.stringify(proctoringDashboard.body));
    assert.equal(proctoringDashboard.body.data.dashboard.summary.activeAttempts, 1);
    assert.equal(proctoringDashboard.body.data.dashboard.summary.securityEvents, 1);
    assert.equal(proctoringDashboard.body.data.dashboard.incidents[0].id, attemptId);
    const unrelatedTeacherDashboard = await secondTeacher.get("/api/proctoring/events");
    assert.equal(unrelatedTeacherDashboard.status, 200);
    assert.equal(unrelatedTeacherDashboard.body.data.dashboard.incidents.length, 0);
    const storedRiskSummary = await teacher.get("/api/proctoring/risk-summary");
    assert.equal(storedRiskSummary.status, 200);
    assert.equal(storedRiskSummary.body.data.report.summary.totalEvents, 1);
    assert.equal("correctAnswer" in attemptQuestions[0], false);
    assert.equal("expectedAnswer" in attemptQuestions[0], false);
    assert.equal("explanation" in attemptQuestions[0], false);
    const firstQuestion = attemptQuestions.find((question) => question.id === questionOneId);
    const savedAnswer = await student.put(
        `/api/attempts/${attemptId}/answers/${firstQuestion.id}`
    ).send({ textResponse: "An explanation written by the student." });
    assert.equal(savedAnswer.status, 200, JSON.stringify(savedAnswer.body));
    const secondQuestion = attemptQuestions.find((question) => question.id === questionTwoId);
    const savedTypingAnswer = await student.put(
        `/api/attempts/${attemptId}/answers/${secondQuestion.id}`
    ).send({ textResponse: "A second descriptive response." });
    assert.equal(savedTypingAnswer.status, 200, JSON.stringify(savedTypingAnswer.body));
    assert.equal((await teacher.get(`/api/attempts/${attemptId}`)).status, 403);

    const otherStudent = request.agent(app);
    const otherStudentRegistration = await otherStudent.post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-CSE-100",
        username: "phase4student2",
        email: "phase4student2@example.test",
        mobile: "1000000003"
    });
    assert.equal(otherStudentRegistration.status, 201, JSON.stringify(otherStudentRegistration.body));
    const approvedOtherStudent = await teacher.patch(
        `/api/teacher/students/${otherStudentRegistration.body.data.user.id}/approve`
    ).send({});
    assert.equal(approvedOtherStudent.status, 200, JSON.stringify(approvedOtherStudent.body));
    await otherStudent.post("/api/auth/student/login").send({
        identifier: "24001-CSE-100",
        password: studentDetails.password
    });
    assert.equal((await otherStudent.post(
        `/api/attempts/${attemptId}/security-events`
    ).send({ eventType: "tabSwitch" })).status, 404);
    assert.equal((await otherStudent.get("/api/student/connected-teachers"))
        .body.data.connections.length, 0);
    assert.equal((await otherStudent.get("/api/tests")).body.data.tests.length, 1);
    assert.equal((await otherStudent.get(`/api/tests/${testId}`)).status, 200);
    assert.equal((await otherStudent.get("/api/student/subjects")).body.data.subjects.length, 2);
    assert.equal((await otherStudent.get(`/api/student/subjects/${subjectId}`)).status, 200);
    assert.equal((await otherStudent.get(`/api/attempts/${attemptId}`)).status, 404);
    const unconnectedAttempt = await otherStudent.post("/api/attempts").send({ testId });
    assert.equal(unconnectedAttempt.status, 201, JSON.stringify(unconnectedAttempt.body));
    assert.equal((await otherStudent.get(`/api/attempts/${unconnectedAttempt.body.data.attempt.id}`))
        .status, 200);

    const secondBranchResponse = await secondTeacher.post("/api/branches").send({
        name: "Mathematics",
        code: "MATH"
    });
    assert.equal(secondBranchResponse.status, 201, JSON.stringify(secondBranchResponse.body));
    const secondBranchId = secondBranchResponse.body.data.branch.id;
    const mathStudentEnrollment = await admin.post("/api/admin/student-enrollments").send({
        pin: "24001-MATH-097",
        branch: secondBranchId,
        ...classAssignment
    });
    assert.equal(mathStudentEnrollment.status, 201, JSON.stringify(mathStudentEnrollment.body));
    const otherBranchStudent = request.agent(app);
    const otherBranchRegistration = await otherBranchStudent.post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-MATH-097",
        username: "mathbranchstudent",
        email: "mathbranchstudent@example.test",
        mobile: "1000000004"
    });
    assert.equal(otherBranchRegistration.status, 201, JSON.stringify(otherBranchRegistration.body));
    assert.equal((await admin.put("/api/admin/class-incharges").send({
        teacher: teacherRegistration.body.data.user.id,
        branch: secondBranchId,
        ...classAssignment
    })).status, 200);
    assert.equal((await teacher.patch(
        `/api/teacher/students/${otherBranchRegistration.body.data.user.id}/approve`
    ).send({})).status, 200);
    await otherBranchStudent.post("/api/auth/student/login").send({
        identifier: "mathbranchstudent",
        password: studentDetails.password
    });
    assert.equal((await otherBranchStudent.get("/api/student/connected-teachers"))
        .body.data.connections.length, 0);
    assert.equal((await otherBranchStudent.get("/api/tests")).body.data.tests.length, 0);
    assert.equal((await otherBranchStudent.get(`/api/tests/${testId}`)).status, 404);
    assert.equal((await otherBranchStudent.post("/api/attempts").send({ testId })).status, 404);
    const otherSemesterStudent = request.agent(app);
    const otherSemesterRegistration = await otherSemesterStudent.post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "24001-CSE-102",
        username: "semester2student",
        email: "semester2student@example.test",
        mobile: "1000000005"
    });
    assert.equal(otherSemesterRegistration.status, 201, JSON.stringify(otherSemesterRegistration.body));
    assert.equal((await admin.put("/api/admin/class-incharges").send({
        teacher: teacherRegistration.body.data.user.id,
        branch: branchId,
        ...classAssignment,
        semester: 2
    })).status, 200);
    assert.equal((await teacher.patch(
        `/api/teacher/students/${otherSemesterRegistration.body.data.user.id}/approve`
    ).send({})).status, 200);
    await otherSemesterStudent.post("/api/auth/student/login").send({
        identifier: "semester2student",
        password: studentDetails.password
    });
    assert.equal((await otherSemesterStudent.get("/api/student/tests")).body.data.tests.length, 0);
    assert.equal((await otherSemesterStudent.get(`/api/tests/${testId}`)).status, 404);
    assert.equal((await otherSemesterStudent.post("/api/attempts").send({ testId })).status, 404);
    const secondTeacherBranches = await secondTeacher.get("/api/branches");
    assert.deepEqual(
        secondTeacherBranches.body.data.branches.map((branch) => branch.id).sort(),
        [branchId, secondBranchId].sort()
    );
    const teacherBranches = await teacher.get("/api/branches");
    assert.deepEqual(
        teacherBranches.body.data.branches.map((branch) => branch.id).sort(),
        [branchId, secondBranchId].sort()
    );
    assert.equal((await secondTeacher.put(`/api/branches/${branchId}`).send({
        name: "Unauthorized Branch Edit",
        code: "CSE"
    })).status, 404);

    const studentDashboard = await student.get("/api/student/dashboard");
    assert.equal(studentDashboard.status, 200, JSON.stringify(studentDashboard.body));
    assert.equal(studentDashboard.body.data.dashboard.availableTestsCount, 1);
    assert.equal(studentDashboard.body.data.dashboard.progress.completedTests, 0);
    const emptyStudentProgress = await student.get("/api/student/progress");
    assert.equal(emptyStudentProgress.status, 200);
    assert.equal(emptyStudentProgress.body.data.progress.completedTests, 0);
    assert.equal(emptyStudentProgress.body.data.progress.trend.length, 0);
    assert.equal((await student.get("/api/student/branches")).body.data.branches.length, 2);
    assert.equal((await student.get("/api/student/subjects")).body.data.subjects.length, 2);
    assert.equal((await student.get(`/api/subjects/${subjectId}`)).status, 200);
    assert.equal((await student.get(`/api/subjects?branch=${secondBranchId}`)).status, 404);
    assert.equal((await teacher.get("/api/teacher/dashboard")).body.data.dashboard.students.total, 3);
    const teacherStudents = await teacher.get("/api/teacher/students?search=phase4student&page=1&limit=1");
    assert.equal(teacherStudents.status, 200, JSON.stringify(teacherStudents.body));
    assert.equal(teacherStudents.body.data.pagination.totalResults, 1);
    assert.equal(teacherStudents.body.data.students.length, 1);
    assert.equal(teacherStudents.body.data.students[0].branchId, branchId);
    const studentIdSearch = await teacher.get("/api/teacher/students?search=24001-CSE-097");
    assert.equal(studentIdSearch.body.data.pagination.totalResults, 1);
    assert.equal(studentIdSearch.body.data.students[0].studentId, "24001-CSE-097");
    const studentBranchSearch = await teacher.get("/api/teacher/students?search=computer%20science");
    assert.equal(
        studentBranchSearch.body.data.pagination.totalResults,
        3,
        JSON.stringify(studentBranchSearch.body.data.students)
    );
    assert.equal((await teacher.get(`/api/teacher/students?branch=${secondBranchId}`))
        .body.data.pagination.totalResults, 0);
    assert.equal((await teacher.get("/api/teacher/students?status=suspended"))
        .body.data.pagination.totalResults, 0);
    assert.equal((await secondTeacher.get("/api/teacher/students")).body.data.pagination.totalResults, 3);
    assert.equal((await student.get("/api/teacher/dashboard")).status, 403);
    assert.equal((await teacher.get("/api/student/dashboard")).status, 403);

    const submittedAttempt = await student.post(`/api/attempts/${attemptId}/submit`);
    assert.equal(submittedAttempt.status, 200, JSON.stringify(submittedAttempt.body));
    assert.equal(submittedAttempt.body.data.attempt.status, "SUBMITTED");
    assert.equal((await student.post(
        `/api/attempts/${attemptId}/security-events`
    ).send({ eventType: "tabSwitch" })).status, 409);
    assert.equal((await student.get(`/api/attempts/${attemptId}`)).body.data.attempt.questions
        .find((question) => question.id === firstQuestion.id).response.textResponse,
    "An explanation written by the student.");
    assert.equal((await student.post("/api/attempts").send({ testId })).status, 409);
    assert.equal((await AttemptModel.findById(attemptId)).status, "SUBMITTED");
    const studentResults = await student.get("/api/results");
    assert.equal(studentResults.status, 200, JSON.stringify(studentResults.body));
    assert.equal(studentResults.body.data.results.length, 0);
    const pendingResults = await teacher.get("/api/results");
    assert.equal(pendingResults.body.data.results.length, 1);
    const resultId = pendingResults.body.data.results[0].id;
    assert.equal(pendingResults.body.data.results[0].evaluationStatus, "PENDING_EVALUATION");
    assert.equal((await student.get(`/api/results/${resultId}`)).status, 404);
    assert.equal((await teacher.post(`/api/results/${resultId}/publish`)).status, 409);
    assert.equal((await teacher.patch(`/api/results/${resultId}/answers/${firstQuestion.id}`)
        .send({ marksAwarded: 6 })).status, 400);
    assert.equal((await teacher.patch(`/api/results/${resultId}/answers/${firstQuestion.id}`)
        .send({ marksAwarded: 4, feedback: "Good explanation." })).status, 200);
    assert.equal((await teacher.patch(`/api/results/${resultId}/answers/${secondQuestion.id}`)
        .send({ marksAwarded: 3 })).status, 200);
    const publishedResult = await teacher.post(`/api/results/${resultId}/publish`);
    assert.equal(publishedResult.status, 200, JSON.stringify(publishedResult.body));
    assert.equal(publishedResult.body.data.result.obtainedMarks, 7);
    assert.equal(publishedResult.body.data.result.evaluationStatus, "PUBLISHED");
    const studentReview = await student.get(`/api/results/${resultId}`);
    assert.equal(studentReview.status, 200, JSON.stringify(studentReview.body));
    assert.equal(studentReview.body.data.result.student.studentId, "24001-CSE-097");
    assert.equal(studentReview.body.data.result.answers
        .find((answer) => answer.id === firstQuestion.id).marksAwarded, 4);
    assert.equal(studentReview.body.data.result.answers
        .find((answer) => answer.id === firstQuestion.id).feedback, "Good explanation.");
    assert.equal((await otherStudent.get(`/api/results/${resultId}`)).status, 404);
    assert.equal((await teacher.get(`/api/results/${resultId}`)).status, 200);
    assert.equal((await secondTeacher.get(`/api/results/${resultId}`)).status, 404);
    assert.equal((await otherStudent.get("/api/results")).body.data.results.length, 0);
    assert.equal((await ResultModel.find({ attempt: attemptId })).length, 1);
    const disconnectedFirstTeacher = await student.delete("/api/student/disconnect-teacher/P4T001");
    assert.equal(disconnectedFirstTeacher.status, 200);
    assert.equal((await student.get("/api/results")).body.data.results.length, 1);
    assert.equal((await student.get(`/api/results/${resultId}`)).status, 200);
    assert.equal((await student.get("/api/student/subjects")).body.data.subjects.length, 2);
    assert.equal((await student.get(`/api/student/subjects/${subjectId}`)).status, 200);
    const reconnectedFirstTeacher = await student.post("/api/student/connect-teacher").send({
        teacherId: "P4T001"
    });
    assert.equal(reconnectedFirstTeacher.status, 201);
    assert.equal((await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "DRAFT" })).status, 409);
    assert.equal((await teacher.put(`/api/tests/${testId}`).send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Changed after official attempt",
        branch: branchId,
        subject: subjectId,
        duration: 50,
        testType: "DESCRIPTIVE",
        totalQuestions: 2,
        totalMarks: 10
    })).status, 409);

    const timeoutTestResponse = await teacher.post("/api/tests").send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Server Deadline Integration Test",
        branch: branchId,
        subject: subjectId,
        duration: 1,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 2
    });
    assert.equal(timeoutTestResponse.status, 201);
    const timeoutTestId = timeoutTestResponse.body.data.test.id;
    const timeoutQuestionResponse = await teacher.post(`/api/tests/${timeoutTestId}/questions`)
        .send({
            ...questionDetails,
            text: "Server deadline test question",
            marks: 2,
        });
    assert.equal(timeoutQuestionResponse.status, 201);
    assert.equal((await teacher.patch(`/api/tests/${timeoutTestId}/status`)
        .send({ status: "PUBLISHED" })).status, 200);
    const timeoutAttemptResponse = await student.post("/api/attempts")
        .send({ testId: timeoutTestId });
    assert.equal(timeoutAttemptResponse.status, 201);
    const timeoutAttemptId = timeoutAttemptResponse.body.data.attempt.id;
    await AttemptModel.updateOne(
        { _id: timeoutAttemptId },
        { $set: { expiresAt: new Date(Date.now() - 1000) } }
    );
    assert.equal(await expireAttempts(), 1);
    const expiredAnswer = await student.put(
        `/api/attempts/${timeoutAttemptId}/answers/${timeoutQuestionResponse.body.data.question.id}`
    ).send({ textResponse: "Late response." });
    assert.equal(expiredAnswer.status, 409);
    assert.equal((await AttemptModel.findById(timeoutAttemptId)).status, "TIMED_OUT");
    assert.equal((await ResultModel.find({ attempt: timeoutAttemptId })).length, 1);
    assert.equal((await student.get("/api/results")).body.data.results.length, 1);
    const firstResultPage = await student.get("/api/results?page=1&limit=1");
    assert.equal(firstResultPage.body.data.results.length, 1);
    assert.equal(firstResultPage.body.data.pagination.totalPages, 1);
    assert.equal((await student.get("/api/results?page=0")).status, 400);
    assert.equal((await student.get("/api/results?status=PASSED")).body.data.results.length, 1);
    assert.equal((await student.get("/api/results?status=FAILED")).body.data.results.length, 0);
    assert.equal((await student.get("/api/results?search=Server%20Deadline"))
        .body.data.pagination.totalResults, 0);
    const teacherSearchResults = await teacher.get("/api/results?search=Test%20Student");
    assert.equal(teacherSearchResults.body.data.pagination.totalResults, 2);
    assert.equal(teacherSearchResults.body.data.summary.participantCount, 1);
    const studentIdResultSearch = await teacher.get("/api/results?search=24001-CSE-097");
    assert.equal(studentIdResultSearch.body.data.pagination.totalResults, 2);
    assert.equal(studentIdResultSearch.body.data.results[0].student.studentId, "24001-CSE-097");
    assert.equal((await student.get("/api/student/results")).body.data.results.length, 1);
    assert.equal((await otherStudent.get("/api/student/results")).body.data.results.length, 0);
    const dateSearch = await teacher.get(
        `/api/results?date=${new Date(studentIdResultSearch.body.data.results[0].submittedAt).toISOString().slice(0, 10)}`
    );
    assert.ok(dateSearch.body.data.pagination.totalResults >= 1);
    assert.equal((await teacher.get("/api/results?date=2026-02-30")).status, 400);
    assert.equal((await secondTeacher.get("/api/results")).body.data.pagination.totalResults, 0);

    const progress = await student.get("/api/progress");
    assert.equal(progress.status, 200, JSON.stringify(progress.body));
    assert.equal(progress.body.data.progress.testsAttempted, 1);
    assert.equal(progress.body.data.progress.averagePercentage, 70);
    assert.equal(progress.body.data.progress.subjectPerformance[0].attempts, 1);
    const studentProgress = await student.get("/api/student/progress");
    assert.equal(studentProgress.status, 200, JSON.stringify(studentProgress.body));
    assert.equal(studentProgress.body.data.progress.completedTests, 1);
    assert.equal(studentProgress.body.data.progress.averagePercentage, 70);
    assert.equal(studentProgress.body.data.progress.trend.length, 1);
    assert.equal((await teacher.get("/api/student/progress")).status, 403);
    assert.equal((await teacher.get("/api/progress")).status, 403);
    assert.equal((await otherStudent.get("/api/progress")).body.data.progress.testsAttempted, 0);

    const upcomingTestResponse = await teacher.post("/api/tests").send({
        ...classAssignment,
        ...examWindowOffsets(60, 120),
        title: "Scheduled Future Test",
        branch: branchId,
        subject: subjectId,
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(upcomingTestResponse.status, 201, JSON.stringify(upcomingTestResponse.body));
    const upcomingTestId = upcomingTestResponse.body.data.test.id;
    assert.equal((await teacher.post(`/api/tests/${upcomingTestId}/questions`).send({
        questionType: "DESCRIPTIVE",
        text: "Future test question",
        marks: 1
    })).status, 201);
    assert.equal((await teacher.patch(`/api/tests/${upcomingTestId}/status`)
        .send({ status: "PUBLISHED" })).status, 200);
    const upcomingStudentTest = (await student.get("/api/tests")).body.data.tests
        .find((test) => test.id === upcomingTestId);
    assert.equal(upcomingStudentTest.availability, "UPCOMING");
    assert.equal((await student.post("/api/attempts").send({ testId: upcomingTestId })).status, 409);

    const closedTestResponse = await teacher.post("/api/tests").send({
        ...classAssignment,
        ...examWindowOffsets(-120, -60),
        title: "Closed Scheduled Test",
        branch: branchId,
        subject: subjectId,
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(closedTestResponse.status, 201, JSON.stringify(closedTestResponse.body));
    const closedTestId = closedTestResponse.body.data.test.id;
    assert.equal((await teacher.post(`/api/tests/${closedTestId}/questions`).send({
        questionType: "DESCRIPTIVE",
        text: "Closed test question",
        marks: 1
    })).status, 201);
    assert.equal((await teacher.patch(`/api/tests/${closedTestId}/status`)
        .send({ status: "PUBLISHED" })).status, 200);
    const closedStudentTest = (await student.get("/api/tests")).body.data.tests
        .find((test) => test.id === closedTestId);
    assert.equal(closedStudentTest.availability, "CLOSED");
    assert.equal((await student.post("/api/attempts").send({ testId: closedTestId })).status, 409);

    const cappedWindow = examWindowOffsets(-5, 10);
    const cappedTestResponse = await teacher.post("/api/tests").send({
        ...classAssignment,
        ...cappedWindow,
        title: "Attempt Deadline Capped by Exam Window",
        branch: branchId,
        subject: subjectId,
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(cappedTestResponse.status, 201, JSON.stringify(cappedTestResponse.body));
    const cappedTestId = cappedTestResponse.body.data.test.id;
    assert.equal((await teacher.post(`/api/tests/${cappedTestId}/questions`).send({
        questionType: "DESCRIPTIVE",
        text: "Capped deadline question",
        marks: 1
    })).status, 201);
    assert.equal((await teacher.patch(`/api/tests/${cappedTestId}/status`)
        .send({ status: "PUBLISHED" })).status, 200);
    const cappedAttempt = await student.post("/api/attempts").send({ testId: cappedTestId });
    assert.equal(cappedAttempt.status, 201, JSON.stringify(cappedAttempt.body));
    assert.equal(
        new Date(cappedAttempt.body.data.attempt.expiresAt).getTime(),
        new Date(cappedWindow.endAt).getTime()
    );
    assert.equal((await teacher.delete(`/api/tests/${upcomingTestId}`)).status, 200);
    assert.equal((await teacher.delete(`/api/tests/${closedTestId}`)).status, 200);

    const historicalCounts = {
        attempts: await AttemptModel.countDocuments(),
        results: await ResultModel.countDocuments()
    };
    const legacyStudentId = new mongoose.Types.ObjectId();
    await UserModel.collection.insertOne({
        _id: legacyStudentId,
        name: "Legacy Student",
        username: "legacystudent",
        email: "legacystudent@example.test",
        mobile: "1000000004",
        passwordHash: "legacy-hash",
        role: "student",
        institution: "Government Polytechnic, Masab Tank",
        branch: new mongoose.Types.ObjectId(branchId),
        year: "1-1",
        accountStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const migrationResult = await migrateStudentIds({ currentYear: 2026 });
    const migratedStudent = await UserModel.findById(legacyStudentId);
    assert.equal(migrationResult.migrated, 1);
    assert.match(migratedStudent.studentId, /^CSE2026\d{3,}$/u);
    assert.deepEqual({
        attempts: await AttemptModel.countDocuments(),
        results: await ResultModel.countDocuments()
    }, historicalCounts);
    assert.equal((await migrateStudentIds({ currentYear: 2026 })).migrated, 0);

    assert.equal((await student.get("/api/tests?status=DRAFT")).body.data.tests.length, 3);
    assert.equal((await teacher.get("/api/tests?status=INVALID")).status, 400);
    assert.equal((await student.post("/api/tests").send({})).status, 403);
    assert.equal((await teacher.get("/api/tests/not-an-object-id")).status, 400);
    assert.equal((await teacher.delete(`/api/tests/${timeoutTestId}`)).status, 200);
    assert.equal((await teacher.delete(`/api/tests/${cappedTestId}`)).status, 200);
    assert.equal((await student.get("/api/tests")).body.data.tests.length, 1);
    assert.equal((await teacher.delete(`/api/tests/${testId}`)).status, 200);
    assert.equal((await teacher.get(`/api/tests/${testId}`)).body.data.test.status, "ARCHIVED");
    assert.equal((await student.get("/api/tests")).body.data.tests.length, 0);

    assert.equal((await student.post("/api/branches").send({ name: "Unauthorized", code: "NO" })).status, 403);
    assert.equal((await student.put(`/api/branches/${branchId}`).send({
        name: "Unauthorized",
        code: "CSE",
        description: ""
    })).status, 403);
    assert.equal((await student.patch(`/api/branches/${branchId}/status`).send({ isActive: false })).status, 403);
    assert.equal((await student.delete(`/api/branches/${branchId}`)).status, 403);
    assert.equal((await student.post("/api/subjects").send({
        name: "Unauthorized",
        code: "NO",
        branch: branchId
    })).status, 403);
    assert.equal((await student.put(`/api/subjects/${subjectId}`).send({
        name: "Unauthorized",
        code: "CS101",
        branch: branchId
    })).status, 403);
    assert.equal((await student.patch(`/api/subjects/${subjectId}/status`).send({ isActive: false })).status, 403);
    assert.equal((await student.delete(`/api/subjects/${subjectId}`)).status, 403);

    assert.equal((await teacher.get("/api/subjects/not-an-object-id")).status, 400);
    assert.equal((await teacher.get("/api/subjects/000000000000000000000001")).status, 404);
    const sharedBranchSubject = await secondTeacher.post("/api/subjects").send({
        name: "Discrete Mathematics",
        code: "CS102",
        branch: branchId
    });
    assert.equal(sharedBranchSubject.status, 201, JSON.stringify(sharedBranchSubject.body));
    const sharedSubjectAssignment = await admin.post("/api/admin/teacher-assignments").send({
        teacher: secondTeacherRegistration.body.data.user.id,
        subject: sharedBranchSubject.body.data.subject.id,
        branch: branchId,
        ...classAssignment
    });
    assert.equal(sharedSubjectAssignment.status, 201, JSON.stringify(sharedSubjectAssignment.body));
    const descriptiveTest = await secondTeacher.post("/api/tests").send({
        ...classAssignment,
        ...activeExamWindow(),
        title: "Descriptive Assessment",
        branch: branchId,
        subject: sharedBranchSubject.body.data.subject.id,
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 5
    });
    assert.equal(descriptiveTest.status, 201, JSON.stringify(descriptiveTest.body));
    const descriptiveQuestion = await secondTeacher.post(
        `/api/tests/${descriptiveTest.body.data.test.id}/questions`
    ).send({
        questionType: "DESCRIPTIVE",
        text: "Define a set.",
        marks: 5
    });
    assert.equal(descriptiveQuestion.status, 201, JSON.stringify(descriptiveQuestion.body));
    const invalidDescriptiveQuestion = await secondTeacher.post(
        `/api/tests/${descriptiveTest.body.data.test.id}/questions`
    ).send({
        questionType: "MCQ",
        text: "This test only allows descriptive responses.",
        options: [
            { key: "A", text: "Option A" },
            { key: "B", text: "Option B" }
        ],
        correctAnswer: "A",
        marks: 5
    });
    assert.equal(invalidDescriptiveQuestion.status, 400);
    assert.equal((await teacher.delete(`/api/branches/${branchId}`)).status, 200);
    assert.equal((await teacher.get(`/api/branches/${branchId}`)).body.data.branch.isActive, false);
    assert.equal((await teacher.delete(`/api/subjects/${subjectId}`)).status, 200);

    const legacyBranchId = new mongoose.Types.ObjectId();
    await BranchModel.collection.insertOne({
        _id: legacyBranchId,
        name: "Legacy Engineering",
        normalizedName: "legacy engineering",
        code: "LEGACY",
        description: "",
        isActive: true,
        createdBy: new mongoose.Types.ObjectId(teacherRegistration.body.data.user.id),
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const instituteMigration = await migrateBranchInstitutions();
    assert.equal(instituteMigration.migratedUsers, 1);
    assert.equal(instituteMigration.migratedBranches, 1);
    assert.equal(
        (await BranchModel.findById(legacyBranchId).select("+institutionKey")).institutionKey,
        "government polytechnic, masab tank"
    );
    assert.equal(
        (await UserModel.findById(legacyStudentId).select("+institutionKey")).institutionKey,
        "government polytechnic, masab tank"
    );

    await UserModel.collection.dropIndex("teacherIdLookup_1");
    await UserModel.collection.dropIndex("teacherId_1");
    const legacyTeacherIds = [
        new mongoose.Types.ObjectId(),
        new mongoose.Types.ObjectId()
    ];
    await UserModel.collection.insertMany(legacyTeacherIds.map((_id, index) => ({
        _id,
        role: "teacher",
        teacherId: "DUPLICATE",
        name: `Legacy Teacher ${index}`,
        username: `legacyteacher${index}`,
        email: `legacyteacher${index}@example.test`,
        mobile: "",
        institution: "Government Polytechnic, Masab Tank",
        createdAt: new Date(Date.now() + index),
        updatedAt: new Date()
    })));
    const teacherIdMigration = await migrateTeacherIds();
    assert.equal(teacherIdMigration.migratedTeachers, 2);
    const migratedLegacyTeachers = await UserModel.find({
        _id: { $in: legacyTeacherIds }
    }).sort({ createdAt: 1, _id: 1 });
    assert.equal(migratedLegacyTeachers[0].teacherId, "DUPLICATE");
    assert.match(migratedLegacyTeachers[1].teacherId, /^LEGACY-[A-F0-9]{8}$/u);
    assert.equal((await migrateTeacherIds()).migratedTeachers, 0);
    const encryptionResult = await migrateUserEncryption();
    assert.equal(encryptionResult.users, await UserModel.countDocuments());
    const encryptedLegacyTeacher = await UserModel.collection.findOne({
        _id: legacyTeacherIds[0]
    });
    assert.match(encryptedLegacyTeacher.teacherId, /^enc:v1:/u);
    assert.equal((await migrateUserEncryption()).users, await UserModel.countDocuments());
});
