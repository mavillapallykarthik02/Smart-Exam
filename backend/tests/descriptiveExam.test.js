import assert from "node:assert/strict";
import bcrypt from "bcryptjs";
import process from "node:process";
import { after, before, test } from "node:test";
import { MongoMemoryServer } from "mongodb-memory-server";
import request from "supertest";

process.env.NODE_ENV = "test";
process.env.JWT_SECRET = "descriptive-exam-integration-test-secret-32";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";

let memoryServer;
let mongoose;
let app;
let User;
let Branch;
let Subject;
let TeacherAssignment;
let TeacherBranchRequest;
let Answer;
let Attempt;
let Result;
let createPendingResult;

before(async () => {
    memoryServer = await MongoMemoryServer.create();
    process.env.MONGODB_URI = memoryServer.getUri();
    const [
        appModule,
        database,
        mongooseModule,
        userModule,
        branchModule,
        subjectModule,
        assignmentModule,
        branchRequestModule,
        answerModule,
        attemptModule,
        resultModule,
        evaluationModule
    ] = await Promise.all([
        import("../app.js"),
        import("../config/database.js"),
        import("mongoose"),
        import("../models/User.js"),
        import("../models/Branch.js"),
        import("../models/Subject.js"),
        import("../models/TeacherAssignment.js"),
        import("../models/TeacherBranchRequest.js"),
        import("../models/Answer.js"),
        import("../models/Attempt.js"),
        import("../models/Result.js"),
        import("../services/evaluationService.js")
    ]);
    app = appModule.default;
    mongoose = mongooseModule.default;
    User = userModule.User;
    Branch = branchModule.Branch;
    Subject = subjectModule.Subject;
    TeacherAssignment = assignmentModule.TeacherAssignment;
    TeacherBranchRequest = branchRequestModule.TeacherBranchRequest;
    Answer = answerModule.Answer;
    Attempt = attemptModule.Attempt;
    Result = resultModule.Result;
    createPendingResult = evaluationModule.createPendingResult;
    await database.connectDatabase();
});

after(async () => {
    await mongoose.disconnect();
    await memoryServer.stop();
});

