import { useCallback, useEffect, useState } from "react";
import { Link, useMatch, useNavigate } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";
import LogoutButton from "../components/LogoutButton";
import { useAuth } from "../context/useAuth";
import { useToast } from "../context/useToast";
import {
    createAdminBranch,
    deleteAdminBranch,
    deleteAdminBranchAdministrator,
    listAdminBranchAdministrators,
    listAdminBranches,
    listAdminBranchPerformance,
    setAdminBranchAdministratorStatus,
    setAdminBranchStatus,
    updateAdminBranch
} from "../services/adminService";

const sections = [
    { id: "branches", label: "Branch Creation & Management" },
    { id: "branch-admins", label: "Branch Administrator Management" },
    { id: "account", label: "College Administrator Account" }
];

const COLLEGE_NAME = "Government Polytechnic - 001";
const COLLEGE_LOCATION = "Masab Tank, Hyderabad";

function AdminManagement() {
    const { user, updateProfile } = useAuth();
    const notify = useToast();
    const navigate = useNavigate();
    const branchRoute = useMatch("/admin/management/branches/:branchId");
    const branchId = branchRoute?.params.branchId;
    const [activeSection, setActiveSection] = useState("branches");
    const [branches, setBranches] = useState([]);
    const [administrators, setAdministrators] = useState([]);
    const [performance, setPerformance] = useState([]);
    const [branchDraft, setBranchDraft] = useState({
        name: "",
        code: "",
        description: "",
        isActive: "active"
    });
    const [editingBranchId, setEditingBranchId] = useState("");
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("ALL");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState("");
    const [accountDraft, setAccountDraft] = useState({
        name: "",
        username: "",
        email: "",
        mobile: ""
    });
    const [isEditingAccount, setIsEditingAccount] = useState(false);
    const [isSavingAccount, setIsSavingAccount] = useState(false);
    const selectedBranch = branches.find((branch) => branch.id === branchId);
    const selectedBranchPerformance = performance.find((branch) => branch.id === branchId);

    useEffect(() => {
        setAccountDraft({
            name: user?.name || "",
            username: user?.username || "",
            email: user?.email || "",
            mobile: user?.mobile || ""
        });
    }, [user]);

    const loadData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const [branchList, administratorList, branchPerformance] = await Promise.all([
                listAdminBranches(),
                listAdminBranchAdministrators(),
                listAdminBranchPerformance()
            ]);
            setBranches(branchList);
            setAdministrators(administratorList);
            setPerformance(branchPerformance);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadData);
    }, [loadData]);

    const runAction = async (action, message) => {
        setIsSaving(true);
        setError("");
        try {
            await action();
            notify(message, "success");
            await loadData();
            return true;
        } catch (requestError) {
            setError(requestError.message);
            return false;
        } finally {
            setIsSaving(false);
        }
    };

    const saveAdminAccount = async (event) => {
        event.preventDefault();
        setIsSavingAccount(true);
        setError("");
        try {
            await updateProfile({
                name: accountDraft.name.trim(),
                username: accountDraft.username.trim(),
                email: accountDraft.email.trim(),
                mobile: accountDraft.mobile.trim()
            });
            setIsEditingAccount(false);
            notify("College Administrator account updated successfully.", "success");
        } catch (requestError) {
            const validationMessages = requestError.errors?.map((item) => item.message) || [];
            setError([requestError.message, ...validationMessages].join(" "));
        } finally {
            setIsSavingAccount(false);
        }
    };

    const cancelAdminAccountEdit = () => {
        setAccountDraft({
            name: user?.name || "",
            username: user?.username || "",
            email: user?.email || "",
            mobile: user?.mobile || ""
        });
        setIsEditingAccount(false);
        setError("");
    };

    const handleBranchSubmit = (event) => {
        event.preventDefault();
        if (!branchDraft.name.trim() || !branchDraft.code.trim()) {
            setError("Enter a branch name and branch code.");
            return;
        }
        const details = {
            name: branchDraft.name.trim(),
            code: branchDraft.code.trim().toUpperCase(),
            collegeName: COLLEGE_NAME,
            description: branchDraft.description.trim(),
            location: COLLEGE_LOCATION,
            isActive: branchDraft.isActive === "active"
        };
        void runAction(
            () => editingBranchId
                ? updateAdminBranch(editingBranchId, details)
                : createAdminBranch(details),
            editingBranchId ? "Branch updated successfully." : "Branch created successfully."
        ).then(() => {
            setBranchDraft({
                name: "",
                code: "",
                description: "",
                isActive: "active"
            });
            setEditingBranchId("");
        });
    };

    const editBranch = (branch) => {
        setEditingBranchId(branch.id);
        setBranchDraft({
            name: branch.name || "",
            code: branch.code || "",
            description: branch.description || "",
            isActive: branch.isActive ? "active" : "inactive"
        });
        if (branchId) navigate("/admin/management");
        window.scrollTo({ top: 0, behavior: "smooth" });
    };

    const openBranch = (branch) => {
        navigate(`/admin/management/branches/${encodeURIComponent(branch.id)}`);
    };

    const reviewAdministrator = (administrator, status) => {
        let reason = "";
        if (status === "REJECTED") {
            reason = window.prompt(`Why are you rejecting ${administrator.name}?`)?.trim() || "";
            if (reason.length < 3) {
                setError("Enter a rejection reason with at least 3 characters.");
                return;
            }
        }
        void runAction(
            () => setAdminBranchAdministratorStatus(administrator.id, status, reason),
            `Branch Administrator ${status.toLowerCase()} successfully.`
        );
    };

    const removeAdministrator = async (administrator) => {
        const confirmed = window.confirm(
            `Delete the ${administrator.approvalStatus || "pending"} Branch Administrator "${administrator.name}"?`
        );
        if (!confirmed) return;
        await runAction(
            () => deleteAdminBranchAdministrator(administrator.id),
            "Branch Administrator deleted successfully."
        );
    };

    const removeBranch = async (branch) => {
        const confirmed = window.confirm(
            `Permanently delete "${branch.name}" (${branch.code})? This cannot be undone. Branches with linked users or academic records cannot be deleted.`
        );
        if (!confirmed) return;

        const deleted = await runAction(
            () => deleteAdminBranch(branch.id),
            "Branch permanently deleted."
        );
        if (deleted && editingBranchId === branch.id) {
            setEditingBranchId("");
            setBranchDraft({ name: "", code: "", description: "", isActive: "active" });
        }
        if (deleted && branchId === branch.id) navigate("/admin/management");
    };

    const filteredBranches = branches.filter((branch) => {
        const matchesSearch = `${branch.name} ${branch.code}`.toLowerCase().includes(search.toLowerCase());
        const isBranchActive = branch.isActive && !branch.isArchived;
        const matchesStatus = statusFilter === "ALL" ||
            (statusFilter === "ACTIVE" && isBranchActive) ||
            (statusFilter === "INACTIVE" && !isBranchActive);
        return matchesSearch && matchesStatus;
    });
    const branchPerformanceById = new Map(performance.map((branch) => [branch.id, branch]));

    return (
        <div className="teacher-page admin-dashboard">
            <header className="teacher-navbar admin-navbar">
                <Link to="/" className="teacher-logo">
                    <BrandLogoImage />
                    <div><h2>SmartExam</h2><p>College Administrator</p></div>
                </Link>
                <LogoutButton role="admin" className="teacher-logout" />
            </header>
            <div className="admin-dashboard-layout">
                <nav className="admin-dashboard-nav" aria-label="College Administrator sections">
                    {sections.map((section) => (
                        <button
                            type="button"
                            key={section.id}
                            className={activeSection === section.id ? "active" : ""}
                            onClick={() => setActiveSection(section.id)}
                        >
                            {section.label}
                        </button>
                    ))}
                </nav>

                <main className="admin-dashboard-content">
                    <div className="teacher-page-heading">
                        <div>
                            <span className="page-badge">COLLEGE ADMINISTRATION</span>
                            <h1>{selectedBranch
                                ? `${selectedBranch.name} (${selectedBranch.code})`
                                : sections.find((section) => section.id === activeSection)?.label}</h1>
                        </div>
                    </div>

                    {error && <div className="error-message" role="alert">{error}</div>}

                    {activeSection === "branches" && branchId && (
                        isLoading ? <div className="teacher-empty-state">Loading branch details...</div> :
                            selectedBranch ? (
                                <>
                                    <section className="teacher-panel admin-section">
                                        <div className="branch-detail-toolbar">
                                            <button type="button" onClick={() => navigate("/admin/management")}>
                                                Back to Branch Management
                                            </button>
                                            <div className="management-actions">
                                                <button type="button" onClick={() => editBranch(selectedBranch)}>Edit</button>
                                                <button type="button" disabled={isSaving} onClick={() => void runAction(
                                                    () => setAdminBranchStatus(selectedBranch.id, {
                                                        isActive: !(selectedBranch.isActive && !selectedBranch.isArchived),
                                                        isArchived: false
                                                    }),
                                                    `Branch ${selectedBranch.isActive && !selectedBranch.isArchived ? "deactivated" : "activated"} successfully.`
                                                )}>{selectedBranch.isActive && !selectedBranch.isArchived ? "Deactivate" : "Activate"}</button>
                                                <button type="button" className="danger" disabled={isSaving} onClick={() => void removeBranch(selectedBranch)}>Delete</button>
                                            </div>
                                        </div>
                                        <div className="branch-detail-summary">
                                            <div><small>Branch name</small><strong>{selectedBranch.name}</strong></div>
                                            <div><small>Branch code</small><strong>{selectedBranch.code}</strong></div>
                                            <div><small>College</small><strong>{COLLEGE_NAME}</strong></div>
                                            <div><small>Location</small><strong>{COLLEGE_LOCATION}</strong></div>
                                            <div><small>Status</small><strong>{selectedBranch.isActive && !selectedBranch.isArchived ? "Active" : "Inactive"}</strong></div>
                                            <div><small>Description</small><strong>{selectedBranch.description || "No description"}</strong></div>
                                        </div>
                                    </section>

                                    <section className="teacher-panel admin-section">
                                        <div className="teacher-panel-heading">
                                            <div>
                                                <h2>Academic Performance</h2>
                                                <p>Calculated from finalized, published examination results.</p>
                                            </div>
                                        </div>
                                        <div className="branch-performance-grid">
                                            <div><small>Completed examinations</small><strong>{selectedBranchPerformance?.completedExaminations ?? 0}</strong></div>
                                            <div><small>Average score</small><strong>{selectedBranchPerformance?.averagePercentage ?? 0}%</strong></div>
                                            <div><small>Pass rate</small><strong>{selectedBranchPerformance?.passPercentage ?? 0}%</strong></div>
                                            <div><small>Performance</small><strong>{selectedBranchPerformance?.performance || "No data"}</strong></div>
                                        </div>
                                        <div className="branch-performance-meta">
                                            <div><small>Sector</small><strong>{selectedBranchPerformance?.sector || "Unassigned"}</strong></div>
                                            <div><small>Branch Administrator</small><strong>{selectedBranchPerformance?.branchAdministrator || "Unassigned"}</strong></div>
                                        </div>
                                    </section>
                                </>
                            ) : (
                                <section className="teacher-panel admin-section">
                                    <div className="teacher-empty-state">
                                        <strong>Branch not found.</strong>
                                        <button type="button" onClick={() => navigate("/admin/management")}>Back to Branch Management</button>
                                    </div>
                                </section>
                            )
                    )}

                    {activeSection === "branches" && !branchId && (
                        <>
                            <section className="teacher-panel admin-section">
                                <div className="teacher-panel-heading">
                                    <div><h2>{editingBranchId ? "Edit Branch" : "Create Branch"}</h2></div>
                                </div>
                                <form className="admin-assignment-form" onSubmit={handleBranchSubmit}>
                                    <label>Branch name
                                        <input required value={branchDraft.name} onChange={(event) => setBranchDraft({ ...branchDraft, name: event.target.value })} />
                                    </label>
                                    <label>Branch code
                                        <input required value={branchDraft.code} onChange={(event) => setBranchDraft({ ...branchDraft, code: event.target.value })} />
                                    </label>
                                    <label>College name
                                        <input value={COLLEGE_NAME} readOnly />
                                    </label>
                                    <label>Branch location
                                        <input value={COLLEGE_LOCATION} readOnly />
                                    </label>
                                    <label>Branch description
                                        <input value={branchDraft.description} onChange={(event) => setBranchDraft({ ...branchDraft, description: event.target.value })} />
                                    </label>
                                    <label>Status
                                        <select value={branchDraft.isActive} onChange={(event) => setBranchDraft({ ...branchDraft, isActive: event.target.value })}>
                                            <option value="active">Active</option>
                                            <option value="inactive">Inactive</option>
                                        </select>
                                    </label>
                                    <button className="auth-button" type="submit" disabled={isSaving}>
                                        {editingBranchId ? "Update branch" : "Create branch"}
                                    </button>
                                </form>
                            </section>

                            <section className="teacher-panel admin-section">
                                <div className="teacher-panel-heading"><div><h2>Branch Management</h2></div></div>
                                <div className="admin-assignment-form admin-filter-row">
                                    <label>Search
                                        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Name or code" />
                                    </label>
                                    <label>Status
                                        <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                                            <option value="ALL">All</option><option value="ACTIVE">Active</option>
                                            <option value="INACTIVE">Inactive</option>
                                        </select>
                                    </label>
                                </div>
                                {isLoading ? <div className="teacher-empty-state">Loading branches...</div> : (
                                    <div className="teacher-management-table">
                                        <div className="management-table-header admin-branch-header">
                                            <div>Branch</div><div>College</div><div>Location</div><div>Status</div>
                                            <div>Exams</div><div>Average</div><div>Pass rate</div><div>Actions</div>
                                        </div>
                                        {filteredBranches.map((branch) => {
                                            const stats = branchPerformanceById.get(branch.id);
                                            const isBranchActive = branch.isActive && !branch.isArchived;
                                            return (
                                                <div
                                                    className="management-table-row admin-branch-row admin-branch-row--interactive"
                                                    key={branch.id}
                                                    role="link"
                                                    tabIndex={0}
                                                    aria-label={`View ${branch.name} performance and manage branch`}
                                                    onClick={() => openBranch(branch)}
                                                    onKeyDown={(event) => {
                                                        if (event.currentTarget === event.target &&
                                                            (event.key === "Enter" || event.key === " ")) {
                                                            event.preventDefault();
                                                            openBranch(branch);
                                                        }
                                                    }}
                                                >
                                                    <div><strong>{branch.name}</strong><small>{branch.code}</small></div>
                                                    <div>{COLLEGE_NAME}</div>
                                                    <div>{COLLEGE_LOCATION}</div>
                                                    <div>{isBranchActive ? "Active" : "Inactive"}</div>
                                                    <div><small>Exams</small><strong>{stats?.completedExaminations ?? 0}</strong></div>
                                                    <div><small>Average</small><strong>{stats?.averagePercentage ?? 0}%</strong></div>
                                                    <div><small>Pass rate</small><strong>{stats?.passPercentage ?? 0}%</strong></div>
                                                    <div className="management-actions">
                                                        <button type="button" onClick={(event) => {
                                                            event.stopPropagation();
                                                            editBranch(branch);
                                                        }}>Edit</button>
                                                        <button type="button" disabled={isSaving} onClick={(event) => {
                                                            event.stopPropagation();
                                                            void runAction(
                                                                () => setAdminBranchStatus(branch.id, {
                                                                    isActive: !isBranchActive,
                                                                    isArchived: false
                                                                }),
                                                                `Branch ${isBranchActive ? "deactivated" : "activated"} successfully.`
                                                            );
                                                        }}>{isBranchActive ? "Deactivate" : "Activate"}</button>
                                                        <button type="button" className="danger" disabled={isSaving} onClick={(event) => {
                                                            event.stopPropagation();
                                                            void removeBranch(branch);
                                                        }}>Delete</button>
                                                        <button type="button" className="admin-branch-open" aria-label={`Open ${branch.name}`} onClick={(event) => {
                                                            event.stopPropagation();
                                                            openBranch(branch);
                                                        }}><span aria-hidden="true">→</span></button>
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </section>
                        </>
                    )}

                    {activeSection === "branch-admins" && (
                        <section className="teacher-panel admin-section">
                            <div className="teacher-panel-heading">
                                <div><h2>Branch Administrator Approval and Management</h2></div>
                            </div>
                            {isLoading ? <div className="teacher-empty-state">Loading requests...</div> : (
                                <div className="teacher-management-table">
                                    <div className="management-table-header admin-branch-admin-header">
                                        <div>Administrator</div><div>College</div><div>Branch</div><div>Status</div><div>Actions</div>
                                    </div>
                                    {administrators.map((administrator) => (
                                        <div className="management-table-row admin-branch-admin-row" key={administrator.id}>
                                            <div><strong>{administrator.name}</strong><small>{administrator.administratorId}</small><small>{administrator.email}</small></div>
                                            <div>{administrator.institution}</div>
                                            <div>{administrator.branch?.name || "Unassigned"}<small>{administrator.branch?.code || ""}</small></div>
                                            <div>{administrator.approvalStatus || "PENDING"}<small>{administrator.accountStatus}</small></div>
                                            <div className="management-actions">
                                                {administrator.approvalStatus !== "APPROVED" && (
                                                    <button type="button" disabled={isSaving} onClick={() => reviewAdministrator(administrator, "APPROVED")}>Approve</button>
                                                )}
                                                {administrator.approvalStatus !== "REJECTED" && (
                                                    <button type="button" className="danger" disabled={isSaving} onClick={() => reviewAdministrator(administrator, "REJECTED")}>Reject</button>
                                                )}
                                                {administrator.approvalStatus !== "APPROVED" && (
                                                    <button type="button" className="danger" disabled={isSaving} onClick={() => void removeAdministrator(administrator)}>Delete</button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {activeSection === "account" && (
                        <section className="teacher-panel admin-section">
                            <div className="teacher-panel-heading">
                                <div>
                                    <h2>College Administrator Account</h2>
                                    <p>View and update the profile saved to your administrator account.</p>
                                </div>
                                {!isEditingAccount && (
                                    <button
                                        type="button"
                                        className="teacher-primary-button"
                                        onClick={() => setIsEditingAccount(true)}
                                    >
                                        Edit Account
                                    </button>
                                )}
                            </div>

                            <div className="branch-detail-summary">
                                <div><small>Role</small><strong>College Administrator</strong></div>
                                <div><small>College</small><strong>{user?.institution || COLLEGE_NAME}</strong></div>
                                {user?.administratorId && (
                                    <div><small>Administrator ID</small><strong>{user.administratorId}</strong></div>
                                )}
                                <div><small>Account status</small><strong>{user?.accountStatus || "Active"}</strong></div>
                            </div>

                            <form className="admin-assignment-form" onSubmit={saveAdminAccount}>
                                <div className="form-group">
                                    <label htmlFor="college-admin-name">Full Name</label>
                                    <input
                                        id="college-admin-name"
                                        value={accountDraft.name}
                                        onChange={(event) => setAccountDraft((current) => ({ ...current, name: event.target.value }))}
                                        disabled={!isEditingAccount || isSavingAccount}
                                        required
                                        maxLength={100}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="college-admin-username">Username</label>
                                    <input
                                        id="college-admin-username"
                                        value={accountDraft.username}
                                        onChange={(event) => setAccountDraft((current) => ({ ...current, username: event.target.value }))}
                                        disabled={!isEditingAccount || isSavingAccount}
                                        required
                                        minLength={3}
                                        maxLength={32}
                                        pattern="[A-Za-z0-9._\-]+"
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="college-admin-email">Email</label>
                                    <input
                                        id="college-admin-email"
                                        type="email"
                                        value={accountDraft.email}
                                        onChange={(event) => setAccountDraft((current) => ({ ...current, email: event.target.value }))}
                                        disabled={!isEditingAccount || isSavingAccount}
                                        required
                                        maxLength={254}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="college-admin-mobile">Mobile</label>
                                    <input
                                        id="college-admin-mobile"
                                        type="tel"
                                        value={accountDraft.mobile}
                                        onChange={(event) => setAccountDraft((current) => ({ ...current, mobile: event.target.value }))}
                                        disabled={!isEditingAccount || isSavingAccount}
                                        maxLength={30}
                                    />
                                </div>
                                {isEditingAccount && (
                                    <div className="modal-actions">
                                        <button type="button" onClick={cancelAdminAccountEdit} disabled={isSavingAccount}>
                                            Cancel
                                        </button>
                                        <button type="submit" className="teacher-primary-button" disabled={isSavingAccount}>
                                            {isSavingAccount ? "Saving..." : "Save Changes"}
                                        </button>
                                    </div>
                                )}
                            </form>
                        </section>
                    )}

                </main>
            </div>
        </div>
    );
}

export default AdminManagement;
