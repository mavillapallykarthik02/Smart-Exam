import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import LogoutButton from "../components/LogoutButton";
import BrandLogoImage from "../components/BrandLogoImage";
import { listBranches } from "../services/branchService";
import { listSubjects } from "../services/subjectService";
import {
    archiveTest,
    createTest,
    listTests,
    setTestStatus,
    updateTest
} from "../services/testService";

function createEmptyTestForm() {
    return {
        title: "",
        branch: "",
        subject: "",
        description: "",
        instructions: "",
        questions: "20",
        duration: "30",
        type: "MCQ",
        totalMarks: "100",
        passingPercentage: "40"
    };
}

function TeacherTests() {
    const [tests, setTests] = useState([]);
    const [branches, setBranches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [subjectsLoading, setSubjectsLoading] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");
    const [formError, setFormError] = useState("");
    const [validationErrors, setValidationErrors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyTestId, setBusyTestId] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");
    const [showModal, setShowModal] = useState(false);
    const [editingTest, setEditingTest] = useState(null);
    const [formData, setFormData] = useState(createEmptyTestForm);

    const loadTests = useCallback(async () => {
        setIsLoading(true);
        setLoadError("");
        try {
            setTests(await listTests());
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    const loadBranches = useCallback(async () => {
        try {
            setBranches((await listBranches()).filter((branch) => branch.isActive));
        } catch (error) {
            setLoadError(error.message);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(() => Promise.all([loadTests(), loadBranches()]));
    }, [loadTests, loadBranches]);

    useEffect(() => {
        if (!formData.branch) {
            return;
        }
        let isCurrent = true;
        Promise.resolve()
            .then(() => listSubjects(formData.branch))
            .then((items) => {
                if (isCurrent) setSubjects(items.filter((subject) => subject.isActive));
            })
            .catch((error) => {
                if (isCurrent) {
                    setValidationErrors((current) => [
                        ...current.filter((item) => item.field !== "subject"),
                        { field: "subject", message: error.message }
                    ]);
                }
            })
            .finally(() => {
                if (isCurrent) setSubjectsLoading(false);
            });
        return () => {
            isCurrent = false;
        };
    }, [formData.branch]);

    const filteredTests = tests.filter((test) => {
        const searchText = search.toLowerCase();

        const matchesSearch =
            test.title.toLowerCase().includes(searchText) ||
            test.subjectName.toLowerCase().includes(searchText) ||
            test.branchName.toLowerCase().includes(searchText) ||
            test.subjectCode.toLowerCase().includes(searchText);

        const matchesStatus =
            statusFilter === "All" ||
            test.status === statusFilter;

        return matchesSearch && matchesStatus;
    });

    const publishedCount = tests.filter(
        (test) => test.status === "Published"
    ).length;

    const draftCount = tests.filter(
        (test) => test.status === "Draft"
    ).length;

    const totalQuestions = tests.reduce(
        (total, test) =>
            total + Number(test.totalQuestions || 0),
        0
    );

    const openCreateModal = () => {
        setEditingTest(null);
        setFormData(createEmptyTestForm());
        setFormError("");
        setValidationErrors([]);
        setSuccessMessage("");
        setShowModal(true);
    };

    const openEditModal = (test) => {
        setEditingTest(test);

        setFormData({
            title: test.title,
            branch: test.branchId,
            subject: test.subjectId,
            description: test.description || "",
            instructions: test.instructions || "",
            questions: String(test.totalQuestions),
            duration: String(test.duration),
            type: test.testType,
            totalMarks: String(test.totalMarks),
            passingPercentage: String(test.passingPercentage)
        });
        setFormError("");
        setValidationErrors([]);
        setSuccessMessage("");
        setSubjects([]);
        setSubjectsLoading(true);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingTest(null);
        setFormData(createEmptyTestForm());
        setSubjects([]);
        setSubjectsLoading(false);
        setFormError("");
        setValidationErrors([]);
    };

    const handleChange = (event) => {
        const { name, value } = event.target;
        setFormData((previous) => ({
            ...previous,
            [name]: value
        }));
        const validationField = name === "questions"
            ? "totalQuestions"
            : name === "type"
                ? "testType"
                : name;
        setValidationErrors((current) => current.filter((item) => (
            item.field !== validationField
        )));
        setFormError("");
    };

    const getFieldError = (field) => {
        const validationField = field === "questions"
            ? "totalQuestions"
            : field === "type"
                ? "testType"
                : field;
        return validationErrors.find((item) => item.field === validationField)?.message;
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError("");
        setValidationErrors([]);
        setSuccessMessage("");
        if (isSubmitting) return;

        const errors = [];
        if (formData.title.trim().length < 3 || formData.title.trim().length > 160) {
            errors.push({
                field: "title",
                message: "Test title must be between 3 and 160 characters."
            });
        }
        if (!formData.branch) {
            errors.push({ field: "branch", message: "Select a branch." });
        }
        if (!formData.subject) {
            errors.push({ field: "subject", message: "Select a subject." });
        }
        if (!["MCQ", "TYPING", "DESCRIPTIVE", "MIXED"].includes(formData.type)) {
            errors.push({ field: "testType", message: "Select a valid test type." });
        }
        if (!/^\d+$/.test(formData.questions) || Number(formData.questions) < 1 || Number(formData.questions) > 500) {
            errors.push({
                field: "totalQuestions",
                message: "Number of questions must be a whole number from 1 to 500."
            });
        }
        if (!/^\d+$/.test(formData.duration) || Number(formData.duration) < 1 || Number(formData.duration) > 600) {
            errors.push({
                field: "duration",
                message: "Duration must be a whole number from 1 to 600 minutes."
            });
        }
        if (!formData.totalMarks.trim() || !Number.isFinite(Number(formData.totalMarks)) || Number(formData.totalMarks) < 0.01 || Number(formData.totalMarks) > 100000) {
            errors.push({
                field: "totalMarks",
                message: "Total marks must be at least 0.01 and no greater than 100000."
            });
        }
        if (!formData.passingPercentage.trim() || !Number.isFinite(Number(formData.passingPercentage)) || Number(formData.passingPercentage) < 0 || Number(formData.passingPercentage) > 100) {
            errors.push({
                field: "passingPercentage",
                message: "Passing percentage must be between 0 and 100."
            });
        }
        if (errors.length) {
            setFormError("Please correct the highlighted fields.");
            setValidationErrors(errors);
            return;
        }

        const details = {
            ...formData,
            title: formData.title.trim(),
            description: formData.description.trim(),
            instructions: formData.instructions.trim(),
            duration: Number(formData.duration),
            totalQuestions: Number(formData.questions),
            totalMarks: Number(formData.totalMarks),
            passingPercentage: Number(formData.passingPercentage),
            testType: formData.type
        };
        delete details.questions;
        delete details.type;
        setIsSubmitting(true);
        try {
            if (editingTest) {
                await updateTest(editingTest.id, details);
            } else {
                await createTest(details);
            }
            closeModal();
            setSuccessMessage(editingTest
                ? "Test updated successfully."
                : "Test created successfully.");
            await loadTests();
        } catch (error) {
            setFormError(error.message);
            setValidationErrors(error.errors || []);
        } finally {
            setIsSubmitting(false);
        }
    };

    const togglePublish = async (test) => {
        setBusyTestId(test.id);
        setActionError("");
        try {
            await setTestStatus(
                test.id,
                test.status === "Published" ? "DRAFT" : "PUBLISHED"
            );
            await loadTests();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusyTestId("");
        }
    };

    const deleteTest = async (test) => {
        const confirmDelete = window.confirm(
            `Archive "${test.title}"? Archived tests are retained for historical records.`
        );
        if (!confirmDelete) {
            return;
        }
        setBusyTestId(test.id);
        setActionError("");
        try {
            await archiveTest(test.id);
            await loadTests();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusyTestId("");
        }
    };

    return (
        <div className="teacher-page">

            {/* ================= NAVBAR ================= */}

            <header className="teacher-navbar">

                <div className="teacher-logo">
                    <BrandLogoImage />
                    <strong>SmartExam</strong>
                </div>

                <nav className="teacher-nav">

                    <Link to="/teacher/dashboard">
                        Dashboard
                    </Link>

                    <Link to="/teacher/students">
                        Students
                    </Link>

                    <Link to="/teacher/branches">
                        Branches
                    </Link>

                    <Link to="/teacher/subjects">
                        Subjects
                    </Link>

                    <Link
                        to="/teacher/tests"
                        className="teacher-nav-active"
                    >
                        Tests
                    </Link>

                    <Link to="/teacher/results">
                        Results
                    </Link>

                    <Link to="/teacher/answers">
                        Answers
                    </Link>

                    <Link to="/teacher/account">
                        Account
                    </Link>

                </nav>

                <LogoutButton role="teacher" className="teacher-logout" />

            </header>


            {/* ================= MAIN ================= */}

            <main className="teacher-dashboard">

                <div className="teacher-page-heading">

                    <p className="teacher-label">
                        TEST MANAGEMENT
                    </p>

                    <h1>
                        Tests
                    </h1>

                    <p>
                        Create, update and manage
                        examination tests.
                    </p>

                </div>


                {/* ================= STATISTICS ================= */}

                <div className="teacher-stat-grid">

                    <div className="teacher-stat-card">

                        <div className="teacher-stat-icon">
                            📝
                        </div>

                        <div>
                            <h2>{tests.length}</h2>
                            <p>Total Tests</p>
                        </div>

                    </div>


                    <div className="teacher-stat-card">

                        <div className="teacher-stat-icon">
                            ✅
                        </div>

                        <div>
                            <h2>{publishedCount}</h2>
                            <p>Published</p>
                        </div>

                    </div>


                    <div className="teacher-stat-card">

                        <div className="teacher-stat-icon">
                            📄
                        </div>

                        <div>
                            <h2>{draftCount}</h2>
                            <p>Draft Tests</p>
                        </div>

                    </div>


                    <div className="teacher-stat-card">

                        <div className="teacher-stat-icon">
                            ❓
                        </div>

                        <div>
                            <h2>{totalQuestions}</h2>
                            <p>Total Questions</p>
                        </div>

                    </div>

                </div>


                {/* ================= TOOLBAR ================= */}

                <div className="teacher-management-toolbar">

                    <input
                        type="text"
                        placeholder="Search tests..."
                        value={search}
                        onChange={(event) =>
                            setSearch(event.target.value)
                        }
                    />

                    <select
                        value={statusFilter}
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
                            )
                        }
                    >
                        <option value="All">
                            All Status
                        </option>

                        <option value="Published">
                            Published
                        </option>

                        <option value="Draft">
                            Draft
                        </option>
                    </select>

                    <button
                        className="teacher-primary-button"
                        onClick={openCreateModal}
                        disabled={isLoading || branches.length === 0}
                    >
                        + Create Test
                    </button>

                </div>

                {(loadError || actionError) && (
                    <div className="error-message" role="alert">
                        {loadError || actionError}
                    </div>
                )}

                {successMessage && (
                    <div className="success-message" role="status">
                        {successMessage}
                    </div>
                )}

                {/* ================= TEST TABLE ================= */}

                <div className="teacher-management-table">

                    <div
                        className="management-table-header"
                        style={{
                            gridTemplateColumns:
                                "1.5fr 1fr 0.7fr 0.7fr 0.8fr 1.4fr"
                        }}
                    >
                        <div>Test</div>
                        <div>Subject</div>
                        <div>Branch</div>
                        <div>Questions</div>
                        <div>Status</div>
                        <div>Actions</div>
                    </div>


                    {filteredTests.length === 0 ? (

                        <div className="teacher-empty-state">

                            {isLoading ? <span>Loading tests...</span> : <span>📝</span>}

                            <h3>
                                {isLoading ? "" : "No tests found"}
                            </h3>

                            <p>
                                {isLoading ? "" : "Create a new test or change your search."}
                            </p>

                        </div>

                    ) : (

                        filteredTests.map((test) => (

                            <div
                                className="management-table-row"
                                key={test.id}
                                style={{
                                    gridTemplateColumns:
                                        "1.5fr 1fr 0.7fr 0.7fr 0.8fr 1.4fr"
                                }}
                            >

                                <div>
                                    <strong>
                                        {test.title}
                                    </strong>

                                    <div
                                        style={{
                                            color:
                                                "#94a3b8",
                                            fontSize:
                                                "11px",
                                            marginTop:
                                                "4px"
                                        }}
                                    >
                                        {test.subjectCode}
                                        {" • "}
                                        {test.duration}
                                        {" min • "}
                                        {test.testType}
                                    </div>
                                </div>


                                <div>
                                    {test.subjectName}
                                </div>


                                <div>
                                    <span className="branch-code">
                                        {test.branch}
                                    </span>
                                </div>


                                <div>
                                    {test.questions}
                                </div>


                                <div>

                                    {test.status === "Published" ? (

                                        <span className="status-active">
                                            Published
                                        </span>

                                    ) : test.status === "Archived" ? (
                                        <span className="status-inactive">Archived</span>

                                    ) : (

                                        <span className="status-inactive">
                                            Draft
                                        </span>

                                    )}

                                </div>


                                <div className="management-actions">

                                    <button
                                        onClick={() =>
                                            openEditModal(test)
                                        }
                                        disabled={test.status === "Archived"}
                                    >
                                        Edit
                                    </button>

                                    <Link
                                        className="action-edit"
                                        to={`/teacher/tests/${test.id}/questions`}
                                    >
                                        Questions
                                    </Link>

                                    <button
                                        onClick={() =>
                                            togglePublish(
                                                test
                                            )
                                        }
                                        disabled={busyTestId === test.id || test.status === "Archived"}
                                    >
                                        {test.status ===
                                        "Published"
                                            ? "Unpublish"
                                            : "Publish"}
                                    </button>

                                    <button
                                        className="danger"
                                        onClick={() =>
                                            deleteTest(
                                                test
                                            )
                                        }
                                        disabled={busyTestId === test.id || test.status === "Archived"}
                                    >
                                        Delete
                                    </button>

                                </div>

                            </div>

                        ))

                    )}

                </div>

            </main>


            {/* ================= CREATE / EDIT MODAL ================= */}

            {showModal && (

                <div
                    className="teacher-modal-overlay teacher-test-modal-overlay"
                    onClick={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        && !isSubmitting) {
                            closeModal();
                        }
                    }}
                >

                    <div className="teacher-modal teacher-test-modal">

                        <button
                            className="modal-close"
                            type="button"
                            aria-label="Close test form"
                            disabled={isSubmitting}
                            onClick={closeModal}
                        >
                            ×
                        </button>

                        <h2>
                            {editingTest
                                ? "Edit Test"
                                : "Create New Test"}
                        </h2>


                        {formError && (
                            <div className="error-message" role="alert">
                                <p>{formError}</p>
                            </div>
                        )}

                        <form
                            className="teacher-test-form"
                            onSubmit={handleSubmit}
                            noValidate
                        >

                            <div className="teacher-form-grid teacher-test-form-fields">
                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="test-title">Test Title *</label>
                                    <input
                                        id="test-title"
                                        type="text"
                                        name="title"
                                        value={formData.title}
                                        onChange={handleChange}
                                        placeholder="Enter test title"
                                        minLength="3"
                                        maxLength="160"
                                        required
                                        aria-invalid={Boolean(getFieldError("title"))}
                                        aria-describedby={getFieldError("title") ? "test-title-error" : undefined}
                                    />
                                    {getFieldError("title") && (
                                        <p className="teacher-field-error" id="test-title-error">{getFieldError("title")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-branch">Branch *</label>
                                    <select
                                        id="test-branch"
                                        name="branch"
                                        value={formData.branch}
                                        onChange={(event) => {
                                            const branch = event.target.value;
                                            setFormData((current) => ({
                                                ...current,
                                                branch,
                                                subject: ""
                                            }));
                                            setSubjects([]);
                                            setSubjectsLoading(Boolean(branch));
                                            setValidationErrors((current) => current.filter(
                                                (item) => item.field !== "branch" && item.field !== "subject"
                                            ));
                                            setFormError("");
                                        }}
                                        required
                                        aria-invalid={Boolean(getFieldError("branch"))}
                                        aria-describedby={getFieldError("branch") ? "test-branch-error" : undefined}
                                    >
                                        <option value="">Select Branch</option>
                                        {branches.map((branch) => (
                                            <option key={branch.id} value={branch.id}>
                                                {branch.name} ({branch.code})
                                            </option>
                                        ))}
                                    </select>
                                    {getFieldError("branch") && (
                                        <p className="teacher-field-error" id="test-branch-error">{getFieldError("branch")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-subject">Subject *</label>
                                    <select
                                        id="test-subject"
                                        name="subject"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        required
                                        disabled={!formData.branch || subjectsLoading || subjects.length === 0}
                                        aria-invalid={Boolean(getFieldError("subject"))}
                                        aria-describedby={getFieldError("subject") ? "test-subject-error" : undefined}
                                    >
                                        <option value="">
                                            {!formData.branch
                                                ? "Select a branch first"
                                                : subjectsLoading
                                                    ? "Loading subjects..."
                                                    : subjects.length
                                                        ? "Select Subject"
                                                        : "No subjects available"}
                                        </option>
                                        {subjects.map((subject) => (
                                            <option key={subject.id} value={subject.id}>
                                                {subject.name} ({subject.code})
                                            </option>
                                        ))}
                                    </select>
                                    {getFieldError("subject") && (
                                        <p className="teacher-field-error" id="test-subject-error">{getFieldError("subject")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="test-description">Test Description</label>
                                    <textarea
                                        id="test-description"
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        placeholder="Enter test description"
                                        maxLength="3000"
                                        rows="2"
                                    />
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-type">Test Type *</label>
                                    <select
                                        id="test-type"
                                        name="type"
                                        value={formData.type}
                                        onChange={handleChange}
                                        required
                                        aria-invalid={Boolean(getFieldError("type"))}
                                        aria-describedby={getFieldError("type") ? "test-type-error" : undefined}
                                    >
                                        <option value="MCQ">MCQ</option>
                                        <option value="TYPING">Typing Test</option>
                                        <option value="DESCRIPTIVE">Descriptive Test</option>
                                        <option value="MIXED">Mixed</option>
                                    </select>
                                    {getFieldError("type") && (
                                        <p className="teacher-field-error" id="test-type-error">{getFieldError("type")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-questions">Number of Questions *</label>
                                    <input
                                        id="test-questions"
                                        type="number"
                                        name="questions"
                                        min="1"
                                        max="500"
                                        step="1"
                                        value={formData.questions}
                                        onChange={handleChange}
                                        required
                                        aria-invalid={Boolean(getFieldError("questions"))}
                                        aria-describedby={getFieldError("questions") ? "test-questions-error" : undefined}
                                    />
                                    {getFieldError("questions") && (
                                        <p className="teacher-field-error" id="test-questions-error">{getFieldError("questions")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-duration">Duration (minutes) *</label>
                                    <input
                                        id="test-duration"
                                        type="number"
                                        name="duration"
                                        min="1"
                                        max="600"
                                        step="1"
                                        value={formData.duration}
                                        onChange={handleChange}
                                        required
                                        aria-invalid={Boolean(getFieldError("duration"))}
                                        aria-describedby={getFieldError("duration") ? "test-duration-error" : undefined}
                                    />
                                    {getFieldError("duration") && (
                                        <p className="teacher-field-error" id="test-duration-error">{getFieldError("duration")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-total-marks">Total Marks *</label>
                                    <input
                                        id="test-total-marks"
                                        type="number"
                                        name="totalMarks"
                                        min="0.01"
                                        max="100000"
                                        step="0.01"
                                        value={formData.totalMarks}
                                        onChange={handleChange}
                                        required
                                        aria-invalid={Boolean(getFieldError("totalMarks"))}
                                        aria-describedby={getFieldError("totalMarks") ? "test-total-marks-error" : undefined}
                                    />
                                    {getFieldError("totalMarks") && (
                                        <p className="teacher-field-error" id="test-total-marks-error">{getFieldError("totalMarks")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group">
                                    <label htmlFor="test-passing-percentage">Passing Percentage *</label>
                                    <input
                                        id="test-passing-percentage"
                                        type="number"
                                        name="passingPercentage"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        value={formData.passingPercentage}
                                        onChange={handleChange}
                                        required
                                        aria-invalid={Boolean(getFieldError("passingPercentage"))}
                                        aria-describedby={getFieldError("passingPercentage") ? "test-passing-percentage-error" : undefined}
                                    />
                                    {getFieldError("passingPercentage") && (
                                        <p className="teacher-field-error" id="test-passing-percentage-error">{getFieldError("passingPercentage")}</p>
                                    )}
                                </div>

                                <div className="teacher-form-group teacher-form-full">
                                    <label htmlFor="test-instructions">Instructions</label>
                                    <textarea
                                        id="test-instructions"
                                        name="instructions"
                                        value={formData.instructions}
                                        onChange={handleChange}
                                        placeholder="Enter instructions for students..."
                                        maxLength="5000"
                                        rows="4"
                                    />
                                </div>
                            </div>

                            <div className="modal-actions">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    disabled={isSubmitting}
                                >
                                    Cancel
                                </button>
                                <button type="submit" disabled={isSubmitting}>
                                    {isSubmitting
                                        ? "Saving..."
                                        : editingTest
                                        ? "Update Test"
                                        : "Create Test"}
                                </button>
                            </div>
                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default TeacherTests;