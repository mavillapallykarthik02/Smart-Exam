import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function LogoutButton({ role, className }) {
    const navigate = useNavigate();
    const { logout } = useAuth();
    const [error, setError] = useState("");

    const handleLogout = async () => {
        setError("");
        try {
            await logout();
            navigate(`/${role}/login`, { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        }
    };

    return (
        <>
            <button
                type="button"
                className={className}
                onClick={handleLogout}
                aria-label="Log out"
            >
                Logout
            </button>
            {error && <span className="logout-error" role="alert">{error}</span>}
        </>
    );
}

export default LogoutButton;
