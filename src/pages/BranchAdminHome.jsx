import { useAuth } from "../context/useAuth";
import LogoutButton from "../components/LogoutButton";

function BranchAdminHome() {
    const { user } = useAuth();
    return (
        <main className="teacher-dashboard">
            <header className="teacher-navbar">
                <div><h2>SmartExam</h2><p>Branch Administrator Portal</p></div>
                <LogoutButton role="branch_admin" />
            </header>
            <section className="teacher-dashboard-content">
                <div className="teacher-welcome">
                    <p>Branch Administrator</p>
                    <h1>{user?.name || "Branch Administrator"}</h1>
                </div>
                <article className="teacher-panel">
                    <h2>Branch Information</h2>
                    <p><strong>Institution:</strong> {user?.institution}</p>
                    <p><strong>Branch:</strong> {user?.branch || "Not assigned"}</p>
                    <p><strong>Administrator ID:</strong> {user?.administratorId}</p>
                    <p><strong>Status:</strong> Approved</p>
                </article>
            </section>
        </main>
    );
}

export default BranchAdminHome;
