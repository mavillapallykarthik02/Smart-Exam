import { Branch } from "../models/Branch.js";
import { Attempt } from "../models/Attempt.js";
import { Question } from "../models/Question.js";
import { Subject } from "../models/Subject.js";
import { Test } from "../models/Test.js";
import { User } from "../models/User.js";
import { INSTITUTION_KEY } from "../config/institution.js";
import { getActiveTeacherIds } from "./studentTeacherService.js";

function notFound(message = "Test not found.") {
    const error = new Error(message);
    error.statusCode = 404;
    return error;
}

function serializeTest(test) {
    return {
        id: test.id,
        title: test.title,
        description: test.description,
        branch: test.branch ? {
            id: test.branch.id,
            name: test.branch.name,
            code: test.branch.code
        } : null,
        subject: test.subject ? {
            id: test.subject.id,
            name: test.subject.name,
            code: test.subject.code
        } : null,
        duration: test.duration,
        testType: test.testType,
        status: test.status,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        passingPercentage: test.passingPercentage,
        instructions: test.instructions,
        teacher: test.createdBy && typeof test.createdBy === "object"
            ? {
                id: test.createdBy.id,
                name: test.createdBy.name,
                teacherId: test.createdBy.teacherId
            }
            : null,
        publishedAt: test.publishedAt,
        createdAt: test.createdAt,
        updatedAt: test.updatedAt
    };
}

async function activeAssignment(branchId, subjectId, teacherId) {
    const teacher = teacherId
        ? await User.findOne({ _id: teacherId, role: "teacher" }).select("institution teacherId")
        : null;
    if (teacherId && !teacher) {
        const error = new Error("Teacher not found.");
        error.statusCode = 404;
        throw error;
    }
    const [branch, subject] = await Promise.all([
        Branch.findOne({
            _id: branchId,
            isActive: true,
            ...(teacher ? {
                institutionKey: INSTITUTION_KEY
            } : {})
        }).select("_id name code"),
        Subject.findOne({
            _id: subjectId,
            isActive: true,
            ...(teacherId ? { createdBy: teacherId } : {})
        }).populate("branch", "_id isActive")
    ]);
    if (!branch) {
        const error = new Error("The selected branch is unavailable to this teacher or inactive.");
        error.statusCode = 400;
        throw error;
    }
    if (!subject || !subject.branch?.isActive) {
        const error = new Error("The selected subject is unavailable to this teacher or inactive.");
        error.statusCode = 400;
        throw error;
    }
    if (subject.branch.id !== branch.id) {
        const error = new Error("The selected subject does not belong to the selected branch.");
        error.statusCode = 400;
        throw error;
    }
    return { branch, subject, teacher };
}

function applyChanges(test, input) {
    test.title = input.title;
    test.description = input.description || "";
    test.branch = input.branch;
    test.subject = input.subject;
    test.duration = Number(input.duration);
    test.testType = input.testType;
    test.totalQuestions = Number(input.totalQuestions);
    test.totalMarks = Number(input.totalMarks);
    test.passingPercentage = input.passingPercentage === undefined
        ? 40
        : Number(input.passingPercentage);
    test.instructions = input.instructions || "";
}

export async function listTests({ user, filters }) {
    const connectedTeacherIds = user.role === "student"
        ? await getActiveTeacherIds(user._id || user.id)
        : [];
    const filter = user.role === "teacher"
        ? { createdBy: user.id }
        : {
            status: "PUBLISHED",
            branch: user.branch?._id || user.branch,
            createdBy: { $in: connectedTeacherIds }
        };
    if (filters.status && user.role === "teacher") filter.status = filters.status;
    if (filters.branch && user.role === "teacher") filter.branch = filters.branch;
    if (filters.subject) filter.subject = filters.subject;
    if (filters.search) filter.title = { $regex: filters.search, $options: "i" };

    let query = Test.find(filter)
        .populate("branch", "name code isActive")
        .populate("subject", "name code isActive branch")
        .populate("createdBy", "name teacherId institution")
        .sort({ updatedAt: -1 });
    const tests = await query;
    const applicableTests = user.role === "student"
        ? tests.filter((test) => (
            test.branch?.isActive &&
            test.subject?.isActive &&
            test.subject.branch?.toString() === test.branch.id
        ))
        : tests;
    return applicableTests.map(serializeTest);
}

