import mongoose from "mongoose";
import { Result } from "../models/Result.js";

function roundPercentage(value) {
    return Math.round(value * 10) / 10;
}

export async function getStudentProgress(studentId) {
    const studentObjectId = new mongoose.Types.ObjectId(studentId);
    const [summaryRows, subjectPerformance, recentResults, trendRows, comparisonRows] =
        await Promise.all([
            Result.aggregate([
                { $match: { student: studentObjectId, evaluationStatus: "PUBLISHED" } },
                {
                    $group: {
                        _id: null,
                        completedTests: { $sum: 1 },
                        averagePercentage: { $avg: "$percentage" },
                        highestPercentage: { $max: "$percentage" },
                        obtainedMarks: { $sum: "$obtainedMarks" },
                        availableMarks: { $sum: "$totalMarks" },
                        passedTests: { $sum: { $cond: ["$passed", 1, 0] } },
                        failedTests: { $sum: { $cond: ["$passed", 0, 1] } }
                    }
                }
            ]),
            Result.aggregate([
                { $match: { student: studentObjectId, evaluationStatus: "PUBLISHED" } },
                {
                    $lookup: {
                        from: "tests",
                        localField: "test",
                        foreignField: "_id",
                        as: "test"
                    }
                },
                { $unwind: { path: "$test", preserveNullAndEmptyArrays: true } },
                {
                    $lookup: {
                        from: "subjects",
                        localField: "test.subject",
                        foreignField: "_id",
                        as: "subject"
                    }
                },
                { $unwind: { path: "$subject", preserveNullAndEmptyArrays: true } },
                {
                    $group: {
                        _id: "$test.subject",
                        name: { $first: { $ifNull: ["$subject.name", "Archived subject"] } },
                        attempts: { $sum: 1 },
                        averagePercentage: { $avg: "$percentage" }
                    }
                },
                { $sort: { averagePercentage: -1, name: 1 } },
                {
                    $project: {
                        _id: 0,
                        name: 1,
                        attempts: 1,
                        averagePercentage: { $round: ["$averagePercentage", 1] }
                    }
                }
            ]),
            Result.find({ student: studentObjectId, evaluationStatus: "PUBLISHED" })
                .populate({
                    path: "test",
                    select: "title subject",
                    populate: { path: "subject", select: "name" }
                })
                .sort({ submittedAt: -1, _id: -1 })
                .limit(5)
                .lean(),
            Result.find({ student: studentObjectId, evaluationStatus: "PUBLISHED" })
                .select("percentage submittedAt")
                .sort({ submittedAt: -1, _id: -1 })
                .limit(30)
                .lean(),
            Result.find({ student: studentObjectId, evaluationStatus: "PUBLISHED" })
                .select("percentage")
                .sort({ submittedAt: -1, _id: -1 })
                .limit(6)
                .lean()
        ]);

    const summary = summaryRows[0];
    const chronologicalTrend = trendRows.reverse().map((result) => ({
        percentage: result.percentage,
        submittedAt: result.submittedAt
    }));
    const latestSix = comparisonRows.reverse();
    const improvement = latestSix.length === 6
        ? latestSix.slice(3).reduce((sum, result) => sum + result.percentage, 0) / 3 -
            latestSix.slice(0, 3).reduce((sum, result) => sum + result.percentage, 0) / 3
        : null;

    return {
        testsAttempted: summary?.completedTests || 0,
        completedTests: summary?.completedTests || 0,
        averagePercentage: summary ? roundPercentage(summary.averagePercentage) : 0,
        highestPercentage: summary ? roundPercentage(summary.highestPercentage) : 0,
        totalMarksObtained: summary?.obtainedMarks || 0,
        totalMarksAvailable: summary?.availableMarks || 0,
        passedTests: summary?.passedTests || 0,
        failedTests: summary?.failedTests || 0,
        improvement: improvement === null ? null : roundPercentage(improvement),
        subjectPerformance,
        recentResults: recentResults.map((result) => ({
            id: result._id.toString(),
            test: result.test?.title || "Archived test",
            subject: result.test?.subject?.name || "",
            percentage: result.percentage,
            submittedAt: result.submittedAt
        })),
        trend: chronologicalTrend
    };
}
