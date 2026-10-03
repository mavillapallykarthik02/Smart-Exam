import { Answer } from "../models/Answer.js";
import { Attempt } from "../models/Attempt.js";
import { Question } from "../models/Question.js";
import { Result } from "../models/Result.js";
import { Test } from "../models/Test.js";

function normalizeTypingResponse(value) {
    return value.normalize("NFKC").trim().toLocaleLowerCase().replace(/\s+/gu, " ");
}

function roundMarks(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function evaluateAttempt(attemptId) {
    const attempt = await Attempt.findById(attemptId);
    if (!attempt || attempt.status === "IN_PROGRESS") {
        const error = new Error("Only submitted exams can be evaluated.");
        error.statusCode = 409;
        throw error;
    }

    const existingResult = await Result.findOne({ attempt: attempt.id });
    if (existingResult) return existingResult;

    const [test, questions, answers] = await Promise.all([
        Test.findById(attempt.test),
        Question.find({ test: attempt.test }).sort({ position: 1 }),
        Answer.find({ attempt: attempt.id })
    ]);
    if (!test) {
        const error = new Error("The test for this attempt could not be found.");
        error.statusCode = 404;
        throw error;
    }

    const answerByQuestion = new Map(answers.map((answer) => [
        answer.question.toString(),
        answer
    ]));
    let obtainedMarks = 0;
    let correctAnswers = 0;
    let incorrectAnswers = 0;
    let unanswered = 0;

    for (const question of questions) {
        const answer = answerByQuestion.get(question.id);
        const responseValue = question.questionType === "MCQ"
            ? answer?.selectedOption || ""
            : answer?.textResponse || "";
        if (!responseValue.trim()) {
            unanswered += 1;
            if (answer) {
                answer.marksAwarded = 0;
                answer.isCorrect = null;
                answer.evaluationStatus = "EVALUATED";
                await answer.save();
            }
            continue;
        }

        const correct = question.questionType === "MCQ"
            ? responseValue.trim().toUpperCase() === question.correctAnswer
            : normalizeTypingResponse(responseValue) ===
                normalizeTypingResponse(question.expectedAnswer);
        const marksAwarded = correct
            ? question.marks
            : question.questionType === "MCQ"
                ? -Math.min(question.negativeMarks, question.marks)
                : 0;
        obtainedMarks += marksAwarded;
        if (correct) {
            correctAnswers += 1;
        } else {
            incorrectAnswers += 1;
        }
        if (answer) {
            answer.marksAwarded = roundMarks(marksAwarded);
            answer.isCorrect = correct;
            answer.evaluationStatus = "EVALUATED";
            await answer.save();
        }
    }

    obtainedMarks = roundMarks(obtainedMarks);
    const percentage = test.totalMarks > 0
        ? Math.max(0, Math.min(100, roundMarks(obtainedMarks / test.totalMarks * 100)))
        : 0;
    try {
        return await Result.create({
            attempt: attempt.id,
            student: attempt.student,
            test: test.id,
            totalMarks: test.totalMarks,
            obtainedMarks,
            percentage,
            correctAnswers,
            incorrectAnswers,
            unanswered,
            passed: obtainedMarks >= test.totalMarks * test.passingPercentage / 100,
            submittedAt: attempt.submittedAt || new Date()
        });
    } catch (error) {
        if (error.code === 11000) {
            return Result.findOne({ attempt: attempt.id });
        }
        throw error;
    }
}
