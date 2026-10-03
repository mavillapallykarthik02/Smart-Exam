import { Branch } from "../models/Branch.js";
import { getStudentProgress } from "./progressService.js";
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

export async function getStudentBranches() {
    return Branch.find({ isActive: true })
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
        studentBranchId: user.branch._id || user.branch
    });
}

export async function getStudentTests(user, filters = {}) {
    return listTests({ user, filters });
}
