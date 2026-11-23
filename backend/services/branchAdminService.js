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
        Subject.countDocuments({ branch: branch._id, isDeleted: { $ne: true } }),
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
    }).select("name studentId username").sort({ name: 1 });
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

function validateSubjectDetails(input) {
    const name = String(input.name || "").trim();
    const code = String(input.code || "").trim().toUpperCase();
    const description = String(input.description || "").trim();
    if (name.length < 2 || name.length > 120 || code.length < 2 || code.length > 20) {
        throw resourceError(400, "Provide a valid subject name and code.");
    }
    if (description.length > 1000) {
        throw resourceError(400, "Subject description must be 1000 characters or fewer.");
    }
    return { name, code, description };
}

function validateSubjectCohort({ academicBatch, studyYear, semester }) {
    if (!/^\d{4}-\d{4}$/u.test(academicBatch) ||
        Number(academicBatch.slice(0, 4)) >= Number(academicBatch.slice(5))) {
        throw resourceError(400, "Academic batch must use a valid YYYY-YYYY range.");
    }
    if (Math.ceil(Number(semester) / 2) !== Number(studyYear)) {
        throw resourceError(400, "Semester must belong to the selected year of study.");
    }
}

function subjectResponse(subject, assignments = [], tests = []) {
    return {
        id: subject.id,
        name: subject.name,
        code: subject.code,
        description: subject.description,
        isActive: subject.isActive,
        testCount: tests.length,
        tests,
        branch: subject.branch && typeof subject.branch === "object"
            ? {
                id: subject.branch.id,
                name: subject.branch.name,
                code: subject.branch.code
            }
            : null,
        assignments
    };
}

export async function listBranchAdminSubjects(administrator) {
    const branch = await getBranchForAdministrator(administrator);
    const [subjects, assignments, tests] = await Promise.all([
        Subject.find({ branch: branch._id, isDeleted: { $ne: true } })
            .populate("branch", "name code")
            .sort({ name: 1 }),
        TeacherAssignment.find({ branch: branch._id })
            .populate("teacher", "name teacherId")
            .populate("subject", "name code")
            .sort({ createdAt: -1 }),
        Test.find({ branch: branch._id })
            .populate("createdBy", "name teacherId")
            .populate("subject", "name code")
            .sort({ updatedAt: -1 })
    ]);
    const assignmentMap = new Map();
    const testsBySubject = new Map();
    for (const assignment of assignments) {
        if (!assignment.subject) continue;
        const subjectId = assignment.subject.id;
        const rows = assignmentMap.get(subjectId) || [];
        rows.push({
            id: assignment.id,
            teacher: assignment.teacher ? {
                id: assignment.teacher.id,
                name: assignment.teacher.name,
                teacherId: assignment.teacher.teacherId
            } : null,
            academicBatch: assignment.academicBatch,
            studyYear: assignment.studyYear,
            semester: assignment.semester,
            isActive: assignment.isActive
        });
        assignmentMap.set(subjectId, rows);
    }
    for (const test of tests) {
        if (!test.subject) continue;
        const subjectId = test.subject.id;
        const matchingAssignment = assignments.find((assignment) =>
            assignment.subject?.id === subjectId &&
            assignment.academicBatch === test.academicBatch &&
            assignment.studyYear === test.studyYear &&
            assignment.semester === test.semester &&
            assignment.isActive
        );
        if (matchingAssignment?.teacher?._id &&
            test.createdBy?._id?.toString() !== matchingAssignment.teacher._id.toString()) {
            await Test.updateOne(
                { _id: test._id },
                { $set: { createdBy: matchingAssignment.teacher._id } }
            );
            test.createdBy = matchingAssignment.teacher;
        }
        const rows = testsBySubject.get(subjectId) || [];
        rows.push({
            id: test.id,
            title: test.title,
            status: test.status,
            academicBatch: test.academicBatch,
            studyYear: test.studyYear,
            semester: test.semester,
            totalQuestions: test.totalQuestions,
            totalMarks: test.totalMarks,
            teacher: test.createdBy ? {
                id: test.createdBy.id,
                name: test.createdBy.name,
                teacherId: test.createdBy.teacherId
            } : null
        });
        testsBySubject.set(subjectId, rows);
    }
    return subjects.map((subject) =>
        subjectResponse(
            subject,
            assignmentMap.get(subject.id) || [],
            testsBySubject.get(subject.id) || []
        )
    );
}

export async function createBranchAdminSubject(administrator, input) {
    const branch = await getBranchForAdministrator(administrator);
    if (!branch.isActive) throw resourceError(409, "Activate your branch before publishing subjects.");
    const details = validateSubjectDetails(input);
    if (await Subject.findOne({
        branch: branch._id,
        $or: [
            { code: details.code },
            { normalizedName: details.name.toLocaleLowerCase("en") }
        ]
    }).select("_id")) {
        throw resourceError(409, "A subject with this name or code already exists in your branch.");
    }
    try {
        const subject = await Subject.create({
            ...details,
            branch: branch._id,
            createdBy: administrator._id,
            isActive: true
        });
        await subject.populate("branch", "name code");
        return subjectResponse(subject);
    } catch (error) {
        if (error.code === 11000) {
            throw resourceError(409, "A subject with this name or code already exists in your branch.");
        }
        throw error;
    }
}

