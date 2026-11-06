import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/useAuth";
import { getStudentDashboard } from "../services/studentService";

function StudentDashboard() {
    const { user: student } = useAuth();
    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        setError("");
        setIsLoading(true);
        setDashboard(null);
        try {
            setDashboard(await getStudentDashboard());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadDashboard);
    }, [loadDashboard]);

    return (
        <div className="student-page">
            <StudentNavbar />
            <main className="student-dashboard">
                <section className="student-welcome">
                    <div>
                        <p className="dashboard-label">STUDENT DASHBOARD</p>
                        <h1>Welcome, {student.name} 👋</h1>
                        <p>Continue your learning and test your knowledge.</p>
                        <span className="branch-badge">{student.branch}</span>
                        <p className="student-id-label">Polytechnic PIN: {student.studentId}</p>
                        <p>{student.academicBatch} · Year {student.studyYear}, Semester {student.semester}</p>
                    </div>
                    <div className="student-profile-circle">{student.name.charAt(0).toUpperCase()}</div>
                </section>
                {error && <div className="error-message" role="alert">
                    <p>{error}</p><button type="button" onClick={loadDashboard}>Retry</button>
                </div>}
                <section className="dashboard-stat-grid">
                    <div className="dashboard-stat-card"><span>📝</span><div>
                        <h3>{dashboard?.progress.completedTests ?? "—"}</h3><p>Tests Completed</p>
                    </div></div>
                    <div className="dashboard-stat-card"><span>🏆</span><div>
                        <h3>{dashboard ? `${dashboard.progress.averagePercentage}%` : "—"}</h3><p>Average Score</p>
                    </div></div>
                    <div className="dashboard-stat-card"><span>⭐</span><div>
                        <h3>{dashboard ? `${dashboard.progress.highestPercentage}%` : "—"}</h3><p>Highest Score</p>
                    </div></div>
                    <div className="dashboard-stat-card"><span>📈</span><div>
                        <h3>{dashboard?.progress.improvement === null || dashboard?.progress.improvement === undefined
                            ? "—" : `${dashboard.progress.improvement > 0 ? "+" : ""}${dashboard.progress.improvement}%`}</h3>
                        <p>Recent Trend</p>
                    </div></div>
                </section>
                <section className="dashboard-section">
                    <div className="section-heading">
                        <div><h2>Available Tests</h2><p>Tests open for your assigned class.</p></div>
                        <Link to="/student/tests">View All</Link>
                    </div>
                    {isLoading ? (
                        <div className="teacher-empty-state">Loading available tests...</div>
                    ) : !dashboard ? null : dashboard.availableTests.length === 0 ? (
                        <div className="teacher-empty-state"><p>No published tests are available right now.</p></div>
                    ) : (
                        <div className="test-card-grid">
                            {dashboard.availableTests.map((test) => (
                                <div className="student-test-card" key={test.id}>
                                    <div className="test-card-top">
                                        <span className="test-icon">📝</span>
                                        <span className="difficulty">{test.testType}</span>
                                    </div>
                                    <h3>{test.title}</h3>
                                    <p className="test-subject">{test.subjectName}</p>
                                    <div className="test-information">
                                        <span>❓ {test.totalQuestions} Questions</span>
                                        <span>⏱ {test.duration} min</span>
                                        <span>🎯 {test.totalMarks} Marks</span>
                                    </div>
                                    <Link to={`/student/tests/${test.id}`} className="start-test-button">View Test</Link>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                <section className="dashboard-two-column">
                    <div className="dashboard-panel">
                        <div className="section-heading"><h2>Recent Results</h2>
                            <Link to="/student/results">View All</Link></div>
                        {!dashboard?.progress.recentResults.length ? (
                            <p>Completed results will appear here.</p>
                        ) : dashboard.progress.recentResults.slice(0, 3).map((result) => (
                            <Link className="result-row" to={`/student/results/${result.id}`} key={result.id}>
                                <div><strong>{result.test}</strong>
                                    <small>{new Date(result.submittedAt).toLocaleDateString()}</small></div>
                                <span className="result-score">{result.percentage}%</span>
                            </Link>
                        ))}
                    </div>
                    <div className="dashboard-panel">
                        <div className="section-heading"><h2>Progress</h2>
                            <Link to="/student/progress">Details</Link></div>
                        {!dashboard?.progress.subjectPerformance.length ? (
                            <p>Subject progress will appear after your first result.</p>
                        ) : dashboard.progress.subjectPerformance.slice(0, 3).map((subject) => (
                            <div className="progress-subject" key={subject.name}>
                                <div><span>{subject.name}</span><strong>{subject.averagePercentage}%</strong></div>
                                <div className="progress-bar">
                                    <span style={{ width: `${subject.averagePercentage}%` }} />
                                </div>
                            </div>
                        ))}
                    </div>
                </section>
                <section className="practice-banner">
                    <div><span>🎯</span><div><h2>Ready for an examination?</h2>
                        <p>Browse tests assigned to your branch, batch, year, and semester.</p></div></div>
                    <Link to="/student/tests">Browse Tests</Link>
                </section>
            </main>
        </div>
    );
}

export default StudentDashboard;
