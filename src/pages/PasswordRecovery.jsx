import { useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";
import { requestPasswordReset, resetPassword } from "../services/api";

const roleLabels = {
    student: "Student",
    teacher: "Teacher",
    admin: "Administrator"
};

function PasswordRecovery({ isReset = false }) {
    const { role } = useParams();
    const [searchParams] = useSearchParams();
    const roleLabel = roleLabels[role];
    const token = searchParams.get("token") || "";
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [error, setError] = useState(
        isReset && !token ? "This password reset link is invalid or expired." : ""
    );
    const [notice, setNotice] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!roleLabel) {
        return (
            <main className="auth-page">
                <section className="auth-card">
                    <h1>Invalid account type</h1>
                    <Link to="/">Back to Home</Link>
                </section>
            </main>
        );
    }

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");
        setNotice("");

        if (isReset && password !== confirmPassword) {
            setError("The passwords do not match.");
            return;
        }

        setIsSubmitting(true);
        try {
            if (isReset) {
                await resetPassword(role, token, password);
                setNotice("Your password has been updated. You can now sign in.");
            } else {
                await requestPasswordReset(role, email.trim());
                setNotice("If an account exists for that email, a password reset link has been sent.");
            }
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const loginPath = role === "admin" ? "/admin/login" : `/${role}/login`;

    return (
        <main className="auth-page auth-page--login">
            <section className="auth-card auth-card--login" aria-labelledby="password-recovery-title">
                <Link to="/" className="auth-login-brand" aria-label="SmartExam home">
                    <BrandLogoImage />
                    <span>SMARTEXAM</span>
                </Link>
                <h1 id="password-recovery-title">
                    {isReset ? "Choose a new password" : `${roleLabel} forgot password`}
                </h1>
                {error && <div className="error-message" role="alert">{error}</div>}
                {notice && <div className="approval-notice" role="status">{notice}</div>}

                {(!isReset || Boolean(token)) && !(isReset && notice) && (
                    <form onSubmit={handleSubmit}>
                        {!isReset ? (
                            <div className="form-group">
                                <label htmlFor="recovery-email">Email address</label>
                                <input id="recovery-email" type="email" autoComplete="email"
                                    required maxLength={254} value={email}
                                    onChange={(event) => setEmail(event.target.value)} />
                            </div>
                        ) : (
                            <>
                                <div className="form-group">
                                    <label htmlFor="new-password">New password</label>
                                    <input id="new-password" type="password" autoComplete="new-password"
                                        required minLength={8} maxLength={128} value={password}
                                        onChange={(event) => setPassword(event.target.value)} />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="confirm-password">Confirm new password</label>
                                    <input id="confirm-password" type="password" autoComplete="new-password"
                                        required minLength={8} maxLength={128} value={confirmPassword}
                                        onChange={(event) => setConfirmPassword(event.target.value)} />
                                </div>
                            </>
                        )}
                        <button className="auth-button" type="submit" disabled={isSubmitting}>
                            {isSubmitting
                                ? "Please wait..."
                                : isReset ? "Update password" : "Send reset link"}
                        </button>
                    </form>
                )}

                {notice && isReset ? (
                    <Link to={loginPath} className="back-home">Go to {roleLabel} login</Link>
                ) : (
                    <Link to={loginPath} className="back-home">Back to {roleLabel} login</Link>
                )}
            </section>
        </main>
    );
}

export default PasswordRecovery;
