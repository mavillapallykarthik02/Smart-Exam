import { Answer } from "../models/Answer.js";
import { Attempt } from "../models/Attempt.js";
import { Branch } from "../models/Branch.js";
import { Question } from "../models/Question.js";
import { Subject } from "../models/Subject.js";
import { Test } from "../models/Test.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { User } from "../models/User.js";
import { MAX_SECURITY_EVENTS_PER_ATTEMPT } from "../utils/securityEventTypes.js";
import { createPendingResult } from "./evaluationService.js";

function shuffleForAttempt(items, salt) {
    const copy = [...items];
    const seed = Array.from(String(salt || "")).reduce((total, character) => total + character.charCodeAt(0), 0);
    for (let index = copy.length - 1; index > 0; index -= 1) {
        const swapIndex = (seed + index + 1) % (index + 1);
        [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
    }
    return copy;
}

function resourceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function safeQuestion(question) {
    return {
        id: question.id,
        position: question.position,
        questionType: question.questionType,
        text: question.text,
        marks: question.marks,
        options: Array.isArray(question.options) ? shuffleForAttempt(question.options, question.id) : undefined,
        explanation: question.explanation || undefined
    };
}

function safeTest(test) {
    return {
        id: test.id,
        title: test.title,
        duration: test.duration,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        instructions: test.instructions,
        startAt: test.startAt,
        endAt: test.endAt,
        subject: test.subject?.name || "",
        branch: test.branch?.name || ""
    };
}

function serializeAttempt(attempt, questions, answers) {
    const responseByQuestion = new Map(
        answers.map((answer) => [answer.question.toString(), {
            textResponse: answer.textResponse,
            updatedAt: answer.updatedAt
        }])
    );
    const randomizedQuestions = shuffleForAttempt(questions, attempt.id.toString()).map((question, index) => ({
        ...safeQuestion(question),
        position: index + 1,
        response: responseByQuestion.get(question.id) || {
            textResponse: ""
        }
    }));
    return {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        submittedAt: attempt.submittedAt,
        test: safeTest(attempt.test),
        security: {
            fullScreenRequired: true,
            copyPasteBlocked: true,
            tabSwitchMonitoring: true,
            windowFocusMonitoring: true,
            multipleLoginProtection: true
        },
        questions: randomizedQuestions
    };
}

async function loadAttempt(attemptId, studentId) {
    const attempt = await Attempt.findOne({ _id: attemptId, student: studentId })
        .populate({
            path: "test",
            populate: [
                { path: "branch", select: "name isActive" },
                { path: "subject", select: "name isActive branch" }
            ]
        });
    if (!attempt) throw resourceError(404, "Attempt not found.");
    const questions = await Question.find({ test: attempt.test.id }).sort({ position: 1 });
    const answers = await Answer.find({ attempt: attempt.id });
    if (attempt.status === "IN_PROGRESS" && Date.now() >= attempt.expiresAt.getTime()) {
        attempt.status = "TIMED_OUT";
        attempt.submittedAt = attempt.expiresAt;
        await attempt.save();
    }
    if (attempt.status !== "IN_PROGRESS") await createPendingResult(attempt.id);
    return serializeAttempt(attempt, questions, answers);
}

export async function startAttempt(testId, student) {
    const studentBranchId = student.branch?._id || student.branch;
    if (!studentBranchId) {
        throw resourceError(404, "No active branch is assigned to this student.");
    }
    const test = await Test.findOne({
        _id: testId,
        status: "PUBLISHED",
        branch: studentBranchId,
        academicBatch: student.academicBatch,
        studyYear: Number(student.studyYear),
        semester: Number(student.semester)
    }).populate([
        { path: "branch", select: "name isActive" },
        { path: "subject", select: "name isActive branch" }
    ]);
    if (!test || !test.branch?.isActive || !test.subject?.isActive ||
        test.subject.branch.toString() !== test.branch.id) {
        throw resourceError(404, "Published test not found.");
    }
    const assigned = await TeacherAssignment.exists({
        teacher: test.createdBy,
        subject: test.subject._id,
        branch: studentBranchId,
        academicBatch: student.academicBatch,
        studyYear: Number(student.studyYear),
        semester: Number(student.semester),
        isActive: true
    });
    if (!assigned) throw resourceError(404, "Published test not found.");
    const now = new Date();
    if (now < test.startAt) throw resourceError(409, "This examination is not available yet.");
    if (now >= test.endAt) throw resourceError(409, "The examination availability window has closed.");
    if (!await User.exists({
        _id: test.createdBy,
        role: "teacher",
        accountStatus: "active"
    })) {
        throw resourceError(404, "Published test not found.");
    }

    const existing = await Attempt.findOne({ student: student.id, test: test.id });
    if (existing) {
        if (existing.status === "IN_PROGRESS") {
            return loadAttempt(existing.id, student.id);
        }
        throw resourceError(409, "An official attempt for this test has already been completed.");
    }

    let attempt;
    try {
        attempt = await Attempt.create({
            student: student.id,
            test: test.id,
            startedAt: now,
            expiresAt: new Date(Math.min(
                now.getTime() + test.duration * 60_000,
                test.endAt.getTime()
            ))
        });
    } catch (error) {
        if (error.code === 11000) {
            const createdByAnotherRequest = await Attempt.findOne({
                student: student.id,
                test: test.id
            });
            if (createdByAnotherRequest?.status === "IN_PROGRESS") {
                return loadAttempt(createdByAnotherRequest.id, student.id);
            }
            throw resourceError(409, "An official attempt for this test has already been completed.");
        }
        throw error;
    }
    const [stillPublished, stillAssigned, activeBranch, activeSubject, activeTeacher] = await Promise.all([
        Test.exists({
            _id: test.id,
            status: "PUBLISHED",
            branch: studentBranchId,
            academicBatch: student.academicBatch,
            studyYear: Number(student.studyYear),
            semester: Number(student.semester)
        }),
        TeacherAssignment.exists({
            teacher: test.createdBy,
            subject: test.subject._id,
            branch: studentBranchId,
            academicBatch: student.academicBatch,
            studyYear: Number(student.studyYear),
            semester: Number(student.semester),
            isActive: true
        }),
        Branch.exists({ _id: studentBranchId, isActive: true }),
        Subject.exists({ _id: test.subject._id, isActive: true, branch: studentBranchId }),
        User.exists({ _id: test.createdBy, role: "teacher", accountStatus: "active" })
    ]);
    if (!stillPublished || !stillAssigned || !activeBranch || !activeSubject ||
        !activeTeacher || Date.now() >= test.endAt.getTime()) {
        await Attempt.deleteOne({ _id: attempt.id, student: student.id });
        throw resourceError(409, "This test is no longer available to start.");
    }
    const questions = await Question.find({ test: test.id }).sort({ position: 1 });
    if (questions.length !== test.totalQuestions) {
        await Attempt.deleteOne({ _id: attempt.id, student: student.id });
        throw resourceError(409, "This test is not ready to be attempted. Contact your teacher.");
    }
    return serializeAttempt(attempt, questions, []);
}

export async function getAttempt(attemptId, studentId) {
    return loadAttempt(attemptId, studentId);
}

export async function saveAnswer(attemptId, questionId, input, studentId) {
    const attempt = await Attempt.findOne({ _id: attemptId, student: studentId });
    if (!attempt) throw resourceError(404, "Attempt not found.");
    if (attempt.status !== "IN_PROGRESS" || Date.now() >= attempt.expiresAt.getTime()) {
        if (attempt.status === "IN_PROGRESS") {
            attempt.status = "TIMED_OUT";
            attempt.submittedAt = attempt.expiresAt;
            await attempt.save();
            await createPendingResult(attempt.id);
        }
        throw resourceError(409, "This exam is no longer accepting answers.");
    }
    const question = await Question.findOne({ _id: questionId, test: attempt.test });
    if (!question) throw resourceError(404, "Question not found for this attempt.");
    const textResponse = input.textResponse?.trim() || "";
    const answer = await Answer.findOneAndUpdate(
        { attempt: attempt.id, question: question.id },
        {
            $set: { textResponse, evaluationStatus: "PENDING" },
            $setOnInsert: { attempt: attempt.id, question: question.id }
        },
        { new: true, upsert: true, runValidators: true }
    );
    return {
        questionId: question.id,
        textResponse: answer.textResponse,
        updatedAt: answer.updatedAt
    };
}

export async function recordSecurityEvent(attemptId, eventType, studentId) {
    const occurredAt = new Date();
    const attempt = await Attempt.findOneAndUpdate(
        {
            _id: attemptId,
            student: studentId,
            status: "IN_PROGRESS",
            expiresAt: { $gt: occurredAt },
            $expr: {
                $lt: [
                    { $size: { $ifNull: ["$securityEvents", []] } },
                    MAX_SECURITY_EVENTS_PER_ATTEMPT
                ]
            }
        },
        { $push: { securityEvents: { type: eventType, occurredAt } } },
        { new: true, runValidators: true, select: "securityEvents" }
    );
    if (!attempt) {
        const existingAttempt = await Attempt.findOne({
            _id: attemptId,
            student: studentId
        }).select("status expiresAt securityEvents");
        if (!existingAttempt) throw resourceError(404, "Attempt not found.");
        if (existingAttempt.securityEvents.length >= MAX_SECURITY_EVENTS_PER_ATTEMPT) {
            throw resourceError(429, "The security event limit for this examination has been reached.");
        }
        throw resourceError(409, "Security events can only be recorded during an active examination.");
    }

    const event = attempt.securityEvents.at(-1);
    return {
        id: event.id,
        type: event.type,
        occurredAt: event.occurredAt
    };
}

export async function submitAttempt(attemptId, studentId) {
    const attempt = await Attempt.findOne({ _id: attemptId, student: studentId });
    if (!attempt) throw resourceError(404, "Attempt not found.");
    if (attempt.status === "IN_PROGRESS") {
        attempt.status = Date.now() >= attempt.expiresAt.getTime() ? "TIMED_OUT" : "SUBMITTED";
        attempt.submittedAt = attempt.status === "TIMED_OUT" ? attempt.expiresAt : new Date();
        await attempt.save();
    }
    await createPendingResult(attempt.id);
    return loadAttempt(attempt.id, studentId);
}

export async function expireDueAttempts() {
    const now = new Date();
    const dueAttempts = await Attempt.find({
        status: "IN_PROGRESS",
        expiresAt: { $lte: now }
    }).select("_id expiresAt").limit(100);
    let expiredCount = 0;
    for (const dueAttempt of dueAttempts) {
        const expiredAttempt = await Attempt.findOneAndUpdate(
            {
                _id: dueAttempt.id,
                status: "IN_PROGRESS",
                expiresAt: { $lte: now }
            },
            {
                $set: {
                    status: "TIMED_OUT",
                    submittedAt: dueAttempt.expiresAt
                }
            },
            { new: true }
        );
        if (expiredAttempt) {
            await createPendingResult(expiredAttempt.id);
            expiredCount += 1;
        }
    }
    return expiredCount;
}
