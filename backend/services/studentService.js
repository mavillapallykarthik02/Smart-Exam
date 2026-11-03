import { Branch } from "../models/Branch.js";
import { normalizeInstitution } from "../utils/institution.js";
import { getStudentProgress } from "./progressService.js";
import { getActiveTeacherIds } from "./studentTeacherService.js";
import { Attempt } from "../models/Attempt.js";
import { Result } from "../models/Result.js";
import { Subject } from "../models/Subject.js";
import { Test } from "../models/Test.js";
import { listSubjects } from "./subjectService.js";
import { listTests } from "./testService.js";

export async function getStudentDashboard(user) {
    const [tests, progress] = await Promise.all([
        listTests({ user, filters: {} }),
        getStudentProgress(user._id)
    ]);
    return {
        availableTestsCount: tests.length,
        availableTests: tests.slice(0, 3),
        progress
    };
}

export async function getStudentBranches(user) {
    return Branch.find({
        isActive: true,
        institutionKey: normalizeInstitution(user.institution)
    })
        .select("name code description isActive")
        .sort({ name: 1 })
        .lean()
        .then((branches) => branches.map((branch) => ({
            id: branch._id.toString(),
            name: branch.name,
            code: branch.code,
            description: branch.description,
            isActive: branch.isActive
        })));
}

export async function getStudentSubjects(user) {
    if (!user.branch) {
        return [];
    }
    return listSubjects({
        role: "student",
        branchId: user.branch._id?.toString() || user.branch.toString(),
        studentBranchId: user.branch._id || user.branch,
        teacherId: user._id || user.id
    });
}

function resourceNotFound() {
    const error = new Error("Subject not found.");
    error.statusCode = 404;
    return error;
}

export async function getStudentSubjectDetails(subjectId, student) {
    const branchId = student.branch?._id || student.branch;
    const connectedTeacherIds = await getActiveTeacherIds(student._id || student.id);
    if (!branchId || connectedTeacherIds.length === 0) throw resourceNotFound();

    const subject = await Subject.findOne({
        _id: subjectId,
        branch: branchId,
        createdBy: { $in: connectedTeacherIds },
        isActive: true
    })
        .populate("branch", "name code isActive")
        .populate("createdBy", "name teacherId institution");
    if (!subject || !subject.branch?.isActive) throw resourceNotFound();

    const tests = await Test.find({
        subject: subject._id,
        branch: subject.branch._id,
        createdBy: subject.createdBy._id,
        status: "PUBLISHED"
    }).sort({ createdAt: -1 });
    const testIds = tests.map((test) => test._id);
    const [completedTestIds, activeAttempts] = await Promise.all([
        Result.distinct("test", { student: student._id || student.id, test: { $in: testIds } }),
        Attempt.find({
            student: student._id || student.id,
            test: { $in: testIds },
            status: "IN_PROGRESS"
        }).select("test").lean()
    ]);
    const completed = new Set(completedTestIds.map(String));
    const inProgress = new Set(activeAttempts.map((attempt) => attempt.test.toString()));
    const testViews = tests.map((test) => ({
        id: test.id,
        title: test.title,
        description: test.description,
        duration: test.duration,
        totalQuestions: test.totalQuestions,
        totalMarks: test.totalMarks,
        status: completed.has(test.id)
            ? "COMPLETED"
            : inProgress.has(test.id)
                ? "IN_PROGRESS"
                : "AVAILABLE"
    }));

    return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        branch: {
            id: subject.branch.id,
            name: subject.branch.name,
            code: subject.branch.code
        },
        teacher: {
            id: subject.createdBy.id,
            name: subject.createdBy.name,
            teacherId: subject.teacherId || subject.createdBy.teacherId,
            institution: subject.createdBy.institution
        },
        tests: testViews,
        availableTests: testViews.filter((test) => test.status === "AVAILABLE"),
        completedTests: testViews.filter((test) => test.status === "COMPLETED"),
        inProgressTests: testViews.filter((test) => test.status === "IN_PROGRESS")
    };
}

export async function getStudentTests(user, filters = {}) {
    return listTests({ user, filters });
}
