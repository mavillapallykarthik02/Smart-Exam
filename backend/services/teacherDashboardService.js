import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { ClassTeacherAssignment } from "../models/ClassTeacherAssignment.js";
import { Result } from "../models/Result.js";
import { Subject } from "../models/Subject.js";
import { Test } from "../models/Test.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { User } from "../models/User.js";

export async function getTeacherDashboard(teacherId) {
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    const [ownedBranchIds, subjectBranchIds, subjectAssignments, classAssignments] = await Promise.all([
        Branch.find({ createdBy: teacherObjectId }).distinct("_id"),
        Subject.find({ createdBy: teacherObjectId }).distinct("branch"),
        TeacherAssignment.find({ teacher: teacherObjectId, isActive: true })
            .select("branch academicBatch studyYear semester")
            .lean(),
        ClassTeacherAssignment.find({ teacher: teacherObjectId, isActive: true })
            .select("branch academicBatch studyYear semester")
            .lean()
    ]);
    const assignments = [...subjectAssignments, ...classAssignments];
    const branchIds = [...new Set(
        [...ownedBranchIds, ...subjectBranchIds, ...assignments.map((assignment) => assignment.branch.toString())]
            .map((id) => id.toString())
    )].map((id) => new mongoose.Types.ObjectId(id));
    const [branches, subjects, testRows] = await Promise.all([
        branchIds.length
            ? Branch.countDocuments({ _id: { $in: branchIds } })
            : 0,
        Subject.countDocuments({ createdBy: teacherObjectId }),
        Test.aggregate([
            { $match: { createdBy: teacherObjectId } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    published: { $sum: { $cond: [{ $eq: ["$status", "PUBLISHED"] }, 1, 0] } },
                    draft: { $sum: { $cond: [{ $eq: ["$status", "DRAFT"] }, 1, 0] } },
                }
            }
        ])
    ]);
    const testStats = testRows[0] || { total: 0, published: 0, draft: 0 };
    const uniqueClassFilters = [];
    const classFilterKeys = new Set();
    for (const assignment of assignments) {
        const key = [
            assignment.branch.toString(),
            assignment.academicBatch,
            assignment.studyYear
        ].join(":");
        if (classFilterKeys.has(key)) continue;
        classFilterKeys.add(key);
        uniqueClassFilters.push({
            branch: assignment.branch,
            academicBatch: assignment.academicBatch,
            studyYear: assignment.studyYear
        });
    }
    const studentClassFilters = uniqueClassFilters;
    const [studentStats, resultStats] = await Promise.all([
        User.aggregate([
            {
                $match: {
                    role: "student",
                    accountStatus: { $in: ["active", "approved"] },
                    branch: { $in: branchIds },
                    $or: studentClassFilters.length
                        ? studentClassFilters
                        : [{ branch: { $in: [] } }]
                }
            },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    active: {
                        $sum: {
                            $cond: [{ $in: ["$accountStatus", ["active", "approved"]] }, 1, 0]
                        }
                    }
                }
            }
        ]),
        Result.aggregate([
            {
                $lookup: {
                    from: "tests",
                    localField: "test",
                    foreignField: "_id",
                    as: "managedTest"
                }
            },
            { $unwind: "$managedTest" },
            { $match: { "managedTest.createdBy": teacherObjectId } },
            {
                $group: {
                    _id: "$student",
                    attempts: { $sum: 1 },
                    percentageTotal: { $sum: "$percentage" },
                    passed: { $sum: { $cond: ["$passed", 1, 0] } }
                }
            },
            {
                $group: {
                    _id: null,
                    attempts: { $sum: "$attempts" },
                    percentageTotal: { $sum: "$percentageTotal" },
                    passed: { $sum: "$passed" },
                    participants: { $sum: 1 }
                }
            },
            {
                $project: {
                    attempts: 1,
                    averagePercentage: {
                        $round: [{ $divide: ["$percentageTotal", "$attempts"] }, 1]
                    },
                    passed: 1,
                    participants: 1
                }
            }
        ])
    ]);
    const result = resultStats[0];
    const students = studentStats[0];
    const totalStudents = students?.total || 0;
    return {
        students: {
            total: totalStudents,
            active: students?.active || 0,
            participants: result?.participants || 0
        },
        tests: {
            total: testStats.total,
            published: testStats.published,
            draft: testStats.draft
        },
        branches,
        subjects,
        results: {
            attempts: result?.attempts || 0,
            passed: result?.passed || 0,
            averagePercentage: result?.averagePercentage || 0
        }
    };
}
