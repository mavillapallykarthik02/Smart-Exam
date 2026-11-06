import mongoose from "mongoose";
import { ClassTeacherAssignment } from "../models/ClassTeacherAssignment.js";
import { User } from "../models/User.js";
import { INSTITUTION_KEY } from "../config/institution.js";
import { createLookupHash, createNameSearchTokens } from "../utils/fieldEncryption.js";

const approvalStatuses = ["pending", "approved", "rejected", "suspended"];

function resourceError(statusCode, message) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

async function getTeacherClasses(teacherId) {
    const teacher = await User.findOne({
        _id: teacherId,
        role: "teacher",
        staffRole: "class_teacher",
        accountStatus: "active",
        $or: [
            { verificationStatus: "APPROVED" },
            { verificationStatus: { $exists: false } }
        ]
    }).select("_id");
    if (!teacher) {
        throw resourceError(403, "Only an active class teacher can manage student approvals.");
    }
    return ClassTeacherAssignment.find({
        teacher: teacher.id,
        isActive: true
    }).select("branch academicBatch studyYear semester").lean();
}

function getStudentClassFilter(classes) {
    return {
        role: "student",
        institutionKey: INSTITUTION_KEY,
        $or: classes.map((item) => ({
            branch: item.branch,
            academicBatch: item.academicBatch,
            studyYear: item.studyYear,
            semester: item.semester
        }))
    };
}

function serializeStudent(student) {
    return {
        id: student.id,
        name: student.name,
        studentId: student.studentId,
        username: student.username,
        email: student.email,
        mobile: student.mobile,
        branch: student.branch?.name || "",
        branchCode: student.branch?.code || "",
        academicBatch: student.academicBatch,
        studyYear: student.studyYear,
        semester: student.semester,
        accountStatus: student.accountStatus,
        rejectionReason: student.rejectionReason,
        suspensionReason: student.suspensionReason,
        createdAt: student.createdAt,
        approvedAt: student.approvedAt,
        rejectedAt: student.rejectedAt,
        suspendedAt: student.suspendedAt
    };
}

export async function listClassTeacherStudents(teacherId, filters) {
    const classes = await getTeacherClasses(teacherId);
    if (!classes.length) {
        return {
            students: [],
            pagination: {
                page: filters.page,
                limit: filters.limit,
                totalResults: 0,
                totalPages: 1
            },
            summary: { total: 0, pending: 0, approved: 0, rejected: 0, suspended: 0 }
        };
    }

    const classFilter = getStudentClassFilter(classes);
    const filter = { ...classFilter };
    if (filters.status) filter.accountStatus = filters.status;
    if (filters.search) {
        const searchHash = createLookupHash(filters.search);
        const tokens = createNameSearchTokens(filters.search);
        filter.$and = [{
            $or: [
                { studentIdLookup: searchHash },
                { nameSearchTokens: { $all: tokens } },
                { usernameLookup: searchHash },
                { emailLookup: searchHash }
            ]
        }];
    }

    const [totalResults, students, counts] = await Promise.all([
        User.countDocuments(filter),
        User.find(filter)
            .select("studentId name username email mobile branch academicBatch studyYear semester accountStatus rejectionReason suspensionReason createdAt approvedAt rejectedAt suspendedAt")
            .populate("branch", "name code")
            .sort({ createdAt: -1, _id: -1 })
            .skip((filters.page - 1) * filters.limit)
            .limit(filters.limit),
        User.aggregate([
            { $match: classFilter },
            { $group: { _id: "$accountStatus", count: { $sum: 1 } } }
        ])
    ]);
    const countByStatus = new Map(counts.map((item) => [item._id, item.count]));
    return {
        students: students.map(serializeStudent),
        pagination: {
            page: filters.page,
            limit: filters.limit,
            totalResults,
            totalPages: Math.max(1, Math.ceil(totalResults / filters.limit))
        },
        summary: {
            total: approvalStatuses.reduce((total, status) => total + (countByStatus.get(status) || 0), 0),
            pending: countByStatus.get("pending") || 0,
            approved: countByStatus.get("approved") || 0,
            rejected: countByStatus.get("rejected") || 0,
            suspended: countByStatus.get("suspended") || 0
        }
    };
}

export async function updateStudentApprovalStatus(
    studentId,
    teacherId,
    action,
    reason = ""
) {
    const classes = await getTeacherClasses(teacherId);
    if (!classes.length) {
        throw resourceError(403, "No class is assigned to this class teacher.");
    }
    if (!mongoose.isValidObjectId(studentId)) {
        throw resourceError(404, "Student not found.");
    }
    const student = await User.findOne({
        _id: studentId,
        ...getStudentClassFilter(classes)
    }).select("_id branch academicBatch studyYear semester accountStatus");
    if (!student) throw resourceError(404, "Student not found in your assigned classes.");

    const transitions = {
        approve: { from: "pending", to: "approved", auditAction: "APPROVED" },
        reject: { from: "pending", to: "rejected", auditAction: "REJECTED" },
        suspend: { from: "approved", to: "suspended", auditAction: "SUSPENDED" },
        reactivate: { from: "suspended", to: "approved", auditAction: "REACTIVATED" }
    };
    const transition = transitions[action];
    if (!transition) throw resourceError(400, "Invalid student status action.");
    if (student.accountStatus !== transition.from) {
        const actionNames = {
            approve: "approved",
            reject: "rejected",
            suspend: "suspended",
            reactivate: "reactivated"
        };
        throw resourceError(409, `Only ${transition.from} students can be ${actionNames[action]}.`);
    }

    const now = new Date();
    const updates = { accountStatus: transition.to };
    if (action === "approve") {
        updates.approvedBy = teacherId;
        updates.approvedAt = now;
        updates.rejectedBy = null;
        updates.rejectedAt = null;
        updates.rejectionReason = "";
    } else if (action === "reject") {
        updates.rejectedBy = teacherId;
        updates.rejectedAt = now;
        updates.rejectionReason = reason;
    } else if (action === "suspend") {
        updates.suspendedBy = teacherId;
        updates.suspendedAt = now;
        updates.suspensionReason = reason;
    } else {
        updates.suspendedBy = null;
        updates.suspendedAt = null;
        updates.suspensionReason = "";
    }

    const updated = await User.findOneAndUpdate(
        {
            _id: student.id,
            role: "student",
            branch: student.branch,
            academicBatch: student.academicBatch,
            studyYear: student.studyYear,
            semester: student.semester,
            accountStatus: transition.from
        },
        {
            $set: updates,
            $push: {
                statusHistory: {
                    $each: [{
                        action: transition.auditAction,
                        fromStatus: transition.from,
                        toStatus: transition.to,
                        actor: teacherId,
                        reason,
                        at: now
                    }],
                    $slice: -100
                }
            }
        },
        { new: true, runValidators: true }
    ).select("_id accountStatus");
    if (!updated) {
        throw resourceError(409, "The student record changed. Refresh the list and try again.");
    }
    return { id: updated.id, accountStatus: updated.accountStatus };
}