export async function getTestById(id, user) {
    const filter = { _id: id };
    if (user.role === "teacher") {
        filter.createdBy = user.id;
    } else {
        filter.status = "PUBLISHED";
        filter.branch = user.branch?._id || user.branch;
        filter.createdBy = { $in: await getActiveTeacherIds(user._id || user.id) };
    }
    const test = await Test.findOne(filter)
        .populate("branch", "name code isActive")
        .populate("subject", "name code isActive branch")
        .populate("createdBy", "name teacherId institution");
    if (!test) throw notFound();
    if (user.role === "student" && (
        !test.branch?.isActive ||
        !test.subject?.isActive ||
        test.subject.branch?.toString() !== test.branch.id
    )) {
        throw notFound();
    }
    return serializeTest(test);
}

export async function createTest(input, teacherId) {
    await activeAssignment(input.branch, input.subject, teacherId);
    const test = new Test({ createdBy: teacherId });
    applyChanges(test, input);
    await test.save();
    await test.populate([
        { path: "branch", select: "name code isActive" },
        { path: "subject", select: "name code isActive branch" },
        { path: "createdBy", select: "name teacherId institution" }
    ]);
    return serializeTest(test);
}

export async function updateTest(id, input, teacherId) {
    const test = await Test.findOne({ _id: id, createdBy: teacherId });
    if (!test) throw notFound();
    if (test.status !== "DRAFT") {
        const error = new Error("Unpublish the test before editing it.");
        error.statusCode = 409;
        throw error;
    }
    if (await Attempt.exists({ test: test.id })) {
        const error = new Error("Tests with started attempts cannot be edited.");
        error.statusCode = 409;
        throw error;
    }
    await activeAssignment(input.branch, input.subject, teacherId);
    applyChanges(test, input);
    await test.save();
    await test.populate([
        { path: "branch", select: "name code isActive" },
        { path: "subject", select: "name code isActive branch" },
        { path: "createdBy", select: "name teacherId institution" }
    ]);
    return serializeTest(test);
}

export async function setTestStatus(id, status, teacherId) {
    const test = await Test.findOne({ _id: id, createdBy: teacherId });
    if (!test) throw notFound();
    if (test.status === "ARCHIVED" && status !== "ARCHIVED") {
        const error = new Error("Archived tests cannot be republished.");
        error.statusCode = 409;
        throw error;
    }
    if (status === "DRAFT" && await Attempt.exists({ test: test.id })) {
        const error = new Error("Tests with started attempts cannot be unpublished.");
        error.statusCode = 409;
        throw error;
    }
    if (status === "PUBLISHED") {
        await activeAssignment(test.branch, test.subject, teacherId);
        const [questionCount, marks] = await Promise.all([
            Question.countDocuments({ test: test.id }),
            Question.aggregate([
                { $match: { test: test._id } },
                { $group: { _id: null, total: { $sum: "$marks" } } }
            ])
        ]);
        const totalQuestionMarks = marks[0]?.total || 0;
        if (questionCount !== test.totalQuestions) {
            const error = new Error(
                `Add exactly ${test.totalQuestions} questions before publishing; this test has ${questionCount}.`
            );
            error.statusCode = 409;
            throw error;
        }
        if (Math.abs(totalQuestionMarks - test.totalMarks) > 0.005) {
            const error = new Error(
                `Question marks total ${totalQuestionMarks}, but the test is configured for ${test.totalMarks}.`
            );
            error.statusCode = 409;
            throw error;
        }
        test.publishedAt = test.publishedAt || new Date();
    } else if (status === "DRAFT") {
        test.publishedAt = null;
    }
    test.status = status;
    await test.save();
    await test.populate([
        { path: "branch", select: "name code isActive" },
        { path: "subject", select: "name code isActive branch" }
    ]);
    return serializeTest(test);
}

export async function archiveTest(id, teacherId) {
    return setTestStatus(id, "ARCHIVED", teacherId);
}
