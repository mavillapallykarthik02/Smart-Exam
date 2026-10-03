import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import TeacherNavbar from "../components/TeacherNavbar";
import { getResult } from "../services/resultService";

function ResultReview({ mode }) {
    const { resultId } = useParams();
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadResult = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setResult(await getResult(resultId));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [resultId]);

    useEffect(() => {
        Promise.resolve().then(loadResult);
    }, [loadResult]);

    return (
        <div className={mode === "student" ? "student-page" : "teacher-page"}>
            {mode === "student"
                ? <StudentNavbar />
                : <TeacherNavbar active="Answers" />}
            <main className={mode === "student" ? "student-content" : "teacher-dashboard"}>
                <Link
                    to={mode === "student" ? "/student/results" : "/teacher/answers"}
                    className="branch-button"
                >
                    ← Back to {mode === "student" ? "My Results" : "Submitted Answers"}
                </Link>
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading answer review...</div>
                ) : error ? (
                    <div className="error-message" role="alert">
                        <p>{error}</p><button type="button" onClick={loadResult}>Retry</button>
                    </div>
                ) : (
                    <>
                        <section className="profile-card result-summary">
                            <p className="dashboard-label">ANSWER REVIEW</p>
                            <h1>{result.test?.title || "Archived test"}</h1>
                            <p>{result.test?.subject} · {result.test?.branch}</p>
                            <p>
                                Student: {result.student?.name} · Student ID: {result.student?.studentId}
                                {mode === "teacher" && ` (@${result.student?.username})`}
                            </p>
                            <div className="profile-details">
                                <div><label>Score</label><strong>{result.obtainedMarks} / {result.totalMarks}</strong></div>
                                <div><label>Percentage</label><strong>{result.percentage.toFixed(1)}%</strong></div>
                                <div><label>Correct</label><strong>{result.correctAnswers}</strong></div>
                                <div><label>Incorrect</label><strong>{result.incorrectAnswers}</strong></div>
                                <div><label>Unanswered</label><strong>{result.unanswered}</strong></div>
                                <div><label>Outcome</label><strong>{result.passed ? "Passed" : "Failed"}</strong></div>
                                <div><label>Submitted</label><strong>{new Date(result.submittedAt).toLocaleString()}</strong></div>
                                <div><label>Time taken</label><strong>{Math.floor(result.durationSeconds / 60)} min</strong></div>
                            </div>
                        </section>
                        <div className="exam-question-list">
                            {result.answers.map((answer) => (
                                <section className="exam-question answer-review" key={answer.id}>
                                    <div className="exam-question-heading">
                                        <h2>Question {answer.position}</h2>
                                        <span>{answer.marksAwarded} / {answer.marks} marks</span>
                                    </div>
                                    <p>{answer.text}</p>
                                    {answer.questionType === "MCQ" ? (
                                        <div className="exam-options">
                                            {answer.options.map((option) => (
                                                <div
                                                    className={
                                                        option.key === answer.correctAnswer
                                                            ? "review-option review-correct"
                                                            : option.key === answer.selectedOption
                                                                ? "review-option review-incorrect"
                                                                : "review-option"
                                                    }
                                                    key={option.key}
                                                >
                                                    <strong>{option.key}.</strong> {option.text}
                                                    {option.key === answer.correctAnswer && " — Correct answer"}
                                                    {option.key === answer.selectedOption && option.key !== answer.correctAnswer &&
                                                        " — Your answer"}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="review-response">
                                            <p><strong>Your response:</strong> {answer.textResponse || "No response"}</p>
                                            <p><strong>Expected answer:</strong> {answer.expectedAnswer}</p>
                                        </div>
                                    )}
                                    {answer.explanation && <p className="review-explanation">
                                        <strong>Explanation:</strong> {answer.explanation}
                                    </p>}
                                    {answer.unanswered && <p className="review-unanswered">Unanswered</p>}
                                </section>
                            ))}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}

export default ResultReview;
