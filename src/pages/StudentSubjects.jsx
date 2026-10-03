import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/AuthContext";
import { listStudentBranches } from "../services/branchService";
import { listStudentSubjects } from "../services/subjectService";

function StudentSubjects() {
    const [searchParams] = useSearchParams();
    const { user } = useAuth();
    const requestedBranch = searchParams.get("branch") || user.branchId || "";
    const [branch, setBranch] = useState(null);
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadPageData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            if (requestedBranch && requestedBranch !== user.branchId) {
                throw new Error("Students can only view subjects in their assigned branch.");
            }
            const branches = await listStudentBranches();
            const assignedBranchId = user.branchId || "";
            const selected = branches.find((item) => item.id === assignedBranchId);
            setBranch(selected || null);

            if (!selected) {
                setSubjects([]);
                return;
            }

            setSubjects(await listStudentSubjects(selected.id));
        } catch (requestError) {
            setError(requestError.message);
            setSubjects([]);
        } finally {
            setIsLoading(false);
        }
    }, [requestedBranch, user.branchId]);

    useEffect(() => {
        Promise.resolve().then(loadPageData);
    }, [loadPageData]);

    return (
        <div className="student-page">

            <StudentNavbar />

            <main className="student-content">

                <div className="page-title">

                    <div>
                        <p className="dashboard-label">
                            {branch ? `${branch.code} BRANCH` : "SUBJECTS"}
                        </p>

                        <h1>Subjects</h1>

                        <p>
                            {branch
                                ? "Select a subject to view its available tests."
                                : "View active subjects and tests for your assigned branch."}
                        </p>
                    </div>

                </div>

                {error && <div className="error-message" role="alert">{error}</div>}

                {!branch && !isLoading && !error ? (
                    <div className="teacher-empty-state">
                        <h3>No active branch selected</h3>
                        <p>Choose an active branch to view its subjects.</p>
                        <Link to="/student/branches" className="branch-button">
                            Browse Branches
                        </Link>
                    </div>
                ) : isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">
                        Loading subjects...
                    </div>
                ) : error ? null : (
                    subjects.length === 0 ? (
                        <div className="teacher-empty-state">
                            <h3>No active subjects available</h3>
                            <p>This branch does not have any active subjects yet.</p>
                        </div>
                    ) : (
                        <div className="subject-grid">

                        {subjects.map((subject) => (

                            <div
                                className="subject-card"
                                key={subject.id}
                            >

                                <div className="subject-card-header">

                                    <span className="subject-icon">
                                        📚
                                    </span>

                                    <span className="subject-code">
                                        {subject.code}
                                    </span>

                                </div>

                                <h2>
                                    {subject.name}
                                </h2>

                                <p>
                                    {subject.description}
                                </p>

                                <div className="subject-footer">

                                    <span>
                                        {subject.code}
                                    </span>

                                    <Link
                                        to="/student/tests"
                                    >
                                        View Tests →
                                    </Link>

                                </div>

                            </div>

                        ))}

                        </div>
                    )
                )}

            </main>

        </div>
    );
}

export default StudentSubjects;
