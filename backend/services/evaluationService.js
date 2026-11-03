import { Answer } from "../models/Answer.js";
import { Attempt } from "../models/Attempt.js";
import { Question } from "../models/Question.js";
import { Result } from "../models/Result.js";
import { Test } from "../models/Test.js";

function roundMarks(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function createPendingResult(attemptId) {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt || attempt.status === "IN_PROGRESS") {
        const error = new Error("Only submitted examinations can be queued for evaluation.");
        error.statusCode = 409;
        throw error;
    }

    const [test, questions] = await Promise.all([
        Test.findById(attempt.test),
        Question.find({ test: attempt.test }).select("_id")
    ]);
    if (!test) {
        const error = new Error("The examination for this attempt could not be found.");
        error.statusCode = 404;
        throw error;
    }

    await Answer.bulkWrite(questions.map((question) => ({
        updateOne: {
            filter: { attempt: attempt.id, question: question.id },
            update: {
                $setOnInsert: {
                    attempt: attempt.id,
                    question: question.id,
                    textResponse: "",
                    evaluationStatus: "PENDING"
                }
            },
            upsert: true
        }
    })), { ordered: true });

    try {
        return await Result.findOneAndUpdate(
            { attempt: attempt.id },
            {
                $setOnInsert: {
                    attempt: attempt.id,
                    student: attempt.student,
                    test: test.id,
                    totalMarks: test.totalMarks,
                    obtainedMarks: 0,
                    percentage: 0,
                    unanswered: 0,
                    passed: false,
                    evaluationStatus: "PENDING_EVALUATION",
                    submittedAt: attempt.submittedAt || new Date()
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );
    } catch (error) {
        if (error.code === 11000) return Result.findOne({ attempt: attempt.id });
        throw error;
    }
}

export async function saveAnswerEvaluation(resultId, questionId, teacher, input) {
    const result = await Result.findById(resultId);
    if (!result) {
        const error = new Error("Result not found.");
        error.statusCode = 404;
        throw error;
    }
    if (teacher.role !== "teacher" ||
        !await Test.exists({ _id: result.test, createdBy: teacher.id })) {
        const error = new Error("Result not found.");
        error.statusCode = 404;
        throw error;
    }
    if (result.evaluationStatus === "PUBLISHED") {
        const error = new Error("Published results cannot be changed.");
        error.statusCode = 409;
        throw error;
    }

    const answer = await Answer.findOne({
        attempt: result.attempt,
        question: questionId
    });
    const question = await Question.findOne({
        _id: questionId,
        test: result.test
    });
    if (!answer || !question) {
        const error = new Error("Answer not found for this examination.");
        error.statusCode = 404;
        throw error;
    }

    const marksAwarded = Number(input.marksAwarded);
    if (!Number.isFinite(marksAwarded) || marksAwarded < 0 || marksAwarded > question.marks) {
        const error = new Error(`Marks must be between 0 and ${question.marks}.`);
        error.statusCode = 400;
        throw error;
    }
    answer.marksAwarded = roundMarks(marksAwarded);
    answer.feedback = input.feedback?.trim() || "";
    answer.evaluationStatus = "EVALUATED";
    await answer.save();

    const answers = await Answer.find({ attempt: result.attempt });
    if (answers.length === await Question.countDocuments({ test: result.test }) &&
        answers.every((item) => item.evaluationStatus === "EVALUATED")) {
        const obtainedMarks = roundMarks(answers.reduce((total, item) => total + item.marksAwarded, 0));
        result.obtainedMarks = obtainedMarks;
        result.percentage = result.totalMarks > 0
            ? roundMarks(obtainedMarks / result.totalMarks * 100)
            : 0;
        result.passed = obtainedMarks >= result.totalMarks *
            (await Test.findById(result.test).select("passingPercentage")).passingPercentage / 100;
        result.evaluationStatus = "EVALUATED";
        await result.save();
    }

    return {
        questionId: question.id,
        marksAwarded: answer.marksAwarded,
        feedback: answer.feedback,
        evaluationStatus: answer.evaluationStatus,
        resultStatus: result.evaluationStatus
    };
}

export async function publishResult(resultId, teacher) {
    const result = await Result.findById(resultId);
    if (!result || teacher.role !== "teacher" ||
        !await Test.exists({ _id: result.test, createdBy: teacher.id })) {
        const error = new Error("Result not found.");
        error.statusCode = 404;
        throw error;
    }
    if (result.evaluationStatus === "PUBLISHED") return result;

    const [answers, questionCount] = await Promise.all([
        Answer.find({ attempt: result.attempt }),
        Question.countDocuments({ test: result.test })
    ]);
    if (result.evaluationStatus !== "EVALUATED" ||
        answers.length !== questionCount ||
        !answers.every((answer) => answer.evaluationStatus === "EVALUATED")) {
        const error = new Error("Evaluate every answer before publishing this result.");
        error.statusCode = 409;
        throw error;
    }
    result.evaluationStatus = "PUBLISHED";
    result.publishedAt = new Date();
    await result.save();
    return result;
}
