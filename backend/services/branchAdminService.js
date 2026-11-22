import { Branch } from "../models/Branch.js";
import { Subject } from "../models/Subject.js";
import { User } from "../models/User.js";
import { Result } from "../models/Result.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { Test } from "../models/Test.js";
import { TeacherBranchRequest } from "../models/TeacherBranchRequest.js";

function resourceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function getBranchForAdministrator(administrator) {
    const branch = await Branch.findOne({
        _id: administrator.branch,
        institutionKey: administrator.institutionKey,
        isArchived: { $ne: true }
    });
    if (!branch) throw resourceError(404, "Your assigned branch was not found.");
    return branch;
}

export async function listBranchTeacherRequests(administrator) {
    const branch = await getBranchForAdministrator(administrator);
    const requests = await TeacherBranchRequest.find({ branch: branch._id })
        .populate("teacher", "name username email mobile teacherId departmentName designation branchName verificationStatus accountStatus")
        .populate("reviewedBy", "name username")
        .sort({ status: 1, createdAt: -1 });
    return requests.map((request) => ({
        id: request.id,
        status: request.status,
        reason: request.reason,
        reviewedAt: request.reviewedAt,
        reviewedBy: request.reviewedBy ? {
            id: request.reviewedBy.id,
            name: request.reviewedBy.name
        } : null,
        teacher: request.teacher ? {
            id: request.teacher.id,
            name: request.teacher.name,
            username: request.teacher.username,
            email: request.teacher.email,
            mobile: request.teacher.mobile,
            teacherId: request.teacher.teacherId,
            departmentName: request.teacher.departmentName,
            designation: request.teacher.designation,
            accountStatus: request.teacher.accountStatus
        } : null,
        createdAt: request.createdAt,
        updatedAt: request.updatedAt
    }));
}

export async function reviewBranchTeacherRequest(administrator, requestId, status, reason = "") {
    if (!["APPROVED", "REJECTED"].includes(status)) {
        throw resourceError(400, "Choose APPROVED or REJECTED.");
    }
    if (status === "REJECTED" && reason.trim().length < 3) {
        throw resourceError(400, "Enter a rejection reason with at least 3 characters.");
    }
    const branch = await getBranchForAdministrator(administrator);
    const request = await TeacherBranchRequest.findOne({
        _id: requestId,
        branch: branch._id
    }).populate("teacher", "name username email teacherId");
    if (!request) throw resourceError(404, "Branch request not found.");

    request.status = status;
    request.reason = status === "REJECTED" ? reason.trim() : "";
    request.reviewedBy = administrator._id;
    request.reviewedAt = new Date();
    await request.save();

    return {
        id: request.id,
        status: request.status,
        reason: request.reason,
        teacher: request.teacher ? {
            id: request.teacher.id,
            name: request.teacher.name
        } : null
    };
}

export async function getBranchAdminOverview(administrator) {
    const branch = await getBranchForAdministrator(administrator);
    const [pendingTeachers, approvedTeachers, subjects, students, results] = await Promise.all([
        User.countDocuments({ role: "teacher", institutionKey: administrator.institutionKey, branchName: branch.name, verificationStatus: "PENDING" }),
        User.countDocuments({ role: "teacher", institutionKey: administrator.institutionKey, branchName: branch.name, verificationStatus: "APPROVED" }),
        Subject.countDocuments({ branch: branch._id }),
        User.countDocuments({ role: "student", institutionKey: administrator.institutionKey, branch: branch._id }),
        Result.find({ evaluationStatus: "PUBLISHED" }).populate("test", "branch").populate("student", "branch")
    ]);
    const branchResults = results.filter((result) =>
        result.test?.branch?.toString() === branch.id ||
        result.student?.branch?.toString() === branch.id
    );
    const percentageRows = branchResults.filter((result) => Number.isFinite(result.percentage));
    const averagePercentage = percentageRows.length
        ? percentageRows.reduce((sum, result) => sum + result.percentage, 0) / percentageRows.length
        : 0;

    return {
        branch: { id: branch.id, name: branch.name, code: branch.code, isActive: branch.isActive },
        pendingTeachers,
        approvedTeachers,
        subjects,
        students,
        averagePercentage: Number(averagePercentage.toFixed(2))
    };
}

export async function listBranchTeachers(administrator) {
    const branch = await getBranchForAdministrator(administrator);
    const teachers = await User.find({
        role: "teacher",
        institutionKey: administrator.institutionKey,
        branchName: branch.name
    }).select("name username email mobile teacherId branchName departmentName designation verificationStatus verificationReason accountStatus createdAt")
        .sort({ name: 1 });
    return teachers.map((teacher) => ({
        id: teacher.id,
        name: teacher.name,
        username: teacher.username,
        email: teacher.email,
        mobile: teacher.mobile,
        teacherId: teacher.teacherId,
        departmentName: teacher.departmentName,
        designation: teacher.designation,
        verificationStatus: teacher.verificationStatus,
        verificationReason: teacher.verificationReason,
        accountStatus: teacher.accountStatus,
        createdAt: teacher.createdAt
    }));
}

export async function setBranchTeacherVerification(administrator, teacherId, status, reason = "") {
    if (!["APPROVED", "REJECTED"].includes(status)) {
        throw resourceError(400, "Choose APPROVED or REJECTED.");
    }
    if (status === "REJECTED" && reason.trim().length < 3) {
        throw resourceError(400, "Enter a rejection reason with at least 3 characters.");
    }
    const branch = await getBranchForAdministrator(administrator);
    const teacher = await User.findOne({
        _id: teacherId,
        role: "teacher",
        institutionKey: administrator.institutionKey,
        branchName: branch.name
    });
    if (!teacher) throw resourceError(404, "Teacher not found in your branch.");

    teacher.verificationStatus = status;
    teacher.accountStatus = status === "APPROVED" ? "active" : "inactive";
    teacher.verificationReviewedBy = administrator._id;
    teacher.verificationReviewedAt = new Date();
    teacher.verificationReason = status === "REJECTED" ? reason.trim() : "";
    await teacher.save();
    return {
        id: teacher.id,
        verificationStatus: teacher.verificationStatus,
        accountStatus: teacher.accountStatus
    };
}

