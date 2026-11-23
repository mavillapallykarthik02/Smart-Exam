import { Branch } from "../models/Branch.js";
import { StudentEnrollment } from "../models/StudentEnrollment.js";
import { Subject } from "../models/Subject.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { TeacherBranchRequest } from "../models/TeacherBranchRequest.js";
import { User } from "../models/User.js";
import { INSTITUTION_KEY } from "../config/institution.js";
import { createLookupHash } from "../utils/fieldEncryption.js";
import { Sector } from "../models/Sector.js";
import { Result } from "../models/Result.js";
import { Test } from "../models/Test.js";
import { ClassTeacherAssignment } from "../models/ClassTeacherAssignment.js";

const COLLEGE_NAME = "Government Polytechnic - 001";
const COLLEGE_LOCATION = "Masab Tank, Hyderabad";

function resourceError(statusCode, message, field) {
    const error = new Error(message);
    error.statusCode = statusCode;
    if (field) error.field = field;
    return error;
}

function validateCohort({ academicBatch, studyYear, semester }) {
    if (!/^\d{4}-\d{4}$/u.test(academicBatch) ||
        Number(academicBatch.slice(0, 4)) >= Number(academicBatch.slice(5))) {
        throw resourceError(400, "Academic batch must use a valid YYYY-YYYY range.", "academicBatch");
    }
    if (Math.ceil(Number(semester) / 2) !== Number(studyYear)) {
        throw resourceError(400, "Semester must belong to the selected year of study.", "semester");
    }
}

export async function createTeacherAssignment(input, adminId) {
    validateCohort(input);
    const [teacher, subject] = await Promise.all([
        User.findOne({
            _id: input.teacher,
            role: "teacher",
            accountStatus: "active",
            verificationStatus: "APPROVED",
            institutionKey: INSTITUTION_KEY
        }).select("_id"),
        Subject.findOne({
            _id: input.subject,
            isActive: true
        }).populate("branch", "_id isActive")
    ]);
    if (!teacher) throw resourceError(404, "Active, approved teacher not found.", "teacher");
    if (!subject || !subject.branch?.isActive) {
        throw resourceError(404, "Active subject not found.", "subject");
    }
    if (!await TeacherBranchRequest.exists({
        teacher: teacher.id,
        branch: subject.branch.id,
        status: "APPROVED"
    })) {
        throw resourceError(403, "The teacher must be approved for the subject's branch.");
    }
    if (input.branch && subject.branch.id !== input.branch) {
        throw resourceError(400, "The subject does not belong to the selected branch.", "branch");
    }

    try {
        const assignment = await TeacherAssignment.create({
            teacher: teacher.id,
            branch: subject.branch.id,
            subject: subject.id,
            academicBatch: input.academicBatch,
            studyYear: input.studyYear,
            semester: input.semester,
            assignedBy: adminId
        });
        return assignment;
    } catch (error) {
        if (error.code === 11000) {
            throw resourceError(409, "This teacher is already assigned to that class and subject.");
        }
        throw error;
    }
}

export async function listTeacherAssignments() {
    const assignments = await TeacherAssignment.find()
        .populate("teacher", "name teacherId username")
        .populate("branch", "name code isActive")
        .populate("subject", "name code isActive")
        .sort({ createdAt: -1 });
    return assignments.map((assignment) => ({
        id: assignment.id,
        teacher: assignment.teacher ? {
            id: assignment.teacher.id,
            name: assignment.teacher.name,
            username: assignment.teacher.username,
            teacherId: assignment.teacher.teacherId
        } : null,
        branch: assignment.branch ? {
            id: assignment.branch.id,
            name: assignment.branch.name,
            code: assignment.branch.code,
            isActive: assignment.branch.isActive
        } : null,
        subject: assignment.subject ? {
            id: assignment.subject.id,
            name: assignment.subject.name,
            code: assignment.subject.code,
            isActive: assignment.subject.isActive
        } : null,
        academicBatch: assignment.academicBatch,
        studyYear: assignment.studyYear,
        semester: assignment.semester,
        isActive: assignment.isActive,
        createdAt: assignment.createdAt
    }));
}

