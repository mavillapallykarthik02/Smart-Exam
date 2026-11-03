import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import TeacherNavbar from "../components/TeacherNavbar";
import {
    getResult,
    publishResult,
    saveAnswerEvaluation
} from "../services/resultService";

function ResultReview({ mode }) {
    const { resultId } = useParams();
    const [result, setResult] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [actionMessage, setActionMessage] = useState("");
    const [savingQuestionId, setSavingQuestionId] = useState("");
    const [drafts, setDrafts] = useState({});
    const [isPublishing, setIsPublishing] = useState(false);

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

    const saveEvaluation = async (answer) => {
        const draft = drafts[answer.id] || {};
        const marksAwarded = draft.marksAwarded ?? answer.marksAwarded;
        if (marksAwarded === null || marksAwarded === undefined || marksAwarded === "") {
            setError("Enter marks for this answer before saving.");
            return;
        }
        setError("");
        setActionMessage("");
        setSavingQuestionId(answer.id);
        try {
            await saveAnswerEvaluation(resultId, answer.id, {
                marksAwarded: Number(marksAwarded),
                feedback: draft.feedback ?? answer.feedback
            });
            setActionMessage("Evaluation saved.");
            await loadResult();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSavingQuestionId("");
        }
    };

    const handlePublish = async () => {
        setError("");
        setActionMessage("");
        setIsPublishing(true);
        try {
            await publishResult(resultId);
            setActionMessage("Result published to the student.");
            await loadResult();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsPublishing(false);
        }
    };

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
                        {actionMessage && <div className="success-message" role="status">{actionMessage}</div>}
                        <section className="profile-card result-summary">
                            <p className="dashboard-label">ANSWER REVIEW</p>
                            <h1>{result.test?.title || "Archived test"}</h1>
                            <p>{result.test?.subject} · {result.test?.branch}</p>
                            <p>
                                Student: {result.student?.name} · Student ID: {result.student?.studentId}
                                {mode === "teacher" && ` (@${result.student?.username})`}
                            </p>
                            <div className="profile-details">
                                {result.evaluationStatus === "PUBLISHED" ? (
                                    <>
                                        <div><label>Score</label><strong>{result.obtainedMarks} / {result.totalMarks}</strong></div>
                                        <div><label>Percentage</label><strong>{result.percentage.toFixed(1)}%</strong></div>
                                        <div><label>Outcome</label><strong>{result.passed ? "Passed" : "Failed"}</strong></div>
                                    </>
                                ) : (
                                    <div><label>Evaluation status</label><strong>{result.evaluationStatus.replaceAll("_", " ")}</strong></div>
                                )}
                                <div><label>Submitted</label><strong>{new Date(result.submittedAt).toLocaleString()}</strong></div>
                                <div><label>Time taken</label><strong>{Math.floor(result.durationSeconds / 60)} min</strong></div>
                            </div>
                            {mode === "teacher" && result.evaluationStatus === "EVALUATED" && (
                                <button
                                    type="button"
                                    className="teacher-primary-button"
                                    onClick={handlePublish}
                                    disabled={isPublishing}
                                >
                                    {isPublishing ? "Publishing..." : "Publish Result"}
                                </button>
                            )}
                        </section>
                        <div className="exam-question-list">
                            {result.answers.map((answer) => (
                                <section className="exam-question answer-review" key={answer.id}>
                                    <div className="exam-question-heading">
                                        <h2>Question {answer.position}</h2>
                                        <span>{answer.marksAwarded ?? "Pending"} / {answer.marks} marks</span>
                                    </div>
                                    <p>{answer.text}</p>
                                    <div className="review-response">
                                        <p><strong>Student response:</strong> {answer.textResponse || "No response"}</p>
                                    </div>
                                    {mode === "teacher" && result.evaluationStatus !== "PUBLISHED" ? (
                                        <div className="teacher-form-grid">
                                            <div className="teacher-form-group">
                                                <label htmlFor={`marks-${answer.id}`}>Marks awarded (maximum {answer.marks})</label>
                                                <input
                                                    id={`marks-${answer.id}`}
                                                    type="number"
                                                    min="0"
                                                    max={answer.marks}
                                                    step="0.01"
                                                    value={drafts[answer.id]?.marksAwarded ?? answer.marksAwarded ?? ""}
                                                    onChange={(event) => setDrafts((current) => ({
                                                        ...current,
                                                        [answer.id]: {
                                                            ...current[answer.id],
                                                            marksAwarded: event.target.value
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <div className="teacher-form-group teacher-form-full">
                                                <label htmlFor={`feedback-${answer.id}`}>Feedback</label>
                                                <textarea
                                                    id={`feedback-${answer.id}`}
                                                    maxLength={5000}
                                                    value={drafts[answer.id]?.feedback ?? answer.feedback}
                                                    onChange={(event) => setDrafts((current) => ({
                                                        ...current,
                                                        [answer.id]: {
                                                            ...current[answer.id],
                                                            feedback: event.target.value
                                                        }
                                                    }))}
                                                />
                                            </div>
                                            <button
                                                type="button"
                                                className="teacher-primary-button"
                                                onClick={() => void saveEvaluation(answer)}
                                                disabled={savingQuestionId === answer.id || result.evaluationStatus === "PUBLISHED"}
                                            >
                                                {savingQuestionId === answer.id ? "Saving..." : "Save evaluation"}
                                            </button>
                                        </div>
                                    ) : answer.feedback ? (
                                        <p className="review-explanation"><strong>Teacher feedback:</strong> {answer.feedback}</p>
                                    ) : null}
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
