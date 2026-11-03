import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaginationControls from "../components/PaginationControls";
import TeacherNavbar from "../components/TeacherNavbar";
import { listResults } from "../services/resultService";

function TeacherAnswers() {
    const [results, setResults] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [summary, setSummary] = useState(null);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadResults = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const resultPage = await listResults({ page, limit: 10, search });
            setResults(resultPage.results);
            setPagination(resultPage.pagination);
            setSummary(resultPage.summary);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        Promise.resolve().then(loadResults);
    }, [loadResults]);

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Answers" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">ANSWER MANAGEMENT</span>
                        <h1>Submitted Answers</h1>
                        <p>Review submitted descriptive responses, award marks and publish completed results.</p>
                    </div>
                </div>
                <div className="teacher-stats-grid">
                    <div className="teacher-stat-card"><div className="stat-icon">📄</div>
                        <div><h3>{summary?.totalAttempts ?? 0}</h3><p>Submitted Examinations</p></div></div>
                    <div className="teacher-stat-card"><div className="stat-icon">⌛</div>
                        <div><h3>{results.filter((result) => result.evaluationStatus === "PENDING_EVALUATION").length}</h3>
                            <p>Awaiting Evaluation</p></div></div>
                    <div className="teacher-stat-card"><div className="stat-icon">✓</div>
                        <div><h3>{results.filter((result) => result.evaluationStatus === "PUBLISHED").length}</h3>
                            <p>Published Results</p></div></div>
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
                    <div className="branch-count">Showing {results.length} of {pagination?.totalResults ?? 0}</div>
                </div>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading submissions...</div>
                ) : results.length === 0 ? (
                    <div className="teacher-empty-state"><h2>No submitted answers yet</h2></div>
                ) : (
                    <div className="teacher-management-table student-id-management-table">
                        <div className="management-table-header">
                            <div>Student ID</div><div>Student</div><div>Test</div>
                            <div>Evaluation</div><div>Score</div><div>Submitted</div><div>Review</div>
                        </div>
                        {results.map((result) => (
                            <div className="management-table-row" key={result.id}>
                                <div><strong>{result.student?.studentId || "—"}</strong></div>
                                <div className="branch-name-cell"><div className="branch-icon">👤</div>
                                    <div><strong>{result.student?.name || "Student"}</strong>
                                        <small>@{result.student?.username}</small></div>
                                </div>
                                <div><strong>{result.test?.title || "Archived test"}</strong>
                                    <small className="table-secondary-text">
                                        {result.student?.branch} · {result.test?.subject}
                                    </small>
                                </div>
                                <div>{result.evaluationStatus.replaceAll("_", " ")}</div>
                                <div>{result.obtainedMarks} / {result.totalMarks}</div>
                                <div>{new Date(result.submittedAt).toLocaleDateString()}</div>
                                <div><Link to={`/teacher/answers/${result.id}`}>Review answers</Link></div>
                            </div>
                        ))}
                    </div>
                )}
                {!isLoading && <PaginationControls pagination={pagination} onPageChange={setPage} />}
            </main>
        </div>
    );
}

export default TeacherAnswers;