test("teacher creates a multi-method exam and student submits all answer methods", async () => {
    const institution = "Government Polytechnic, Masab Tank";
    const institutionKey = institution.toLocaleLowerCase("en");
    const password = "descriptive-test-password";
    const passwordHash = await bcrypt.hash(password, 4);

    const teacher = await User.create({
        name: "Exam Teacher",
        username: "examteacher",
        email: "examteacher@example.test",
        mobile: "1000000011",
        passwordHash,
        role: "teacher",
        institution,
        institutionKey,
        verificationStatus: "APPROVED",
        accountStatus: "active",
        teacherId: "EXAM001",
        departmentName: "Computer Science",
        branchName: "Computer Science and Engineering",
        designation: "Lecturer"
    });

    const branch = await Branch.create({
        name: "Computer Science and Engineering",
        code: "CSE",
        institutionKey,
        isActive: true,
        createdBy: teacher.id
    });
    await TeacherBranchRequest.create({
        teacher: teacher.id,
        branch: branch.id,
        status: "APPROVED"
    });
    const subject = await Subject.create({
        name: "Engineering Mathematics",
        code: "EM",
        branch: branch.id,
        isActive: true,
        createdBy: teacher.id
    });

    await User.create({
        name: "Exam Student",
        username: "examstudent",
        email: "examstudent@example.test",
        mobile: "1000000012",
        passwordHash,
        role: "student",
        institution,
        institutionKey,
        accountStatus: "approved",
        studentId: "24001-CSE-501",
        branch: branch.id,
        year: "1-1",
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1
    });
    await User.create({
        name: "No Attempt Student",
        username: "noattemptstudent",
        email: "noattemptstudent@example.test",
        mobile: "1000000013",
        passwordHash,
        role: "student",
        institution,
        institutionKey,
        accountStatus: "approved",
        studentId: "24001-CSE-502",
        branch: branch.id,
        year: "1-1",
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1
    });

    await TeacherAssignment.create({
        teacher: teacher.id,
        branch: branch.id,
        subject: subject.id,
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1,
        assignedBy: teacher.id,
        isActive: true
    });

    const teacherAgent = request.agent(app);
    const studentAgent = request.agent(app);

    const teacherLogin = await teacherAgent.post("/api/auth/teacher/login").send({
        identifier: "examteacher",
        password
    });
    assert.equal(teacherLogin.status, 200, JSON.stringify(teacherLogin.body));
    const studentLogin = await studentAgent.post("/api/auth/student/login").send({
        identifier: "24001-CSE-501",
        password
    });
    assert.equal(studentLogin.status, 200, JSON.stringify(studentLogin.body));

    const testCreate = await teacherAgent.post("/api/tests").send({
        title: "Multi-method descriptive examination",
        description: "English equation and drawing methods",
        branch: branch.id,
        subject: subject.id,
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1,
        duration: 30,
        testType: "DESCRIPTIVE",
        totalQuestions: 1,
        totalMarks: 10,
        passingPercentage: 40,
        instructions: "Answer with any combination of methods.",
        startAt: new Date(Date.now() - 60_000).toISOString(),
        endAt: new Date(Date.now() + 60 * 60_000).toISOString()
    });
    assert.equal(testCreate.status, 201, JSON.stringify(testCreate.body));
    const testId = testCreate.body.data.test.id;

    const questionCreate = await teacherAgent.post(`/api/tests/${testId}/questions`).send({
        questionType: "DESCRIPTIVE",
        text: "Derive the result and illustrate it.",
        title: "Derivation and diagram",
        instructions: "Use any answer method.",
        contentMethods: ["ENGLISH", "EQUATION", "DRAW"],
        englishContent: "<p>Explain the derivation.</p>",
        equationSource: "\\int_0^1 x^2 \\, dx",
        equationEntries: [{ id: "q1", source: "\\int_0^1 x^2 \\, dx", order: 1 }],
        drawingPages: [{ width: 800, height: 500, objects: [] }],
        marks: 10,
        expectedAnswer: "A complete derivation with a diagram.",
        markingScheme: "Derivation 6 marks, diagram 4 marks.",
        evaluationInstructions: "Award partial marks."
    });
    assert.equal(questionCreate.status, 201, JSON.stringify(questionCreate.body));
    const questionId = questionCreate.body.data.question.id;
    assert.deepEqual(questionCreate.body.data.question.contentMethods, ["ENGLISH", "EQUATION", "DRAW"]);

    const publish = await teacherAgent.patch(`/api/tests/${testId}/status`).send({ status: "PUBLISHED" });
    assert.equal(publish.status, 200, JSON.stringify(publish.body));

    const rosterOverview = await teacherAgent.get("/api/results/teacher-overview");
    assert.equal(rosterOverview.status, 200, JSON.stringify(rosterOverview.body));
    const firstTestOverview = rosterOverview.body.data.subjects
        .flatMap((item) => item.tests)
        .find((item) => item.id === testId);
    assert.ok(firstTestOverview);
    assert.equal(firstTestOverview.students.length, 2);
    assert.ok(firstTestOverview.students.every((entry) =>
        entry.participationStatus === "NOT_ATTEMPTED"
    ));
    assert.equal((await studentAgent.get("/api/results/teacher-overview")).status, 403);

    const attemptStart = await studentAgent.post("/api/attempts").send({ testId });
    assert.equal(attemptStart.status, 201, JSON.stringify(attemptStart.body));
    const attempt = attemptStart.body.data.attempt;
    const startedQuestion = attempt.questions.find((item) => item.id === questionId);
    assert.equal(startedQuestion.contentMethods.includes("DRAW"), true);
    assert.equal("expectedAnswer" in startedQuestion, false);

    const answerSave = await studentAgent.put(`/api/attempts/${attempt.id}/answers/${questionId}`).send({
        selectedMethods: ["ENGLISH", "EQUATION", "DRAW"],
        englishResponse: "<p>I derived the expression.</p>",
        textResponse: "<p>I derived the expression.</p>",
        equationSource: "\\frac{d}{dx}x^2=2x",
        equationEntries: [{ id: "a1", source: "\\frac{d}{dx}x^2=2x", order: 1 }],
        drawingPages: [{
            width: 800,
            height: 500,
            objects: [{ type: "rect", x: 20, y: 20, width: 200, height: 100, stroke: "#111827", strokeWidth: 3 }]
        }]
    });
    assert.equal(answerSave.status, 200, JSON.stringify(answerSave.body));

    const storedAnswer = await Answer.findOne({ attempt: attempt.id, question: questionId });
    assert.equal(storedAnswer.englishResponse, "<p>I derived the expression.</p>");
    assert.equal(storedAnswer.equationSource, "\\frac{d}{dx}x^2=2x");
    assert.equal(storedAnswer.drawingPages.length, 1);
    assert.deepEqual(storedAnswer.selectedMethods, ["ENGLISH", "EQUATION", "DRAW"]);

    const submission = await studentAgent.post(`/api/attempts/${attempt.id}/submit`);
    assert.equal(submission.status, 200, JSON.stringify(submission.body));
    assert.equal(submission.body.data.attempt.status, "SUBMITTED");
    assert.equal((await Attempt.findById(attempt.id)).status, "SUBMITTED");

    await createPendingResult(attempt.id);
    const result = await Result.findOne({ attempt: attempt.id });
    assert.ok(result);
    assert.equal(result.evaluationStatus, "PENDING_EVALUATION");

    const evaluation = await teacherAgent.patch(`/api/results/${result.id}/answers/${questionId}`).send({
        marksAwarded: 8,
        feedback: "Strong derivation and a useful diagram."
    });
    assert.equal(evaluation.status, 200, JSON.stringify(evaluation.body));

    const publishResult = await teacherAgent.post(`/api/results/${result.id}/publish`);
    assert.equal(publishResult.status, 200, JSON.stringify(publishResult.body));

    const review = await teacherAgent.get(`/api/results/${result.id}`);
    assert.equal(review.status, 200, JSON.stringify(review.body));
    const reviewedAnswer = review.body.data.result.answers[0];
    assert.equal(reviewedAnswer.englishResponse, "<p>I derived the expression.</p>");
    assert.equal(reviewedAnswer.equationSource, "\\frac{d}{dx}x^2=2x");
    assert.equal(reviewedAnswer.drawingPages.length, 1);
    assert.equal(reviewedAnswer.marksAwarded, 8);

    const studentReview = await studentAgent.get(`/api/results/${result.id}`);
    assert.equal(studentReview.status, 200, JSON.stringify(studentReview.body));
    assert.equal(studentReview.body.data.result.obtainedMarks, 8);

    const mcqTestResponse = await teacherAgent.post("/api/tests").send({
        title: "Multiple choice examination",
        branch: branch.id,
        subject: subject.id,
        academicBatch: "2024-2027",
        studyYear: 1,
        semester: 1,
        duration: 30,
        testType: "MCQ",
        totalQuestions: 2,
        totalMarks: 10,
        passingPercentage: 40,
        startAt: new Date(Date.now() - 60_000).toISOString(),
        endAt: new Date(Date.now() + 60 * 60_000).toISOString()
    });
    assert.equal(mcqTestResponse.status, 201, JSON.stringify(mcqTestResponse.body));
    const mcqTestId = mcqTestResponse.body.data.test.id;
    const mcqQuestionResponses = [];
    mcqQuestionResponses.push(await teacherAgent.post(`/api/tests/${mcqTestId}/questions`).send({
            questionType: "MCQ",
            text: "What is the derivative of x squared?",
            options: [
                { key: "A", text: "x" },
                { key: "B", text: "2x" },
                { key: "C", text: "x squared" },
                { key: "D", text: "2" }
            ],
            correctAnswer: "B",
            marks: 5
        }));
    mcqQuestionResponses.push(await teacherAgent.post(`/api/tests/${mcqTestId}/questions`).send({
            questionType: "MCQ",
            text: "What is the integral of 1?",
            options: [
                { key: "A", text: "x + C" },
                { key: "B", text: "1 + C" },
                { key: "C", text: "0" },
                { key: "D", text: "x squared" }
            ],
            correctAnswer: "A",
            marks: 5
        }));
    assert.deepEqual(mcqQuestionResponses.map((response) => response.status), [201, 201]);
    const mcqQuestionIds = mcqQuestionResponses.map((response) => response.body.data.question.id);
    const mcqPublish = await teacherAgent.patch(`/api/tests/${mcqTestId}/status`)
        .send({ status: "PUBLISHED" });
    assert.equal(mcqPublish.status, 200, JSON.stringify(mcqPublish.body));

    const mcqAttemptResponse = await studentAgent.post("/api/attempts").send({ testId: mcqTestId });
    assert.equal(mcqAttemptResponse.status, 201, JSON.stringify(mcqAttemptResponse.body));
    const mcqAttempt = mcqAttemptResponse.body.data.attempt;
    const mcqQuestions = mcqAttempt.questions;
    assert.ok(mcqQuestions.every((question) => question.questionType === "MCQ"));
    assert.ok(mcqQuestions.every((question) => question.options.length === 4));
    assert.ok(mcqQuestions.every((question) => !("correctAnswer" in question)));
    const firstMcqQuestion = mcqQuestions.find((question) => question.id === mcqQuestionIds[0]);
    assert.ok(firstMcqQuestion);
    const mcqAnswerSave = await studentAgent.put(
        `/api/attempts/${mcqAttempt.id}/answers/${firstMcqQuestion.id}`
    ).send({ selectedOption: "B" });
    assert.equal(mcqAnswerSave.status, 200, JSON.stringify(mcqAnswerSave.body));
    const secondMcqQuestion = mcqQuestions.find((question) => question.id !== firstMcqQuestion.id);
    const invalidMcqAnswer = await studentAgent.put(
        `/api/attempts/${mcqAttempt.id}/answers/${secondMcqQuestion.id}`
    ).send({ selectedOption: "Z" });
    assert.equal(invalidMcqAnswer.status, 400);

    const mcqSubmission = await studentAgent.post(`/api/attempts/${mcqAttempt.id}/submit`);
    assert.equal(mcqSubmission.status, 200, JSON.stringify(mcqSubmission.body));
    const mcqResult = await Result.findOne({ attempt: mcqAttempt.id });
    assert.equal(mcqResult.evaluationStatus, "PUBLISHED");
    assert.equal(mcqResult.obtainedMarks, 5);
    assert.equal(mcqResult.percentage, 50);
    assert.equal(mcqResult.unanswered, 1);
    assert.equal(mcqResult.passed, true);

    const mcqStudentResults = await studentAgent.get("/api/results");
    assert.ok(mcqStudentResults.body.data.results.some((item) => item.id === mcqResult.id));
    const mcqReview = await studentAgent.get(`/api/results/${mcqResult.id}`);
    assert.equal(mcqReview.status, 200, JSON.stringify(mcqReview.body));
    const reviewedCorrectAnswer = mcqReview.body.data.result.answers
        .find((answer) => answer.id === firstMcqQuestion.id);
    assert.equal(reviewedCorrectAnswer.selectedOption, "B");
    assert.equal(reviewedCorrectAnswer.correctAnswer, "B");
    assert.equal(reviewedCorrectAnswer.marksAwarded, 5);
});
