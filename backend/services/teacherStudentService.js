import mongoose from "mongoose";
import { Attempt } from "../models/Attempt.js";
import { Branch } from "../models/Branch.js";
import { Result } from "../models/Result.js";
import { Subject } from "../models/Subject.js";
import { User } from "../models/User.js";
import { createLookupHash, createNameSearchTokens } from "../utils/fieldEncryption.js";

function escapeRegex(value) {
    return value.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
}

export async function listTeacherStudents(teacherId, filters) {
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    const [ownedBranchIds, subjectBranchIds] = await Promise.all([
        Branch.find({ createdBy: teacherObjectId }).distinct("_id"),
        Subject.find({ createdBy: teacherObjectId }).distinct("branch")
    ]);
    const branchIds = [...new Set(
        [...ownedBranchIds, ...subjectBranchIds].map((id) => id.toString())
    )].map((id) => new mongoose.Types.ObjectId(id));
    const filter = { role: "student", branch: { $in: branchIds } };
    if (filters.branch) {
        const requestedBranch = new mongoose.Types.ObjectId(filters.branch);
        filter.branch = { $in: branchIds, $eq: requestedBranch };
    }
    if (filters.status) filter.accountStatus = filters.status;
    if (filters.search) {
        const pattern = new RegExp(escapeRegex(filters.search), "i");
        const lookupHash = createLookupHash(filters.search);
        const nameTokens = createNameSearchTokens(filters.search);
        const matchingBranches = await Branch.find({
            _id: { $in: branchIds },
            $or: [{ name: pattern }, { code: pattern }]
        }).distinct("_id");
        filter.$or = [
            { studentIdLookup: lookupHash },
            { nameSearchTokens: { $all: nameTokens } },
            { usernameLookup: lookupHash },
            { emailLookup: lookupHash },
            { mobileLookup: lookupHash },
            { branch: { $in: matchingBranches } }
        ];
    }

    const [totalStudents, activeStudents, totalFiltered, students] = await Promise.all([
        User.countDocuments({ role: "student", branch: { $in: branchIds } }),
        User.countDocuments({
            role: "student",
            accountStatus: "active",
            branch: { $in: branchIds }
        }),
        User.countDocuments(filter),
        User.find(filter)
            .select("studentId name username email mobile branch year accountStatus createdAt")
            .populate("branch", "name code")
            .sort({ name: 1, _id: 1 })
            .skip((filters.page - 1) * filters.limit)
            .limit(filters.limit)
    ]);
    const studentIds = students.map((student) => student._id);
    const [performance, attemptCounts] = studentIds.length
        ? await Promise.all([
            Result.aggregate([
                { $match: { student: { $in: studentIds }, evaluationStatus: "PUBLISHED" } },
                {
                    $group: {
                        _id: "$student",
                        completedTests: { $sum: 1 },
                        averagePercentage: { $avg: "$percentage" }
                    }
                }
            ]),
            Attempt.aggregate([
                { $match: { student: { $in: studentIds } } },
                { $group: { _id: "$student", testsAttempted: { $sum: 1 } } }
            ])
        ])
        : [[], []];
    const performanceByStudent = new Map(performance.map((item) => [
        item._id.toString(),
        item
    ]));
    const attemptCountByStudent = new Map(attemptCounts.map((item) => [
        item._id.toString(),
        item.testsAttempted
    ]));
    return {
        students: students.map((student) => {
            const stats = performanceByStudent.get(student._id.toString());
            return {
                id: student._id.toString(),
                studentId: student.studentId,
                name: student.name,
                username: student.username,
                email: student.email,
                mobile: student.mobile,
                branch: student.branch?.name || "",
                branchId: student.branch?._id?.toString() || "",
                branchCode: student.branch?.code || "",
                year: student.year,
                accountStatus: student.accountStatus,
                testsAttempted: attemptCountByStudent.get(student._id.toString()) || 0,
                testsCompleted: stats?.completedTests || 0,
                averagePercentage: stats
                    ? Math.round(stats.averagePercentage * 10) / 10
                    : null,
                createdAt: student.createdAt
            };
        }),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalResults: totalFiltered,
            totalPages: Math.max(1, Math.ceil(totalFiltered / filters.limit))
        },
        summary: {
            totalStudents,
            activeStudents
        }
    };
}
