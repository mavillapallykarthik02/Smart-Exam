import mongoose from "mongoose";
import { Branch } from "../models/Branch.js";
import { ClassTeacherAssignment } from "../models/ClassTeacherAssignment.js";
import { Result } from "../models/Result.js";
import { Subject } from "../models/Subject.js";
import { Test } from "../models/Test.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { TeacherBranchRequest } from "../models/TeacherBranchRequest.js";
import { listTeacherStudents } from "./teacherStudentService.js";

export async function getTeacherDashboard(teacherId) {
    const teacherObjectId = new mongoose.Types.ObjectId(teacherId);
    const [ownedBranchIds, subjectAssignments, classAssignments, approvedBranchIds] = await Promise.all([
        Branch.find({ createdBy: teacherObjectId }).distinct("_id"),
        TeacherAssignment.find({ teacher: teacherObjectId, isActive: true })
            .select("branch subject academicBatch studyYear semester")
            .lean(),
        ClassTeacherAssignment.find({ teacher: teacherObjectId, isActive: true })
            .select("branch academicBatch studyYear semester")
            .lean(),
        TeacherBranchRequest.find({ teacher: teacherObjectId, status: "APPROVED" })
            .distinct("branch")
    ]);
    const assignments = [...subjectAssignments, ...classAssignments];
    const branchIds = [...new Set(
        [
            ...ownedBranchIds,
            ...approvedBranchIds,
            ...assignments.map((assignment) => assignment.branch.toString())
        ]
            .map((id) => id.toString())
    )].map((id) => new mongoose.Types.ObjectId(id));
    const approvedBranchIdSet = new Set(approvedBranchIds.map((id) => id.toString()));
    const assignedSubjectIds = [...new Set(subjectAssignments
        .filter((assignment) => approvedBranchIdSet.has(assignment.branch.toString()))
        .map((assignment) => assignment.subject.toString()))]
        .map((id) => new mongoose.Types.ObjectId(id));
    const [branches, subjects, testRows, studentPage, resultStats] = await Promise.all([
        branchIds.length
            ? Branch.countDocuments({ _id: { $in: branchIds }, isActive: true })
            : 0,
        assignedSubjectIds.length
            ? Subject.countDocuments({ _id: { $in: assignedSubjectIds }, isActive: true })
            : 0,
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
        ]),
        listTeacherStudents(teacherObjectId, {
            page: 1,
            limit: 1,
            search: "",
            branch: "",
            studyYear: "",
            status: ""
        }),
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
    const testStats = testRows[0] || { total: 0, published: 0, draft: 0 };
    const result = resultStats[0];
    const totalStudents = studentPage.summary.totalStudents;
    return {
        students: {
            total: totalStudents,
            active: studentPage.summary.activeStudents,
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
