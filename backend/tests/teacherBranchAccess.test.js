import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "teacher-branch-access-integration-secret";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.CLIENT_ORIGIN = "http://localhost:5173,https://smart-exam-theta.vercel.app";

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
    const corsPreflight = await request(app)
        .options("/api/auth/admin/login")
        .set("Origin", "https://smart-exam-theta.vercel.app")
        .set("Access-Control-Request-Method", "POST")
        .set("Access-Control-Request-Headers", "content-type");
    assert.equal(corsPreflight.status, 204);
    assert.equal(
        corsPreflight.headers["access-control-allow-origin"],
        "https://smart-exam-theta.vercel.app"
    );
    assert.equal(corsPreflight.headers["access-control-allow-credentials"], "true");

    const blockedMutation = await request(app)
        .post("/api/auth/admin/login")
        .set("Origin", "https://untrusted.example")
        .send({});
    assert.equal(blockedMutation.status, 403, JSON.stringify(blockedMutation.body));

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

    const teacherUser = await User.create({
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

    const replacementTeacherUser = await User.create({
        name: "Replacement Branch Teacher",
        username: "branch-access-repl-teacher",
        email: "branch-access-replacement-teacher@example.test",
        passwordHash,
        role: "teacher",
        teacherId: "BRACCESSRT001",
        institution: institution.name,
        institutionKey,
        accountStatus: "active",
        verificationStatus: "APPROVED"
    });
    const replacementTeacher = request.agent(app);
    assert.equal((await replacementTeacher.post("/api/auth/teacher/login").send({
        identifier: "branch-access-repl-teacher",
        password: "secure-test-password"
    })).status, 200);
    const replacementBranchRequest = await replacementTeacher.post(`/api/branches/${branch.id}/request`);
    assert.equal(replacementBranchRequest.status, 201, JSON.stringify(replacementBranchRequest.body));
    const replacementReview = await branchAdministrator.patch(
        `/api/branch-admin/branch-requests/${replacementBranchRequest.body.data.request.id}/status`
    ).send({ status: "APPROVED" });
    assert.equal(replacementReview.status, 200, JSON.stringify(replacementReview.body));

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

    const branchSubject = await branchAdministrator.post("/api/branch-admin/subjects").send({
        name: "Branch Mathematics",
        code: "BAT-MATH",
        description: "Published by the branch administrator."
    });
    assert.equal(branchSubject.status, 201, JSON.stringify(branchSubject.body));
    const subjectId = branchSubject.body.data.subject.id;
    const assignment = await branchAdministrator.post(
        `/api/branch-admin/subjects/${subjectId}/assignments`
    ).send({
        teacher: teacherUser.id,
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1
    });
    assert.equal(assignment.status, 201, JSON.stringify(assignment.body));
    const reassignment = await branchAdministrator.patch(
        `/api/branch-admin/assignments/${assignment.body.data.assignment.id}`
    ).send({ teacher: replacementTeacherUser.id });
    assert.equal(reassignment.status, 200, JSON.stringify(reassignment.body));
    assert.equal(reassignment.body.data.assignment.teacher, replacementTeacherUser.id);
    const restoredAssignment = await branchAdministrator.patch(
        `/api/branch-admin/assignments/${assignment.body.data.assignment.id}`
    ).send({ teacher: teacherUser.id });
    assert.equal(restoredAssignment.status, 200, JSON.stringify(restoredAssignment.body));

    const unassignedPublishedSubject = await branchAdministrator.post("/api/branch-admin/subjects").send({
        name: "Published Branch Chemistry",
        code: "BAT-CHEM",
        description: "Visible to branch students before teacher assignment."
    });
    assert.equal(unassignedPublishedSubject.status, 201, JSON.stringify(unassignedPublishedSubject.body));

    const removableSubject = await branchAdministrator.post("/api/branch-admin/subjects").send({
        name: "Unused Branch Subject",
        code: "BAT-UNUSED",
        description: ""
    });
    assert.equal(removableSubject.status, 201, JSON.stringify(removableSubject.body));
    const deleteUnusedSubject = await branchAdministrator.delete(
        `/api/branch-admin/subjects/${removableSubject.body.data.subject.id}`
    );
    assert.equal(deleteUnusedSubject.status, 200, JSON.stringify(deleteUnusedSubject.body));
    const listedSubjects = await branchAdministrator.get("/api/branch-admin/subjects");
    assert.equal(listedSubjects.status, 200, JSON.stringify(listedSubjects.body));
    assert.equal(
        listedSubjects.body.data.subjects.some((subject) => subject.id === removableSubject.body.data.subject.id),
        false
    );

    const studentAgent = request.agent(app);
    const studentLogin = await studentAgent.post("/api/auth/student/login").send({
        identifier: "branch-access-student",
        password: "secure-test-password"
    });
    assert.equal(studentLogin.status, 200, JSON.stringify(studentLogin.body));
    const studentSubjects = await studentAgent.get("/api/student/subjects");
    assert.equal(studentSubjects.status, 200, JSON.stringify(studentSubjects.body));
    assert.deepEqual(
        studentSubjects.body.data.subjects.map((subject) => subject.id).sort(),
        [subjectId, unassignedPublishedSubject.body.data.subject.id].sort()
    );
    const unassignedSubjectDetails = await studentAgent.get(
        `/api/student/subjects/${unassignedPublishedSubject.body.data.subject.id}`
    );
    assert.equal(unassignedSubjectDetails.status, 200, JSON.stringify(unassignedSubjectDetails.body));
    assert.equal(unassignedSubjectDetails.body.data.subject.tests.length, 0);
    const branchPerformance = await branchAdministrator.get("/api/branch-admin/performance");
    assert.equal(branchPerformance.status, 200, JSON.stringify(branchPerformance.body));
    assert.equal(branchPerformance.body.data.students[0].name, "Branch Access Student");
    assert.equal(branchPerformance.body.data.students[0].studentId, "24001-BAT-001");

    const teacherDashboard = await teacher.get("/api/teacher/dashboard");
    const teacherStudentList = await teacher.get("/api/teacher/students?page=1&limit=1");
    assert.equal(teacherDashboard.status, 200, JSON.stringify(teacherDashboard.body));
    assert.equal(teacherStudentList.status, 200, JSON.stringify(teacherStudentList.body));
    assert.equal(
        teacherDashboard.body.data.dashboard.students.total,
        teacherStudentList.body.data.summary.totalStudents
    );

    const unassignedClassTest = await teacher.post("/api/tests").send({
        title: "Unassigned Class Test",
        branch: branch.id,
        subject: subjectId,
        academicBatch: "2025-2028",
        studyYear: 1,
        semester: 1,
        startAt: new Date(Date.now() - 60_000).toISOString(),
        endAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(unassignedClassTest.status, 403, JSON.stringify(unassignedClassTest.body));

    const testResponse = await teacher.post("/api/tests").send({
        title: "Branch Published Test",
        description: "",
        branch: branch.id,
        subject: subjectId,
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1,
        startAt: new Date(Date.now() - 60_000).toISOString(),
        endAt: new Date(Date.now() + 60 * 60_000).toISOString(),
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 1
    });
    assert.equal(testResponse.status, 201, JSON.stringify(testResponse.body));
    const testId = testResponse.body.data.test.id;
    assert.equal((await studentAgent.get("/api/student/tests")).body.data.tests.length, 0);
    const question = await teacher.post(`/api/tests/${testId}/questions`).send({
        questionType: "DESCRIPTIVE",
        text: "Explain the concept.",
        marks: 1
    });
    assert.equal(question.status, 201, JSON.stringify(question.body));
    const published = await teacher.patch(`/api/tests/${testId}/status`).send({
        status: "PUBLISHED"
    });
    assert.equal(published.status, 200, JSON.stringify(published.body));

    const studentTests = await studentAgent.get("/api/student/tests");
    assert.equal(studentTests.status, 200, JSON.stringify(studentTests.body));
    assert.equal(studentTests.body.data.tests.length, 1);
    assert.equal(studentTests.body.data.tests[0].id, testId);
    const deleteSubjectWithTest = await branchAdministrator.delete(
        `/api/branch-admin/subjects/${subjectId}`
    );
    assert.equal(deleteSubjectWithTest.status, 409, JSON.stringify(deleteSubjectWithTest.body));

    const destinationSubject = await branchAdministrator.post("/api/branch-admin/subjects").send({
        name: "Transferred Mathematics",
        code: "BAT-TRANSFER",
        description: "Destination for transferred examination data."
    });
    assert.equal(destinationSubject.status, 201, JSON.stringify(destinationSubject.body));
    const destinationSubjectId = destinationSubject.body.data.subject.id;
    const destinationAssignment = await branchAdministrator.post(
        `/api/branch-admin/subjects/${destinationSubjectId}/assignments`
    ).send({
        teacher: teacherUser.id,
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1
    });
    assert.equal(destinationAssignment.status, 201, JSON.stringify(destinationAssignment.body));

    const additionalSourceAssignment = await branchAdministrator.post(
        `/api/branch-admin/subjects/${subjectId}/assignments`
    ).send({
        teacher: replacementTeacherUser.id,
        academicBatch: "2025-2028",
        studyYear: 1,
        semester: 1
    });
    assert.equal(additionalSourceAssignment.status, 201, JSON.stringify(additionalSourceAssignment.body));

    const transferAndDelete = await branchAdministrator.delete(
        `/api/branch-admin/subjects/${subjectId}`
    ).send({ destinationSubjectId });
    assert.equal(transferAndDelete.status, 200, JSON.stringify(transferAndDelete.body));
    assert.equal(transferAndDelete.body.data.transfer.testsTransferred, 1);
    assert.equal(transferAndDelete.body.data.transfer.assignmentsTransferred, 1);
    assert.equal(transferAndDelete.body.data.transfer.duplicateAssignmentsMerged, 1);

    const subjectsAfterTransfer = await branchAdministrator.get("/api/branch-admin/subjects");
    const transferredSubject = subjectsAfterTransfer.body.data.subjects.find(
        (subject) => subject.id === destinationSubjectId
    );
    assert.ok(transferredSubject);
    assert.equal(transferredSubject.testCount, 1);
    assert.equal(transferredSubject.assignments.length, 2);
    assert.equal(
        subjectsAfterTransfer.body.data.subjects.some((subject) => subject.id === subjectId),
        false
    );
    const studentTestsAfterTransfer = await studentAgent.get("/api/student/tests");
    assert.equal(studentTestsAfterTransfer.status, 200, JSON.stringify(studentTestsAfterTransfer.body));
    assert.equal(studentTestsAfterTransfer.body.data.tests.length, 1);
    assert.equal(studentTestsAfterTransfer.body.data.tests[0].id, testId);

    const teacherTestsAfterTransfer = await teacher.get("/api/tests");
    assert.equal(teacherTestsAfterTransfer.status, 200, JSON.stringify(teacherTestsAfterTransfer.body));
    assert.equal(
        teacherTestsAfterTransfer.body.data.tests.some((test) => test.id === testId),
        true
    );
    const replacementTeacherTestsAfterTransfer = await replacementTeacher.get("/api/tests");
    assert.equal(replacementTeacherTestsAfterTransfer.status, 200, JSON.stringify(replacementTeacherTestsAfterTransfer.body));
    assert.equal(
        replacementTeacherTestsAfterTransfer.body.data.tests.some((test) => test.id === testId),
        false
    );
});
