import { useCallback, useEffect, useState } from "react";
import PaginationControls from "../components/PaginationControls";
import TeacherNavbar from "../components/TeacherNavbar";
import { listBranches } from "../services/branchService";
import { listTeacherStudents } from "../services/teacherService";

function TeacherStudents() {
    const [students, setStudents] = useState([]);
    const [branches, setBranches] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [summary, setSummary] = useState(null);
    const [search, setSearch] = useState("");
    const [branch, setBranch] = useState("");
    const [status, setStatus] = useState("");
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [branchError, setBranchError] = useState("");

    const loadBranches = useCallback(async () => {
        setBranchError("");
        try {
            setBranches(await listBranches());
        } catch (requestError) {
            setBranchError(requestError.message);
        }
    }, []);

    const loadStudents = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const studentPage = await listTeacherStudents({
                page,
                limit: 10,
                search,
                branch,
                status
            });
            setStudents(studentPage.students);
            setPagination(studentPage.pagination);
            setSummary(studentPage.summary);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, branch, status]);

    useEffect(() => {
        Promise.resolve().then(loadStudents);
    }, [loadStudents]);

    useEffect(() => {
        Promise.resolve().then(loadBranches);
    }, [loadBranches]);

    const changeFilter = (setFilter) => (event) => {
        setFilter(event.target.value);
        setPage(1);
    };

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Students" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">STUDENT MANAGEMENT</span>
                        <h1>Students</h1>
                        <p>Students registered in branches you manage, with their completed exam performance.</p>
                    </div>
                </div>

                {branchError && (
                    <div className="error-message" role="alert">
                        <p>Unable to load branch filters: {branchError}</p>
                        <button type="button" onClick={loadBranches}>Retry</button>
                    </div>
                )}

                {error && (
                    <div className="error-message" role="alert">
                        <p>Unable to load students: {error}</p>
                        <button type="button" onClick={loadStudents}>Retry</button>
                    </div>
                )}

                <div className="teacher-stats-grid">
                    <div className="teacher-stat-card"><div className="stat-icon">👨‍🎓</div>
                        <div><h3>{summary?.totalStudents ?? "—"}</h3><p>Managed Students</p></div></div>
                    <div className="teacher-stat-card"><div className="stat-icon">✓</div>
                        <div><h3>{summary?.activeStudents ?? "—"}</h3><p>Active Accounts</p></div></div>
                </div>

                <div className="teacher-management-toolbar">
                    <div className="teacher-search-box">
                        <span>🔍</span>
                        <input
                            type="search"
                            value={search}
                            onChange={changeFilter(setSearch)}
                            placeholder="Search Student ID, name, email, branch..."
                            aria-label="Search students"
                        />
                    </div>
                    <select className="management-filter" value={branch}
                        onChange={changeFilter(setBranch)} aria-label="Filter by branch">
                        <option value="">All managed branches</option>
                        {branches.map((item) => <option key={item.id} value={item.id}>
                            {item.name} ({item.code})
                        </option>)}
                    </select>
                    <select className="management-filter" value={status}
                        onChange={changeFilter(setStatus)} aria-label="Filter by account status">
                        <option value="">All account statuses</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="suspended">Suspended</option>
                    </select>
                    <div className="branch-count">
                        Showing {students.length} of {pagination?.totalResults ?? "—"}
                    </div>
                </div>

                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading students...</div>
                ) : students.length === 0 ? (
                    <div className="teacher-empty-state">
                        <h2>No students found</h2>
                        <p>There are no students matching your managed branches and selected filters.</p>
                    </div>
                ) : (
                    <div className="teacher-management-table student-id-management-table">
                        <div className="management-table-header">
                            <div>Student ID</div><div>Student</div><div>Branch</div>
                            <div>Year / Semester</div><div>Tests Attempted</div>
                            <div>Average Score</div><div>Account</div>
                        </div>
                        {students.map((student) => (
                            <div className="management-table-row" key={student.id}>
                                <div><strong>{student.studentId}</strong></div>
                                <div className="branch-name-cell">
                                    <div className="branch-icon">👤</div>
                                    <div><strong>{student.name}</strong>
                                        <small>@{student.username}</small>
                                        <small>{student.email}</small>
                                    </div>
                                </div>
                                <div>{student.branch} {student.branchCode && `(${student.branchCode})`}</div>
                                <div>{student.year || "—"}</div>
                                <div>{student.testsAttempted}</div>
                                <div>{student.averagePercentage === null
                                    ? "No results" : `${student.averagePercentage}%`}</div>
                                <div><span className={student.accountStatus === "active"
                                    ? "status-active" : "status-inactive"}>
                                    {student.accountStatus}
                                </span></div>
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && <PaginationControls pagination={pagination} onPageChange={setPage} />}
            </main>
        </div>
    );
}

export default TeacherStudents;
