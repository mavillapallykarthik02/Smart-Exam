import { Subject } from "../models/Subject.js";
import { TeacherAssignment } from "../models/TeacherAssignment.js";
import { User } from "../models/User.js";
import { INSTITUTION_KEY } from "../config/institution.js";

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
            institutionKey: INSTITUTION_KEY
        }).select("_id"),
        Subject.findOne({
            _id: input.subject,
            isActive: true
        }).populate("branch", "_id isActive")
    ]);
    if (!teacher) throw resourceError(404, "Active teacher not found.", "teacher");
    if (!subject || !subject.branch?.isActive) {
        throw resourceError(404, "Active subject not found.", "subject");
    }
    if (subject.createdBy.toString() !== teacher.id) {
        throw resourceError(403, "The assigned teacher must own the selected subject.");
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

export async function listAssignmentsForTeacher(teacherId) {
    return listTeacherAssignments().then((assignments) => (
        assignments.filter((assignment) => (
            assignment.teacher?.id === teacherId &&
            assignment.isActive &&
            assignment.branch?.isActive &&
            assignment.subject?.isActive
        ))
    ));
}