export async function updateBranchAdminSubject(administrator, subjectId, input) {
    const branch = await getBranchForAdministrator(administrator);
    const subject = await Subject.findOne({
        _id: subjectId,
        branch: branch._id,
        isDeleted: { $ne: true }
    });
    if (!subject) throw resourceError(404, "Subject not found in your branch.");
    const details = validateSubjectDetails(input);
    if (await Subject.findOne({
        _id: { $ne: subject._id },
        branch: branch._id,
        $or: [
            { code: details.code },
            { normalizedName: details.name.toLocaleLowerCase("en") }
        ]
    }).select("_id")) {
        throw resourceError(409, "A subject with this name or code already exists in your branch.");
    }
    Object.assign(subject, details);
    try {
        await subject.save();
    } catch (error) {
        if (error.code === 11000) {
            throw resourceError(409, "A subject with this name or code already exists in your branch.");
        }
        throw error;
    }
    await subject.populate("branch", "name code");
    return subjectResponse(subject);
}

export async function setBranchAdminSubjectStatus(administrator, subjectId, isActive) {
    const branch = await getBranchForAdministrator(administrator);
    if (isActive && !branch.isActive) {
        throw resourceError(409, "Activate your branch before publishing subjects.");
    }
    const subject = await Subject.findOneAndUpdate(
        { _id: subjectId, branch: branch._id, isDeleted: { $ne: true } },
        { $set: { isActive } },
        { new: true, runValidators: true }
    ).populate("branch", "name code");
    if (!subject) throw resourceError(404, "Subject not found in your branch.");
    return subjectResponse(subject);
}

export async function deleteBranchAdminSubject(administrator, subjectId, destinationSubjectId) {
    const branch = await getBranchForAdministrator(administrator);
    const subject = await Subject.findOne({
        _id: subjectId,
        branch: branch._id,
        isDeleted: { $ne: true }
    });
    if (!subject) throw resourceError(404, "Subject not found in your branch.");

    const [testsExist, assignmentsExist] = await Promise.all([
        Test.exists({ subject: subject._id, branch: branch._id }),
        TeacherAssignment.exists({ subject: subject._id, branch: branch._id })
    ]);
    if ((testsExist || assignmentsExist) && !destinationSubjectId) {
        throw resourceError(409, "This subject has tests or teacher assignments. Select another active subject to transfer its data before deleting it.");
    }

    let destinationSubject = null;
    if (destinationSubjectId) {
        if (destinationSubjectId === subject.id) {
            throw resourceError(400, "Choose a different destination subject.");
        }
        destinationSubject = await Subject.findOne({
            _id: destinationSubjectId,
            branch: branch._id,
            isActive: true,
            isDeleted: { $ne: true }
        });
        if (!destinationSubject) {
            throw resourceError(404, "Choose an active destination subject in your branch.");
        }
    }

    let testsTransferred = 0;
    let assignmentsTransferred = 0;
    let duplicateAssignmentsMerged = 0;
    if (destinationSubject) {
        const transferredTestIds = await Test.find({
            subject: subject._id,
            branch: branch._id
        }).distinct("_id");
        const testTransfer = await Test.updateMany(
            { subject: subject._id, branch: branch._id },
            { $set: { subject: destinationSubject._id } }
        );
        testsTransferred = testTransfer.modifiedCount;

        const assignments = await TeacherAssignment.find({
            subject: subject._id,
            branch: branch._id
        });
        for (const assignment of assignments) {
            const existing = await TeacherAssignment.findOne({
                _id: { $ne: assignment._id },
                teacher: assignment.teacher,
                branch: branch._id,
                subject: destinationSubject._id,
                academicBatch: assignment.academicBatch,
                studyYear: assignment.studyYear,
                semester: assignment.semester
            });
            if (existing) {
                if (assignment.isActive && !existing.isActive) {
                    existing.isActive = true;
                    await existing.save();
                }
                await assignment.deleteOne();
                duplicateAssignmentsMerged += 1;
            } else {
                assignment.subject = destinationSubject._id;
                await assignment.save();
                assignmentsTransferred += 1;
            }
        }
        const destinationAssignments = await TeacherAssignment.find({
            subject: destinationSubject._id,
            branch: branch._id,
            isActive: true
        }).lean();
        const transferredTests = await Test.find({
            subject: destinationSubject._id,
            branch: branch._id,
            _id: { $in: transferredTestIds }
        });
        for (const test of transferredTests) {
            const managingAssignment = destinationAssignments.find((assignment) =>
                assignment.academicBatch === test.academicBatch &&
                assignment.studyYear === test.studyYear &&
                assignment.semester === test.semester
            );
            if (managingAssignment) {
                test.createdBy = managingAssignment.teacher;
                await test.save();
            }
        }
    } else {
        await TeacherAssignment.updateMany(
            { subject: subject._id, branch: branch._id, isActive: true },
            { $set: { isActive: false } }
        );
    }

    subject.isActive = false;
    subject.isDeleted = true;
    await subject.save();
    return { testsTransferred, assignmentsTransferred, duplicateAssignmentsMerged };
}

