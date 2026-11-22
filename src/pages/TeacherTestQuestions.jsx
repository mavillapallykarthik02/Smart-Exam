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
import EnglishEditor from "../components/editors/EnglishEditor";
import EquationEditor from "../components/editors/EquationEditor";
import PaintStudio from "../components/editors/PaintStudio";

const emptyForm = {
    text: "",
    title: "",
    instructions: "",
    marks: "1",
    explanation: "",
    contentMethods: ["ENGLISH"],
    englishContent: "",
    equationSource: "",
    equationEntries: [],
    drawingPages: [],
    options: [
        { key: "A", text: "" },
        { key: "B", text: "" },
        { key: "C", text: "" },
        { key: "D", text: "" }
    ],
    correctAnswer: "A",
    imageUrl: "",
    expectedAnswer: "",
    markingScheme: "",
    evaluationInstructions: ""
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
            text: question.text || "",
            title: question.title || "",
            instructions: question.instructions || "",
            marks: String(question.marks),
            explanation: question.explanation || "",
            contentMethods: question.contentMethods?.length ? question.contentMethods : ["ENGLISH"],
            englishContent: question.englishContent || "",
            equationSource: question.equationSource || "",
            equationEntries: question.equationEntries || [],
            drawingPages: question.drawingPages || [],
            options: question.options?.length
                ? question.options.map(({ key, text }) => ({ key, text }))
                : emptyForm.options.map((option) => ({ ...option })),
            correctAnswer: question.correctAnswer || "A",
            imageUrl: question.imageUrl || "",
            expectedAnswer: question.expectedAnswer || "",
            markingScheme: question.markingScheme || "",
            evaluationInstructions: question.evaluationInstructions || ""
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
        const details = test?.testType === "MCQ" ? {
            questionType: "MCQ",
            text: form.text.trim(),
            options: form.options,
            correctAnswer: form.correctAnswer,
            marks: Number(form.marks),
            explanation: form.explanation.trim()
        } : {
            questionType: "DESCRIPTIVE",
            text: form.text.trim(),
            title: form.title.trim(),
            instructions: form.instructions.trim(),
            marks: Number(form.marks),
            explanation: form.explanation.trim(),
            contentMethods: form.contentMethods,
            englishContent: form.englishContent,
            equationSource: form.equationSource,
            equationEntries: form.equationEntries,
            drawingPages: form.drawingPages,
            imageUrl: form.imageUrl.trim(),
            expectedAnswer: form.expectedAnswer,
            markingScheme: form.markingScheme,
            evaluationInstructions: form.evaluationInstructions
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
                                    <input value={test.testType === "MCQ" ? "Multiple choice" : "Descriptive"} readOnly />
                                </div>
                                <div className="teacher-form-group">
                                    <label htmlFor="questionTitle">Question title (optional)</label>
                                    <input
                                        id="questionTitle"
                                        value={form.title}
                                        onChange={(event) => setForm((old) => ({ ...old, title: event.target.value }))}
                                        maxLength={160}
                                    />
                                </div>
                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="questionText">Question text</label>
                                    <textarea id="questionText" value={form.text} onChange={(event) => setForm((old) => ({ ...old, text: event.target.value }))} maxLength={10000} rows="3" required />
                                </div>
                                {test.testType === "MCQ" && (
                                    <div className="teacher-form-group teacher-form-full mcq-options">
                                        <fieldset>
                                            <legend>Answer options</legend>
                                            {form.options.map((option, index) => (
                                                <div className="mcq-option-editor" key={option.key}>
                                                    <label htmlFor={`option-${index}`}>Option {option.key}</label>
                                                    <input
                                                        id={`option-${index}`}
                                                        value={option.text}
                                                        maxLength={2000}
                                                        required
                                                        onChange={(event) => setForm((old) => ({
                                                            ...old,
                                                            options: old.options.map((item, itemIndex) => (
                                                                itemIndex === index
                                                                    ? { ...item, text: event.target.value }
                                                                    : item
                                                            ))
                                                        }))}
                                                    />
                                                    {form.options.length > 2 && (
                                                        <button
                                                            type="button"
                                                            onClick={() => setForm((old) => {
                                                                const options = old.options.filter((_item, itemIndex) => itemIndex !== index);
                                                                const correctOptionIndex = options.findIndex((item) => item.key === old.correctAnswer);
                                                                return {
                                                                    ...old,
                                                                    options: options.map((item, itemIndex) => ({
                                                                        ...item,
                                                                        key: String.fromCharCode(65 + itemIndex)
                                                                    })),
                                                                    correctAnswer: String.fromCharCode(65 + Math.max(0, correctOptionIndex))
                                                                };
                                                            })}
                                                        >
                                                            Remove
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                            {form.options.length < 6 && (
                                                <button
                                                    type="button"
                                                    onClick={() => setForm((old) => ({
                                                        ...old,
                                                        options: [...old.options, {
                                                            key: String.fromCharCode(65 + old.options.length),
                                                            text: ""
                                                        }]
                                                    }))}
                                                >
                                                    Add option
                                                </button>
                                            )}
                                            <label className="correct-option-field">
                                                Correct answer
                                                <select
                                                    value={form.correctAnswer}
                                                    onChange={(event) => setForm((old) => ({ ...old, correctAnswer: event.target.value }))}
                                                >
                                                    {form.options.map((option) => (
                                                        <option key={option.key} value={option.key}>{option.key}</option>
                                                    ))}
                                                </select>
                                            </label>
                                        </fieldset>
                                    </div>
                                )}
                                {test.testType === "MCQ" ? (
                                    <>
                                        <div className="teacher-form-group">
                                            <label htmlFor="marks">Marks</label>
                                            <input id="marks" type="number" min="0.01" step="0.01" value={form.marks} onChange={(event) => setForm((old) => ({ ...old, marks: event.target.value }))} required />
                                        </div>
                                        <div className="teacher-form-group teacher-form-full">
                                            <label htmlFor="explanation">Explanation (optional)</label>
                                            <textarea id="explanation" value={form.explanation} onChange={(event) => setForm((old) => ({ ...old, explanation: event.target.value }))} maxLength={5000} rows="2" />
                                        </div>
                                    </>
                                ) : (
                                    <>
                                        <div className="teacher-form-group teacher-form-full">
                                            <label htmlFor="questionInstructions">Question instructions (optional)</label>
                                            <textarea id="questionInstructions" value={form.instructions} onChange={(event) => setForm((old) => ({ ...old, instructions: event.target.value }))} maxLength={5000} rows="2" />
                                        </div>
                                        <div className="teacher-form-group">
                                            <label htmlFor="marks">Marks</label>
                                            <input id="marks" type="number" min="0.01" step="0.01" value={form.marks} onChange={(event) => setForm((old) => ({ ...old, marks: event.target.value }))} required />
                                        </div>
                                        <div className="teacher-form-group">
                                            <label htmlFor="questionImage">Question image URL (optional)</label>
                                            <input id="questionImage" type="url" value={form.imageUrl} onChange={(event) => setForm((old) => ({ ...old, imageUrl: event.target.value }))} maxLength={2048} />
                                        </div>
                                        <div className="teacher-form-group teacher-form-full">
                                            <label htmlFor="explanation">Explanation (optional)</label>
                                            <textarea id="explanation" value={form.explanation} onChange={(event) => setForm((old) => ({ ...old, explanation: event.target.value }))} maxLength={5000} rows="2" />
                                        </div>
                                    </>
                                )}
                            </div>
                            {test.testType === "DESCRIPTIVE" && (
                            <>
                            <fieldset className="method-selector">
                                <legend>SELECT QUESTION CONTENT METHODS</legend>
                                {[
                                    ["ENGLISH", "English"],
                                    ["EQUATION", "Equation"],
                                    ["DRAW", "Draw"]
                                ].map(([method, label]) => (
                                    <label key={method}>
                                        <input
                                            type="checkbox"
                                            checked={form.contentMethods.includes(method)}
                                            onChange={(event) => setForm((old) => ({
                                                ...old,
                                                contentMethods: event.target.checked
                                                    ? [...old.contentMethods, method]
                                                    : old.contentMethods.filter((item) => item !== method)
                                            }))}
                                        />
                                        {label}
                                    </label>
                                ))}
                            </fieldset>
                            {form.contentMethods.length === 0 && (
                                <div className="error-message">Select at least one question content method.</div>
                            )}
                            {form.contentMethods.includes("ENGLISH") && (
                                <section className="method-editor-panel">
                                    <h3>English question content</h3>
                                    <EnglishEditor
                                        value={form.englishContent}
                                        onChange={(englishContent) => setForm((old) => ({ ...old, englishContent }))}
                                        label="English question content"
                                    />
                                </section>
                            )}
                            {form.contentMethods.includes("EQUATION") && (
                                <section className="method-editor-panel">
                                    <h3>Equation question content</h3>
                                    <EquationEditor
                                        value={form.equationSource}
                                        onChange={(equationSource) => setForm((old) => ({ ...old, equationSource }))}
                                        label="Equation question content"
                                    />
                                </section>
                            )}
                            {form.contentMethods.includes("DRAW") && (
                                <section className="method-editor-panel">
                                    <h3>Drawing question content</h3>
                                    <PaintStudio
                                        pages={form.drawingPages.length ? form.drawingPages : [{ width: 800, height: 500, objects: [] }]}
                                        onChange={(drawingPages) => setForm((old) => ({ ...old, drawingPages }))}
                                    />
                                </section>
                            )}
                            <div className="teacher-form-grid">
                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="expectedAnswer">Expected answer (optional)</label>
                                    <textarea id="expectedAnswer" value={form.expectedAnswer} onChange={(event) => setForm((old) => ({ ...old, expectedAnswer: event.target.value }))} maxLength={20000} rows="3" />
                                </div>
                                <div className="teacher-form-group">
                                    <label htmlFor="markingScheme">Marking scheme (optional)</label>
                                    <textarea id="markingScheme" value={form.markingScheme} onChange={(event) => setForm((old) => ({ ...old, markingScheme: event.target.value }))} maxLength={10000} rows="3" />
                                </div>
                                <div className="teacher-form-group">
                                    <label htmlFor="evaluationInstructions">Evaluation instructions (optional)</label>
                                    <textarea id="evaluationInstructions" value={form.evaluationInstructions} onChange={(event) => setForm((old) => ({ ...old, evaluationInstructions: event.target.value }))} maxLength={5000} rows="3" />
                                </div>
                            </div>
                            </>
                            )}
                            <details className="question-preview">
                                <summary>Preview complete question</summary>
                                <div className="question-preview-content">
                                    {form.title && <h3>{form.title}</h3>}
                                    <p>{form.text}</p>
                                    {test.testType === "MCQ" ? (
                                        <>
                                            <ul>
                                                {form.options.map((option) => (
                                                    <li key={option.key}>
                                                        {option.key}. {option.text}
                                                        {option.key === form.correctAnswer ? " (Correct answer)" : ""}
                                                    </li>
                                                ))}
                                            </ul>
                                            {form.explanation && <p><strong>Explanation:</strong> {form.explanation}</p>}
                                        </>
                                    ) : (
                                    <>
                                    {form.instructions && <p><strong>Instructions:</strong> {form.instructions}</p>}
                                    {form.imageUrl && <img src={form.imageUrl} alt="Question" />}
                                    {form.contentMethods.includes("ENGLISH") && (
                                        <EnglishEditor value={form.englishContent} onChange={() => {}} label="English question preview" readOnly />
                                    )}
                                    {form.contentMethods.includes("EQUATION") && (
                                        <EquationEditor value={form.equationSource} onChange={() => {}} label="Equation question preview" readOnly />
                                    )}
                                    {form.contentMethods.includes("DRAW") && (
                                        <PaintStudio
                                            pages={form.drawingPages.length ? form.drawingPages : [{ width: 800, height: 500, objects: [] }]}
                                            onChange={() => {}}
                                            readOnly
                                        />
                                    )}
                                    </>
                                    )}
                                </div>
                            </details>
                            <div className="modal-actions">
                                {editingQuestion && <button type="button" onClick={resetForm}>Cancel Edit</button>}
                                <button className="teacher-primary-button" type="submit" disabled={isSaving || form.contentMethods.length === 0}>
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
                                <>
                                    <ol className="mcq-question-options">
                                        {question.options.map((option) => (
                                            <li key={option.key}>
                                                {option.key}. {option.text}
                                                {option.key === question.correctAnswer ? " (Correct answer)" : ""}
                                            </li>
                                        ))}
                                    </ol>
                                    <p>Student answers are evaluated automatically.</p>
                                </>
                            ) : <p>Student answers will be evaluated manually by the teacher.</p>}
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
