import assert from "node:assert/strict";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "branch-subject-integration-test-secret-32";

let memoryServer;
let app;
let mongoose;
let AttemptModel;
let ResultModel;
let UserModel;
let expireAttempts;
let migrateStudentIds;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [{ default: application }, database, mongooseModule, attemptModule, resultModule, attemptService, userModule, migrationModule] = await Promise.all([
        import("../app.js"),
        import("../config/database.js"),
        import("mongoose"),
        import("../models/Attempt.js"),
        import("../models/Result.js"),
        import("../services/attemptService.js"),
        import("../models/User.js"),
        import("../scripts/migrateStudentIds.js")
    ]);
    app = application;
    mongoose = mongooseModule.default;
    AttemptModel = attemptModule.Attempt;
    ResultModel = resultModule.Result;
    UserModel = userModule.User;
    expireAttempts = attemptService.expireDueAttempts;
    migrateStudentIds = migrationModule.migrateStudentIds;
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

    const teacherDetails = {
        name: "Test Teacher",
        username: "phase4teacher",
        email: "phase4teacher@example.test",
        mobile: "1000000001",
        password: "secure-test-password",
        institution: "Test Institute",
        teacherId: "P4T001"
    };
    const studentDetails = {
        studentId: "CSE2026001",
        name: "Test Student",
        username: "phase4student",
        email: "phase4student@example.test",
        mobile: "1000000002",
        password: "secure-test-password",
        institution: "Test Institute",
        branch: "CSE",
        year: "1-1"
    };

    const teacherRegistration = await teacher.post("/api/auth/teacher/register").send(teacherDetails);
    assert.equal(teacherRegistration.status, 201, JSON.stringify(teacherRegistration.body));
    await teacher.post("/api/auth/logout");
    const teacherLogin = await teacher.post("/api/auth/teacher/login").send({
        identifier: teacherDetails.username,
        password: teacherDetails.password
    });
    assert.equal(teacherLogin.status, 200);
    assert.equal(teacherLogin.body.data.user.role, "teacher");
    assert.equal("passwordHash" in teacherLogin.body.data.user, false);
    const profileUpdate = await teacher.put("/api/auth/me").send({
        name: "Updated Test Teacher",
        role: "student",
        accountStatus: "inactive"
    });
    assert.equal(profileUpdate.status, 200, JSON.stringify(profileUpdate.body));
    assert.equal(profileUpdate.body.data.user.name, "Updated Test Teacher");
    assert.equal(profileUpdate.body.data.user.role, "teacher");
    assert.equal(profileUpdate.body.data.user.accountStatus, "active");

    const branchResponse = await teacher.post("/api/branches").send({
        name: "Computer Science",
        code: "CSE",
        description: "Computer science and software engineering."
    });
    assert.equal(branchResponse.status, 201, JSON.stringify(branchResponse.body));
    assert.equal(branchResponse.body.success, true);
    const branchId = branchResponse.body.data.branch.id;
    const publicBranches = await request(app).get("/api/branches/available");
    assert.equal(publicBranches.status, 200);
    assert.deepEqual(
        publicBranches.body.data.branches.map((branch) => branch.id),
        [branchId]
    );

    const invalidBranchRegistration = await request(app)
        .post("/api/auth/student/register")
        .send({ ...studentDetails, username: "invalidbranch", email: "invalidbranch@example.test", branch: "CSE" });
    assert.equal(invalidBranchRegistration.status, 400);
    const invalidStudentId = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        username: "invalidstudentid",
        email: "invalidstudentid@example.test",
        studentId: "bad id"
    });
    assert.equal(invalidStudentId.status, 400);

    studentDetails.branch = branchId;
    const studentRegistration = await student.post("/api/auth/student/register").send(studentDetails);
    assert.equal(studentRegistration.status, 201, JSON.stringify(studentRegistration.body));
    assert.equal(studentRegistration.body.data.user.branchId, branchId);
    assert.equal(studentRegistration.body.data.user.branch, "Computer Science");
    assert.equal(studentRegistration.body.data.user.studentId, "CSE2026001");
    const duplicateStudentId = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "cse2026001",
        username: "differentstudent",
        email: "differentstudent@example.test"
    });
    assert.equal(duplicateStudentId.status, 409);
    assert.equal(duplicateStudentId.body.message, "Student ID already exists.");
    const duplicateUsername = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "CSE2026009",
        email: "different-email@example.test"
    });
    assert.equal(duplicateUsername.status, 409);
    const duplicateEmail = await request(app).post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "CSE2026010",
        username: "differentusername"
    });
    assert.equal(duplicateEmail.status, 409);
    await student.post("/api/auth/logout");
    const studentLogin = await student.post("/api/auth/student/login").send({
        identifier: studentDetails.email,
        password: studentDetails.password
    });
    assert.equal(studentLogin.status, 200);
    assert.equal(studentLogin.body.data.user.role, "student");
    assert.equal(studentLogin.body.data.user.studentId, "CSE2026001");
    const protectedStudentIdUpdate = await student.put("/api/auth/me").send({
        studentId: "ALTERED2026"
    });
    assert.equal(protectedStudentIdUpdate.status, 400);
    assert.equal((await student.get("/api/auth/me")).body.data.user.studentId, "CSE2026001");

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

    const deactivatedSubject = await teacher.patch(`/api/subjects/${subjectId}/status`)
        .send({ isActive: false });
    assert.equal(deactivatedSubject.body.data.subject.isActive, false);
    assert.equal((await student.get(`/api/subjects?branch=${branchId}`)).body.data.subjects.length, 0);

    await teacher.patch(`/api/subjects/${subjectId}/status`).send({ isActive: true });
    assert.equal((await student.get("/api/branches")).body.data.branches.length, 1);

    const testResponse = await teacher.post("/api/tests").send({
        title: "Phase 5 Integration Test",
        description: "Test-owned integration fixture.",
        branch: branchId,
        subject: subjectId,
        duration: 45,
        testType: "MIXED",
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
        questionType: "MCQ",
        text: "Which value is correct?",
        options: [
            { key: "A", text: "Correct option" },
            { key: "B", text: "Incorrect option" }
        ],
        correctAnswer: "A",
        marks: 5,
        negativeMarks: 1,
        explanation: "Option A is correct."
    };
    const questionOne = await teacher.post(`/api/tests/${testId}/questions`)
        .send(questionDetails);
    assert.equal(questionOne.status, 201, JSON.stringify(questionOne.body));
    const questionOneId = questionOne.body.data.question.id;
    const invalidQuestion = await teacher.post(`/api/tests/${testId}/questions`)
        .send({ ...questionDetails, correctAnswer: "C" });
    assert.equal(invalidQuestion.status, 400);
    const typingQuestionDetails = {
        questionType: "TYPING",
        text: "Enter the answer to life, the universe, and everything.",
        options: [],
        expectedAnswer: "42",
        marks: 5,
        negativeMarks: 0
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
        testType: "MCQ",
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

    const secondTeacher = request.agent(app);
    const secondTeacherRegistration = await secondTeacher.post("/api/auth/teacher/register").send({
        ...teacherDetails,
        username: "phase4teacher2",
        email: "phase4teacher2@example.test",
        teacherId: "P4T002"
    });
    assert.equal(secondTeacherRegistration.status, 201);
    assert.equal((await secondTeacher.get(`/api/tests/${testId}`)).status, 404);
    const sharedBranches = await secondTeacher.get("/api/branches");
    assert.equal(sharedBranches.status, 200);
    assert.equal(
        sharedBranches.body.data.branches.find((branch) => branch.id === branchId).canManage,
        false
    );
    const emptyTeacherDashboard = await secondTeacher.get("/api/teacher/dashboard");
    assert.equal(emptyTeacherDashboard.status, 200);
    assert.equal(emptyTeacherDashboard.body.data.dashboard.branches, 0);
    assert.equal(emptyTeacherDashboard.body.data.dashboard.tests.total, 0);
    assert.equal(emptyTeacherDashboard.body.data.dashboard.results.attempts, 0);
    assert.equal((await secondTeacher.get("/api/teacher/students")).body.data.summary.totalStudents, 0);
    assert.equal((await secondTeacher.put(`/api/tests/${testId}`).send({
        title: "Unauthorized edit",
        branch: branchId,
        subject: subjectId,
        duration: 20,
        testType: "MCQ",
        totalQuestions: 1,
        totalMarks: 1
    })).status, 404);

    assert.equal((await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "DRAFT" })).status, 200);
    const updatedTest = await teacher.put(`/api/tests/${testId}`).send({
        title: "Updated Phase 5 Test",
        description: "Updated fixture.",
        branch: branchId,
        subject: subjectId,
        duration: 50,
        testType: "MIXED",
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
    assert.equal(attemptOwner.student.studentId, "CSE2026001");
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
    assert.equal("correctAnswer" in attemptQuestions[0], false);
    assert.equal("expectedAnswer" in attemptQuestions[0], false);
    assert.equal("explanation" in attemptQuestions[0], false);
    const selectedQuestion = attemptQuestions.find((question) => question.questionType === "MCQ");
    const savedAnswer = await student.put(
        `/api/attempts/${attemptId}/answers/${selectedQuestion.id}`
    ).send({ selectedOption: "A" });
    assert.equal(savedAnswer.status, 200, JSON.stringify(savedAnswer.body));
    const safeTypingQuestion = attemptQuestions.find((question) => question.questionType === "TYPING");
    const savedTypingAnswer = await student.put(
        `/api/attempts/${attemptId}/answers/${safeTypingQuestion.id}`
    ).send({ textResponse: "  42 \n" });
    assert.equal(savedTypingAnswer.status, 200, JSON.stringify(savedTypingAnswer.body));
    assert.equal((await teacher.get(`/api/attempts/${attemptId}`)).status, 403);

    const otherStudent = request.agent(app);
    const otherStudentRegistration = await otherStudent.post("/api/auth/student/register").send({
        ...studentDetails,
        studentId: "CSE2026002",
        username: "phase4student2",
        email: "phase4student2@example.test",
        mobile: "1000000003"
    });
    assert.equal(otherStudentRegistration.status, 201, JSON.stringify(otherStudentRegistration.body));
    assert.equal((await otherStudent.get(`/api/attempts/${attemptId}`)).status, 404);

    const secondBranchResponse = await secondTeacher.post("/api/branches").send({
        name: "Mathematics",
        code: "MATH"
    });
    assert.equal(secondBranchResponse.status, 201, JSON.stringify(secondBranchResponse.body));
    const secondBranchId = secondBranchResponse.body.data.branch.id;
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
    assert.equal((await student.get("/api/student/subjects")).body.data.subjects.length, 1);
    assert.equal((await student.get(`/api/subjects/${subjectId}`)).status, 200);
    assert.equal((await student.get(`/api/subjects?branch=${secondBranchId}`)).status, 404);
    assert.equal((await teacher.get("/api/teacher/dashboard")).body.data.dashboard.students.total, 2);
    const teacherStudents = await teacher.get("/api/teacher/students?search=phase4student&page=1&limit=1");
    assert.equal(teacherStudents.status, 200, JSON.stringify(teacherStudents.body));
    assert.equal(teacherStudents.body.data.pagination.totalResults, 2);
    assert.equal(teacherStudents.body.data.students.length, 1);
    assert.equal(teacherStudents.body.data.students[0].branchId, branchId);
    const studentIdSearch = await teacher.get("/api/teacher/students?search=cse2026001");
    assert.equal(studentIdSearch.body.data.pagination.totalResults, 1);
    assert.equal(studentIdSearch.body.data.students[0].studentId, "CSE2026001");
    const studentBranchSearch = await teacher.get("/api/teacher/students?search=computer%20science");
    assert.equal(studentBranchSearch.body.data.pagination.totalResults, 2);
    assert.equal((await teacher.get(`/api/teacher/students?branch=${secondBranchId}`))
        .body.data.pagination.totalResults, 0);
    assert.equal((await teacher.get("/api/teacher/students?status=suspended"))
        .body.data.pagination.totalResults, 0);
    assert.equal((await secondTeacher.get("/api/teacher/students")).body.data.pagination.totalResults, 0);
    assert.equal((await student.get("/api/teacher/dashboard")).status, 403);
    assert.equal((await teacher.get("/api/student/dashboard")).status, 403);

    const submittedAttempt = await student.post(`/api/attempts/${attemptId}/submit`);
    assert.equal(submittedAttempt.status, 200, JSON.stringify(submittedAttempt.body));
    assert.equal(submittedAttempt.body.data.attempt.status, "SUBMITTED");
    assert.equal((await student.get(`/api/attempts/${attemptId}`)).body.data.attempt.questions
        .find((question) => question.id === selectedQuestion.id).response.selectedOption, "A");
    assert.equal((await student.post("/api/attempts").send({ testId })).status, 409);
    assert.equal((await AttemptModel.findById(attemptId)).status, "SUBMITTED");
    const studentResults = await student.get("/api/results");
    assert.equal(studentResults.status, 200, JSON.stringify(studentResults.body));
    assert.equal(studentResults.body.data.results.length, 1);
    const resultId = studentResults.body.data.results[0].id;
    assert.equal(studentResults.body.data.results[0].obtainedMarks, 10);
    assert.equal(studentResults.body.data.results[0].correctAnswers, 2);
    assert.equal(studentResults.body.data.results[0].unanswered, 0);
    const studentReview = await student.get(`/api/results/${resultId}`);
    assert.equal(studentReview.status, 200, JSON.stringify(studentReview.body));
    assert.equal(studentReview.body.data.result.student.studentId, "CSE2026001");
    assert.equal(studentReview.body.data.result.answers
        .find((answer) => answer.id === selectedQuestion.id).correctAnswer, "A");
    assert.equal(studentReview.body.data.result.answers
        .find((answer) => answer.id === questionTwoId).expectedAnswer, "42");
    assert.equal((await otherStudent.get(`/api/results/${resultId}`)).status, 404);
    assert.equal((await teacher.get(`/api/results/${resultId}`)).status, 200);
    assert.equal((await secondTeacher.get(`/api/results/${resultId}`)).status, 404);
    assert.equal((await otherStudent.get("/api/results")).body.data.results.length, 0);
    assert.equal((await ResultModel.find({ attempt: attemptId })).length, 1);
    assert.equal((await teacher.patch(`/api/tests/${testId}/status`)
        .send({ status: "DRAFT" })).status, 409);
    assert.equal((await teacher.put(`/api/tests/${testId}`).send({
        title: "Changed after official attempt",
        branch: branchId,
        subject: subjectId,
        duration: 50,
        testType: "MIXED",
        totalQuestions: 2,
        totalMarks: 10
    })).status, 409);

    const timeoutTestResponse = await teacher.post("/api/tests").send({
        title: "Server Deadline Integration Test",
        branch: branchId,
        subject: subjectId,
        duration: 1,
        testType: "MCQ",
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
            negativeMarks: 0
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
    ).send({ selectedOption: "A" });
    assert.equal(expiredAnswer.status, 409);
    assert.equal((await AttemptModel.findById(timeoutAttemptId)).status, "TIMED_OUT");
    assert.equal((await ResultModel.find({ attempt: timeoutAttemptId })).length, 1);
    assert.equal((await student.get("/api/results")).body.data.results.length, 2);
    const firstResultPage = await student.get("/api/results?page=1&limit=1");
    const secondResultPage = await student.get("/api/results?page=2&limit=1");
    assert.equal(firstResultPage.body.data.results.length, 1);
    assert.equal(firstResultPage.body.data.pagination.totalPages, 2);
    assert.equal(secondResultPage.body.data.pagination.page, 2);
    assert.equal((await student.get("/api/results?page=0")).status, 400);
    assert.equal((await student.get("/api/results?status=PASSED")).body.data.results.length, 1);
    assert.equal((await student.get("/api/results?status=FAILED")).body.data.results.length, 1);
    assert.equal((await student.get("/api/results?search=Server%20Deadline"))
        .body.data.pagination.totalResults, 1);
    const teacherSearchResults = await teacher.get("/api/results?search=Test%20Student");
    assert.equal(teacherSearchResults.body.data.pagination.totalResults, 2);
    assert.equal(teacherSearchResults.body.data.summary.participantCount, 1);
    const studentIdResultSearch = await teacher.get("/api/results?search=CSE2026001");
    assert.equal(studentIdResultSearch.body.data.pagination.totalResults, 2);
    assert.equal(studentIdResultSearch.body.data.results[0].student.studentId, "CSE2026001");
    assert.equal((await student.get("/api/student/results")).body.data.results.length, 2);
    assert.equal((await otherStudent.get("/api/student/results")).body.data.results.length, 0);
    const dateSearch = await teacher.get(
        `/api/results?date=${new Date(studentIdResultSearch.body.data.results[0].submittedAt).toISOString().slice(0, 10)}`
    );
    assert.ok(dateSearch.body.data.pagination.totalResults >= 1);
    assert.equal((await teacher.get("/api/results?date=2026-02-30")).status, 400);
    assert.equal((await secondTeacher.get("/api/results")).body.data.pagination.totalResults, 0);

    const progress = await student.get("/api/progress");
    assert.equal(progress.status, 200, JSON.stringify(progress.body));
    assert.equal(progress.body.data.progress.testsAttempted, 2);
    assert.equal(progress.body.data.progress.averagePercentage, 50);
    assert.equal(progress.body.data.progress.subjectPerformance[0].attempts, 2);
    const studentProgress = await student.get("/api/student/progress");
    assert.equal(studentProgress.status, 200, JSON.stringify(studentProgress.body));
    assert.equal(studentProgress.body.data.progress.completedTests, 2);
    assert.equal(studentProgress.body.data.progress.averagePercentage, 50);
    assert.equal(studentProgress.body.data.progress.trend.length, 2);
    assert.equal((await teacher.get("/api/student/progress")).status, 403);
    assert.equal((await teacher.get("/api/progress")).status, 403);
    assert.equal((await otherStudent.get("/api/progress")).body.data.progress.testsAttempted, 0);

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
        institution: "Test Institute",
        branch: new mongoose.Types.ObjectId(branchId),
        year: "1-1",
        accountStatus: "active",
        createdAt: new Date(),
        updatedAt: new Date()
    });
    const migrationResult = await migrateStudentIds({ currentYear: 2026 });
    const migratedStudent = await UserModel.findById(legacyStudentId).lean();
    assert.equal(migrationResult.migrated, 1);
    assert.match(migratedStudent.studentId, /^CSE2026\d{3,}$/u);
    assert.deepEqual({
        attempts: await AttemptModel.countDocuments(),
        results: await ResultModel.countDocuments()
    }, historicalCounts);
    assert.equal((await migrateStudentIds({ currentYear: 2026 })).migrated, 0);

    assert.equal((await student.get("/api/tests?status=DRAFT")).body.data.tests.length, 2);
    assert.equal((await teacher.get("/api/tests?status=INVALID")).status, 400);
    assert.equal((await student.post("/api/tests").send({})).status, 403);
    assert.equal((await teacher.get("/api/tests/not-an-object-id")).status, 400);
    assert.equal((await teacher.delete(`/api/tests/${timeoutTestId}`)).status, 200);
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
    const descriptiveTest = await secondTeacher.post("/api/tests").send({
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
        questionType: "TYPING",
        text: "Define a set.",
        expectedAnswer: "A well-defined collection of distinct objects.",
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
});
