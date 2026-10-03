import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import BrandLogoImage from "../components/BrandLogoImage";
import { getTest } from "../services/testService";
import {
    createQuestion,
    deleteQuestion,
    listQuestions,
    reorderQuestions,
    updateQuestion
} from "../services/questionService";

const emptyForm = {
    questionType: "MCQ",
    text: "",
    options: [
        { key: "A", text: "" },
        { key: "B", text: "" },
        { key: "C", text: "" },
        { key: "D", text: "" }
    ],
    correctAnswer: "A",
    expectedAnswer: "",
    marks: "1",
    negativeMarks: "0",
    explanation: ""
};

function createEmptyQuestionForm(testType) {
    return {
        ...emptyForm,
        questionType: ["TYPING", "DESCRIPTIVE"].includes(testType)
            ? "TYPING"
            : "MCQ"
    };
}

function TeacherTestQuestions() {
    const { testId } = useParams();
    const navigate = useNavigate();
    const [test, setTest] = useState(null);
    const [questions, setQuestions] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [formError, setFormError] = useState("");
    const [validationErrors, setValidationErrors] = useState([]);
    const [actionError, setActionError] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [busyQuestionId, setBusyQuestionId] = useState("");
    const [editingQuestion, setEditingQuestion] = useState(null);
    const [form, setForm] = useState(() => createEmptyQuestionForm(""));

    const loadPage = useCallback(async () => {
        setIsLoading(true);
        setLoadError("");
        try {
            const [loadedTest, loadedQuestions] = await Promise.all([
                getTest(testId),
                listQuestions(testId)
            ]);
            setTest(loadedTest);
            setQuestions(loadedQuestions);
            setForm(createEmptyQuestionForm(loadedTest.testType));
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, [testId]);

    useEffect(() => {
        Promise.resolve().then(loadPage);
    }, [loadPage]);

    const resetForm = () => {
        setEditingQuestion(null);
        setForm(createEmptyQuestionForm(test?.testType));
        setFormError("");
        setValidationErrors([]);
    };

    const editQuestion = (question) => {
        setEditingQuestion(question);
        setForm({
            questionType: question.questionType,
            text: question.text,
            options: question.questionType === "MCQ"
                ? ["A", "B", "C", "D"].map((key) => ({
                    key,
                    text: question.options.find((option) => option.key === key)?.text || ""
                }))
                : emptyForm.options,
            correctAnswer: question.correctAnswer || "A",
            expectedAnswer: question.expectedAnswer || "",
            marks: String(question.marks),
            negativeMarks: String(question.negativeMarks || 0),
            explanation: question.explanation || ""
        });
        setFormError("");
        setValidationErrors([]);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const changeOption = (key, text) => {
        setForm((previous) => ({
            ...previous,
            options: previous.options.map((option) => (
                option.key === key ? { ...option, text } : option
            ))
        }));
    };

    const submitQuestion = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError("");
        setValidationErrors([]);
        const details = {
            questionType: form.questionType,
            text: form.text.trim(),
            marks: Number(form.marks),
            negativeMarks: Number(form.negativeMarks || 0),
            explanation: form.explanation.trim(),
            ...(form.questionType === "MCQ"
                ? {
                    options: form.options.filter((option) => option.text.trim()),
                    correctAnswer: form.correctAnswer
                }
                : { expectedAnswer: form.expectedAnswer.trim() })
        };

        try {
            if (editingQuestion) {
                await updateQuestion(testId, editingQuestion.id, details);
            } else {
                await createQuestion(testId, details);
            }
            resetForm();
            await loadPage();
        } catch (error) {
            setFormError(error.message);
            setValidationErrors(error.errors || []);
        } finally {
            setIsSaving(false);
        }
    };

    const removeQuestion = async (question) => {
        if (!window.confirm(`Delete question ${question.position}?`)) return;
        setBusyQuestionId(question.id);
        setActionError("");
        try {
            await deleteQuestion(testId, question.id);
            await loadPage();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusyQuestionId("");
        }
    };

    const moveQuestion = async (index, direction) => {
        const nextIndex = index + direction;
        if (nextIndex < 0 || nextIndex >= questions.length) return;
        const reordered = [...questions];
        [reordered[index], reordered[nextIndex]] = [reordered[nextIndex], reordered[index]];
        setActionError("");
        try {
            const updated = await reorderQuestions(testId, reordered.map((question, position) => ({
                questionId: question.id,
                position: position + 1
            })));
            setQuestions(updated);
        } catch (error) {
            setActionError(error.message);
        }
    };

    if (isLoading) {
        return <main className="teacher-dashboard" aria-live="polite">Loading test questions...</main>;
    }

    if (loadError) {
        return (
            <main className="teacher-dashboard">
                <div className="error-message" role="alert">{loadError}</div>
                <button className="teacher-primary-button" onClick={loadPage}>Retry</button>
                <button className="teacher-secondary-button" onClick={() => navigate("/teacher/tests")}>
                    Back to Tests
                </button>
            </main>
        );
    }

    return (
        <div className="teacher-page">
            <header className="teacher-navbar">
                <div className="teacher-logo"><BrandLogoImage /><strong>SmartExam</strong></div>
                <nav className="teacher-nav">
                    <Link to="/teacher/dashboard">Dashboard</Link>
                    <Link to="/teacher/tests">Tests</Link>
                </nav>
                <LogoutButton role="teacher" className="teacher-logout" />
            </header>
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <span className="teacher-label">QUESTION MANAGEMENT</span>
                    <h1>{test.title}</h1>
                    <p>{questions.length} / {test.totalQuestions} questions · {test.testType} · {test.totalMarks} marks</p>
                    <Link to="/teacher/tests">← Back to Tests</Link>
                </div>
                {(actionError || formError) && (
                    <div className="error-message" role="alert">
                        <p>{actionError || formError}</p>
                        {validationErrors.map((item, index) => (
                            <p key={`${item.field}-${index}`}>{item.message}</p>
                        ))}
                    </div>
                )}
                <section className="teacher-panel">
                    <h2>{editingQuestion ? `Edit Question ${editingQuestion.position}` : "Add Question"}</h2>
                    {test.status !== "Draft" ? (
                        <p>Questions are locked while a test is {test.status.toLowerCase()}.</p>
                    ) : questions.length >= test.totalQuestions && !editingQuestion ? (
                        <p>The configured question count has been reached.</p>
                    ) : (
                        <form onSubmit={submitQuestion}>
                            <div className="teacher-form-grid">
                                {test.testType === "MIXED" && (
                                    <div className="teacher-form-group">
                                        <label htmlFor="questionType">Question type</label>
                                        <select id="questionType" value={form.questionType} onChange={(event) => setForm((old) => ({ ...old, questionType: event.target.value }))}>
                                            <option value="MCQ">MCQ</option>
                                            <option value="TYPING">Typing</option>
                                        </select>
                                    </div>
                                )}
                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="questionText">Question text</label>
                                    <textarea id="questionText" value={form.text} onChange={(event) => setForm((old) => ({ ...old, text: event.target.value }))} maxLength={10000} rows="4" required />
                                </div>
                                {form.questionType === "MCQ" && (
                                    <>
                                        {form.options.map((option) => (
                                            <div className="teacher-form-group" key={option.key}>
                                                <label htmlFor={`option-${option.key}`}>Option {option.key}</label>
                                                <input id={`option-${option.key}`} value={option.text} onChange={(event) => changeOption(option.key, event.target.value)} maxLength={2000} required />
                                            </div>
                                        ))}
                                        <div className="teacher-form-group">
                                            <label htmlFor="correctAnswer">Correct option</label>
                                            <select id="correctAnswer" value={form.correctAnswer} onChange={(event) => setForm((old) => ({ ...old, correctAnswer: event.target.value }))}>
                                                {form.options.map((option) => <option key={option.key} value={option.key}>{option.key}</option>)}
                                            </select>
                                        </div>
                                    </>
                                )}
                                {form.questionType === "TYPING" && (
                                    <div className="teacher-form-group teacher-form-full">
                                        <label htmlFor="expectedAnswer">
                                            Expected answer (case and whitespace normalized for automatic grading)
                                        </label>
                                        <textarea id="expectedAnswer" value={form.expectedAnswer} onChange={(event) => setForm((old) => ({ ...old, expectedAnswer: event.target.value }))} maxLength={10000} rows="3" required />
                                    </div>
                                )}
                                <div className="teacher-form-group">
                                    <label htmlFor="marks">Marks</label>
                                    <input id="marks" type="number" min="0.01" step="0.01" value={form.marks} onChange={(event) => setForm((old) => ({ ...old, marks: event.target.value }))} required />
                                </div>
                                {form.questionType === "MCQ" && (
                                    <div className="teacher-form-group">
                                        <label htmlFor="negativeMarks">Negative marks</label>
                                        <input id="negativeMarks" type="number" min="0" step="0.01" value={form.negativeMarks} onChange={(event) => setForm((old) => ({ ...old, negativeMarks: event.target.value }))} />
                                    </div>
                                )}
                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="explanation">Explanation (optional)</label>
                                    <textarea id="explanation" value={form.explanation} onChange={(event) => setForm((old) => ({ ...old, explanation: event.target.value }))} maxLength={5000} rows="2" />
                                </div>
                            </div>
                            <div className="modal-actions">
                                {editingQuestion && <button type="button" onClick={resetForm}>Cancel Edit</button>}
                                <button className="teacher-primary-button" type="submit" disabled={isSaving}>
                                    {isSaving ? "Saving..." : editingQuestion ? "Update Question" : "Add Question"}
                                </button>
                            </div>
                        </form>
                    )}
                </section>
                <section className="teacher-panel">
                    <h2>Questions ({questions.length})</h2>
                    {questions.length === 0 ? (
                        <div className="teacher-empty-state">No questions have been added yet.</div>
                    ) : questions.map((question, index) => (
                        <article className="teacher-management-table" key={question.id} style={{ padding: 20, marginTop: 16 }}>
                            <div className="teacher-panel-heading">
                                <div>
                                    <span className="page-badge">QUESTION {question.position} · {question.questionType}</span>
                                    <h3>{question.text}</h3>
                                </div>
                                <strong>{question.marks} marks</strong>
                            </div>
                            {question.questionType === "MCQ" ? (
                                <ol type="A">
                                    {question.options.map((option) => <li key={option.key}>{option.text}</li>)}
                                </ol>
                            ) : <p>Expected answer is securely stored.</p>}
                            <div className="management-actions">
                                <button type="button" onClick={() => moveQuestion(index, -1)} disabled={index === 0 || test.status !== "Draft"}>Move up</button>
                                <button type="button" onClick={() => moveQuestion(index, 1)} disabled={index === questions.length - 1 || test.status !== "Draft"}>Move down</button>
                                <button type="button" onClick={() => editQuestion(question)} disabled={test.status !== "Draft"}>Edit</button>
                                <button type="button" className="action-delete" onClick={() => removeQuestion(question)} disabled={test.status !== "Draft" || busyQuestionId === question.id}>Delete</button>
                            </div>
                        </article>
                    ))}
                </section>
            </main>
        </div>
    );
}

export default TeacherTestQuestions;
