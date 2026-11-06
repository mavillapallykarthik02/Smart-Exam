import { useCallback, useEffect, useState } from "react";
import TeacherNavbar from "../components/TeacherNavbar";
import {
    listBranches
} from "../services/branchService";
import {
    createSubject,
    deactivateSubject,
    listSubjects,
    setSubjectStatus,
    updateSubject
} from "../services/subjectService";

function TeacherSubjects() {

    /* =========================
       BRANCH DATA
    ========================== */

    const [branches, setBranches] = useState([]);
    const [branchError, setBranchError] = useState("");
    const [isLoadingBranches, setIsLoadingBranches] = useState(true);


    /* =========================
       SUBJECT DATA
    ========================== */

    const [subjects, setSubjects] = useState([]);
    const [isLoadingSubjects, setIsLoadingSubjects] = useState(true);
    const [subjectError, setSubjectError] = useState("");
    const [actionError, setActionError] = useState("");
    const [formError, setFormError] = useState("");
    const [validationErrors, setValidationErrors] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busySubjectId, setBusySubjectId] = useState("");


    const [searchTerm, setSearchTerm] =
        useState("");


    const [selectedBranch, setSelectedBranch] =
        useState("All");


    const [selectedStatus, setSelectedStatus] =
        useState("All");


    const [showModal, setShowModal] =
        useState(false);


    const [editingSubject, setEditingSubject] =
        useState(null);


    /* =========================
       FORM DATA
    ========================== */

    const [formData, setFormData] = useState({
        name: "",
        code: "",
        branchCode: "",
        description: ""
    });


    const loadBranches = useCallback(async () => {
        setIsLoadingBranches(true);
        setBranchError("");
        try {
            setBranches(await listBranches());
        } catch (error) {
            setBranchError(error.message);
        } finally {
            setIsLoadingBranches(false);
        }
    }, []);

    const loadSubjects = useCallback(async () => {
        setIsLoadingSubjects(true);
        setSubjectError("");
        const branchId = selectedBranch === "All"
            ? undefined
            : branches.find((branch) => branch.code === selectedBranch)?.id;
        if (selectedBranch !== "All" && !branchId) {
            setSubjects([]);
            setIsLoadingSubjects(false);
            return;
        }
        try {
            setSubjects(await listSubjects(branchId));
        } catch (error) {
            setSubjectError(error.message);
        } finally {
            setIsLoadingSubjects(false);
        }
    }, [branches, selectedBranch]);

    useEffect(() => {
        Promise.resolve().then(loadBranches);
    }, [loadBranches]);

    useEffect(() => {
        Promise.resolve().then(loadSubjects);
    }, [loadSubjects]);


    /* =========================
       HANDLE INPUT
    ========================== */

    const handleChange = (e) => {

        const { name, value } = e.target;

        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));
    };


    /* =========================
       ADD SUBJECT
    ========================== */

    const resetForm = () => {
        setFormData({ name: "", code: "", branchCode: "", description: "" });
        setEditingSubject(null);
        setFormError("");
        setValidationErrors([]);
    };

    const handleAddSubject = () => {
        resetForm();
        setShowModal(true);
    };

    const handleEditSubject = (subject) => {
        setEditingSubject(subject);
        setFormData({
            name: subject.name,
            code: subject.code,
            branchCode: subject.branchCode,
            description: subject.description
        });
        setFormError("");
        setValidationErrors([]);
        setShowModal(true);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setFormError("");
        setValidationErrors([]);
        setActionError("");

        const branch = branches.find((item) => item.code === formData.branchCode);
        if (!branch || !branch.isActive) {
            setFormError("Select an active branch.");
            return;
        }

        setIsSubmitting(true);
        const details = {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            branch: branch.id,
            description: formData.description.trim()
        };
        try {
            if (editingSubject) {
                await updateSubject(editingSubject.id, details);
            } else {
                await createSubject(details);
            }
            setShowModal(false);
            resetForm();
            await loadSubjects();
        } catch (error) {
            setFormError(error.message);
            setValidationErrors(error.errors || []);
        } finally {
            setIsSubmitting(false);
        }
    };

    const closeModal = () => {
        setShowModal(false);
        resetForm();
    };

    const handleToggleStatus = async (subject) => {
        setActionError("");
        setBusySubjectId(subject.id);
        try {
            await setSubjectStatus(subject.id, !subject.isActive);
            await loadSubjects();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusySubjectId("");
        }
    };

    const handleDelete = async (subject) => {
        if (!window.confirm(`Deactivate "${subject.name}"?`)) {
            return;
        }

        setActionError("");
        setBusySubjectId(subject.id);
        try {
            await deactivateSubject(subject.id);
            await loadSubjects();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusySubjectId("");
        }
    };


    /* =========================
       FILTER SUBJECTS
    ========================== */

    const filteredSubjects =
        subjects.filter((subject) => {

            const search =
                searchTerm.toLowerCase();


            const matchesSearch =
                subject.name
                    .toLowerCase()
                    .includes(search) ||

                subject.code
                    .toLowerCase()
                    .includes(search) ||

                subject.branchName
                    .toLowerCase()
                    .includes(search) ||

                subject.description
                    .toLowerCase()
                    .includes(search);


            const matchesBranch =
                selectedBranch === "All" ||
                subject.branchCode ===
                    selectedBranch;


            const matchesStatus =
                selectedStatus === "All" ||
                subject.status ===
                    selectedStatus;


            return (
                matchesSearch &&
                matchesBranch &&
                matchesStatus
            );
        });


    /* =========================
       COUNTS
    ========================== */

    const activeSubjects =
        subjects.filter(
            (subject) =>
                subject.status === "Active"
        ).length;


    const inactiveSubjects =
        subjects.filter(
            (subject) =>
                subject.status === "Inactive"
        ).length;


    return (

        <div className="teacher-page">

            <TeacherNavbar active="Subjects" />

            {/* =========================
                MAIN
            ========================== */}

            <main className="teacher-dashboard">

                {/* PAGE HEADING */}

                <div className="teacher-page-heading">

                    <div>

                        <span className="page-badge">
                            SUBJECT MANAGEMENT
                        </span>

                        <h1>
                            Manage Subjects
                        </h1>

                        <p>
                            Create and manage subjects
                            for different academic
                            branches.
                        </p>

                    </div>


                    <button
                        className="teacher-primary-button"
                        onClick={
                            handleAddSubject
                        }
                        disabled={isLoadingBranches || Boolean(branchError)}
                    >
                        + Add Subject
                    </button>

                </div>

                {(branchError || subjectError || actionError) && (
                    <div className="error-message" role="alert">
                        {branchError || subjectError || actionError}
                    </div>
                )}

                {/* =========================
                    STATISTICS
                ========================== */}

                <div className="teacher-stats-grid">

                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            📚
                        </div>

                        <div>

                            <h3>
                                {subjects.length}
                            </h3>

                            <p>
                                Total Subjects
                            </p>

                        </div>

                    </div>


                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            ✓
                        </div>

                        <div>

                            <h3>
                                {activeSubjects}
                            </h3>

                            <p>
                                Active Subjects
                            </p>

                        </div>

                    </div>


                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            ⏸
                        </div>

                        <div>

                            <h3>
                                {inactiveSubjects}
                            </h3>

                            <p>
                                Inactive Subjects
                            </p>

                        </div>

                    </div>

                </div>


                {/* =========================
                    TOOLBAR
                ========================== */}

                <div className="teacher-management-toolbar">

                    {/* SEARCH */}

                    <div className="teacher-search-box">

                        <span>
                            🔍
                        </span>

                        <input
                            type="text"
                            placeholder="Search subjects..."
                            value={
                                searchTerm
                            }
                            onChange={(e) =>
                                setSearchTerm(
                                    e.target.value
                                )
                            }
                        />

                    </div>


                    {/* BRANCH FILTER */}

                    <select
                        value={selectedBranch}
                        onChange={(e) =>
                            setSelectedBranch(
                                e.target.value
                            )
                        }
                        className="management-filter"
                    >

                        <option value="All">
                            All Branches
                        </option>

                        {branches.map(
                            (branch) => (

                                <option
                                    key={branch.id}
                                    value={
                                        branch.code
                                    }
                                >
                                    {branch.code} -{" "}
                                    {branch.name}
                                </option>

                            )
                        )}

                    </select>


                    {/* STATUS FILTER */}

                    <select
                        value={selectedStatus}
                        onChange={(e) =>
                            setSelectedStatus(
                                e.target.value
                            )
                        }
                        className="management-filter"
                    >

                        <option value="All">
                            All Status
                        </option>

                        <option value="Active">
                            Active
                        </option>

                        <option value="Inactive">
                            Inactive
                        </option>

                    </select>


                    <div className="branch-count">

                        Showing{" "}
                        {filteredSubjects.length}{" "}
                        of{" "}
                        {subjects.length}{" "}
                        subjects

                    </div>

                </div>


                {/* =========================
                    SUBJECT TABLE
                ========================== */}

                <div className="teacher-management-table">

                    <div className="management-table-header">

                        <div>
                            Subject
                        </div>

                        <div>
                            Code
                        </div>

                        <div>
                            Branch
                        </div>

                        <div>
                            Status
                        </div>

                        <div>
                            Actions
                        </div>

                    </div>


                    {isLoadingSubjects ? (
                        <div className="teacher-empty-state" aria-live="polite">
                            Loading subjects...
                        </div>
                    ) : filteredSubjects.length >
                    0 ? (

                        filteredSubjects.map(
                            (subject) => (

                                <div
                                    className="management-table-row"
                                    key={
                                        subject.id
                                    }
                                >

                                    {/* SUBJECT */}

                                    <div className="branch-name-cell">

                                        <div className="branch-icon">
                                            📚
                                        </div>

                                        <div>

                                            <strong>
                                                {
                                                    subject.name
                                                }
                                            </strong>

                                            <small>
                                                Subject ID:{" "}
                                                {
                                                    subject.id
                                                }
                                            </small>

                                        </div>

                                    </div>


                                    {/* CODE */}

                                    <div>

                                        <span className="branch-code">
                                            {
                                                subject.code
                                            }
                                        </span>

                                    </div>


                                    {/* BRANCH */}

                                    <div>

                                        <strong>
                                            {
                                                subject.branchCode
                                            }
                                        </strong>

                                        <small
                                            className="table-secondary-text"
                                        >
                                            {
                                                subject.branchName
                                            }
                                        </small>

                                    </div>


                                    {/* STATUS */}

                                    <div>

                                        <span
                                            className={
                                                subject.status ===
                                                "Active"
                                                    ? "status-active"
                                                    : "status-inactive"
                                            }
                                        >
                                            ●{" "}
                                            {
                                                subject.status
                                            }
                                        </span>

                                    </div>


                                    {/* ACTIONS */}

                                    <div className="management-actions">

                                        <button
                                            className="action-edit"
                                            onClick={() =>
                                                handleEditSubject(
                                                    subject
                                                )
                                            }
                                        >
                                            Edit
                                        </button>


                                        <button
                                            className="action-toggle"
                                            onClick={() =>
                                                handleToggleStatus(
                                                    subject
                                                )
                                            }
                                            disabled={busySubjectId === subject.id}
                                        >
                                            {
                                                subject.status ===
                                                "Active"
                                                    ? "Deactivate"
                                                    : "Activate"
                                            }
                                        </button>


                                        <button
                                            className="action-delete"
                                            onClick={() =>
                                                handleDelete(
                                                    subject
                                                )
                                            }
                                            disabled={busySubjectId === subject.id || !subject.isActive}
                                        >
                                            Delete
                                        </button>

                                    </div>

                                </div>

                            )
                        )

                    ) : (

                        <div className="teacher-empty-state">

                            <div className="empty-icon">
                                🔍
                            </div>

                            <h3>
                                No subjects found
                            </h3>

                            <p>
                                Try another search or
                                add a new subject.
                            </p>

                        </div>

                    )}

                </div>

            </main>


            {/* =========================
                ADD / EDIT MODAL
            ========================== */}

            {showModal && (

                <div
                    className="teacher-modal-overlay"
                    onClick={closeModal}
                >

                    <div
                        className="teacher-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        {/* MODAL HEADER */}

                        <div className="modal-header">

                            <div>

                                <span className="page-badge">
                                    {
                                        editingSubject
                                            ? "EDIT SUBJECT"
                                            : "NEW SUBJECT"
                                    }
                                </span>

                                <h2>
                                    {
                                        editingSubject
                                            ? "Edit Subject"
                                            : "Add New Subject"
                                    }
                                </h2>

                            </div>


                            <button
                                className="modal-close"
                                onClick={closeModal}
                            >
                                ×
                            </button>

                        </div>

                        {formError && (
                            <div className="error-message" role="alert">
                                <p>{formError}</p>
                                {validationErrors.map((item, index) => (
                                    <p key={`${item.field}-${index}`}>{item.message}</p>
                                ))}
                            </div>
                        )}

                        {/* FORM */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                            className="branch-form"
                        >

                            {/* SUBJECT NAME */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Subject Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={
                                        formData.name
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Example: Python Programming"
                                    required
                                />

                            </div>


                            {/* SUBJECT CODE */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Subject Code
                                </label>

                                <input
                                    type="text"
                                    name="code"
                                    value={
                                        formData.code
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Example: PYTHON"
                                    maxLength="15"
                                    required
                                />

                            </div>


                            {/* BRANCH */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Select Branch
                                </label>

                                <select
                                    name="branchCode"
                                    value={
                                        formData.branchCode
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        -- Select Branch --
                                    </option>

                                    {branches
                                        .filter(
                                            (branch) =>
                                                branch.isActive
                                        )
                                        .map(
                                            (
                                                branch
                                            ) => (

                                                <option
                                                    key={
                                                        branch.id
                                                    }
                                                    value={
                                                        branch.code
                                                    }
                                                >
                                                    {
                                                        branch.code
                                                    }{" "}
                                                    -{" "}
                                                    {
                                                        branch.name
                                                    }
                                                </option>

                                            )
                                        )}

                                </select>

                            </div>


                            {/* DESCRIPTION */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="Enter subject description..."
                                    rows="4"
                                    required
                                />

                            </div>


                            {/* BUTTONS */}

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="teacher-secondary-button"
                                    onClick={
                                        closeModal
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="submit"
                                    className="teacher-primary-button"
                                    disabled={isSubmitting || isLoadingBranches}
                                >
                                    {isSubmitting
                                        ? "Saving..."
                                        : (
                                        editingSubject
                                            ? "Update Subject"
                                            : "Add Subject"
                                        )}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default TeacherSubjects;