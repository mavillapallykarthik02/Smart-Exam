import { Answer } from "../models/Answer.js";
import { Attempt } from "../models/Attempt.js";
import { Branch } from "../models/Branch.js";
import { Question } from "../models/Question.js";
import { Subject } from "../models/Subject.js";
import { Result } from "../models/Result.js";
import { Test } from "../models/Test.js";
import { User } from "../models/User.js";
import { createLookupHash, createNameSearchTokens } from "../utils/fieldEncryption.js";

function notFound() {
    const error = new Error("Result not found.");
    error.statusCode = 404;
    return error;
}

function serializeResult(result) {
    return {
        id: result.id,
        attemptId: result.attempt?.toString() || "",
        student: result.student ? {
            id: result.student.id,
            studentId: result.student.studentId,
            name: result.student.name,
            username: result.student.username,
            email: result.student.email,
            mobile: result.student.mobile,
            branch: result.student.branch?.name || "",
            branchCode: result.student.branch?.code || "",
            year: result.student.year,
            institution: result.student.institution
        } : null,
        test: result.test ? {
            id: result.test.id,
            title: result.test.title,
            subject: result.test.subject?.name || "",
            branch: result.test.branch?.name || ""
        } : null,
        totalMarks: result.totalMarks,
        obtainedMarks: result.obtainedMarks,
        percentage: result.percentage,
        unanswered: result.unanswered,
        passed: result.passed,
        evaluationStatus: result.evaluationStatus,
        publishedAt: result.publishedAt,
        submittedAt: result.submittedAt
    };
}

const resultPopulation = [
    {
        path: "student",
        select: "studentId name username email mobile branch year institution",
        populate: { path: "branch", select: "name code" }
    },
    {
        path: "test",
        select: "title subject branch",
        populate: [
            { path: "subject", select: "name" },
            { path: "branch", select: "name" }
        ]
    }
];

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export async function listResults(user, filters) {
    let filter;
    if (user.role === "student") {
        filter = { student: user._id, evaluationStatus: "PUBLISHED" };
    } else {
        const tests = await Test.find({ createdBy: user._id }).select("_id");
        filter = { test: { $in: tests.map((test) => test._id) } };
    }
    if (filters.status === "PASSED") filter.passed = true;
    if (filters.status === "FAILED") filter.passed = false;
    if (filters.date) {
        const start = new Date(`${filters.date}T00:00:00.000Z`);
        const end = new Date(start);
        end.setUTCDate(end.getUTCDate() + 1);
        filter.submittedAt = { $gte: start, $lt: end };
    }
    if (filters.search) {
        const pattern = new RegExp(escapeRegex(filters.search), "i");
        const lookupHash = createLookupHash(filters.search);
        const nameTokens = createNameSearchTokens(filters.search);
        const [matchingSubjects, matchingBranches, matchingStudents] = await Promise.all([
            Subject.find({ name: pattern }).select("_id"),
            Branch.find({ $or: [{ name: pattern }, { code: pattern }] }).select("_id"),
            User.find({
                role: "student",
                $or: [
                    { studentIdLookup: lookupHash },
                    { nameSearchTokens: { $all: nameTokens } },
                    { usernameLookup: lookupHash },
                    { emailLookup: lookupHash }
                ]
            }).select("_id")
        ]);
        const ownedTestFilter = user.role === "teacher" ? { createdBy: user._id } : {};
        const matchingTests = await Test.find({
            ...ownedTestFilter,
            $or: [
                { title: pattern },
                    { subject: { $in: matchingSubjects.map((subject) => subject._id) } },
                    { branch: { $in: matchingBranches.map((branch) => branch._id) } }
            ]
        }).select("_id");
        const searchAlternatives = [
                { test: { $in: matchingTests.map((test) => test._id) } }
        ];
        if (user.role === "teacher") {
            searchAlternatives.push({
                student: { $in: matchingStudents.map((student) => student._id) }
            });
        }
        filter.$and = [...(filter.$and || []), { $or: searchAlternatives }];
    }
    const totalResults = await Result.countDocuments(filter);
    const [summaryRows, participantRows] = await Promise.all([
        Result.aggregate([
            { $match: filter },
            {
                $group: {
                    _id: null,
                    totalAttempts: { $sum: 1 },
                    passed: { $sum: { $cond: ["$passed", 1, 0] } },
                    failed: { $sum: { $cond: ["$passed", 0, 1] } },
                    unanswered: { $sum: "$unanswered" },
                    averagePercentage: { $avg: "$percentage" }
                }
            }
        ]),
        Result.aggregate([
            { $match: filter },
            { $group: { _id: "$student" } },
            { $count: "participantCount" }
        ])
    ]);
    const summary = summaryRows[0]
        ? {
            totalAttempts: summaryRows[0].totalAttempts,
            passed: summaryRows[0].passed,
            failed: summaryRows[0].failed,
            participantCount: participantRows[0]?.participantCount || 0,
            unanswered: summaryRows[0].unanswered,
            averagePercentage: Math.round(summaryRows[0].averagePercentage * 10) / 10
        }
        : {
            totalAttempts: 0,
            passed: 0,
            failed: 0,
            participantCount: 0,
            unanswered: 0,
            averagePercentage: 0
        };
    const page = filters.page;
    const limit = filters.limit;
    const results = await Result.find(filter)
        .populate(resultPopulation)
        .sort({ submittedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit);
    return {
        results: results.map(serializeResult),
        pagination: {
            page,
            limit,
            totalResults,
            totalPages: Math.max(1, Math.ceil(totalResults / limit))
        },
        summary
    };
}

export async function getResult(id, user) {
    const result = await Result.findById(id).populate(resultPopulation);
    if (!result) throw notFound();
    if (user.role === "student" && (
        result.student.id !== user.id ||
        result.evaluationStatus !== "PUBLISHED"
    )) throw notFound();
    if (user.role === "teacher") {
        const ownedTest = await Test.exists({ _id: result.test.id, createdBy: user.id });
        if (!ownedTest) throw notFound();
    }
    const [attempt, questions, answers] = await Promise.all([
        Attempt.findById(result.attempt),
        Question.find({ test: result.test.id }).sort({ position: 1 }),
        Answer.find({ attempt: result.attempt })
    ]);
    const answerByQuestion = new Map(answers.map((answer) => [
        answer.question.toString(),
        answer
    ]));
    const review = questions.map((question) => {
        const answer = answerByQuestion.get(question.id);
        return {
            id: question.id,
            position: question.position,
            text: question.text,
            textResponse: answer?.textResponse || "",
            marks: question.marks,
            marksAwarded: answer?.marksAwarded ?? null,
            feedback: answer?.feedback || "",
            evaluationStatus: answer?.evaluationStatus || "PENDING",
            unanswered: !answer || !answer.textResponse
        };
    });
    return {
        ...serializeResult(result),
        durationSeconds: attempt
            ? Math.round((attempt.submittedAt || result.submittedAt) - attempt.startedAt) / 1000
            : null,
        answers: review
    };
}
