import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import { listStudentTests } from "../services/testService";

function StudentTests() {
    const [tests, setTests] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const availabilityLabel = {
        AVAILABLE: "Available now",
        UPCOMING: "Upcoming",
        CLOSED: "Closed"
    };
    const loadTests = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setTests(await listStudentTests());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadTests);
    }, [loadTests]);

    return (
        <div className="student-page">

            <StudentNavbar />

            <main className="student-content">

                <div className="page-title">

                    <div>
                        <p className="dashboard-label">
                            TEST SERIES
                        </p>

                        <h1>Available Tests</h1>

                        <p>
                            Select an examination according to your subjects.
                        </p>
                    </div>

                </div>

                {error && (
                    <div className="error-message" role="alert">
                        <p>{error}</p>
                        <button type="button" onClick={loadTests}>Retry</button>
                    </div>
                )}

                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading available tests...</div>
                ) : tests.length === 0 ? (
                    <div className="teacher-empty-state">
                        <h3>No published tests available</h3>
                        <p>Published tests for your assigned branch and class will appear here.</p>
                    </div>
                ) : (
                    <div className="test-series-grid">
                        {tests.map((test) => (
                            <div className="series-test-card" key={test.id}>
                                <div className="series-top">
                                    <span className="test-icon">📝</span>
                                    <span className={test.availability === "AVAILABLE" ? "status-available" : "status-inactive"}>
                                        {availabilityLabel[test.availability] || "Published"}
                                    </span>
                                </div>
                                <h2>{test.title}</h2>
                                <p className="series-subject">
                                    {test.subjectName} • {test.branchName}
                                </p>
                                <p>
                                    {test.academicBatch} · Year {test.studyYear}, Semester {test.semester}
                                </p>
                                <p>
                                    Opens {new Date(test.startAt).toLocaleString()} · Closes {new Date(test.endAt).toLocaleString()}
                                </p>
                                <div className="series-details">
                                    <div><strong>{test.totalQuestions}</strong><span>Questions</span></div>
                                    <div><strong>{test.duration} Minutes</strong><span>Duration</span></div>
                                    <div><strong>{test.totalMarks}</strong><span>Marks</span></div>
                                </div>
                                {test.availability === "AVAILABLE" ? (
                                    <Link className="start-test-button" to={`/student/tests/${test.id}`}>
                                        View Test
                                    </Link>
                                ) : (
                                    <button className="start-test-button" type="button" disabled>
                                        {test.availability === "UPCOMING" ? "Not Open Yet" : "Window Closed"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                )}

            </main>

        </div>
    );
}

export default StudentTests;