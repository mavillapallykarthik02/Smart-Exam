import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";
import BrandLogoImage from "../components/BrandLogoImage";

function AdminLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        setError("");
        setIsSubmitting(true);
        try {
            await login("admin", { identifier: identifier.trim(), password });
            navigate(location.state?.from?.pathname || "/admin/management", { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-page auth-page--login">
            <section className="auth-card auth-card--login" aria-labelledby="admin-login-title">
                <Link to="/" className="auth-login-brand" aria-label="SmartExam home">
                    <BrandLogoImage />
                    <span>SMARTEXAM</span>
                </Link>
                <h1 id="admin-login-title">Administrator Login</h1>
                <p>Access staff verification and class-incharge management.</p>
                {error && <div className="error-message" role="alert">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="admin-identifier">Username or email</label>
                        <input id="admin-identifier" autoComplete="username" required
                            value={identifier} onChange={(event) => setIdentifier(event.target.value)} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="admin-password">Password</label>
                        <input id="admin-password" type="password" autoComplete="current-password"
                            required value={password}
                            onChange={(event) => setPassword(event.target.value)} />
                    </div>
                    <button className="auth-button" type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Signing in..." : "Sign in"}
                    </button>
                </form>
                <p className="register-text">
                    <Link to="/forgot-password/admin">Forgot your password?</Link>
                </p>
                <Link to="/" className="back-home">Back home</Link>
            </section>
        </main>
    );
}

export default AdminLogin;
