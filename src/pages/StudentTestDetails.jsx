import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import { startAttempt } from "../services/attemptService";
import { getTest } from "../services/testService";

function StudentTestDetails() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [startError, setStartError] = useState("");
    const [isStarting, setIsStarting] = useState(false);

    const loadTest = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setTest(await getTest(testId));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [testId]);

    const handleStart = async () => {
        setStartError("");
        setIsStarting(true);
        try {
            const attempt = await startAttempt(testId);
            navigate(`/student/attempts/${attempt.id}`);
        } catch (requestError) {
            setStartError(requestError.message);
        } finally {
            setIsStarting(false);
        }
    };

    useEffect(() => {
        Promise.resolve().then(loadTest);
    }, [loadTest]);

    return (
        <div className="student-page">
            <StudentNavbar />
            <main className="student-content">
                <Link to="/student/tests" className="branch-button">← Available Tests</Link>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading test details...</div>
                ) : error ? (
                    <div className="error-message" role="alert">
                        <p>{error}</p>
                        <button type="button" onClick={loadTest}>Retry</button>
                    </div>
                ) : (
                    <section className="profile-card">
                        <p className="dashboard-label">PUBLISHED TEST</p>
                        <h1>{test.title}</h1>
                        <p>{test.subjectName} · {test.branchName}</p>
                        <p>
                            {test.academicBatch} · Year {test.studyYear}, Semester {test.semester}
                        </p>
                        <p>
                            Opens {new Date(test.startAt).toLocaleString()} · Closes {new Date(test.endAt).toLocaleString()}
                        </p>
                        {test.availability !== "AVAILABLE" && (
                            <p role="status">
                                {test.availability === "UPCOMING"
                                    ? "This exam is scheduled to open later."
                                    : "The exam availability window has closed."}
                            </p>
                        )}
                        {test.description && <p>{test.description}</p>}
                        <div className="profile-details">
                            <div><label>Questions</label><strong>{test.totalQuestions}</strong></div>
                            <div><label>Duration</label><strong>{test.duration} minutes</strong></div>
                            <div><label>Total marks</label><strong>{test.totalMarks}</strong></div>
                            <div><label>Passing score</label><strong>{test.passingPercentage}%</strong></div>
                            <div><label>Question type</label><strong>{test.testType}</strong></div>
                            <div><label>Published</label><strong>{test.publishedAt ? new Date(test.publishedAt).toLocaleString() : "—"}</strong></div>
                        </div>
                        {test.instructions && (
                            <div>
                                <h2>Instructions</h2>
                                <p>{test.instructions}</p>
                            </div>
                        )}
                        {startError && <p className="error-message" role="alert">{startError}</p>}
                        <button
                            type="button"
                            className="start-test-button"
                            disabled={isStarting || test.availability !== "AVAILABLE"}
                            onClick={handleStart}
                        >
                            {isStarting
                                ? "Starting..."
                                : test.availability === "UPCOMING"
                                    ? "Not Open Yet"
                                    : test.availability === "CLOSED"
                                        ? "Window Closed"
                                        : "Start Official Exam"}
                        </button>
                    </section>
                )}
            </main>
        </div>
    );
}

export default StudentTestDetails;
