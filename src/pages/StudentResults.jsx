import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import PaginationControls from "../components/PaginationControls";
import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/AuthContext";
import { listStudentResults } from "../services/resultService";

function StudentResults() {
    const { user: student } = useAuth();
    const [results, setResults] = useState([]);
    const [pagination, setPagination] = useState(null);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("All");
    const [page, setPage] = useState(1);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadResults = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const resultPage = await listStudentResults({
                page,
                limit: 10,
                search,
                status: status === "All" ? "" : status
            });
            setResults(resultPage.results);
            setPagination(resultPage.pagination);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [page, search, status]);

    useEffect(() => {
        Promise.resolve().then(loadResults);
    }, [loadResults]);

    return (
        <div className="student-page">
            <StudentNavbar />
            <main className="student-content">
                <div className="page-title">
                    <p className="dashboard-label">EXAMINATION HISTORY</p>
                    <h1>My Results</h1>
                    <p>Student ID: {student.studentId} · View your submitted official examination results and answer review.</p>
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
                        }} placeholder="Search test or subject..." />
                    </div>
                    <select className="management-filter" value={status} onChange={(event) => {
                        setStatus(event.target.value);
                        setPage(1);
                    }}>
                        <option>All</option><option value="PASSED">Passed</option><option value="FAILED">Failed</option>
                    </select>
                </div>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading results...</div>
                ) : results.length === 0 ? (
                    <div className="teacher-empty-state">
                        <h2>No results yet</h2>
                        <p>Results appear here after you submit an official exam.</p>
                    </div>
                ) : (
                    <div className="results-table-container">
                        <table className="results-table">
                            <thead><tr>
                                <th>Test</th><th>Subject</th><th>Submitted</th>
                                <th>Score</th><th>Percentage</th><th>Correct</th>
                                <th>Incorrect</th><th>Unanswered</th><th>Status</th><th>Review</th>
                            </tr></thead>
                            <tbody>
                                {results.map((result) => (
                                    <tr key={result.id}>
                                        <td><strong>{result.test?.title || "Archived test"}</strong></td>
                                        <td>{result.test?.subject || "—"}</td>
                                        <td>{new Date(result.submittedAt).toLocaleString()}</td>
                                        <td>{result.obtainedMarks} / {result.totalMarks}</td>
                                        <td><span className="result-percentage">{result.percentage.toFixed(1)}%</span></td>
                                        <td>{result.correctAnswers}</td>
                                        <td>{result.incorrectAnswers}</td>
                                        <td>{result.unanswered}</td>
                                        <td>{result.passed ? "Passed" : "Failed"}</td>
                                        <td><Link to={`/student/results/${result.id}`}>Review answers</Link></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
                {!isLoading && <PaginationControls pagination={pagination} onPageChange={setPage} />}
            </main>
        </div>
    );
}

export default StudentResults;
