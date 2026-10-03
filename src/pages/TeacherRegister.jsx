import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import BrandLogoImage from "../components/BrandLogoImage";

function TeacherRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
    institution: "",
    teacherId: ""
  });
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    setFormData({
      ...formData,
      [event.target.name]: event.target.value
    });

    setError("");
    setValidationErrors([]);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (
      !formData.fullName ||
      !formData.email ||
      !formData.mobile ||
      !formData.username ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.institution ||
      !formData.teacherId
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (formData.username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const details = { ...formData };
    delete details.fullName;
    delete details.confirmPassword;
    try {
      await register("teacher", {
        ...details,
        name: formData.fullName.trim()
      });
      navigate("/teacher/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setValidationErrors(requestError.errors || []);
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

      <div className="register-container">

        <div className="register-heading">

          <span className="auth-badge">
            TEACHER REGISTRATION
          </span>

          <h1>
            Create your teacher account
          </h1>

          <p>
            Join SmartExam to create examinations and manage
            student performance.
          </p>

        </div>

        <div className="register-card">

          {error && (
            <div className="error-message" role="alert">
              {error}
              {validationErrors.length > 0 && (
                <ul>
                  {validationErrors.map((item, index) => (
                    <li key={`${item.field}-${index}`}>{item.message}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit}>

            <div className="form-section-title">
              Personal Information
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Full Name *</label>

                <input
                  type="text"
                  name="fullName"
                  autoComplete="name"
                  required
                  value={formData.fullName}
                  onChange={handleChange}
                  placeholder="Enter full name"
                />
              </div>

              <div className="form-group">
                <label>Email *</label>

                <input
                  type="email"
                  name="email"
                  autoComplete="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter email address"
                />
              </div>

              <div className="form-group">
                <label>Mobile Number *</label>

                <input
                  type="tel"
                  name="mobile"
                  autoComplete="tel"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                />
              </div>

              <div className="form-group">
                <label>Teacher ID *</label>

                <input
                  type="text"
                  name="teacherId"
                  required
                  value={formData.teacherId}
                  onChange={handleChange}
                  placeholder="Enter teacher ID"
                />
              </div>

            </div>

            <div className="form-section-title">
              Account Details
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Username *</label>

                <input
                  type="text"
                  name="username"
                  autoComplete="username"
                  minLength={3}
                  maxLength={32}
                  pattern="[A-Za-z0-9._-]+"
                  title="Use 3–32 letters, numbers, dots, underscores or hyphens."
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose username"
                />
                <small>Use 3–32 letters, numbers, dots, underscores or hyphens.</small>
              </div>

              <div className="form-group">
                <label>Institution *</label>

                <input
                  type="text"
                  name="institution"
                  autoComplete="organization"
                  required
                  value={formData.institution}
                  onChange={handleChange}
                  placeholder="College / Institution"
                />
              </div>

              <div className="form-group">
                <label>Password *</label>

                <input
                  type="password"
                  name="password"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  placeholder="Create password"
                />
              </div>

              <div className="form-group">
                <label>Confirm Password *</label>

                <input
                  type="password"
                  name="confirmPassword"
                  autoComplete="new-password"
                  minLength={8}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  placeholder="Confirm password"
                />
              </div>

            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Creating account..." : "Create Teacher Account"}
            </button>

          </form>

          <p className="auth-switch">
            Already registered?

            <Link to="/teacher/login">
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default TeacherRegister;