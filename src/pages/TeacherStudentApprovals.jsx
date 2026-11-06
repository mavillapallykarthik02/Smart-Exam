import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import PaginationControls from "../components/PaginationControls";
import TeacherNavbar from "../components/TeacherNavbar";
import {
    listStudentApprovals,
    updateStudentApproval
} from "../services/teacherService";

const statuses = ["pending", "approved", "rejected", "suspended"];

function TeacherStudentApprovals() {
    const { user } = useAuth();
    const [students, setStudents] = useState([]);
    const [summary, setSummary] = useState(null);
    const [pagination, setPagination] = useState(null);
    const [status, setStatus] = useState("pending");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [actioningStudent, setActioningStudent] = useState("");
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    const loadApprovals = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const result = await listStudentApprovals({
                page,
                limit: 10,
                status,
                search
            });
            setStudents(result.students);
            setSummary(result.summary);
            setPagination(result.pagination);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => {
        if (user?.staffRole !== "class_teacher") return;
        Promise.resolve().then(loadApprovals);
    }, [loadApprovals, user?.staffRole]);

    const changeStatus = (nextStatus) => {
        setStatus(nextStatus);
        setPage(1);
        setNotice("");
    };

    const handleAction = async (student, action) => {
        let reason = "";
        if (action === "reject" || action === "suspend") {
            reason = window.prompt(
                action === "reject" ? "Enter the rejection reason:" : "Enter the suspension reason:"
            )?.trim() || "";
            if (reason.length < 3) {
                setError("Enter a reason with at least 3 characters to continue.");
                return;
            }
        }
        const actionLabel = {
            approve: "approve",
            reject: "reject",
            suspend: "suspend",
            reactivate: "reactivate"
        }[action];
        if (!window.confirm(`Are you sure you want to ${actionLabel} ${student.name}?`)) return;

        setError("");
        setNotice("");
        setActioningStudent(student.id);
        try {
            await updateStudentApproval(student.id, action, reason);
            const pastTense = {
                approve: "approved",
                reject: "rejected",
                suspend: "suspended",
                reactivate: "reactivated"
            }[action];
            setNotice(`Student ${pastTense} successfully.`);
            await loadApprovals();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setActioningStudent("");
        }
    };

    if (user?.staffRole !== "class_teacher") {
        return (
            <div className="teacher-page">
                <TeacherNavbar />
                <main className="teacher-dashboard">
                    <div className="teacher-empty-state" role="alert">
                        <h2>Class incharge access required</h2>
                        <p>Student approval actions are available only to teachers assigned as class incharge.</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Approvals" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">CLASS INCHARGE</span>
                        <h1>Student approvals</h1>
                        <p>Review and manage students assigned to your classes.</p>
                    </div>
                </div>

                {error && <div className="error-message" role="alert">
                    <p>{error}</p>
                    <button type="button" onClick={loadApprovals}>Retry</button>
                </div>}
                {notice && <div className="approval-notice" role="status">{notice}</div>}

                <div className="teacher-stats-grid approval-stats-grid">
                    {[
                        ["total", "Registered"],
                        ["pending", "Pending"],
                        ["approved", "Approved"],
                        ["rejected", "Rejected"],
                        ["suspended", "Suspended"]
                    ].map(([key, label]) => (
                        <div className="teacher-stat-card" key={key}>
                            <div><h3>{summary?.[key] ?? "—"}</h3><p>{label}</p></div>
                        </div>
                    ))}
                </div>

                <div className="teacher-management-toolbar">
                    <div className="teacher-search-box">
                        <span aria-hidden="true">⌕</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => {
                                setSearch(event.target.value);
                                setPage(1);
                            }}
                            placeholder="Search student name or PIN"
                            aria-label="Search by student name or PIN"
                        />
                    </div>
                    <select
                        className="management-filter"
                        value={status}
                        onChange={(event) => changeStatus(event.target.value)}
                        aria-label="Filter by approval status"
                    >
                        {statuses.map((item) => (
                            <option key={item} value={item}>
                                {item[0].toUpperCase() + item.slice(1)}
                            </option>
                        ))}
                    </select>
                    <div className="branch-count">
                        Showing {students.length} of {pagination?.totalResults ?? "—"}
                    </div>
                </div>

                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading students...</div>
                ) : students.length === 0 ? (
                    <div className="teacher-empty-state">
                        <h2>No {status} students</h2>
                        <p>There are no students in this class matching the selected filter.</p>
                    </div>
                ) : (
                    <div className="teacher-management-table approval-table">
                        <div className="management-table-header">
                            <div>Polytechnic PIN</div>
                            <div>Student</div>
                            <div>Branch and class</div>
                            <div>Registered</div>
                            <div>Status</div>
                            <div>Actions</div>
                        </div>
                        {students.map((student) => (
                            <div className="management-table-row" key={student.id}>
                                <div><strong>{student.studentId}</strong></div>
                                <div className="branch-name-cell">
                                    <div className="branch-icon" aria-hidden="true">👤</div>
                                    <div>
                                        <strong>{student.name}</strong>
                                        <small>{student.email}</small>
                                        {student.mobile && <small>{student.mobile}</small>}
                                    </div>
                                </div>
                                <div>
                                    {student.branch} {student.branchCode && `(${student.branchCode})`}
                                    <small>{student.academicBatch} · Year {student.studyYear}, Semester {student.semester}</small>
                                </div>
                                <div>{new Date(student.createdAt).toLocaleDateString()}</div>
                                <div>
                                    <span className={`approval-status approval-status-${student.accountStatus}`}>
                                        {student.accountStatus}
                                    </span>
                                    {student.rejectionReason && <small>{student.rejectionReason}</small>}
                                    {student.suspensionReason && <small>{student.suspensionReason}</small>}
                                </div>
                                <div className="management-actions approval-actions">
                                    {student.accountStatus === "pending" && <>
                                        <button
                                            type="button"
                                            disabled={actioningStudent === student.id}
                                            onClick={() => void handleAction(student, "approve")}
                                        >Approve</button>
                                        <button
                                            type="button"
                                            className="danger"
                                            disabled={actioningStudent === student.id}
                                            onClick={() => void handleAction(student, "reject")}
                                        >Reject</button>
                                    </>}
                                    {student.accountStatus === "approved" && (
                                        <button
                                            type="button"
                                            className="danger"
                                            disabled={actioningStudent === student.id}
                                            onClick={() => void handleAction(student, "suspend")}
                                        >Suspend</button>
                                    )}
                                    {student.accountStatus === "suspended" && (
                                        <button
                                            type="button"
                                            disabled={actioningStudent === student.id}
                                            onClick={() => void handleAction(student, "reactivate")}
                                        >Reactivate</button>
                                    )}
                                    {actioningStudent === student.id && <small>Updating…</small>}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && <PaginationControls pagination={pagination} onPageChange={setPage} />}
            </main>
        </div>
    );
}

export default TeacherStudentApprovals;
