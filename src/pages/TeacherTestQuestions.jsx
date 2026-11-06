import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import TeacherNavbar from "../components/TeacherNavbar";
import { getTest } from "../services/testService";
import {
    createQuestion,
    deleteQuestion,
    listQuestions,
    reorderQuestions,
    updateQuestion
} from "../services/questionService";

const emptyForm = {
    text: "",
    marks: "1",
    explanation: ""
};

function createEmptyQuestionForm() {
    return { ...emptyForm };
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
            text: question.text,
            marks: String(question.marks),
            explanation: question.explanation || ""
        });
        setFormError("");
        setValidationErrors([]);
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const submitQuestion = async (event) => {
        event.preventDefault();
        setIsSaving(true);
        setFormError("");
        setValidationErrors([]);
        const details = {
            text: form.text.trim(),
            marks: Number(form.marks),
            explanation: form.explanation.trim()
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
        return (
            <div className="teacher-page">
                <TeacherNavbar active="Tests" />
                <main className="teacher-dashboard" aria-live="polite">
                    <div className="teacher-empty-state">Loading test questions...</div>
                </main>
            </div>
        );
    }

    if (loadError) {
        return (
            <div className="teacher-page">
                <TeacherNavbar active="Tests" />
                <main className="teacher-dashboard">
                    <div className="teacher-page-heading">
                        <div>
                            <span className="page-badge">QUESTION MANAGEMENT</span>
                            <h1>Test questions</h1>
                        </div>
                    </div>
                    <div className="error-message" role="alert">{loadError}</div>
                    <button className="teacher-primary-button" onClick={loadPage}>Retry</button>
                    <button className="teacher-secondary-button" onClick={() => navigate("/teacher/tests")}>
                        Back to Tests
                    </button>
                </main>
            </div>
        );
    }

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Tests" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="teacher-label">QUESTION MANAGEMENT</span>
                        <h1>{test.title}</h1>
                        <p>{questions.length} / {test.totalQuestions} questions · {test.testType} · {test.totalMarks} marks</p>
                    </div>
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
                                <div className="teacher-form-group">
                                    <label>Question type</label>
                                    <input value="Descriptive" readOnly />
                                </div>
                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="questionText">Question text</label>
                                    <textarea id="questionText" value={form.text} onChange={(event) => setForm((old) => ({ ...old, text: event.target.value }))} maxLength={10000} rows="4" required />
                                </div>
                                <div className="teacher-form-group">
                                    <label htmlFor="marks">Marks</label>
                                    <input id="marks" type="number" min="0.01" step="0.01" value={form.marks} onChange={(event) => setForm((old) => ({ ...old, marks: event.target.value }))} required />
                                </div>
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
                            <p>Student answers will be evaluated manually by the teacher.</p>
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
