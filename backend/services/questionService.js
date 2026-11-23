import mongoose from "mongoose";
import { Question } from "../models/Question.js";
import { Test } from "../models/Test.js";
import { teacherCanManageTest } from "./testAccessService.js";

function notFound(message = "Question or test not found.") {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function conflict(message) {
    const error = new Error(message);
    error.statusCode = 409;
    return error;
}

function serializeQuestion(question) {
    return {
        id: question.id,
        testId: question.test.toString(),
        position: question.position,
        questionType: question.questionType,
        text: question.text,
        options: question.options,
        correctAnswer: question.correctAnswer,
        title: question.title,
        instructions: question.instructions,
        contentMethods: question.contentMethods,
        englishContent: question.englishContent,
        equationSource: question.equationSource,
        equationEntries: question.equationEntries,
        drawingPages: question.drawingPages,
        imageUrl: question.imageUrl,
        expectedAnswer: question.expectedAnswer,
        markingScheme: question.markingScheme,
        evaluationInstructions: question.evaluationInstructions,
        marks: question.marks,
        explanation: question.explanation,
        createdAt: question.createdAt,
        updatedAt: question.updatedAt
    };
}

async function getEditableTest(testId, teacherId) {
    const test = await Test.findById(testId);
    if (!test || !await teacherCanManageTest(teacherId, test)) throw notFound("Test not found.");
    if (test.status !== "DRAFT") {
        throw conflict("Questions can only be changed while the test is a draft.");
    }
    return test;
}

function questionValues(input, testType) {
    if (testType === "MCQ") {
        return {
            questionType: "MCQ",
            text: input.text.trim(),
            options: input.options,
            correctAnswer: input.correctAnswer,
            marks: Number(input.marks),
            explanation: input.explanation?.trim() || ""
        };
    }
    return {
        questionType: "DESCRIPTIVE",
        text: input.text.trim(),
        title: input.title?.trim() || "",
        instructions: input.instructions?.trim() || "",
        contentMethods: Array.isArray(input.contentMethods) ? input.contentMethods : ["ENGLISH"],
        englishContent: input.englishContent?.trim() || "",
        equationSource: input.equationSource?.trim() || "",
        equationEntries: Array.isArray(input.equationEntries) ? input.equationEntries : [],
        drawingPages: Array.isArray(input.drawingPages) ? input.drawingPages : [],
        imageUrl: input.imageUrl?.trim() || "",
        expectedAnswer: input.expectedAnswer?.trim() || "",
        markingScheme: input.markingScheme?.trim() || "",
        evaluationInstructions: input.evaluationInstructions?.trim() || "",
        marks: Number(input.marks),
        explanation: input.explanation?.trim() || ""
    };
}

export async function listQuestions(testId, teacherId) {
    const test = await Test.findById(testId);
    if (!test || !await teacherCanManageTest(teacherId, test)) throw notFound("Test not found.");
    const questions = await Question.find({ test: testId }).sort({ position: 1 });
    return questions.map(serializeQuestion);
}

export async function createQuestion(testId, input, teacherId) {
    const test = await getEditableTest(testId, teacherId);
    const currentCount = await Question.countDocuments({ test: testId });
    if (currentCount >= test.totalQuestions) {
        throw conflict("The configured question count has been reached.");
    }
    if (input.questionType && input.questionType !== test.testType) {
        const error = new Error("Question type must match the examination type.");
        error.statusCode = 400;
        throw error;
    }
    const values = questionValues(input, test.testType);
    const question = await Question.create({
        ...values,
        test: testId,
        position: currentCount + 1
    });
    return serializeQuestion(question);
}

export async function updateQuestion(testId, questionId, input, teacherId) {
    const test = await getEditableTest(testId, teacherId);
    const question = await Question.findOne({ _id: questionId, test: testId });
    if (!question) throw notFound("Question not found for this test.");
    if (input.questionType && input.questionType !== test.testType) {
        const error = new Error("Question type must match the examination type.");
        error.statusCode = 400;
        throw error;
    }
    Object.assign(question, questionValues(input, test.testType));
    await question.save();
    return serializeQuestion(question);
}

export async function deleteQuestion(testId, questionId, teacherId) {
    await getEditableTest(testId, teacherId);
    const question = await Question.findOneAndDelete({ _id: questionId, test: testId });
    if (!question) throw notFound("Question not found for this test.");
    await Question.updateMany(
        { test: testId, position: { $gt: question.position } },
        { $inc: { position: -1 } }
    );
    return { id: question.id };
}

export async function reorderQuestions(testId, order, teacherId) {
    await getEditableTest(testId, teacherId);
    const existing = await Question.find({ test: testId }).select("_id");
    const ids = order.map(({ questionId }) => questionId);
    if (
        ids.length !== existing.length ||
        new Set(ids).size !== ids.length ||
        !ids.every((id) => mongoose.isValidObjectId(id)) ||
        !existing.every((question) => ids.includes(question.id))
    ) {
        const error = new Error("Provide every question exactly once to reorder this test.");
        error.statusCode = 400;
        throw error;
    }
    const temporaryOperations = order.map(({ questionId, position }) => ({
        updateOne: {
            filter: { _id: questionId, test: testId },
            update: { $set: { position: -position } }
        }
    }));
    const positions = order.map(({ position }) => position);
    if (new Set(positions).size !== positions.length || Math.min(...positions) !== 1 || Math.max(...positions) !== positions.length) {
        const error = new Error("Question positions must be unique and consecutive starting from 1.");
        error.statusCode = 400;
        throw error;
    }
    if (temporaryOperations.length) {
        await Question.bulkWrite(temporaryOperations, { ordered: true });
        await Question.bulkWrite(order.map(({ questionId, position }) => ({
            updateOne: {
                filter: { _id: questionId, test: testId },
                update: { $set: { position } }
            }
        })), { ordered: true });
    }
    return listQuestions(testId, teacherId);
}

export async function questionCount(testId) {
    return Question.countDocuments({ test: testId });
}
