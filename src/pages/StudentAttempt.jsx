import { useCallback, useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import {
    getAttempt,
    recordAttemptSecurityEvent,
    saveAttemptAnswer,
    submitAttempt
} from "../services/attemptService";

const SHARED_WARNING_MESSAGE = "This action is blocked while the examination is running.";

function formatRemaining(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const remainingSeconds = seconds % 60;
    return [hours, minutes, remainingSeconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function StudentAttempt() {
    const { attemptId } = useParams();
    const [attempt, setAttempt] = useState(null);
    const [responses, setResponses] = useState({});
    const [remaining, setRemaining] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [pendingSaveCount, setPendingSaveCount] = useState(0);
    const pendingSaves = useRef(new Map());
    const latestResponses = useRef({});
    const unsavedQuestions = useRef(new Set());
    const [unsavedCount, setUnsavedCount] = useState(0);
    const [error, setError] = useState("");
    const [securityWarnings, setSecurityWarnings] = useState([]);
    const submitted = useRef(false);

    const updateUnsavedStatus = (questionId, unsaved) => {
        if (unsaved) unsavedQuestions.current.add(questionId);
        else unsavedQuestions.current.delete(questionId);
        setUnsavedCount(unsavedQuestions.current.size);
    };

    const loadAttempt = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            const loaded = await getAttempt(attemptId);
            setAttempt(loaded);
            const loadedResponses = Object.fromEntries(loaded.questions.map((question) => [
                question.id,
                question.response
            ]));
            latestResponses.current = loadedResponses;
            unsavedQuestions.current.clear();
            setUnsavedCount(0);
            setResponses(loadedResponses);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [attemptId]);

    const finishAttempt = useCallback(async (confirmSubmit) => {
        if (submitted.current || !attempt || attempt.status !== "IN_PROGRESS") return;
        if (confirmSubmit && !window.confirm("Submit this exam now? You cannot change answers afterward.")) {
            return;
        }
        submitted.current = true;
        setIsSubmitting(true);
        setError("");
        try {
            const savesSucceeded = (await Promise.all(pendingSaves.current.values()))
                .every(Boolean);
            if (confirmSubmit && (!savesSucceeded || unsavedQuestions.current.size > 0)) {
                submitted.current = false;
                setError("One or more answers could not be saved. Retry the answer save before submitting.");
                return;
            }
            setAttempt(await submitAttempt(attempt.id));
        } catch (requestError) {
            submitted.current = false;
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    }, [attempt]);

    useEffect(() => {
        Promise.resolve().then(loadAttempt);
    }, [loadAttempt]);

    useEffect(() => {
        if (!attempt || attempt.status !== "IN_PROGRESS") return undefined;
        const updateRemaining = () => {
            const milliseconds = new Date(attempt.expiresAt).getTime() - Date.now();
            setRemaining(milliseconds);
            if (milliseconds <= 0) void finishAttempt(false);
        };
        updateRemaining();
        const timer = window.setInterval(updateRemaining, 1000);
        return () => window.clearInterval(timer);
    }, [attempt, finishAttempt]);

    const saveResponse = async (question, response) => {
        const previousSave = pendingSaves.current.get(question.id) || Promise.resolve(true);
        const currentSave = previousSave.catch(() => false).then(async () => {
            setPendingSaveCount((count) => count + 1);
            setError("");
            try {
                await saveAttemptAnswer(attempt.id, question.id, response);
                if (JSON.stringify(latestResponses.current[question.id]) === JSON.stringify(response)) {
                    updateUnsavedStatus(question.id, false);
                }
                return true;
            } catch (requestError) {
                setError(requestError.message);
                if (requestError.status === 409) {
                    await loadAttempt();
                }
                return false;
            } finally {
                setPendingSaveCount((count) => Math.max(0, count - 1));
            }
        });
        pendingSaves.current.set(question.id, currentSave);
        const saved = await currentSave;
        if (pendingSaves.current.get(question.id) === currentSave) {
            pendingSaves.current.delete(question.id);
        }
        return saved;
    };

    const changeResponse = (question, patch) => {
        const next = { ...responses[question.id], ...patch };
        latestResponses.current = { ...latestResponses.current, [question.id]: next };
        updateUnsavedStatus(question.id, true);
        setResponses((current) => ({ ...current, [question.id]: next }));
    };

    const retryUnsavedAnswers = async () => {
        if (!attempt) return;
        const questionsById = new Map(attempt.questions.map((question) => [question.id, question]));
        await Promise.all([...unsavedQuestions.current].map((questionId) => {
            const question = questionsById.get(questionId);
            if (!question) return Promise.resolve(false);
            return saveResponse(question, latestResponses.current[questionId]);
        }));
    };

    const addSecurityWarning = useCallback((message, eventType) => {
        const warningId = `${Date.now()}-${Math.random()}`;
        setSecurityWarnings((current) => [
            {
                id: warningId,
                message
            },
            ...current
        ].slice(0, 5));
        if (eventType && attempt?.id) {
            void recordAttemptSecurityEvent(attempt.id, eventType).catch((requestError) => {
                setError(`Could not record this security event: ${requestError.message}`);
            });
        }
    }, [attempt]);

    useEffect(() => {
        if (!attempt || attempt.status !== "IN_PROGRESS") return undefined;

        const requestExamFullscreen = async () => {
            try {
                if (document.fullscreenElement === null && document.documentElement.requestFullscreen) {
                    await document.documentElement.requestFullscreen();
                }
            } catch {
                addSecurityWarning("Full-screen mode could not be enforced automatically in this browser.");
            }
        };

        const handleFullscreenChange = () => {
            if (!document.fullscreenElement) {
                addSecurityWarning("Warning: Full-screen mode was exited.", "fullscreenExit");
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                addSecurityWarning(
                    "Warning: The examination tab was hidden or switched away from.",
                    "tabSwitch"
                );
            }
        };

        const handleWindowBlur = () => {
            addSecurityWarning("Warning: The browser lost focus while the exam was running.", "focusLoss");
        };

        const handleCopyPaste = (event) => {
            const disabledAction = event.type === "copy" ? "copy" : event.type === "cut" ? "cut" : "paste";
            event.preventDefault();
            const eventType = event.type === "copy" ? "copyEvent"
                : event.type === "cut" ? "cutEvent" : "pasteEvent";
            addSecurityWarning(
                `Warning: ${disabledAction.toUpperCase()} actions are disabled during the examination.`,
                eventType
            );
        };

        const handleContextMenu = (event) => {
            event.preventDefault();
            addSecurityWarning("Warning: The browser context menu is disabled during this exam.", "contextMenu");
        };

        const handleShortcut = (event) => {
            const key = event.key.toLowerCase();
            if ((event.ctrlKey || event.metaKey) && ["c", "v", "x", "p", "a", "s"].includes(key)) {
                event.preventDefault();
                const eventType = key === "c" ? "copyEvent"
                    : key === "v" ? "pasteEvent"
                        : key === "x" ? "cutEvent" : "shortcutUse";
                addSecurityWarning(
                    `Warning: ${key.toUpperCase()} shortcut usage is disabled during the exam. ${SHARED_WARNING_MESSAGE}`,
                    eventType
                );
            }
        };

        const handleBeforeUnload = () => {
            addSecurityWarning("Warning: The exam page was reloaded or interrupted.", "reload");
        };

        void requestExamFullscreen();
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleWindowBlur);
        document.addEventListener("copy", handleCopyPaste);
        document.addEventListener("paste", handleCopyPaste);
        document.addEventListener("cut", handleCopyPaste);
        document.addEventListener("contextmenu", handleContextMenu);
        document.addEventListener("keydown", handleShortcut);
        window.addEventListener("beforeunload", handleBeforeUnload);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleWindowBlur);
            document.removeEventListener("copy", handleCopyPaste);
            document.removeEventListener("paste", handleCopyPaste);
            document.removeEventListener("cut", handleCopyPaste);
            document.removeEventListener("contextmenu", handleContextMenu);
            document.removeEventListener("keydown", handleShortcut);
            window.removeEventListener("beforeunload", handleBeforeUnload);
        };
    }, [addSecurityWarning, attempt]);

    return (
        <div className="student-page">
            <StudentNavbar />
            <main className="student-content exam-content">
                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading your exam...</div>
                ) : error && !attempt ? (
                    <div className="error-message" role="alert">
                        <p>{error}</p>
                        <button type="button" onClick={loadAttempt}>Retry</button>
                    </div>
                ) : attempt && (
                    <>
                        <header className="exam-header">
                            <div>
                                <p className="dashboard-label">OFFICIAL EXAM</p>
                                <h1>{attempt.test.title}</h1>
                                <p>{attempt.test.subject} · {attempt.test.branch}</p>
                            </div>
                            {attempt.status === "IN_PROGRESS" && (
                                <div className="exam-timer" role="timer" aria-live="off">
                                    Time remaining <strong>{formatRemaining(remaining)}</strong>
                                </div>
                            )}
                        </header>
                        {attempt.test.instructions && (
                            <p className="exam-instructions">{attempt.test.instructions}</p>
                        )}
                        {securityWarnings.length > 0 && (
                            <div className="error-message" role="alert">
                                <p>Exam security notice:</p>
                                <ul>
                                    {securityWarnings.map((warning) => (
                                        <li key={warning.id}>{warning.message}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {error && <div className="error-message" role="alert">
                            <p>{error}</p>
                            {unsavedCount > 0 && attempt.status === "IN_PROGRESS" && (
                                <button type="button" onClick={() => void retryUnsavedAnswers()}
                                    disabled={pendingSaveCount > 0}>
                                    Retry saving {unsavedCount} answer{unsavedCount === 1 ? "" : "s"}
                                </button>
                            )}
                        </div>}
                        {attempt.status === "IN_PROGRESS" ? (
                            <>
                                <div className="exam-question-list">
                                    {attempt.questions.map((question) => {
                                        const response = responses[question.id] || {
                                            textResponse: ""
                                        };
                                        return (
                                            <section className="exam-question" key={question.id}>
                                                <div className="exam-question-heading">
                                                    <h2>Question {question.position}</h2>
                                                    <span>{question.marks} marks</span>
                                                </div>
                                                <p>{question.text}</p>
                                                <textarea
                                                    value={response.textResponse || ""}
                                                    maxLength={10000}
                                                    onChange={(event) => changeResponse(question, {
                                                        textResponse: event.target.value
                                                    })}
                                                    onBlur={() => void saveResponse(question, response)}
                                                    aria-label={`Response to question ${question.position}`}
                                                />
                                                <p className="exam-save-status" aria-live="polite">
                                                    {pendingSaveCount > 0 ? "Saving answers..." : ""}
                                                </p>
                                            </section>
                                        );
                                    })}
                                </div>
                                <button
                                    type="button"
                                    className="start-test-button"
                                    onClick={() => void finishAttempt(true)}
                                    disabled={isSubmitting || pendingSaveCount > 0}
                                >
                                    {isSubmitting ? "Submitting..." : "Submit Exam"}
                                </button>
                            </>
                        ) : (
                            <section className="teacher-empty-state" role="status">
                                <h2>{attempt.status === "TIMED_OUT" ? "Time expired" : "Exam submitted"}</h2>
                                <p>Your answers have been submitted. Results will be available after evaluation.</p>
                                <Link to="/student/results" className="start-test-button">My Results</Link>
                            </section>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default StudentAttempt;