export async function createBranchTeacherAssignment(administrator, subjectId, input) {
    validateSubjectCohort(input);
    const branch = await getBranchForAdministrator(administrator);
    if (!branch.isActive) throw resourceError(409, "Your branch is inactive.");
    const [teacher, subject, branchRequest] = await Promise.all([
        User.findOne({
            _id: input.teacher,
            role: "teacher",
            institutionKey: administrator.institutionKey,
            verificationStatus: "APPROVED",
            accountStatus: "active"
        }).select("_id"),
        Subject.findOne({
            _id: subjectId,
            branch: branch._id,
            isDeleted: { $ne: true }
        }),
        TeacherBranchRequest.findOne({
            teacher: input.teacher,
            branch: branch._id,
            status: "APPROVED"
        }).select("_id")
    ]);
    if (!teacher || !branchRequest) {
        throw resourceError(403, "Only an active, approved teacher for your branch can be assigned.");
    }
    if (!subject) throw resourceError(404, "Subject not found in your branch.");
    try {
        const assignment = await TeacherAssignment.create({
            teacher: teacher._id,
            branch: branch._id,
            subject: subject._id,
            academicBatch: input.academicBatch,
            studyYear: Number(input.studyYear),
            semester: Number(input.semester),
            assignedBy: administrator._id
        });
        return {
            id: assignment.id,
            teacher: teacher.id,
            subject: subject.id,
            academicBatch: assignment.academicBatch,
            studyYear: assignment.studyYear,
            semester: assignment.semester,
            isActive: assignment.isActive
        };
    } catch (error) {
        if (error.code === 11000) {
            throw resourceError(409, "This teacher is already assigned to that class and subject.");
        }
        throw error;
    }
}

export async function updateBranchTeacherAssignment(administrator, assignmentId, teacherId) {
    const branch = await getBranchForAdministrator(administrator);
    const assignment = await TeacherAssignment.findOne({
        _id: assignmentId,
        branch: branch._id
    });
    if (!assignment) throw resourceError(404, "Teacher assignment not found in your branch.");
    if (!await Subject.exists({
        _id: assignment.subject,
        branch: branch._id,
        isDeleted: { $ne: true }
    })) {
        throw resourceError(404, "Subject not found in your branch.");
    }

    const [teacher, branchRequest] = await Promise.all([
        User.findOne({
            _id: teacherId,
            role: "teacher",
            institutionKey: administrator.institutionKey,
            verificationStatus: "APPROVED",
            accountStatus: "active"
        }).select("_id"),
        TeacherBranchRequest.findOne({
            teacher: teacherId,
            branch: branch._id,
            status: "APPROVED"
        }).select("_id")
    ]);
    if (!teacher || !branchRequest) {
        throw resourceError(403, "Only an active, approved teacher for your branch can be assigned.");
    }

    assignment.teacher = teacher._id;
    try {
        await assignment.save();
    } catch (error) {
        if (error.code === 11000) {
            throw resourceError(409, "This teacher is already assigned to that class and subject.");
        }
        throw error;
    }
    return {
        id: assignment.id,
        teacher: teacher.id,
        subject: assignment.subject.toString(),
        academicBatch: assignment.academicBatch,
        studyYear: assignment.studyYear,
        semester: assignment.semester,
        isActive: assignment.isActive
    };
}

export async function setBranchTeacherAssignmentStatus(administrator, assignmentId, isActive) {
    const branch = await getBranchForAdministrator(administrator);
    if (isActive) {
        const existing = await TeacherAssignment.findOne({
            _id: assignmentId,
            branch: branch._id
        }).select("teacher");
        if (!existing) throw resourceError(404, "Teacher assignment not found in your branch.");
        const [teacher, branchRequest] = await Promise.all([
            User.exists({
                _id: existing.teacher,
                role: "teacher",
                institutionKey: administrator.institutionKey,
                verificationStatus: "APPROVED",
                accountStatus: "active"
            }),
            TeacherBranchRequest.exists({
                teacher: existing.teacher,
                branch: branch._id,
                status: "APPROVED"
            })
        ]);
        if (!teacher || !branchRequest) {
            throw resourceError(403, "Only an active, approved teacher for your branch can be assigned.");
        }
    }
    const assignment = await TeacherAssignment.findOneAndUpdate(
        { _id: assignmentId, branch: branch._id },
        { $set: { isActive } },
        { new: true, runValidators: true }
    );
    if (!assignment) throw resourceError(404, "Teacher assignment not found in your branch.");
    return { id: assignment.id, isActive: assignment.isActive };
}
