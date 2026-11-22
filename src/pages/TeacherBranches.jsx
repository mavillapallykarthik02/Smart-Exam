import { useCallback, useEffect, useState } from "react";
import TeacherNavbar from "../components/TeacherNavbar";
import { useAuth } from "../context/useAuth";
import {
    listAvailableBranches,
    listBranches,
    requestBranchAccess
} from "../services/branchService";

function TeacherBranches() {
    const { user } = useAuth();
    const [branches, setBranches] = useState([]);
    const [requests, setRequests] = useState([]);
    const [selectedBranchId, setSelectedBranchId] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [busyBranchId, setBusyBranchId] = useState("");
    const [search, setSearch] = useState("");

    const loadBranches = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            const [branchList, teacherBranches] = await Promise.all([
                listAvailableBranches(user?.institution),
                listBranches()
            ]);
            const teacherBranchById = new Map(
                teacherBranches.map((branch) => [branch.id, branch])
            );
            setRequests(teacherBranches
                .filter((branch) => branch.requestStatus)
                .map((branch) => ({
                    status: branch.requestStatus,
                    reason: branch.requestReason,
                    branch: { id: branch.id }
                })));
            setBranches(branchList.map((branch) => ({
                ...branch,
                requestStatus: teacherBranchById.get(branch.id)?.requestStatus || "",
                requestReason: teacherBranchById.get(branch.id)?.requestReason || ""
            })));
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, [user?.institution]);

    useEffect(() => {
        Promise.resolve().then(loadBranches);
    }, [loadBranches]);

    const submitRequest = async (event) => {
        event.preventDefault();
        const branch = branches.find((item) => item.id === selectedBranchId);
        if (!branch) {
            setError("Select an active branch to request access.");
            return;
        }
        setBusyBranchId(branch.id);
        setError("");
        setNotice("");
        try {
            await requestBranchAccess(branch.id);
            setNotice(`Your request to manage ${branch.name} was submitted for Branch Administrator approval.`);
            setSelectedBranchId("");
            await loadBranches();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setBusyBranchId("");
        }
    };

    const requestByBranch = new Map(
        requests.map((request) => [request.branch?.id, request])
    );
    const approvedBranches = branches.filter((branch) =>
        requestByBranch.get(branch.id)?.status === "APPROVED"
    );
    const requestableBranches = branches.filter((branch) => {
        const status = requestByBranch.get(branch.id)?.status;
        return status !== "PENDING" && status !== "APPROVED";
    });
    const filteredApprovedBranches = approvedBranches.filter((branch) => {
        const term = search.trim().toLowerCase();
        return !term ||
            branch.name.toLowerCase().includes(term) ||
            branch.code.toLowerCase().includes(term);
    });

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Branches" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">BRANCH ACCESS</span>
                        <h1>Manage Branches</h1>
                        <p>Request access to branches. The assigned Branch Administrator must approve each request.</p>
                    </div>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}
                {notice && <div className="approval-notice" role="status">{notice}</div>}

                <form className="teacher-management-toolbar" onSubmit={submitRequest}>
                    <label className="teacher-form-group" htmlFor="branch-access-request">
                        Request branch access
                        <select
                            id="branch-access-request"
                            value={selectedBranchId}
                            onChange={(event) => setSelectedBranchId(event.target.value)}
                            disabled={isLoading}
                            required
                        >
                            <option value="">Select an active branch</option>
                            {requestableBranches.map((branch) => {
                                const status = requestByBranch.get(branch.id)?.status;
                                return (
                                    <option
                                        key={branch.id}
                                        value={branch.id}
                                    >
                                        {branch.name} ({branch.code}){status === "REJECTED" ? " — request again" : ""}
                                    </option>
                                );
                            })}
                        </select>
                    </label>
                    <button
                        type="submit"
                        className="teacher-primary-button"
                        disabled={isLoading || !selectedBranchId || busyBranchId === selectedBranchId}
                    >
                        {busyBranchId ? "Submitting..." : "Request access"}
                    </button>
                </form>

                <div className="teacher-management-toolbar">
                    <div className="teacher-search-box">
                        <span>🔍</span>
                        <input
                            type="search"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search branches..."
                            aria-label="Search branches"
                        />
                    </div>
                    <div className="branch-count">
                        {approvedBranches.length} approved branches
                    </div>
                </div>

                {isLoading ? (
                    <div className="teacher-empty-state">Loading branches...</div>
                ) : (
                    <div className="teacher-management-table">
                        <div className="management-table-header" style={{ gridTemplateColumns: "1.4fr 0.7fr 1fr" }}>
                            <div>Branch</div>
                            <div>Code</div>
                            <div>Access</div>
                        </div>
                        {filteredApprovedBranches.map((branch) => {
                            const branchRequest = requestByBranch.get(branch.id);
                            return (
                                <div className="management-table-row" style={{ gridTemplateColumns: "1.4fr 0.7fr 1fr" }} key={branch.id}>
                                    <div><strong>{branch.name}</strong><small>{branch.description || "No description"}</small></div>
                                    <div><span className="branch-code">{branch.code}</span></div>
                                    <div>
                                        <span className="status-active">Approved</span>
                                        <small>{branchRequest?.reviewedAt
                                            ? `Approved ${new Date(branchRequest.reviewedAt).toLocaleDateString()}`
                                            : "Branch management enabled"}</small>
                                    </div>
                                </div>
                            );
                        })}
                        {!filteredApprovedBranches.length && (
                            <div className="teacher-empty-state">
                                <h3>No approved branches yet</h3>
                                <p>Select a branch above and request access. It will appear here after its Branch Administrator approves it.</p>
                            </div>
                        )}
                    </div>
                )}
            </main>
        </div>
    );
}

export default TeacherBranches;
