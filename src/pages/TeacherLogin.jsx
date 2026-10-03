import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import BrandLogoImage from "../components/BrandLogoImage";

function TeacherLogin() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [formData, setFormData] = useState({
    username: "",
    password: ""
  });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });

    setError("");
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!formData.username || !formData.password) {
      setError("Please enter your username and password.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    try {
      await login("teacher", {
        identifier: formData.username.trim(),
        password: formData.password
      });
      navigate(location.state?.from?.pathname || "/teacher/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page teacher-auth">

      <div className="auth-brand">
        <Link to="/" className="logo">
          <BrandLogoImage />
          <span>SmartExam</span>
        </Link>
      </div>

      <div className="auth-container">

        <div className="auth-info">

          <span className="auth-badge">
            TEACHER PORTAL
          </span>

          <h1>
            Manage your
            <br />
            <span>examinations.</span>
          </h1>

          <p>
            Create tests, manage questions, monitor students
            and analyze examination performance.
          </p>

          <div className="auth-benefits">
            <div>✓ Create and manage examinations</div>
            <div>✓ Manage branches and subjects</div>
            <div>✓ View student answers and results</div>
            <div>✓ Analyze student performance</div>
          </div>

        </div>

        <div className="auth-card">

          <h2>Teacher Login</h2>

          <p className="auth-subtitle">
            Sign in to your teacher dashboard.
          </p>

          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="form-group">
              <label>Username or Email</label>

              <input
                type="text"
                name="username"
                autoComplete="username"
                required
                value={formData.username}
                onChange={handleChange}
                placeholder="Enter username or email"
              />
            </div>

            <div className="form-group">
              <label>Password</label>

              <input
                type="password"
                name="password"
                autoComplete="current-password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="Enter password"
              />
            </div>

            <div className="form-options">

              <label className="remember-option">
                <input type="checkbox" />
                Remember me
              </label>

              <button
                type="button"
                className="forgot-button"
              >
                Forgot password?
              </button>

            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Signing in..." : "Sign In"}
            </button>

          </form>

          <div className="auth-divider">
            <span>OR</span>
          </div>

          <p className="register-text">
            New teacher?

            <Link to="/teacher/register">
              Create Teacher Account
            </Link>
          </p>

          <Link to="/" className="back-home">
            ← Back to SmartExam
          </Link>

        </div>

      </div>

    </div>
  );
}

export default TeacherLogin;