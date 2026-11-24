import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import LogoutButton from "../components/LogoutButton";
import BrandLogoImage from "../components/BrandLogoImage";
import BranchAdminSubjects from "./BranchAdminSubjects";
import {
    getBranchAdminTeacherDetails,
    listBranchAdminBranchRequests,
    listBranchAdminStudentPerformance,
    listBranchAdminStudents,
    listBranchAdminTeachers,
    reviewBranchAdminTeacher,
    reviewBranchAdminBranchRequest
} from "../services/branchAdminService";

const sections = [
    { id: "teachers", label: "Teacher Approval & Management" },
    { id: "subjects", label: "Subjects & Teaching Assignments" },
    { id: "branch-requests", label: "Teacher Branch Requests" },
    { id: "performance", label: "Student Progress & Performance" },
    { id: "account", label: "Administrator Account" }
];

function BranchAdminHome() {
    const { user, updateProfile } = useAuth();
    const [activeSection, setActiveSection] = useState("teachers");
    const [teachers, setTeachers] = useState([]);
    const [students, setStudents] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [branchRequests, setBranchRequests] = useState([]);
    const [selectedTeacherId, setSelectedTeacherId] = useState("");
    const [selectedTeacherDetails, setSelectedTeacherDetails] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isAccountEditing, setIsAccountEditing] = useState(false);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [accountForm, setAccountForm] = useState({
        name: user?.name || "",
        username: user?.username || "",
        email: user?.email || "",
        mobile: user?.mobile || ""
    });

    useEffect(() => {
        setAccountForm({
            name: user?.name || "",
            username: user?.username || "",
            email: user?.email || "",
            mobile: user?.mobile || ""
        });
    }, [user]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const [teacherList, studentList, studentPerformance, teacherBranchRequests] = await Promise.all([
                listBranchAdminTeachers(),
                listBranchAdminStudents(),
                listBranchAdminStudentPerformance(),
                listBranchAdminBranchRequests()
            ]);
            setTeachers(teacherList);
            setStudents(studentList);
            setPerformance(studentPerformance);
            setBranchRequests(teacherBranchRequests);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadData);
    }, [loadData]);

    const reviewTeacher = async (teacher, status) => {
        let reason = "";
        if (status === "REJECTED") {
            reason = window.prompt(`Why are you rejecting ${teacher.name}?`)?.trim() || "";
            if (reason.length < 3) {
                setError("Enter a rejection reason with at least 3 characters.");
                return;
            }
        }
        setIsSaving(true);
        setError("");
        try {
            await reviewBranchAdminTeacher(teacher.id, status, reason);
            setNotice(`Teacher ${status.toLowerCase()} successfully.`);
            await loadData();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const reviewBranchRequest = async (branchRequest, status) => {
        let reason = "";
        if (status === "REJECTED") {
            reason = window.prompt(`Why are you rejecting ${branchRequest.teacher?.name}'s branch request?`)?.trim() || "";
            if (reason.length < 3) {
                setError("Enter a rejection reason with at least 3 characters.");
                return;
            }
        }
        setIsSaving(true);
        setError("");
        try {
            await reviewBranchAdminBranchRequest(branchRequest.id, status, reason);
            setNotice(`Branch request ${status.toLowerCase()} successfully.`);
            await loadData();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    const openTeacherDetails = async (teacher) => {
        if (teacher.verificationStatus !== "APPROVED") return;
        setSelectedTeacherId(teacher.id);
        setSelectedTeacherDetails(null);
        setError("");
        setIsSaving(true);
        try {
            setSelectedTeacherDetails(await getBranchAdminTeacherDetails(teacher.id));
        } catch (requestError) {
            setError(requestError.message);
            setSelectedTeacherId("");
        } finally {
            setIsSaving(false);
        }
    };

    const saveAccount = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setError("");
        setNotice("");
        try {
            await updateProfile(accountForm);
            setIsAccountEditing(false);
            setNotice("Account details updated successfully.");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="teacher-page admin-dashboard">
            <header className="teacher-navbar admin-navbar">
                <Link to="/branch-admin/home" className="teacher-logo">
                    <BrandLogoImage />
                    <div><h2>SmartExam</h2><p>Branch Administrator</p></div>
                </Link>
                <LogoutButton role="branch_admin" className="teacher-logout" />
            </header>
            <div className="admin-dashboard-layout">
                <nav className="admin-dashboard-nav" aria-label="Branch administrator sections">
                    {sections.map((section) => (
                        <button
                            type="button"
                            key={section.id}
                            className={activeSection === section.id ? "active" : ""}
                            onClick={() => {
                                setActiveSection(section.id);
                                setSelectedTeacherId("");
                                setSelectedTeacherDetails(null);
                                setError("");
                                setNotice("");
                            }}
                        >
                            {section.label}
                        </button>
                    ))}
                </nav>
                <main className="admin-dashboard-content">
                    <div className="teacher-page-heading">
                        <div>
                            <span className="page-badge">BRANCH ADMINISTRATION</span>
                            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
                        </div>
                    </div>
                    {error && <div className="error-message" role="alert">{error}</div>}
                    {notice && <div className="approval-notice" role="status">{notice}</div>}
                    {isLoading ? <div className="teacher-empty-state">Loading branch information...</div> : (
                    <>
                        {activeSection === "teachers" && (
                            <>
                                {selectedTeacherId && selectedTeacherDetails ? (
                                    <>
                                        <article className="teacher-panel admin-section">
                                            <div className="teacher-panel-heading">
                                                <div>
                                                    <h2>{selectedTeacherDetails.teacher.name}</h2>
                                                    <p>Teacher ID: {selectedTeacherDetails.teacher.teacherId}</p>
                                                </div>
                                                <button type="button" className="teacher-primary-button" onClick={() => {
                                                    setSelectedTeacherId("");
                                                    setSelectedTeacherDetails(null);
                                                }}>Back to Teachers</button>
                                            </div>
                                            <div className="branch-detail-summary">
                                                <div><small>Email</small><strong>{selectedTeacherDetails.teacher.email}</strong></div>
                                                <div><small>Mobile</small><strong>{selectedTeacherDetails.teacher.mobile || "-"}</strong></div>
                                                <div><small>Department</small><strong>{selectedTeacherDetails.teacher.departmentName || "-"}</strong></div>
                                                <div><small>Designation</small><strong>{selectedTeacherDetails.teacher.designation || "-"}</strong></div>
                                                <div><small>Status</small><strong>{selectedTeacherDetails.teacher.verificationStatus}</strong></div>
                                                <div><small>Account</small><strong>{selectedTeacherDetails.teacher.accountStatus}</strong></div>
                                            </div>
                                        </article>
                                        <article className="teacher-panel admin-section">
                                            <div className="teacher-panel-heading"><div><h2>Teacher Subjects and Performance</h2></div></div>
                                            <div className="teacher-management-table">
                                                <div className="management-table-header" style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 0.7fr 0.7fr" }}>
                                                    <div>Subject</div><div>Academic Placement</div><div>Completed</div><div>Average</div><div>Highest</div>
                                                </div>
                                                {selectedTeacherDetails.subjects.map((subject) => (
                                                    <div className="management-table-row" key={subject.id} style={{ gridTemplateColumns: "1.2fr 1fr 0.7fr 0.7fr 0.7fr" }}>
                                                        <div><strong>{subject.name}</strong><small>{subject.code}</small></div>
                                                        <div>{subject.assignments.map((assignment) => `${assignment.academicBatch} • Year ${assignment.studyYear} • Sem ${assignment.semester}`).join(", ")}</div>
                                                        <div>{subject.completedTests}</div>
                                                        <div>{subject.averagePercentage}%</div>
                                                        <div>{subject.highestPercentage}%</div>
                                                    </div>
                                                ))}
                                                {!selectedTeacherDetails.subjects.length && <p className="management-empty">No subjects are assigned to this teacher.</p>}
                                            </div>
                                        </article>
                                    </>
                                ) : (
                                    <article className="teacher-panel admin-section">
                                        <div className="teacher-panel-heading"><div><h2>Teacher Approval and Management</h2></div></div>
                                        {selectedTeacherId && !selectedTeacherDetails ? (
                                            <div className="teacher-empty-state">Loading teacher information...</div>
                                        ) : (
                                            <div className="teacher-management-table">
                                                <div className="management-table-header" style={{ gridTemplateColumns: "1.5fr 1fr 0.7fr 1fr" }}>
                                                    <div>Teacher</div><div>Email</div><div>Status</div><div>Actions</div>
                                                </div>
                                                {teachers.map((teacher) => (
                                                    <div
                                                        className="management-table-row"
                                                        style={{ gridTemplateColumns: "1.5fr 1fr 0.7fr 1fr" }}
                                                        key={teacher.id}
                                                        role={teacher.verificationStatus === "APPROVED" ? "button" : undefined}
                                                        tabIndex={teacher.verificationStatus === "APPROVED" ? 0 : undefined}
                                                        onClick={() => teacher.verificationStatus === "APPROVED" && openTeacherDetails(teacher)}
                                                        onKeyDown={(event) => {
                                                            if (teacher.verificationStatus === "APPROVED" && (event.key === "Enter" || event.key === " ")) {
                                                                event.preventDefault();
                                                                openTeacherDetails(teacher);
                                                            }
                                                        }}
                                                    >
                                                        <div><strong>{teacher.name}</strong><small>{teacher.teacherId} • {teacher.departmentName}</small></div>
                                                        <div>{teacher.email}</div>
                                                        <div><span className="status-badge">{teacher.verificationStatus}</span></div>
                                                        <div className="management-actions">
                                                            {teacher.verificationStatus !== "APPROVED" && <button type="button" disabled={isSaving} onClick={(event) => { event.stopPropagation(); void reviewTeacher(teacher, "APPROVED"); }}>Approve</button>}
                                                            {teacher.verificationStatus !== "REJECTED" && <button type="button" className="danger" disabled={isSaving} onClick={(event) => { event.stopPropagation(); void reviewTeacher(teacher, "REJECTED"); }}>Reject</button>}
                                                        </div>
                                                    </div>
                                                ))}
                                                {!teachers.length && <p className="management-empty">No teachers are assigned to this branch.</p>}
                                            </div>
                                        )}
                                    </article>
                                )}
                            </>
                        )}
                        {activeSection === "branch-requests" && (
                            <article className="teacher-panel admin-section">
                                <div className="teacher-panel-heading"><div><h2>Teacher Branch Requests</h2></div></div>
                                <div className="teacher-management-table">
                                    <div className="management-table-header" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 1fr" }}>
                                        <div>Teacher</div><div>Department</div><div>Status</div><div>Actions</div>
                                    </div>
                                    {branchRequests.map((branchRequest) => (
                                        <div className="management-table-row" style={{ gridTemplateColumns: "1.4fr 1fr 0.7fr 1fr" }} key={branchRequest.id}>
                                            <div>
                                                <strong>{branchRequest.teacher?.name || "Unknown teacher"}</strong>
                                                <small>{branchRequest.teacher?.teacherId}</small>
                                                <small>{branchRequest.teacher?.email}</small>
                                            </div>
                                            <div>{branchRequest.teacher?.departmentName || "-"}<small>{branchRequest.teacher?.designation || ""}</small></div>
                                            <div>
                                                {branchRequest.status === "APPROVED" && <span className="status-active">Approved</span>}
                                                {branchRequest.status === "PENDING" && <span className="result-pending">Pending</span>}
                                                {branchRequest.status === "REJECTED" && <span className="status-inactive">Rejected</span>}
                                                {branchRequest.reason && <small>{branchRequest.reason}</small>}
                                            </div>
                                            <div>
                                                {branchRequest.status === "PENDING" ? (
                                                    <>
                                                        <button type="button" className="teacher-primary-button" disabled={isSaving}
                                                            onClick={() => reviewBranchRequest(branchRequest, "APPROVED")}>Approve</button>
                                                        <button type="button" className="danger" disabled={isSaving}
                                                            onClick={() => reviewBranchRequest(branchRequest, "REJECTED")}>Reject</button>
                                                    </>
                                                ) : (
                                                    <span>{branchRequest.status}</span>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {!branchRequests.length && <div className="teacher-empty-state">No teachers have requested access to this branch.</div>}
                                </div>
                            </article>
                        )}
                        {activeSection === "subjects" && (
                            <BranchAdminSubjects />
                        )}
                        {activeSection === "performance" && (
                            <>
                                <article className="teacher-panel admin-section">
                                    <div className="teacher-panel-heading"><div><h2>Students</h2></div></div>
                                    <div className="teacher-management-table">
                                        <div className="management-table-header" style={{ gridTemplateColumns: "1fr 1fr 0.7fr" }}>
                                            <div>Student</div><div>Academic Placement</div><div>Status</div>
                                        </div>
                                        {students.map((student) => (
                                            <div className="management-table-row" key={student.id}
                                                style={{ gridTemplateColumns: "1fr 1fr 0.7fr" }}>
                                                <div><strong>{student.name}</strong><small>{student.studentId}</small></div>
                                                <div>{student.academicBatch || "Batch not set"} • Year {student.studyYear || "-"}</div>
                                                <div><span className="status-badge">{student.accountStatus}</span></div>
                                            </div>
                                        ))}
                                        {!students.length && <p className="management-empty">No students are assigned to this branch.</p>}
                                    </div>
                                </article>
                                <article className="teacher-panel admin-section">
                                    <div className="teacher-panel-heading"><div><h2>Student Progress and Performance</h2></div></div>
                                    <div className="teacher-management-table">
                                        <div className="management-table-header" style={{ gridTemplateColumns: "1.2fr 0.7fr 0.7fr 0.7fr" }}>
                                            <div>Student</div><div>Completed</div><div>Average</div><div>Highest</div>
                                        </div>
                                        {performance.map((student) => (
                                            <div className="management-table-row" key={student.id}
                                                style={{ gridTemplateColumns: "1.2fr 0.7fr 0.7fr 0.7fr" }}>
                                                <div><strong>{student.name}</strong><small>{student.studentId}</small></div>
                                                <div>{student.completedTests}</div>
                                                <div>{student.averagePercentage}%</div>
                                                <div>{student.highestPercentage}%</div>
                                            </div>
                                        ))}
                                        {!performance.length && <p className="management-empty">No student performance data is available.</p>}
                                    </div>
                                </article>
                            </>
                        )}
                        {activeSection === "account" && (
                            <article className="teacher-panel admin-section">
                                <div className="teacher-panel-heading">
                                    <div>
                                        <h2>Administrator Account</h2>
                                        <p>View and update the profile saved to your branch administrator account.</p>
                                    </div>
                                    {!isAccountEditing && (
                                        <button
                                            type="button"
                                            className="teacher-primary-button"
                                            onClick={() => setIsAccountEditing(true)}
                                        >
                                            Edit Account
                                        </button>
                                    )}
                                </div>
                                <p><strong>Administrator ID:</strong> {user?.administratorId}</p>
                                <p><strong>Branch:</strong> {user?.branch}</p>
                                <form className="admin-assignment-form" onSubmit={saveAccount}>
                                    <div className="form-group"><label htmlFor="account-name">Full Name</label><input id="account-name" value={accountForm.name} onChange={(event) => setAccountForm((current) => ({ ...current, name: event.target.value }))} disabled={!isAccountEditing || isSaving} required /></div>
                                    <div className="form-group"><label htmlFor="account-username">Username</label><input id="account-username" value={accountForm.username} onChange={(event) => setAccountForm((current) => ({ ...current, username: event.target.value }))} disabled={!isAccountEditing || isSaving} required /></div>
                                    <div className="form-group"><label htmlFor="account-email">Email</label><input id="account-email" type="email" value={accountForm.email} onChange={(event) => setAccountForm((current) => ({ ...current, email: event.target.value }))} disabled={!isAccountEditing || isSaving} required /></div>
                                    <div className="form-group"><label htmlFor="account-mobile">Mobile</label><input id="account-mobile" value={accountForm.mobile} onChange={(event) => setAccountForm((current) => ({ ...current, mobile: event.target.value }))} disabled={!isAccountEditing || isSaving} /></div>
                                    {isAccountEditing && (
                                        <div className="modal-actions">
                                            <button type="button" disabled={isSaving} onClick={() => {
                                                setAccountForm({
                                                    name: user?.name || "",
                                                    username: user?.username || "",
                                                    email: user?.email || "",
                                                    mobile: user?.mobile || ""
                                                });
                                                setIsAccountEditing(false);
                                                setError("");
                                            }}>Cancel</button>
                                            <button type="submit" className="teacher-primary-button" disabled={isSaving}>{isSaving ? "Saving..." : "Save Changes"}</button>
                                        </div>
                                    )}
                                </form>
                            </article>
                        )}
                    </>
                )}
                </main>
            </div>
        </div>
    );
}

export default BranchAdminHome;
