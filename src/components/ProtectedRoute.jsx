import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function ProtectedRoute({ role, children }) {
    const { user, isLoading, authError, refreshUser } = useAuth();
    const location = useLocation();

    if (isLoading) {
        return <main className="auth-status" aria-live="polite">Checking your session...</main>;
    }

    if (authError) {
        return (
            <main className="auth-status" role="alert">
                <p>Unable to verify your session: {authError}</p>
                <button type="button" className="auth-button" onClick={refreshUser}>
                    Try again
                </button>
            </main>
        );
    }

    if (!user) {
        return <Navigate to={`/${role}/login`} replace state={{ from: location }} />;
    }

    if (user.role !== role) {
        return <Navigate
            to={user.role === "admin" ? "/admin/management" : `/${user.role}/dashboard`}
            replace
        />;
    }

    return children;
}

export default ProtectedRoute;
