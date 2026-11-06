import { useCallback, useEffect, useState } from "react";
import TeacherNavbar from "../components/TeacherNavbar";
import {
    createBranch,
    deactivateBranch,
    listBranches,
    setBranchStatus,
    updateBranch
} from "../services/branchService";

function TeacherBranches() {
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [actionError, setActionError] = useState("");
    const [searchTerm, setSearchTerm] = useState("");
    const [showModal, setShowModal] = useState(false);
    const [editingBranch, setEditingBranch] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [busyBranchId, setBusyBranchId] = useState("");
    const [formError, setFormError] = useState("");
    const [validationErrors, setValidationErrors] = useState([]);
    const [formData, setFormData] = useState({
        name: "",
        code: "",
        description: ""
    });

    const loadBranches = useCallback(async () => {
        setIsLoading(true);
        setLoadError("");
        try {
            setBranches(await listBranches());
        } catch (error) {
            setLoadError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadBranches);
    }, [loadBranches]);

    const handleAddBranch = () => {
        setEditingBranch(null);
        setFormData({
            name: "",
            code: "",
            description: ""
        });
        setFormError("");
        setValidationErrors([]);
        setShowModal(true);
    };

    const handleEditBranch = (branch) => {
        setEditingBranch(branch);
        setFormData({
            name: branch.name,
            code: branch.code,
            description: branch.description
        });
        setFormError("");
        setValidationErrors([]);
        setShowModal(true);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData((previousData) => ({
            ...previousData,
            [name]: value
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");
        setValidationErrors([]);
        setActionError("");
        setIsSubmitting(true);
        const details = {
            name: formData.name.trim(),
            code: formData.code.trim().toUpperCase(),
            description: formData.description.trim()
        };

        try {
            if (editingBranch) {
                await updateBranch(editingBranch.id, details);
            } else {
                await createBranch(details);
            }
            setShowModal(false);
            setEditingBranch(null);
            setFormData({ name: "", code: "", description: "" });
            await loadBranches();
        } catch (error) {
            setFormError(error.message);
            setValidationErrors(error.errors || []);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleToggleStatus = async (branch) => {
        setActionError("");
        setBusyBranchId(branch.id);
        try {
            await setBranchStatus(branch.id, !branch.isActive);
            await loadBranches();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusyBranchId("");
        }
    };

    const handleDelete = async (branch) => {
        const confirmDelete = window.confirm(
            `Deactivate "${branch.name}"? Existing subjects and historical references will be kept.`
        );
        if (!confirmDelete) {
            return;
        }

        setActionError("");
        setBusyBranchId(branch.id);
        try {
            await deactivateBranch(branch.id);
            await loadBranches();
        } catch (error) {
            setActionError(error.message);
        } finally {
            setBusyBranchId("");
        }
    };

    const filteredBranches = branches.filter((branch) => {
        const search = searchTerm.toLowerCase();
        return (
            branch.name.toLowerCase().includes(search) ||
            branch.code.toLowerCase().includes(search) ||
            branch.description.toLowerCase().includes(search)
        );
    });

    return (
        <div className="teacher-page">

            <TeacherNavbar active="Branches" />

            {/* =========================
                MAIN CONTENT
            ========================== */}

            <main className="teacher-dashboard">

                {/* Page Heading */}

                <div className="teacher-page-heading">

                    <div>
                        <span className="page-badge">
                            BRANCH MANAGEMENT
                        </span>

                        <h1>Manage Branches</h1>

                        <p>
                            Branches are shared across teachers. Use an existing branch for your subjects and exams;
                            only its creator can edit or deactivate it.
                        </p>
                    </div>

                    <button
                        className="teacher-primary-button"
                        onClick={handleAddBranch}
                        disabled={isLoading}
                    >
                        + Add Branch
                    </button>

                </div>

                {(loadError || actionError) && (
                    <div className="error-message" role="alert">
                        {loadError || actionError}
                    </div>
                )}

                {/* =========================
                    STATISTICS
                ========================== */}

                <div className="teacher-stats-grid">

                    <div className="teacher-stat-card">
                        <div className="stat-icon">
                            🏫
                        </div>

                        <div>
                            <h3>{branches.length}</h3>
                            <p>Total Branches</p>
                        </div>
                    </div>


                    <div className="teacher-stat-card">
                        <div className="stat-icon">
                            ✓
                        </div>

                        <div>
                            <h3>
                                {
                                    branches.filter(
                                        (branch) =>
                                            branch.isActive
                                    ).length
                                }
                            </h3>

                            <p>Active Branches</p>
                        </div>
                    </div>


                    <div className="teacher-stat-card">
                        <div className="stat-icon">
                            ⏸
                        </div>

                        <div>
                            <h3>
                                {
                                    branches.filter(
                                        (branch) =>
                                            !branch.isActive
                                    ).length
                                }
                            </h3>

                            <p>Inactive Branches</p>
                        </div>
                    </div>

                </div>


                {/* =========================
                    SEARCH
                ========================== */}

                <div className="teacher-management-toolbar">

                    <div className="teacher-search-box">

                        <span>🔍</span>

                        <input
                            type="text"
                            placeholder="Search branches..."
                            value={searchTerm}
                            onChange={(e) =>
                                setSearchTerm(e.target.value)
                            }
                        />

                    </div>

                    <div className="branch-count">
                        Showing {filteredBranches.length} of{" "}
                        {branches.length} branches
                    </div>

                </div>


                {/* =========================
                    BRANCH TABLE
                ========================== */}

                <div className="teacher-management-table">

                    <div className="management-table-header">

                        <div>Branch</div>
                        <div>Code</div>
                        <div>Description</div>
                        <div>Status</div>
                        <div>Actions</div>

                    </div>


                    {isLoading ? (
                        <div className="teacher-empty-state" aria-live="polite">
                            Loading branches...
                        </div>
                    ) : filteredBranches.length > 0 ? (

                        filteredBranches.map((branch) => (

                            <div
                                className="management-table-row"
                                key={branch.id}
                            >

                                {/* Branch */}

                                <div className="branch-name-cell">

                                    <div className="branch-icon">
                                        🏫
                                    </div>

                                    <div>
                                        <strong>
                                            {branch.name}
                                        </strong>

                                        <small>
                                            Branch ID:{" "}
                                            {branch.id}
                                        </small>
                                    </div>

                                </div>


                                {/* Code */}

                                <div>
                                    <span className="branch-code">
                                        {branch.code}
                                    </span>
                                </div>


                                {/* Description */}

                                <div className="branch-description">
                                    {branch.description}
                                </div>


                                {/* Status */}

                                <div>

                                    <span
                                        className={
                                            branch.isActive
                                                ? "status-active"
                                                : "status-inactive"
                                        }
                                    >
                                        ● {branch.isActive ? "Active" : "Inactive"}
                                    </span>

                                </div>


                                {/* Actions */}

                                <div className="management-actions">

                                    <button
                                        className="action-edit"
                                        onClick={() =>
                                            handleEditBranch(
                                                branch
                                            )
                                        }
                                        disabled={!branch.canManage}
                                    >
                                        Edit
                                    </button>


                                    <button
                                        className="action-toggle"
                                        onClick={() =>
                                            handleToggleStatus(
                                                branch
                                            )
                                        }
                                        disabled={!branch.canManage || busyBranchId === branch.id}
                                    >
                                        {branch.isActive
                                            ? "Deactivate"
                                            : "Activate"}
                                    </button>


                                    <button
                                        className="action-delete"
                                        onClick={() =>
                                            handleDelete(
                                                branch
                                            )
                                        }
                                        disabled={!branch.canManage || busyBranchId === branch.id || !branch.isActive}
                                    >
                                        Delete
                                    </button>

                                </div>

                            </div>

                        ))

                    ) : (

                        <div className="teacher-empty-state">

                            <div className="empty-icon">
                                🔍
                            </div>

                            <h3>
                                No branches found
                            </h3>

                            <p>
                                Try another search term or
                                add a new branch.
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
                    onClick={() =>
                        setShowModal(false)
                    }
                >

                    <div
                        className="teacher-modal"
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="modal-header">

                            <div>
                                <span className="page-badge">
                                    {editingBranch
                                        ? "EDIT BRANCH"
                                        : "NEW BRANCH"}
                                </span>

                                <h2>
                                    {editingBranch
                                        ? "Edit Branch"
                                        : "Add New Branch"}
                                </h2>
                            </div>

                            <button
                                className="modal-close"
                                onClick={() =>
                                    setShowModal(false)
                                }
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

                        <form
                            onSubmit={handleSubmit}
                            className="branch-form"
                        >

                            {/* Branch Name */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Branch Name
                                </label>

                                <input
                                    type="text"
                                    name="name"
                                    value={formData.name}
                                    onChange={handleChange}
                                    placeholder="Example: Computer Science & Engineering"
                                    required
                                />

                            </div>


                            {/* Branch Code */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Branch Code
                                </label>

                                <input
                                    type="text"
                                    name="code"
                                    value={formData.code}
                                    onChange={handleChange}
                                    placeholder="Example: CSE"
                                    maxLength="10"
                                    required
                                />

                            </div>


                            {/* Description */}

                            <div className="teacher-form-group">

                                <label className="teacher-label">
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={handleChange}
                                    placeholder="Enter branch description..."
                                    rows="4"
                                    required
                                />

                            </div>


                            {/* Buttons */}

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="teacher-secondary-button"
                                    onClick={() =>
                                        setShowModal(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="teacher-primary-button"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting
                                        ? "Saving..."
                                        : editingBranch
                                        ? "Update Branch"
                                        : "Add Branch"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}

        </div>
    );
}

export default TeacherBranches;