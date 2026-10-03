import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaginationControls from "../components/PaginationControls";
import TeacherNavbar from "../components/TeacherNavbar";
import { listResults } from "../services/resultService";

function TeacherResults() {
    const [results, setResults] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("All");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadResults = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const resultPage = await listResults({
                page,
                limit: 10,
                search,
                date,
                status: status === "All" ? "" : status.toUpperCase()
            });
            setResults(resultPage.results);
            setPagination(resultPage.pagination);
            setSummary(resultPage.summary);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, date, status]);

    useEffect(() => {
        Promise.resolve().then(loadResults);
    }, [loadResults]);

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Results" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">RESULT MANAGEMENT</span>
                        <h1>Student Results</h1>
                        <p>Review real submitted attempts and test performance.</p>
                    </div>
                </div>
                <div className="teacher-stats-grid">
                    <div className="teacher-stat-card"><div className="stat-icon">📊</div>
                        <div><h3>{summary?.totalAttempts ?? 0}</h3><p>Total Attempts</p></div></div>
                    <div className="teacher-stat-card"><div className="stat-icon">✓</div>
                        <div><h3>{summary?.passed ?? 0}</h3><p>Passed</p></div></div>
                    <div className="teacher-stat-card"><div className="stat-icon">📈</div>
                        <div><h3>{summary?.averagePercentage ?? 0}%</h3><p>Average Score</p></div></div>
                </div>
                {error && <div className="error-message" role="alert">
                    <p>{error}</p><button type="button" onClick={loadResults}>Retry</button>
                </div>}
                <div className="teacher-management-toolbar">
                    <div className="teacher-search-box">
                        <span>🔍</span>
                        <input value={search} onChange={(event) => {
                            setSearch(event.target.value);
                            setPage(1);
                        }}
                            placeholder="Search Student ID, name, branch, subject or test..." />
                    </div>
                    <select className="management-filter" value={status}
                        onChange={(event) => {
                            setStatus(event.target.value);
                            setPage(1);
                        }}>
                        <option>All</option><option>Passed</option><option>Failed</option>
                    </select>
                    <input
                        className="management-filter"
                        type="date"
                        value={date}
                        onChange={(event) => {
                            setDate(event.target.value);
                            setPage(1);
                        }}
                        aria-label="Filter results by submission date"
                    />
                    <div className="branch-count">Showing {results.length} of {pagination?.totalResults ?? 0}</div>
                </div>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading results...</div>
                ) : results.length === 0 ? (
                    <div className="teacher-empty-state"><h2>No matching results</h2></div>
                ) : (
                    <div className="teacher-management-table student-id-management-table teacher-results-id-table">
                        <div className="management-table-header">
                            <div>Student ID</div><div>Student</div><div>Test</div><div>Score</div>
                            <div>Percentage</div><div>Status</div><div>Submitted</div><div>Action</div>
                        </div>
                        {results.map((result) => (
                            <div className="management-table-row" key={result.id}>
                                <div><strong>{result.student?.studentId || "—"}</strong></div>
                                <div className="branch-name-cell"><div className="branch-icon">👤</div>
                                    <div><strong>{result.student?.name || "Student"}</strong>
                                        <small>@{result.student?.username}</small></div>
                                </div>
                                <div><strong>{result.test?.title || "Archived test"}</strong>
                                    <small className="table-secondary-text">{result.test?.subject} · {result.test?.branch}</small>
                                </div>
                                <div>{result.obtainedMarks} / {result.totalMarks}</div>
                                <div>{result.percentage.toFixed(1)}%</div>
                                <div><span className={result.passed ? "status-active" : "status-inactive"}>
                                    ● {result.passed ? "Passed" : "Failed"}
                                </span></div>
                                <div>{new Date(result.submittedAt).toLocaleDateString()}</div>
                                <div><Link to={`/teacher/answers/${result.id}`}>Review</Link></div>
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && <PaginationControls pagination={pagination} onPageChange={setPage} />}
            </main>
        </div>
    );
}

export default TeacherResults;
