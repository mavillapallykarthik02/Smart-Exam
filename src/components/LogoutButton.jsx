import { useState } from "react";
import { useAuth } from "../context/useAuth";

function LogoutButton({ className }) {
    const { logout } = useAuth();
    const [error, setError] = useState("");
    const [isLoggingOut, setIsLoggingOut] = useState(false);

    const handleLogout = async () => {
        if (isLoggingOut) return;
        setError("");
        setIsLoggingOut(true);
        try {
            await logout();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoggingOut(false);
            window.location.replace("/");
        }
    };

    return (
        <>
            <button
                type="button"
                className={className}
                onClick={handleLogout}
                disabled={isLoggingOut}
                aria-label="Log out"
            >
                {isLoggingOut ? "Logging out..." : "Logout"}
            </button>
            {error && <span className="logout-error" role="alert">{error}</span>}
        </>
    );
}

export default LogoutButton;
