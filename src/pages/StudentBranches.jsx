import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/AuthContext";
import { listStudentBranches } from "../services/branchService";

function StudentBranches() {
    const { user } = useAuth();
    const [branches, setBranches] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let isMounted = true;

        async function loadBranches() {
            setIsLoading(true);
            setError("");
            try {
                const availableBranches = await listStudentBranches();
                if (isMounted) {
                    setBranches(availableBranches);
                }
            } catch (requestError) {
                if (isMounted) {
                    setError(requestError.message);
                }
            } finally {
                if (isMounted) {
                    setIsLoading(false);
                }
            }
        }

        loadBranches();
        return () => {
            isMounted = false;
        };
    }, []);

    return (
        <div className="student-page">

            <StudentNavbar />

            <main className="student-content">

                <div className="page-title">

                    <div>
                        <p className="dashboard-label">
                            ACADEMIC BRANCHES
                        </p>

                        <h1>Your Academic Branch</h1>

                        <p>
                            Your account is assigned to {user.branch}. Browse
                            active branches below; subjects and examinations
                            are available only for your assigned branch.
                        </p>
                    </div>

                </div>


                {error && <div className="error-message" role="alert">{error}</div>}

                {isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">
                        Loading branches...
                    </div>
                ) : branches.length === 0 ? (
                    <div className="teacher-empty-state">
                        <h3>No active branches available</h3>
                        <p>Please check again later.</p>
                    </div>
                ) : (
                    <div className="branch-grid">
                    {branches.map((branch) => (

                        <div
                            className="branch-card"
                            key={branch.id}
                        >

                            <div className="branch-icon">
                                {branch.icon || "🏫"}
                            </div>

                            <span className="branch-short">
                                {branch.code}
                            </span>

                            <h2>
                                {branch.name}
                            </h2>

                            <p>
                                {branch.description}
                            </p>

                            {branch.id === user.branchId ? (
                                <Link to="/student/subjects" className="branch-button">
                                    View Subjects →
                                </Link>
                            ) : (
                                <p className="branch-button-disabled">Not your assigned branch</p>
                            )}

                        </div>

                    ))}

                    </div>
                )}

            </main>

        </div>
    );
}

export default StudentBranches;