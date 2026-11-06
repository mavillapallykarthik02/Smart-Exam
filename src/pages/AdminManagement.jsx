import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import BrandLogoImage from "../components/BrandLogoImage";
import {
    assignClassIncharge,
    assignTeacherSubject,
    createAdminBranch,
    listAdminBranches,
    listAdminSubjects,
    listAdminTeachers,
    listClassIncharges,
    listAdminTeacherAssignments,
    reviewTeacher,
    setClassInchargeStatus,
    setTeacherAssignmentStatus,
    updateTeacherStaffRole
} from "../services/adminService";

const staffRoles = [
    ["guest_lecturer", "Guest Lecturer"],
    ["class_teacher", "Class Teacher"],
    ["hod", "HOD"],
    ["principal", "Principal"]
];

function AdminManagement() {
    const [teachers, setTeachers] = useState([]);
    const [branches, setBranches] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [teacherAssignments, setTeacherAssignments] = useState([]);
    const [form, setForm] = useState({
        teacher: "",
        branch: "",
        academicBatch: "",
        studyYear: "1",
        semester: "1"
    });
    const [teachingForm, setTeachingForm] = useState({
        teacher: "",
        subject: "",
        academicBatch: "",
        studyYear: "1",
        semester: "1"
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [branchDraft, setBranchDraft] = useState({
        teacher: "",
        name: "",
        code: "",
        description: ""
    });

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const [
                teacherList,
                branchList,
                assignmentList,
                subjectList,
                teacherAssignmentList
            ] = await Promise.all([
                listAdminTeachers(),
                listAdminBranches(),
                listClassIncharges(),
                listAdminSubjects(),
                listAdminTeacherAssignments()
            ]);
            setTeachers(teacherList);
            setBranches(branchList);
            setAssignments(assignmentList);
            setSubjects(subjectList);
            setTeacherAssignments(teacherAssignmentList);
            const verifiedTeachers = teacherList.filter((item) =>
                item.verificationStatus === "APPROVED" && item.accountStatus === "active"
            );
            setForm((current) => ({
                ...current,
                teacher: verifiedTeachers.some((item) => item.id === current.teacher)
                    ? current.teacher
                    : verifiedTeachers[0]?.id || "",
                branch: current.branch || branchList[0]?.id || ""
            }));
            setBranchDraft((current) => ({
                ...current,
                teacher: verifiedTeachers.some((item) => item.id === current.teacher)
                    ? current.teacher
                    : verifiedTeachers[0]?.id || ""
            }));
            setTeachingForm((current) => {
                const teacher = verifiedTeachers.some((item) => item.id === current.teacher)
                    ? current.teacher
                    : verifiedTeachers[0]?.id || "";
                const teacherSubjects = subjectList.filter((item) =>
                    item.isActive && item.teacher?.id === teacher
                );
                return {
                    ...current,
                    teacher,
                    subject: teacherSubjects.some((item) => item.id === current.subject)
                        ? current.subject
                        : teacherSubjects[0]?.id || ""
                };
            });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadData);
    }, [loadData]);

    const runAction = async (action, successMessage) => {
        setError("");
        setNotice("");
        setIsSaving(true);
        try {
            await action();
            setNotice(successMessage);
            await loadData();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleTeacherReview = (teacher, status) => {
        let reason = "";
        if (status === "REJECTED") {
            reason = window.prompt(`Why are you rejecting ${teacher.name}'s application?`)?.trim() || "";
            if (reason.length < 3) {
                setError("Enter a rejection reason with at least 3 characters.");
                return;
            }
        }
        const label = status === "APPROVED" ? "approve" : "reject";
        if (!window.confirm(`Are you sure you want to ${label} ${teacher.name}?`)) return;
        void runAction(
            () => reviewTeacher(teacher.id, status, reason),
            `Teacher ${status.toLowerCase()} successfully.`
        );
    };

    const handleRoleChange = (teacher, staffRole) => {
        if (teacher.staffRole === staffRole) return;
        void runAction(
            () => updateTeacherStaffRole(teacher.id, staffRole),
            "Teacher role updated."
        );
    };

    const handleAssignmentSubmit = (event) => {
        event.preventDefault();
        if (!form.teacher || !form.branch || !/^\d{4}-\d{4}$/u.test(form.academicBatch)) {
            setError("Choose an approved teacher and branch, and enter an academic batch such as 2024-2027.");
            return;
        }
        if (!window.confirm("Assign this teacher as the incharge for the selected class?")) return;
        void runAction(async () => {
            await assignClassIncharge({
                ...form,
                studyYear: Number(form.studyYear),
                semester: Number(form.semester)
            });
        }, "Class incharge assigned successfully.");
    };

    const handleTeachingAssignmentSubmit = (event) => {
        event.preventDefault();
        const subject = subjects.find((item) =>
            item.id === teachingForm.subject &&
            item.teacher?.id === teachingForm.teacher &&
            item.isActive
        );
        if (!teachingForm.teacher || !subject ||
            !/^\d{4}-\d{4}$/u.test(teachingForm.academicBatch) ||
            Math.ceil(Number(teachingForm.semester) / 2) !== Number(teachingForm.studyYear)) {
            setError("Choose an approved teacher's active subject and a valid class cohort.");
            return;
        }
        if (!window.confirm(`Assign ${subject.name} to this teacher and class?`)) return;
        void runAction(async () => {
            await assignTeacherSubject({
                teacher: teachingForm.teacher,
                subject: subject.id,
                branch: subject.branch?.id,
                academicBatch: teachingForm.academicBatch,
                studyYear: Number(teachingForm.studyYear),
                semester: Number(teachingForm.semester)
            });
        }, "Teaching assignment created successfully.");
    };

    const handleBranchSubmit = (event) => {
        event.preventDefault();
        if (!branchDraft.teacher) {
            setError("Select an approved teacher to associate with this branch.");
            return;
        }
        const name = branchDraft.name.trim();
        const code = branchDraft.code.trim();
        if (!name || !code) {
            setError("Enter a branch name and code.");
            return;
        }
        void runAction(async () => {
            const branch = await createAdminBranch({
                teacher: branchDraft.teacher,
                name,
                code,
                description: branchDraft.description.trim()
            });
            setForm((current) => ({ ...current, branch: branch.id }));
            setBranchDraft((current) => ({
                ...current,
                name: "",
                code: "",
                description: ""
            }));
        }, "Branch created and added to the assignment selector.");
    };

    const pendingTeachers = teachers.filter((teacher) =>
        teacher.verificationStatus === "PENDING" && teacher.accountStatus === "active"
    );
    const verifiedTeachers = teachers.filter((teacher) =>
        teacher.verificationStatus === "APPROVED" && teacher.accountStatus === "active"
    );
    const assignableSubjects = subjects.filter((subject) =>
        subject.isActive && subject.teacher?.id === teachingForm.teacher
    );

    return (
        <div className="teacher-page">
            <header className="teacher-navbar admin-navbar">
                <Link to="/" className="teacher-logo">
                    <BrandLogoImage />
                    <div><h2>SmartExam</h2><p>Administrator Panel</p></div>
                </Link>
                <LogoutButton role="admin" className="teacher-logout" />
            </header>
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">COLLEGE ADMINISTRATION</span>
                        <h1>Staff verification and class incharges</h1>
                        <p>Verify teacher affiliations, assign controlled staff roles, and designate class incharges.</p>
                    </div>
                </div>

                {error && <div className="error-message" role="alert">
                    <p>{error}</p><button type="button" onClick={loadData}>Retry</button>
                </div>}
                {notice && <div className="approval-notice" role="status">{notice}</div>}

                <section className="teacher-panel admin-section">
                    <div className="teacher-panel-heading">
                        <div>
                            <h2>Teacher verification</h2>
                            <p>{pendingTeachers.length} application{pendingTeachers.length === 1 ? "" : "s"} awaiting review</p>
                        </div>
                        <button type="button" className="management-filter" onClick={loadData}
                            disabled={isLoading || isSaving}>Refresh</button>
                    </div>
                    {isLoading ? (
                        <div className="teacher-empty-state">Loading teacher applications...</div>
                    ) : teachers.length === 0 ? (
                        <div className="teacher-empty-state">
                            <h3>No teacher applications</h3>
                            <p>Teacher registrations will appear here for verification.</p>
                        </div>
                    ) : (
                        <div className="teacher-management-table">
                            <div className="management-table-header admin-teacher-header">
                                <div>Teacher</div><div>Affiliation</div><div>Verification</div><div>Staff role</div><div>Actions</div>
                            </div>
                            {teachers.map((teacher) => (
                                <div className="management-table-row admin-teacher-row" key={teacher.id}>
                                    <div><strong>{teacher.name}</strong>
                                        <small>{teacher.teacherId} · {teacher.email}</small>
                                        <small>{teacher.username}</small>
                                    </div>
                                    <div>{teacher.departmentName || "—"}<small>
                                        {teacher.branchName || "—"} · {teacher.designation || "—"}
                                    </small></div>
                                    <div><span className={`approval-status approval-status-${teacher.verificationStatus?.toLowerCase()}`}>
                                        {teacher.verificationStatus || "APPROVED"}
                                    </span>
                                        {teacher.verificationReason && <small>{teacher.verificationReason}</small>}
                                    </div>
                                    <div>
                                        <select className="management-filter" value={teacher.staffRole || "guest_lecturer"}
                                            aria-label={`Staff role for ${teacher.name}`}
                                            disabled={isSaving || teacher.verificationStatus !== "APPROVED"}
                                            onChange={(event) => handleRoleChange(teacher, event.target.value)}>
                                            {staffRoles.map(([value, label]) => (
                                                <option key={value} value={value}>{label}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="management-actions">
                                        {teacher.verificationStatus === "PENDING" && <>
                                            <button type="button" disabled={isSaving}
                                                onClick={() => handleTeacherReview(teacher, "APPROVED")}>Approve</button>
                                            <button type="button" className="danger" disabled={isSaving}
                                                onClick={() => handleTeacherReview(teacher, "REJECTED")}>Reject</button>
                                        </>}
                                        {teacher.verificationStatus === "REJECTED" && (
                                            <button type="button" disabled={isSaving}
                                                onClick={() => handleTeacherReview(teacher, "APPROVED")}>Approve</button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="teacher-panel admin-section">
                    <div className="teacher-panel-heading">
                        <div>
                            <h2>Branch management</h2>
                            <p>Create an active branch for an approved teacher. New branches become available to student registration and class assignments.</p>
                        </div>
                    </div>
                    {verifiedTeachers.length === 0 && (
                        <p className="admin-assignment-notice" role="status">
                            Approve a teacher before creating a branch. Branches are associated with their managing teacher.
                        </p>
                    )}
                    <form className="admin-branch-form" onSubmit={handleBranchSubmit}>
                        <label>Managing teacher
                            <select required value={branchDraft.teacher}
                                disabled={verifiedTeachers.length === 0}
                                onChange={(event) => setBranchDraft({
                                    ...branchDraft,
                                    teacher: event.target.value
                                })}>
                                <option value="">Select an approved teacher</option>
                                {verifiedTeachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.name} ({teacher.teacherId})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Branch name
                            <input required minLength={2} maxLength={120}
                                value={branchDraft.name}
                                onChange={(event) => setBranchDraft({
                                    ...branchDraft,
                                    name: event.target.value
                                })}
                                placeholder="e.g. Computer Science" />
                        </label>
                        <label>Branch code
                            <input required minLength={2} maxLength={12}
                                pattern="[A-Za-z0-9_-]+"
                                value={branchDraft.code}
                                onChange={(event) => setBranchDraft({
                                    ...branchDraft,
                                    code: event.target.value
                                })}
                                placeholder="e.g. CSE" />
                        </label>
                        <label>Description (optional)
                            <input maxLength={1000}
                                value={branchDraft.description}
                                onChange={(event) => setBranchDraft({
                                    ...branchDraft,
                                    description: event.target.value
                                })}
                                placeholder="Briefly describe this branch" />
                        </label>
                        <button className="teacher-secondary-button" type="submit"
                            disabled={isSaving || isLoading || verifiedTeachers.length === 0}>
                            {isSaving ? "Saving..." : "Create branch"}
                        </button>
                    </form>
                </section>

                <section className="teacher-panel admin-section">
                    <div className="teacher-panel-heading">
                        <div>
                            <h2>Assign a class incharge</h2>
                            <p>Approved student registrations are reviewed by the assigned class incharge before login access is granted.</p>
                        </div>
                    </div>
                    {verifiedTeachers.length === 0 && (
                        <p className="admin-assignment-notice" role="status">
                            {pendingTeachers.length > 0
                                ? "Approve a pending teacher in the section above. Approved teachers will then appear in this selector."
                                : "There are no approved active teachers available to assign yet."}
                        </p>
                    )}
                    {branches.filter((branch) => branch.isActive).length === 0 && (
                        <p className="admin-assignment-notice" role="status">
                            No active branches are available. Create one in Branch management above or activate an existing branch in Teacher Branch Management.
                        </p>
                    )}
                    <form className="admin-assignment-form" onSubmit={handleAssignmentSubmit}>
                        <label>Verified teacher
                            <select required value={form.teacher}
                                onChange={(event) => setForm({ ...form, teacher: event.target.value })}>
                                <option value="">Select teacher</option>
                                {verifiedTeachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.name} ({teacher.teacherId})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Branch
                            <select required value={form.branch}
                                disabled={!branches.some((branch) => branch.isActive)}
                                onChange={(event) => setForm({ ...form, branch: event.target.value })}>
                                <option value="">
                                    {branches.some((branch) => branch.isActive)
                                        ? "Select branch"
                                        : "No active branches"}
                                </option>
                                {branches.filter((branch) => branch.isActive).map((branch) => (
                                    <option key={branch.id} value={branch.id}>{branch.name} ({branch.code})</option>
                                ))}
                            </select>
                        </label>
                        <label>Academic batch
                            <input required pattern="\d{4}-\d{4}" placeholder="2024-2027"
                                value={form.academicBatch}
                                onChange={(event) => setForm({ ...form, academicBatch: event.target.value })} />
                        </label>
                        <label>Course year
                            <select value={form.studyYear}
                                onChange={(event) => setForm({ ...form, studyYear: event.target.value })}>
                                {[1, 2, 3].map((year) => <option key={year} value={year}>{year}</option>)}
                            </select>
                        </label>
                        <label>Semester
                            <select value={form.semester}
                                onChange={(event) => setForm({ ...form, semester: event.target.value })}>
                                {[1, 2, 3, 4, 5, 6].map((semester) => (
                                    <option key={semester} value={semester}>{semester}</option>
                                ))}
                            </select>
                        </label>
                        <button className="auth-button" type="submit"
                            disabled={isSaving || isLoading || !teachers.some((teacher) =>
                                teacher.verificationStatus === "APPROVED" && teacher.accountStatus === "active"
                            )}>
                            {isSaving ? "Saving..." : "Assign class incharge"}
                        </button>
                    </form>
                </section>

                <section className="teacher-panel admin-section">
                    <div className="teacher-panel-heading">
                        <div>
                            <h2>Assign a subject to a teacher</h2>
                            <p>Active teaching assignments let teachers create tests for the specified class.</p>
                        </div>
                    </div>
                    {verifiedTeachers.length > 0 && assignableSubjects.length === 0 && (
                        <p className="admin-assignment-notice" role="status">
                            Create an active subject owned by the selected teacher before assigning it to a class.
                        </p>
                    )}
                    <form className="admin-assignment-form" onSubmit={handleTeachingAssignmentSubmit}>
                        <label>Verified teacher
                            <select required value={teachingForm.teacher}
                                onChange={(event) => {
                                    const teacher = event.target.value;
                                    const firstSubject = subjects.find((item) =>
                                        item.isActive && item.teacher?.id === teacher
                                    );
                                    setTeachingForm((current) => ({
                                        ...current,
                                        teacher,
                                        subject: firstSubject?.id || ""
                                    }));
                                }}>
                                <option value="">Select teacher</option>
                                {verifiedTeachers.map((teacher) => (
                                    <option key={teacher.id} value={teacher.id}>
                                        {teacher.name} ({teacher.teacherId})
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Active subject
                            <select required value={teachingForm.subject}
                                disabled={assignableSubjects.length === 0}
                                onChange={(event) => setTeachingForm({
                                    ...teachingForm,
                                    subject: event.target.value
                                })}>
                                <option value="">Select teacher-owned subject</option>
                                {assignableSubjects.map((subject) => (
                                    <option key={subject.id} value={subject.id}>
                                        {subject.name} · {subject.branch?.code || "Branch unavailable"}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label>Academic batch
                            <input required pattern="\d{4}-\d{4}" placeholder="2024-2027"
                                value={teachingForm.academicBatch}
                                onChange={(event) => setTeachingForm({
                                    ...teachingForm,
                                    academicBatch: event.target.value
                                })} />
                        </label>
                        <label>Course year
                            <select value={teachingForm.studyYear}
                                onChange={(event) => setTeachingForm({
                                    ...teachingForm,
                                    studyYear: event.target.value,
                                    semester: String((Number(event.target.value) - 1) * 2 + 1)
                                })}>
                                {[1, 2, 3].map((year) => (
                                    <option key={year} value={year}>{year}</option>
                                ))}
                            </select>
                        </label>
                        <label>Semester
                            <select value={teachingForm.semester}
                                onChange={(event) => setTeachingForm({
                                    ...teachingForm,
                                    semester: event.target.value,
                                    studyYear: String(Math.ceil(Number(event.target.value) / 2))
                                })}>
                                {[1, 2, 3, 4, 5, 6].map((semester) => (
                                    <option key={semester} value={semester}>{semester}</option>
                                ))}
                            </select>
                        </label>
                        <button className="auth-button" type="submit"
                            disabled={isSaving || isLoading || !teachingForm.teacher ||
                                assignableSubjects.length === 0}>
                            {isSaving ? "Saving..." : "Assign subject and class"}
                        </button>
                    </form>
                </section>

                <section className="teacher-panel admin-section">
                    <div className="teacher-panel-heading">
                        <div><h2>Current teaching assignments</h2>
                            <p>Deactivate an assignment to remove it from test creation and student test access.</p></div>
                    </div>
                    {teacherAssignments.length === 0 ? (
                        <div className="teacher-empty-state"><p>No teaching assignments yet.</p></div>
                    ) : (
                        <div className="teacher-management-table">
                            <div className="management-table-header admin-class-header">
                                <div>Teacher</div><div>Subject</div><div>Class</div><div>Status</div><div>Action</div>
                            </div>
                            {teacherAssignments.map((assignment) => (
                                <div className="management-table-row admin-class-row" key={assignment.id}>
                                    <div><strong>{assignment.teacher?.name || "Unavailable"}</strong>
                                        <small>{assignment.teacher?.teacherId || ""}</small></div>
                                    <div>{assignment.subject?.name || "Unavailable"}
                                        <small>{assignment.branch?.name || "Branch unavailable"}</small></div>
                                    <div>{assignment.academicBatch} · Year {assignment.studyYear}, Semester {assignment.semester}</div>
                                    <div>{assignment.isActive ? "Active" : "Inactive"}</div>
                                    <div><button type="button" className="management-filter"
                                        disabled={isSaving}
                                        onClick={() => void runAction(
                                            () => setTeacherAssignmentStatus(assignment.id, !assignment.isActive),
                                            `Teaching assignment ${assignment.isActive ? "deactivated" : "activated"}.`
                                        )}>
                                        {assignment.isActive ? "Deactivate" : "Activate"}
                                    </button></div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="teacher-panel admin-section">
                    <div className="teacher-panel-heading">
                        <div><h2>Current class incharges</h2>
                            <p>Deactivate an assignment to remove its approval permissions.</p></div>
                    </div>
                    {assignments.length === 0 ? (
                        <div className="teacher-empty-state"><p>No class incharges assigned yet.</p></div>
                    ) : (
                        <div className="teacher-management-table">
                            <div className="management-table-header admin-class-header">
                                <div>Class incharge</div><div>Branch</div><div>Class</div><div>Status</div><div>Action</div>
                            </div>
                            {assignments.map((assignment) => (
                                <div className="management-table-row admin-class-row" key={assignment.id}>
                                    <div><strong>{assignment.teacher?.name}</strong>
                                        <small>{assignment.teacher?.teacherId}</small></div>
                                    <div>{assignment.branch?.name} ({assignment.branch?.code})</div>
                                    <div>{assignment.academicBatch} · Year {assignment.studyYear}, Semester {assignment.semester}</div>
                                    <div>{assignment.isActive ? "Active" : "Inactive"}</div>
                                    <div><button type="button" className="management-filter"
                                        disabled={isSaving}
                                        onClick={() => void runAction(
                                            () => setClassInchargeStatus(assignment.id, !assignment.isActive),
                                            `Class incharge ${assignment.isActive ? "deactivated" : "activated"}.`
                                        )}>
                                        {assignment.isActive ? "Deactivate" : "Activate"}
                                    </button></div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </main>
        </div>
    );
}

export default AdminManagement;
