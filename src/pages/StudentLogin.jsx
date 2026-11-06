import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/useAuth";
import BrandLogoImage from "../components/BrandLogoImage";

function StudentLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({ identifier: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.identifier.trim() || !formData.password) {
      setError("Please enter your Polytechnic PIN, username, or email and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await login("student", {
        identifier: formData.identifier.trim(),
        password: formData.password
      });
      navigate(location.state?.from?.pathname || "/student/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="auth-page auth-page--login student-auth-login">
      <section className="auth-card auth-card--login" aria-labelledby="student-login-title">
        <Link to="/" className="auth-login-brand" aria-label="SmartExam home">
          <BrandLogoImage />
          <span>SMARTEXAM</span>
        </Link>

        <h1 id="student-login-title">Student Login</h1>

        {error && <div className="error-message" role="alert">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="student-identifier">Polytechnic PIN / Username / Email</label>
            <input
              id="student-identifier"
              type="text"
              name="identifier"
              autoComplete="username"
              required
              value={formData.identifier}
              onChange={handleChange}
              placeholder="Enter your PIN, username, or email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="student-password">Password</label>
            <div className="auth-password-field">
              <input
                id="student-password"
                type={showPassword ? "text" : "password"}
                name="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter your password"
              />
              <button
                type="button"
                className="auth-password-toggle"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
                onClick={() => setShowPassword((visible) => !visible)}
              >
                {showPassword ? "Hide" : "Show"}
              </button>
            </div>
          </div>

          <button type="submit" className="auth-button" disabled={isSubmitting}>
            {isSubmitting ? "Signing in..." : "Login"}
          </button>
        </form>

        <p className="register-text">
          <Link to="/forgot-password/student">Forgot your password?</Link>
        </p>
        <p className="register-text">
          Don&apos;t have an account? <Link to="/student/register">Register</Link>
        </p>
        <Link to="/" className="back-home">Back to Home</Link>
      </section>
    </main>
  );
}

export default StudentLogin;