export async function setTeacherAssignmentStatus(id, isActive) {
    const assignment = await TeacherAssignment.findByIdAndUpdate(
        id,
        { $set: { isActive } },
        { new: true, runValidators: true }
    );
    if (!assignment) throw resourceError(404, "Teacher assignment not found.");
    return { id: assignment.id, isActive: assignment.isActive };
}

export async function createStudentEnrollment(input, adminId) {
    const pin = String(input.pin || "").trim().toUpperCase();
    const pinMatch = /^\d{5}-([A-Z]{2,6})-\d{3}$/iu.exec(pin);
    if (!pinMatch) {
        throw resourceError(400, "Polytechnic PIN must use the format 24001-CS-097.", "pin");
    }

    validateCohort(input);

    const branch = await Branch.findOne({
        _id: input.branch,
        institutionKey: INSTITUTION_KEY,
        isActive: true
    }).select("_id code");
    if (!branch) {
        throw resourceError(404, "Active branch not found.", "branch");
    }
    if (pinMatch[1].toUpperCase() !== branch.code.toUpperCase()) {
        throw resourceError(400, "The PIN branch code does not match the selected branch.", "pin");
    }

    const pinLookup = createLookupHash(pin);
    const existingEnrollment = await StudentEnrollment.findOne({
        institutionKey: INSTITUTION_KEY,
        pinLookup
    }).select("_id status");
    if (existingEnrollment) {
        throw resourceError(409, "Polytechnic PIN already exists.", "pin");
    }

    const enrollment = await StudentEnrollment.create({
        pinLookup,
        institutionKey: INSTITUTION_KEY,
        branch: branch.id,
        academicBatch: input.academicBatch,
        studyYear: Number(input.studyYear),
        semester: Number(input.semester),
        createdBy: adminId
    });

    return {
        id: enrollment.id,
        pin,
        branch: enrollment.branch,
        academicBatch: enrollment.academicBatch,
        studyYear: enrollment.studyYear,
        semester: enrollment.semester,
        status: enrollment.status,
        createdAt: enrollment.createdAt
    };
}

export async function listAssignmentsForTeacher(teacherId) {
    const [assignments, approvedBranches] = await Promise.all([
        listTeacherAssignments(),
        TeacherBranchRequest.find({
            teacher: teacherId,
            status: "APPROVED"
        }).distinct("branch")
    ]);
    const approvedBranchIds = new Set(approvedBranches.map((branch) => branch.toString()));
    return assignments.filter((assignment) => (
            assignment.teacher?.id === teacherId &&
            assignment.isActive &&
            assignment.branch?.isActive &&
            assignment.subject?.isActive &&
            approvedBranchIds.has(assignment.branch.id)
        ));
}

export async function listAdminSectors() {
    const sectors = await Sector.find({
        institutionKey: INSTITUTION_KEY
    }).sort({ name: 1 });
    return sectors.map((sector) => ({
        id: sector.id,
        name: sector.name,
        description: sector.description,
        isActive: sector.isActive,
        createdAt: sector.createdAt
    }));
}

export async function createAdminSector(input, adminId) {
    const name = String(input.name || "").trim();
    if (name.length < 2) throw resourceError(400, "Sector name must contain at least 2 characters.", "name");
    try {
        const sector = await Sector.create({
            name,
            institutionKey: INSTITUTION_KEY,
            description: String(input.description || "").trim(),
            createdBy: adminId
        });
        return {
            id: sector.id,
            name: sector.name,
            description: sector.description,
            isActive: sector.isActive
        };
    } catch (error) {
        if (error.code === 11000) throw resourceError(409, "This sector already exists.", "name");
        throw error;
    }
}