export async function getBranchTeacherDetails(administrator, teacherId) {
    const branch = await getBranchForAdministrator(administrator);
    const teacher = await User.findOne({
        _id: teacherId,
        role: "teacher",
        institutionKey: administrator.institutionKey,
        branchName: branch.name
    }).select("name username email mobile teacherId branchName departmentName designation verificationStatus verificationReason accountStatus createdAt");
    if (!teacher) throw resourceError(404, "Teacher not found in your branch.");

    const assignments = await TeacherAssignment.find({
        teacher: teacher._id,
        branch: branch._id,
        isActive: true
    }).populate("subject", "name code description isActive").sort({ academicBatch: -1, studyYear: 1, semester: 1 });

    const subjectMap = new Map();
    for (const assignment of assignments) {
        if (!assignment.subject) continue;
        const id = assignment.subject.id;
        if (!subjectMap.has(id)) {
            subjectMap.set(id, {
                id,
                name: assignment.subject.name,
                code: assignment.subject.code,
                description: assignment.subject.description || "",
                isActive: assignment.subject.isActive,
                assignments: []
            });
        }
        subjectMap.get(id).assignments.push({
            academicBatch: assignment.academicBatch,
            studyYear: assignment.studyYear,
            semester: assignment.semester
        });
    }

    const subjectIds = [...subjectMap.keys()];
    const tests = subjectIds.length
        ? await Test.find({
            createdBy: teacher._id,
            branch: branch._id,
            subject: { $in: subjectIds },
            status: { $ne: "DRAFT" }
        }).select("_id subject")
        : [];
    const testIds = tests.map((test) => test._id);
    const performanceRows = testIds.length
        ? await Result.aggregate([
            { $match: { test: { $in: testIds }, evaluationStatus: "PUBLISHED" } },
            {
                $lookup: {
                    from: "tests",
                    localField: "test",
                    foreignField: "_id",
                    as: "testDetails"
                }
            },
            { $unwind: "$testDetails" },
            {
                $group: {
                    _id: "$testDetails.subject",
                    completedTests: { $sum: 1 },
                    averagePercentage: { $avg: "$percentage" },
                    highestPercentage: { $max: "$percentage" }
                }
            }
        ])
        : [];
    const performanceBySubject = new Map(performanceRows.map((row) => [row._id.toString(), row]));
    const subjects = [...subjectMap.values()].map((subject) => {
        const performance = performanceBySubject.get(subject.id);
        return {
            ...subject,
            completedTests: performance?.completedTests || 0,
            averagePercentage: performance ? Number(performance.averagePercentage.toFixed(2)) : 0,
            highestPercentage: performance ? Number(performance.highestPercentage.toFixed(2)) : 0
        };
    });

    return {
        teacher: {
            id: teacher.id,
            name: teacher.name,
            username: teacher.username,
            email: teacher.email,
            mobile: teacher.mobile,
            teacherId: teacher.teacherId,
            departmentName: teacher.departmentName,
            designation: teacher.designation,
            verificationStatus: teacher.verificationStatus,
            verificationReason: teacher.verificationReason,
            accountStatus: teacher.accountStatus,
            createdAt: teacher.createdAt
        },
        subjects
    };
}

export async function listBranchStudents(administrator) {
    const branch = await getBranchForAdministrator(administrator);
    const students = await User.find({
        role: "student",
        institutionKey: administrator.institutionKey,
        branch: branch._id
    }).select("name username email mobile studentId academicBatch studyYear semester accountStatus approvalStatus createdAt")
        .sort({ name: 1 });
    return students.map((student) => ({
        id: student.id,
        name: student.name,
        username: student.username,
        email: student.email,
        mobile: student.mobile,
        studentId: student.studentId,
        academicBatch: student.academicBatch,
        studyYear: student.studyYear,
        semester: student.semester,
        accountStatus: student.accountStatus,
        approvalStatus: student.approvalStatus,
        createdAt: student.createdAt
    }));
}

export async function getBranchStudentPerformance(administrator) {
    const branch = await getBranchForAdministrator(administrator);
    const students = await User.find({
        role: "student",
        institutionKey: administrator.institutionKey,
        branch: branch._id
    }).select("name studentId username").sort({ name: 1 }).lean();
    const studentIds = students.map((student) => student._id);
    if (studentIds.length === 0) return [];

    const rows = await Result.aggregate([
        { $match: { student: { $in: studentIds }, evaluationStatus: "PUBLISHED" } },
        {
            $group: {
                _id: "$student",
                completedTests: { $sum: 1 },
                averagePercentage: { $avg: "$percentage" },
                highestPercentage: { $max: "$percentage" },
                passedTests: { $sum: { $cond: ["$passed", 1, 0] } }
            }
        }
    ]);
    const performanceByStudent = new Map(rows.map((row) => [row._id.toString(), row]));
    return students.map((student) => {
        const performance = performanceByStudent.get(student._id.toString());
        return {
            id: student._id.toString(),
            name: student.name,
            studentId: student.studentId,
            username: student.username,
            completedTests: performance?.completedTests || 0,
            averagePercentage: performance ? Number(performance.averagePercentage.toFixed(2)) : 0,
            highestPercentage: performance ? Number(performance.highestPercentage.toFixed(2)) : 0,
            passedTests: performance?.passedTests || 0
        };
    });
}
