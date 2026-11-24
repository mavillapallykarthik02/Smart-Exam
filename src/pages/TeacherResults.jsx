import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TeacherNavbar from "../components/TeacherNavbar";
import { getTeacherResultOverview } from "../services/resultService";

function TeacherResults() {
    const [subjects, setSubjects] = useState([]);
    const [search, setSearch] = useState("");
    const [date, setDate] = useState("");
    const [status, setStatus] = useState("All");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadResults = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const overview = await getTeacherResultOverview();
            setSubjects(overview.subjects);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadResults);
    }, [loadResults]);

    const normalizedSearch = search.trim().toLowerCase();
    const visibleSubjects = subjects.map((subject) => ({
        ...subject,
        tests: subject.tests.map((test) => ({
            ...test,
            students: test.students.filter((entry) => {
                const searchMatch = !normalizedSearch || [
                    subject.name,
                    subject.code,
                    test.title,
                    entry.student.name,
                    entry.student.studentId,
                    entry.student.username,
                    entry.student.branch
                ].some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
                const statusMatch = status === "All" ||
                    (status === "Passed" && entry.result?.passed) ||
                    (status === "Failed" && entry.result && !entry.result.passed);
                const dateMatch = !date || (
                    entry.submittedAt &&
                    new Date(entry.submittedAt).toISOString().slice(0, 10) === date
                );
                return searchMatch && statusMatch && dateMatch;
            })
        })).filter((test) => test.students.length > 0)
    })).filter((subject) => subject.tests.length > 0);
    const visibleEntries = visibleSubjects.flatMap((subject) =>
        subject.tests.flatMap((test) => test.students)
    );
    const completedResults = visibleEntries.filter((entry) => entry.result);
    const summary = {
        totalAttempts: completedResults.length,
        passed: completedResults.filter((entry) => entry.result.passed).length,
        averagePercentage: completedResults.length
            ? (completedResults.reduce((total, entry) => total + entry.result.percentage, 0) /
                completedResults.length).toFixed(1)
            : "0.0"
    };

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Results" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">RESULT MANAGEMENT</span>
                        <h1>Student Results</h1>
                        <p>Browse results by subject and test. Each test includes every student in its class, including students who have not attempted it.</p>
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
                        <input value={search} onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search student, subject, or test..." />
                    </div>
                    <select className="management-filter" value={status}
                        onChange={(event) => setStatus(event.target.value)}>
                        <option>All</option><option>Passed</option><option>Failed</option>
                    </select>
                    <input
                        className="management-filter"
                        type="date"
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                        aria-label="Filter results by submission date"
                    />
                    <div className="branch-count">Showing {visibleEntries.length} students</div>
                </div>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading results...</div>
                ) : visibleSubjects.length === 0 ? (
                    <div className="teacher-empty-state"><h2>No matching tests or students</h2></div>
                ) : (
                    visibleSubjects.map((subject) => (
                        <details className="results-subject-group" key={subject.id} open>
                            <summary>
                                <span>{subject.name}{subject.code ? ` (${subject.code})` : ""}</span>
                                <small>{subject.tests.length} test{subject.tests.length === 1 ? "" : "s"}</small>
                            </summary>
                            <div className="results-test-list">
                                {subject.tests.map((test) => (
                                    <details className="results-test-group" key={test.id}>
                                        <summary>
                                            <span>{test.title}</span>
                                            <small>{test.branch} · {test.academicBatch} · Year {test.studyYear}, Semester {test.semester} · {test.students.length} students</small>
                                        </summary>
                                        <div className="teacher-management-table results-roster-table">
                                            <div className="management-table-header">
                                                <div>Student ID</div><div>Student</div><div>Result</div>
                                                <div>Score</div><div>Percentage</div><div>Submitted</div><div>Action</div>
                                            </div>
                                            {test.students.map((entry) => (
                                                <div className="management-table-row" key={entry.student.id}>
                                                    <div><strong>{entry.student.studentId || "—"}</strong></div>
                                                    <div className="branch-name-cell">
                                                        <div className="branch-icon">👤</div>
                                                        <div><strong>{entry.student.name}</strong><small>@{entry.student.username}</small></div>
                                                    </div>
                                                    <div><span className={entry.result
                                                        ? entry.result.passed ? "status-active" : "status-inactive"
                                                        : ["IN_PROGRESS", "SUBMITTED", "TIMED_OUT"].includes(entry.participationStatus)
                                                            ? "result-pending" : "status-inactive"}>
                                                        {entry.result
                                                            ? entry.result.evaluationStatus === "PUBLISHED"
                                                                ? entry.result.passed ? "Passed" : "Failed"
                                                                : entry.result.evaluationStatus.replaceAll("_", " ")
                                                            : entry.participationStatus === "IN_PROGRESS"
                                                                ? "In progress"
                                                                : ["SUBMITTED", "TIMED_OUT"].includes(entry.participationStatus)
                                                                    ? "Submitted · evaluation pending"
                                                                    : "Not attempted"}
                                                    </span></div>
                                                    <div>{entry.result
                                                        ? `${entry.result.obtainedMarks} / ${entry.result.totalMarks}`
                                                        : `— / ${test.totalMarks}`}</div>
                                                    <div>{entry.result ? `${Number(entry.result.percentage).toFixed(1)}%` : "—"}</div>
                                                    <div>{entry.submittedAt
                                                        ? new Date(entry.submittedAt).toLocaleDateString() : "—"}</div>
                                                    <div>{entry.result
                                                        ? <Link to={`/teacher/answers/${entry.result.id}`}>Review</Link>
                                                        : "—"}</div>
                                                </div>
                                            ))}
                                        </div>
                                    </details>
                                ))}
                            </div>
                        </details>
                    ))
                )}
            </main>
        </div>
    );
}

export default TeacherResults;