export async function updateAdminBranch(id, input) {
    const branch = await Branch.findOne({
        _id: id,
        institutionKey: INSTITUTION_KEY
    }).populate("sector", "name");
    if (!branch) throw resourceError(404, "Branch not found.", "id");
    if (input.sector) {
        const sector = await Sector.findOne({
            _id: input.sector,
            institutionKey: INSTITUTION_KEY,
            isActive: true
        }).select("_id");
        if (!sector) throw resourceError(404, "Active sector not found.", "sector");
        branch.sector = sector._id;
    } else {
        branch.sector = null;
    }
    branch.name = String(input.name || "").trim();
    branch.code = String(input.code || "").trim().toUpperCase();
    branch.description = String(input.description || "").trim();
    branch.collegeName = COLLEGE_NAME;
    branch.location = COLLEGE_LOCATION;
    await branch.save();
    return serializeAdminBranch(await branch.populate("sector", "name"));
}

export async function setAdminBranchStatus(id, input) {
    const updates = {};
    if (typeof input.isActive === "boolean") {
        updates.isActive = input.isActive;
        if (input.isActive) updates.isArchived = false;
    }
    if (typeof input.isArchived === "boolean") updates.isArchived = input.isArchived;
    const branch = await Branch.findOneAndUpdate(
        { _id: id, institutionKey: INSTITUTION_KEY },
        { $set: updates },
        { new: true, runValidators: true }
    ).populate("sector", "name");
    if (!branch) throw resourceError(404, "Branch not found.", "id");
    return serializeAdminBranch(branch);
}

export async function deleteAdminBranch(id) {
    const branch = await Branch.findOne({
        _id: id,
        institutionKey: INSTITUTION_KEY
    }).select("_id");
    if (!branch) throw resourceError(404, "Branch not found.", "id");

    const [hasUsers, hasSubjects, hasTests, hasEnrollments, hasTeacherAssignments, hasClassIncharges] =
        await Promise.all([
            User.exists({ branch: branch._id }),
            Subject.exists({ branch: branch._id }),
            Test.exists({ branch: branch._id }),
            StudentEnrollment.exists({ branch: branch._id }),
            TeacherAssignment.exists({ branch: branch._id }),
            ClassTeacherAssignment.exists({ branch: branch._id })
        ]);

    if (
        hasUsers || hasSubjects || hasTests || hasEnrollments ||
        hasTeacherAssignments || hasClassIncharges
    ) {
        throw resourceError(
            409,
            "This branch is linked to users or academic records and cannot be permanently deleted. Deactivate it instead."
        );
    }

    const deletion = await Branch.deleteOne({
        _id: branch._id,
        institutionKey: INSTITUTION_KEY
    });
    if (deletion.deletedCount !== 1) {
        throw resourceError(404, "Branch not found.", "id");
    }
}

function serializeAdminBranch(branch) {
    return {
        id: branch.id,
        name: branch.name,
        code: branch.code,
        description: branch.description,
        sectorId: branch.sector?.id || "",
        sector: branch.sector?.name || "",
        collegeName: COLLEGE_NAME,
        location: COLLEGE_LOCATION,
        isActive: branch.isActive,
        isArchived: branch.isArchived,
        createdAt: branch.createdAt,
        updatedAt: branch.updatedAt
    };
}

export async function listAdminBranchAdministrators() {
    const administrators = await User.find({
        role: "branch_admin",
        institutionKey: INSTITUTION_KEY
    }).populate("branch", "name code sector").sort({ createdAt: -1 });
    return administrators.map((administrator) => ({
        id: administrator.id,
        name: administrator.name,
        username: administrator.username,
        email: administrator.email,
        mobile: administrator.mobile,
        administratorId: administrator.administratorId,
        institution: administrator.institution,
        branch: administrator.branch ? {
            id: administrator.branch.id,
            name: administrator.branch.name,
            code: administrator.branch.code
        } : null,
        approvalStatus: administrator.verificationStatus,
        accountStatus: administrator.accountStatus,
        approvalReason: administrator.verificationReason,
        approvedAt: administrator.approvedAt,
        createdAt: administrator.createdAt
    }));
}

