import { useCallback, useEffect, useState } from "react";
import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/AuthContext";
import { getProgress } from "../services/progressService";

function StudentProgress() {
    const { user: student } = useAuth();
    const [progress, setProgress] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    const loadProgress = useCallback(async () => {
        setError(null);
        setIsLoading(true);
        try {
            setProgress(await getProgress());
        } catch (requestError) {
            setError(requestError);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadProgress);
    }, [loadProgress]);

    return (
        <div className="student-page">
            <StudentNavbar />
            <main className="student-content">
                <div className="page-title">
                    <p className="dashboard-label">PERFORMANCE</p>
                    <h1>My Progress</h1>
                    <p>{student.name} · Student ID: {student.studentId}</p>
                    <p>Analytics are calculated from your submitted official exam results.</p>
                </div>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading your progress...</div>
                ) : error ? (
                    <div className="teacher-empty-state" role="alert">
                        <h2>{error.status === 401 || error.status === 403
                            ? "Sign in as a student to view progress"
                            : "Unable to load progress"}</h2>
                        <p>{error.message}</p>
                        {(error.status === 401 || error.status === 403) && (
                            <a href="/student/login">Student sign in</a>
                        )}
                        <button type="button" onClick={loadProgress}>Retry</button>
                    </div>
                ) : progress && (
                    <>
                        {progress.completedTests === 0 && (
                            <div className="teacher-empty-state">
                                <h2>No data available</h2>
                                <p>Complete an official exam to see your progress and subject performance.</p>
                            </div>
                        )}
                        <div className="progress-stat-grid">
                            <div className="progress-stat"><strong>{progress.completedTests}</strong><span>Tests Completed</span></div>
                            <div className="progress-stat"><strong>{progress.averagePercentage}%</strong><span>Average Score</span></div>
                            <div className="progress-stat"><strong>{progress.highestPercentage}%</strong><span>Highest Score</span></div>
                            <div className="progress-stat"><strong>{progress.passedTests}</strong><span>Tests Passed</span></div>
                        </div>
                        <section className="progress-panel">
                            <h2>Subject-wise Performance</h2>
                            {progress.subjectPerformance.length === 0 ? (
                                <p>Subject performance will appear after you complete a test.</p>
                            ) : progress.subjectPerformance.map((subject) => (
                                <div className="large-progress" key={subject.name}>
                                    <div className="large-progress-header">
                                        <span>{subject.name} · {subject.attempts} {subject.attempts === 1 ? "test" : "tests"}</span>
                                        <strong>{subject.averagePercentage}%</strong>
                                    </div>
                                    <div className="large-progress-bar">
                                        <span style={{ width: `${subject.averagePercentage}%` }} />
                                    </div>
                                </div>
                            ))}
                        </section>
                        {progress.trend.length > 0 && (
                            <section className="progress-panel">
                                <h2>Performance over time</h2>
                                <div className="progress-trend-list">
                                    {progress.trend.map((point, index) => (
                                        <div className="progress-trend-item" key={`${point.submittedAt}-${index}`}>
                                            <time dateTime={point.submittedAt}>
                                                {new Date(point.submittedAt).toLocaleDateString()}
                                            </time>
                                            <div
                                                className="progress-trend-track"
                                                role="img"
                                                aria-label={`${point.percentage}% on ${new Date(point.submittedAt).toLocaleDateString()}`}
                                            >
                                                <span style={{ width: `${Math.max(0, Math.min(100, point.percentage))}%` }} />
                                            </div>
                                            <strong>{point.percentage}%</strong>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                        <section className="improvement-panel">
                            <div>
                                <span className="improvement-icon">📈</span>
                                <div>
                                    <h2>Recent Performance Trend</h2>
                                    {progress.improvement === null ? (
                                        <p>Complete at least six tests to compare your latest results with the preceding three-test group.</p>
                                    ) : (
                                        <p>
                                            Your latest three-test average is {Math.abs(progress.improvement)} percentage points{" "}
                                            {progress.improvement >= 0 ? "higher" : "lower"} than the preceding three-test average.
                                        </p>
                                    )}
                                </div>
                            </div>
                        </section>
                    </>
                )}
            </main>
        </div>
    );
}

export default StudentProgress;
