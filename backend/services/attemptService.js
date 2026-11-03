import { Answer } from "../models/Answer.js";
import { Attempt } from "../models/Attempt.js";
import { Question } from "../models/Question.js";
import { Test } from "../models/Test.js";
import { getActiveTeacherIds } from "./studentTeacherService.js";
import { createPendingResult } from "./evaluationService.js";

function resourceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function safeQuestion(question) {
    return {
        id: question.id,
        position: question.position,
        text: question.text,
        marks: question.marks
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
    return {
        id: attempt.id,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        submittedAt: attempt.submittedAt,
        test: safeTest(attempt.test),
        questions: questions.map((question) => ({
            ...safeQuestion(question),
            response: responseByQuestion.get(question.id) || {
                textResponse: ""
            }
        }))
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
        createdBy: { $in: await getActiveTeacherIds(student._id || student.id) }
    }).populate([
        { path: "branch", select: "name isActive" },
        { path: "subject", select: "name isActive branch" }
    ]);
    if (!test || !test.branch?.isActive || !test.subject?.isActive ||
        test.subject.branch.toString() !== test.branch.id) {
        throw resourceError(404, "Published test not found.");
    }

    const existing = await Attempt.findOne({ student: student.id, test: test.id });
    if (existing) {
        if (existing.status === "IN_PROGRESS") {
            return loadAttempt(existing.id, student.id);
        }
        throw resourceError(409, "An official attempt for this test has already been completed.");
    }

    const now = new Date();
    let attempt;
    try {
        attempt = await Attempt.create({
            student: student.id,
            test: test.id,
            startedAt: now,
            expiresAt: new Date(now.getTime() + test.duration * 60_000)
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
    const stillPublished = await Test.exists({
        _id: test.id,
        status: "PUBLISHED",
        branch: studentBranchId
    });
    if (!stillPublished) {
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