export async function setBranchAdministratorStatus(id, status, adminId, reason = "") {
    const administrator = await User.findOne({
        _id: id,
        role: "branch_admin",
        institutionKey: INSTITUTION_KEY
    }).populate("branch", "name code");
    if (!administrator) throw resourceError(404, "Branch Administrator not found.", "id");
    if (!["APPROVED", "REJECTED"].includes(status)) {
        throw resourceError(400, "Choose APPROVED or REJECTED.", "status");
    }
    if (!administrator.branch) {
        throw resourceError(400, "Assign this administrator to a branch before approval.");
    }
    if (status === "REJECTED" && reason.trim().length < 3) {
        throw resourceError(400, "Enter a rejection reason with at least 3 characters.", "reason");
    }
    if (status === "APPROVED") {
        const assigned = await User.exists({
            role: "branch_admin",
            institutionKey: INSTITUTION_KEY,
            branch: administrator.branch._id,
            verificationStatus: "APPROVED",
            _id: { $ne: administrator._id }
        });
        if (assigned) throw resourceError(409, "This branch already has an approved Branch Administrator.");
    }

    administrator.verificationStatus = status;
    administrator.accountStatus = status === "APPROVED" ? "active" : "inactive";
    administrator.verificationReviewedBy = adminId;
    administrator.verificationReviewedAt = new Date();
    administrator.approvedBy = status === "APPROVED" ? adminId : null;
    administrator.approvedAt = status === "APPROVED" ? new Date() : null;
    administrator.rejectedBy = status === "REJECTED" ? adminId : null;
    administrator.rejectedAt = status === "REJECTED" ? new Date() : null;
    administrator.verificationReason = status === "REJECTED" ? reason.trim() : "";
    await administrator.save();
    await Branch.updateOne(
        { _id: administrator.branch._id },
        { $set: { branchAdministrator: status === "APPROVED" ? administrator._id : null } }
    );
    return { id: administrator.id, approvalStatus: status, accountStatus: administrator.accountStatus };
}

export async function listAdminBranchPerformance() {
    const branches = await Branch.find({
        institutionKey: INSTITUTION_KEY,
        isArchived: { $ne: true }
    }).populate("sector", "name").populate("branchAdministrator", "name administratorId");
    const results = await Result.find({
        evaluationStatus: "PUBLISHED"
    }).populate("test", "branch subject title").populate("student", "branch");

    return branches.map((branch) => {
        const branchResults = results.filter((result) =>
            result.test?.branch?.toString() === branch.id ||
            result.student?.branch?.toString() === branch.id
        );
        const finalized = branchResults.filter((result) =>
            Number.isFinite(result.percentage) && result.percentage >= 0
        );
        const average = finalized.length
            ? finalized.reduce((sum, result) => sum + result.percentage, 0) / finalized.length
            : 0;
        const passed = finalized.filter((result) => result.passed).length;
        return {
            id: branch.id,
            name: branch.name,
            code: branch.code,
            sector: branch.sector?.name || "Unassigned",
            branchAdministrator: branch.branchAdministrator?.name || "Unassigned",
            totalStudents: 0,
            totalTeachers: 0,
            totalSubjects: 0,
            totalExaminations: finalized.length,
            completedExaminations: finalized.length,
            averagePercentage: Number(average.toFixed(2)),
            passPercentage: finalized.length
                ? Number(((passed / finalized.length) * 100).toFixed(2))
                : 0,
            performance: !finalized.length ? "No data" : average >= 60 ? "Good" : "Needs attention"
        };
    });
}
