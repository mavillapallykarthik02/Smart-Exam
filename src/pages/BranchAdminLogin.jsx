import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";
import { useAuth } from "../context/useAuth";

function BranchAdminLogin() {
    const navigate = useNavigate();
    const location = useLocation();
    const { login } = useAuth();
    const [identifier, setIdentifier] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        setError("");
        setIsSubmitting(true);
        try {
            await login("branch_admin", { identifier: identifier.trim(), password });
            navigate(location.state?.from?.pathname || "/branch-admin/home", { replace: true });
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <main className="auth-page auth-page--login">
            <section className="auth-card auth-card--login" aria-labelledby="branch-admin-login-title">
                <Link to="/" className="auth-login-brand" aria-label="SmartExam home">
                    <BrandLogoImage /><span>SMARTEXAM</span>
                </Link>
                <h1 id="branch-admin-login-title">Branch Administrator Login</h1>
                {error && <div className="error-message" role="alert">{error}</div>}
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="branch-admin-identifier">Administrator ID / Email</label>
                        <input id="branch-admin-identifier" name="identifier" required autoComplete="username" value={identifier} onChange={(event) => { setIdentifier(event.target.value); setError(""); }} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="branch-admin-password">Password</label>
                        <div className="auth-password-field">
                            <input id="branch-admin-password" name="password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={(event) => { setPassword(event.target.value); setError(""); }} />
                            <button type="button" className="auth-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} onClick={() => setShowPassword((visible) => !visible)}>
                                {showPassword ? "Hide" : "Show"}
                            </button>
                        </div>
                    </div>
                    <button type="submit" className="auth-button" disabled={isSubmitting}>{isSubmitting ? "Signing in..." : "Login"}</button>
                </form>
                <p className="register-text">No account? <Link to="/branch-admin/register">Register</Link></p>
                <p className="back-home"><Link to="/forgot-password/branch_admin">Forgot your password?</Link></p>
                <p className="back-home"><Link to="/">Back to Home</Link></p>
            </section>
        </main>
    );
}

export default BranchAdminLogin;
