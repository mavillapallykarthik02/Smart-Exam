import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";
import LogoutButton from "../components/LogoutButton";
import {
    createAdminBranch,
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
    { id: "performance", label: "Branch Academic Performance" }
];

const COLLEGE_NAME = "Government Polytechnic - 001";
const COLLEGE_LOCATION = "Masab Tank, Hyderabad";

function AdminManagement() {
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
    const [notice, setNotice] = useState("");

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
        setNotice("");
        try {
            await action();
            setNotice(message);
            await loadData();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSaving(false);
        }
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
        window.scrollTo({ top: 0, behavior: "smooth" });
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

    const filteredBranches = branches.filter((branch) => {
        const matchesSearch = `${branch.name} ${branch.code}`.toLowerCase().includes(search.toLowerCase());
        const matchesStatus = statusFilter === "ALL" ||
            (statusFilter === "ACTIVE" && branch.isActive && !branch.isArchived) ||
            (statusFilter === "INACTIVE" && !branch.isActive) ||
            (statusFilter === "ARCHIVED" && branch.isArchived);
        return matchesSearch && matchesStatus;
    });

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
                            <h1>{sections.find((section) => section.id === activeSection)?.label}</h1>
                        </div>
                    </div>

                    {error && <div className="error-message" role="alert">{error}</div>}
                    {notice && <div className="approval-notice" role="status">{notice}</div>}

                    {activeSection === "branches" && (
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
                                            <option value="INACTIVE">Inactive</option><option value="ARCHIVED">Archived</option>
                                        </select>
                                    </label>
                                </div>
                                {isLoading ? <div className="teacher-empty-state">Loading branches...</div> : (
                                    <div className="teacher-management-table">
                                        <div className="management-table-header admin-branch-header">
                                            <div>Branch</div><div>College</div><div>Location</div><div>Status</div><div>Actions</div>
                                        </div>
                                        {filteredBranches.map((branch) => (
                                            <div className="management-table-row admin-branch-row" key={branch.id}>
                                                <div><strong>{branch.name}</strong><small>{branch.code}</small></div>
                                                <div>{COLLEGE_NAME}</div>
                                                <div>{COLLEGE_LOCATION}</div>
                                                <div>{branch.isArchived ? "Archived" : branch.isActive ? "Active" : "Inactive"}</div>
                                                <div className="management-actions">
                                                    <button type="button" onClick={() => editBranch(branch)}>Edit</button>
                                                    <button type="button" onClick={() => void runAction(
                                                        () => setAdminBranchStatus(branch.id, { isActive: !branch.isActive }),
                                                        `Branch ${branch.isActive ? "deactivated" : "activated"} successfully.`
                                                    )}>{branch.isActive ? "Deactivate" : "Activate"}</button>
                                                    <button type="button" className="danger" onClick={() => void runAction(
                                                        () => setAdminBranchStatus(branch.id, { isArchived: !branch.isArchived }),
                                                        `Branch ${branch.isArchived ? "restored" : "archived"} successfully.`
                                                    )}>{branch.isArchived ? "Restore" : "Archive"}</button>
                                                </div>
                                            </div>
                                        ))}
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
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}

                    {activeSection === "performance" && (
                        <section className="teacher-panel admin-section">
                            <div className="teacher-panel-heading">
                                <div><h2>Branch Academic Performance</h2><p>Data is calculated from finalized published examination results.</p></div>
                            </div>
                            {isLoading ? <div className="teacher-empty-state">Loading performance...</div> : (
                                <div className="teacher-management-table">
                                    <div className="management-table-header admin-performance-header">
                                        <div>Branch</div><div>Sector</div><div>Administrator</div><div>Examinations</div><div>Average</div><div>Pass</div><div>Status</div>
                                    </div>
                                    {performance.map((branch) => (
                                        <div className="management-table-row admin-performance-row" key={branch.id}>
                                            <div><strong>{branch.name}</strong><small>{branch.code}</small></div>
                                            <div>{branch.sector}</div>
                                            <div>{branch.branchAdministrator}</div>
                                            <div>{branch.completedExaminations}</div>
                                            <div>{branch.averagePercentage}%</div>
                                            <div>{branch.passPercentage}%</div>
                                            <div>{branch.performance}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </section>
                    )}
                </main>
            </div>
        </div>
    );
}

export default AdminManagement;
