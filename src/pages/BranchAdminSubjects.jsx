import { useCallback, useEffect, useState } from "react";
import {
    assignBranchAdminSubject,
    createBranchAdminSubject,
    deleteBranchAdminSubject,
    listBranchAdminSubjects,
    updateBranchAdminAssignment,
    setBranchAdminAssignmentStatus,
    setBranchAdminSubjectStatus
} from "../services/branchAdminService";

function BranchAdminSubjects({ teachers, branchRequests }) {
    const [subjects, setSubjects] = useState([]);
    const [form, setForm] = useState({ name: "", code: "", description: "" });
    const [assignments, setAssignments] = useState({});
    const [expandedSubjects, setExpandedSubjects] = useState({});
    const [editingAssignment, setEditingAssignment] = useState(null);
    const [pendingSubjectDelete, setPendingSubjectDelete] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadSubjects = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setSubjects(await listBranchAdminSubjects());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadSubjects);
    }, [loadSubjects]);

    const eligibleTeachers = teachers.filter((teacher) =>
        teacher.verificationStatus === "APPROVED" &&
        teacher.accountStatus === "active" &&
        branchRequests.some((request) =>
            request.teacher?.id === teacher.id && request.status === "APPROVED"
        )
    );

    const updateAssignmentForm = (subjectId, key, value) => {
        setAssignments((current) => ({
            ...current,
            [subjectId]: {
                teacher: "",
                academicBatch: "",
                studyYear: "1",
                semester: "1",
                ...current[subjectId],
                [key]: value
            }
        }));
    };

    const createSubject = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            await createBranchAdminSubject({
                name: form.name.trim(),
                code: form.code.trim().toUpperCase(),
                description: form.description.trim()
            });
            setForm({ name: "", code: "", description: "" });
            setNotice("Subject published. Assign an approved teacher and class for student access.");
            await loadSubjects();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const assignTeacher = async (event, subject) => {
        event.preventDefault();
        const values = assignments[subject.id] || {};
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            await assignBranchAdminSubject(subject.id, {
                teacher: values.teacher,
                academicBatch: values.academicBatch.trim(),
                studyYear: Number(values.studyYear),
                semester: Number(values.semester)
            });
            setNotice(`${subject.name} assigned to the selected teacher and class.`);
            setExpandedSubjects((current) => ({ ...current, [subject.id]: true }));
            setAssignments((current) => ({
                ...current,
                [subject.id]: { ...values, teacher: "", academicBatch: "" }
            }));
            await loadSubjects();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleSubject = async (subject) => {
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            await setBranchAdminSubjectStatus(subject.id, !subject.isActive);
            setNotice(subject.isActive ? "Subject unpublished from students." : "Subject published to students.");
            await loadSubjects();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const deleteSubject = async (subject, destinationSubjectId = "") => {
        const hasTransferableData = subject.testCount > 0 || subject.assignments.length > 0;
        if (hasTransferableData && !destinationSubjectId) {
            setPendingSubjectDelete({ id: subject.id, destinationSubjectId: "" });
            return;
        }
        const destination = subjects.find((item) => item.id === destinationSubjectId);
        const confirmation = destination
            ? `Transfer ${subject.testCount} test(s) and ${subject.assignments.length} teacher assignment(s) to ${destination.name}, then delete ${subject.name}? Test attempts, answers, and results will remain attached to those tests.`
            : `Delete ${subject.name}? This subject has no tests or teacher assignments.`;
        if (!window.confirm(confirmation)) return;
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            const { transfer } = await deleteBranchAdminSubject(subject.id, destinationSubjectId);
            setNotice(destination
                ? `Transferred ${transfer.testsTransferred} test(s) and ${transfer.assignmentsTransferred + transfer.duplicateAssignmentsMerged} teacher assignment(s) to ${destination.name}; ${subject.name} deleted.`
                : `${subject.name} deleted.`);
            setEditingAssignment(null);
            setPendingSubjectDelete(null);
            await loadSubjects();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const saveAssignedTeacher = async (event) => {
        event.preventDefault();
        if (!editingAssignment) return;
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            await updateBranchAdminAssignment(editingAssignment.id, editingAssignment.teacher);
            setNotice("Assigned teacher updated.");
            setEditingAssignment(null);
            await loadSubjects();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const toggleAssignment = async (assignment) => {
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            await setBranchAdminAssignmentStatus(assignment.id, !assignment.isActive);
            setNotice(assignment.isActive ? "Teacher assignment deactivated." : "Teacher assignment reactivated.");
            await loadSubjects();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <section>
            {error && <div className="error-message" role="alert">{error}</div>}
            {notice && <div className="approval-notice" role="status">{notice}</div>}
            <article className="teacher-panel admin-section">
                <div className="teacher-panel-heading">
                    <div>
                        <h2>Create a branch subject</h2>
                        <p>New subjects are published to your branch. Students see them after a teacher and class are assigned.</p>
                    </div>
                </div>
                <form className="admin-assignment-form" onSubmit={createSubject}>
                    <label>
                        Subject name
                        <input
                            required
                            minLength="2"
                            maxLength="120"
                            value={form.name}
                            onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                        />
                    </label>
                    <label>
                        Subject code
                        <input
                            required
                            minLength="2"
                            maxLength="20"
                            value={form.code}
                            onChange={(event) => setForm((current) => ({ ...current, code: event.target.value }))}
                        />
                    </label>
                    <label>
                        Description
                        <input
                            maxLength="1000"
                            value={form.description}
                            onChange={(event) => setForm((current) => ({ ...current, description: event.target.value }))}
                        />
                    </label>
                    <button className="auth-button" type="submit" disabled={isSaving}>
                        {isSaving ? "Saving..." : "Create and Publish"}
                    </button>
                </form>
            </article>

            {isLoading ? (
                <div className="teacher-empty-state">Loading branch subjects...</div>
            ) : subjects.length === 0 ? (
                <div className="teacher-empty-state">No subjects have been created for this branch yet.</div>
            ) : subjects.map((subject) => {
                const values = assignments[subject.id] || {
                    teacher: "",
                    academicBatch: "",
                    studyYear: "1",
                    semester: "1"
                };
                const isExpanded = Boolean(expandedSubjects[subject.id]);
                return (
                    <article className="teacher-panel admin-section" key={subject.id}>
                        <div className="teacher-panel-heading">
                            <div>
                                <h2>
                                    <button
                                        type="button"
                                        className="subject-expand-toggle"
                                        aria-expanded={isExpanded}
                                        onClick={() => setExpandedSubjects((current) => ({
                                            ...current,
                                            [subject.id]: !current[subject.id]
                                        }))}
                                    >
                                        <span>{subject.name} <small>({subject.code})</small></span>
                                        <span className="subject-expand-label">
                                            {isExpanded
                                                ? "Hide details"
                                                : subject.testCount
                                                    ? `View ${subject.testCount} test${subject.testCount === 1 ? "" : "s"} and details`
                                                    : "View details"}
                                        </span>
                                    </button>
                                </h2>
                                <p>{subject.description || "No description"} · {subject.isActive ? "Published" : "Unpublished"}</p>
                            </div>
                            <div className="subject-actions">
                                <button
                                    type="button"
                                    className="teacher-primary-button"
                                    disabled={isSaving}
                                    onClick={() => toggleSubject(subject)}
                                >
                                    {subject.isActive ? "Unpublish" : "Publish"}
                                </button>
                                <button
                                    type="button"
                                    className="subject-delete-button"
                                    disabled={isSaving}
                                    onClick={() => deleteSubject(subject)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                        {pendingSubjectDelete?.id === subject.id && (
                            <div className="subject-transfer-panel">
                                <p>
                                    This subject has {subject.testCount} test(s) and {subject.assignments.length} teacher assignment(s). Select another active subject to transfer its tests and assignments before deletion. Attempts, answers, and results stay attached to their tests.
                                </p>
                                {subjects.some((candidate) => candidate.id !== subject.id && candidate.isActive) ? (
                                    <form
                                        className="subject-transfer-form"
                                        onSubmit={(event) => {
                                            event.preventDefault();
                                            deleteSubject(subject, pendingSubjectDelete.destinationSubjectId);
                                        }}
                                    >
                                        <label>
                                            Destination subject
                                            <select
                                                required
                                                value={pendingSubjectDelete.destinationSubjectId}
                                                onChange={(event) => setPendingSubjectDelete((current) => ({
                                                    ...current,
                                                    destinationSubjectId: event.target.value
                                                }))}
                                            >
                                                <option value="">Select an active subject</option>
                                                {subjects
                                                    .filter((candidate) => candidate.id !== subject.id && candidate.isActive)
                                                    .map((candidate) => (
                                                        <option key={candidate.id} value={candidate.id}>
                                                            {candidate.name} ({candidate.code})
                                                        </option>
                                                    ))}
                                            </select>
                                        </label>
                                        <div className="subject-transfer-actions">
                                            <button
                                                className="auth-button"
                                                type="submit"
                                                disabled={isSaving || !pendingSubjectDelete.destinationSubjectId}
                                            >
                                                {isSaving ? "Transferring..." : "Transfer and Delete"}
                                            </button>
                                            <button
                                                type="button"
                                                disabled={isSaving}
                                                onClick={() => setPendingSubjectDelete(null)}
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </form>
                                ) : (
                                    <p>Create and publish another subject in this branch before transferring these tests.</p>
                                )}
                            </div>
                        )}
                        <div
                            id={`subject-details-${subject.id}`}
                            className="subject-details-panel"
                            hidden={!isExpanded}
                        >
                        <div className="teacher-management-table">
                            <div className="management-table-header" style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 1.3fr" }}>
                                <div>Approved teacher</div><div>Class</div><div>Status</div><div>Action</div>
                            </div>
                            {subject.assignments.map((assignment) => (
                                <div className="management-table-row" key={assignment.id}
                                    style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 1.3fr" }}>
                                    <div>
                                        <strong>{assignment.teacher?.name || "Teacher unavailable"}</strong>
                                        <small>{assignment.teacher?.teacherId || ""}</small>
                                    </div>
                                    <div>{assignment.academicBatch} · Year {assignment.studyYear}, Semester {assignment.semester}</div>
                                    <div>{assignment.isActive ? "Active" : "Inactive"}</div>
                                    <div className="assignment-actions">
                                        <button type="button" disabled={isSaving || eligibleTeachers.length === 0}
                                            onClick={() => setEditingAssignment({
                                                id: assignment.id,
                                                subjectId: subject.id,
                                                teacher: assignment.teacher?.id || ""
                                            })}>
                                            Edit teacher
                                        </button>
                                        <button type="button" disabled={isSaving}
                                            onClick={() => toggleAssignment(assignment)}>
                                            {assignment.isActive ? "Deactivate" : "Reactivate"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {!subject.assignments.length && (
                                <p className="management-empty">No teachers are assigned to this subject yet.</p>
                            )}
                        </div>
                            {subject.tests?.length > 0 && (
                                <div className="subject-transferred-tests">
                                    <h3>Tests under this subject</h3>
                                    <div className="teacher-management-table">
                                        <div className="management-table-header" style={{ gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr" }}>
                                            <div>Test</div><div>Class</div><div>Managing teacher</div><div>Status</div>
                                        </div>
                                        {subject.tests.map((test) => (
                                            <div
                                                className="management-table-row"
                                                key={test.id}
                                                style={{ gridTemplateColumns: "1.5fr 1fr 1fr 0.8fr" }}
                                            >
                                                <div><strong>{test.title}</strong><small>{test.totalQuestions} questions · {test.totalMarks} marks</small></div>
                                                <div>Batch {test.academicBatch} · Year {test.studyYear}, Semester {test.semester}</div>
                                                <div>{test.teacher?.name || "Not assigned"}<small>{test.teacher?.teacherId || ""}</small></div>
                                                <div>{test.status}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                            {!subject.tests?.length && (
                                <div className="subject-transferred-tests">
                                    <h3>Tests under this subject</h3>
                                    <p className="management-empty">No tests have been created for this subject yet.</p>
                                </div>
                            )}
                        {editingAssignment?.subjectId === subject.id && (
                            <form className="admin-assignment-edit-form" onSubmit={saveAssignedTeacher}>
                                <label>
                                    Approved teacher
                                    <select required value={editingAssignment.teacher}
                                        onChange={(event) => setEditingAssignment((current) => ({
                                            ...current,
                                            teacher: event.target.value
                                        }))}>
                                        <option value="">Select teacher</option>
                                        {eligibleTeachers.map((teacher) => (
                                            <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.teacherId}</option>
                                        ))}
                                    </select>
                                </label>
                                <button className="auth-button" type="submit"
                                    disabled={isSaving || !editingAssignment.teacher}>
                                    {isSaving ? "Saving..." : "Save teacher"}
                                </button>
                                <button type="button" disabled={isSaving}
                                    onClick={() => setEditingAssignment(null)}>
                                    Cancel
                                </button>
                            </form>
                        )}
                        {!subject.assignments.length && <form className="admin-assignment-form" onSubmit={(event) => assignTeacher(event, subject)}>
                            <label>
                                Approved teacher
                                <select required value={values.teacher}
                                    onChange={(event) => updateAssignmentForm(subject.id, "teacher", event.target.value)}>
                                    <option value="">Select teacher</option>
                                    {eligibleTeachers.map((teacher) => (
                                        <option key={teacher.id} value={teacher.id}>{teacher.name} · {teacher.teacherId}</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Academic batch
                                <input required placeholder="2024-2027" value={values.academicBatch}
                                    onChange={(event) => updateAssignmentForm(subject.id, "academicBatch", event.target.value)} />
                            </label>
                            <label>
                                Study year
                                <select value={values.studyYear}
                                    onChange={(event) => {
                                        const studyYear = event.target.value;
                                        setAssignments((current) => ({
                                            ...current,
                                            [subject.id]: {
                                                teacher: "",
                                                academicBatch: "",
                                                ...current[subject.id],
                                                studyYear,
                                                semester: String(Number(studyYear) * 2 - 1)
                                            }
                                        }));
                                    }}>
                                    {[1, 2, 3].map((year) => <option key={year} value={year}>{year}</option>)}
                                </select>
                            </label>
                            <label>
                                Semester
                                <select value={values.semester}
                                    onChange={(event) => updateAssignmentForm(subject.id, "semester", event.target.value)}>
                                    {[1, 2, 3, 4, 5, 6]
                                        .filter((semester) => Math.ceil(semester / 2) === Number(values.studyYear))
                                        .map((semester) => <option key={semester} value={semester}>{semester}</option>)}
                                </select>
                            </label>
                            <button className="auth-button" type="submit" disabled={isSaving || eligibleTeachers.length === 0}>
                                {eligibleTeachers.length ? "Assign Teacher" : "No approved teacher available"}
                            </button>
                        </form>}
                        </div>
                    </article>
                );
            })}
        </section>
    );
}

export default BranchAdminSubjects;
