import { Link, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import BrandLogoImage from "../components/BrandLogoImage";

const institutionName = "Government Polytechnic, Masab Tank";

function TeacherRegister() {
  const navigate = useNavigate();
  const { login, register } = useAuth();

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
    institution: institutionName,
    teacherId: "",
    confirmTeacherId: ""
  });
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState("");

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
    if (isSubmitting) return;

    if (
      [formData.fullName, formData.email, formData.username, formData.institution, formData.teacherId]
        .some((value) => !value.trim()) ||
      !formData.confirmTeacherId.trim() ||
      !formData.password ||
      !formData.confirmPassword
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Password and Confirm Password do not match.");
      return;
    }
    if (formData.teacherId.trim() !== formData.confirmTeacherId.trim()) {
      setError("Create Your ID and Confirm Your ID do not match.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/u.test(formData.teacherId.trim())) {
      setError("Teacher ID must be 3–40 characters using letters, numbers, hyphens or underscores.");
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
    delete details.confirmTeacherId;
    try {
      await register("teacher", {
        ...details,
        name: formData.fullName.trim()
      });
      try {
        await login("teacher", {
          identifier: formData.username.trim(),
          password: formData.password
        });
        navigate("/teacher/dashboard", { replace: true });
      } catch (loginError) {
        setRegistrationNotice(
          `Your account was created, but automatic sign-in failed: ${loginError.message}`
        );
        setIsRegistered(true);
      }
    } catch (requestError) {
      const field = requestError.errors?.[0]?.field;
      const message = field === "teacherId"
        ? "This Teacher ID is already registered."
        : field === "email"
          ? "This email address is already registered."
          : field === "username"
            ? "This username is already taken."
          : requestError.status >= 500 || !requestError.status
            ? "Unable to complete registration. Please try again."
            : requestError.message;
      setError(message);
      setValidationErrors(
        ["teacherId", "email", "username"].includes(field) ? [] : requestError.errors || []
      );
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

        </div>

        <div className="register-card">

          {isRegistered ? (
            <div className="registration-success" role="status">
              <h2>Teacher Registered Successfully!</h2>
              <p>{registrationNotice || "Your teacher account has been created successfully."}</p>
              <button
                type="button"
                className="auth-button"
                onClick={() => navigate("/teacher/login", { replace: true })}
              >
                Go to Login
              </button>
            </div>
          ) : (
            <>
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

          <form onSubmit={handleSubmit} noValidate>

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
                <label>Mobile Number</label>
                <input
                  type="tel"
                  name="mobile"
                  autoComplete="tel"
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter mobile number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="teacher-id">Create Your ID *</label>

                <input
                  id="teacher-id"
                  type="text"
                  name="teacherId"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{2,39}"}
                  value={formData.teacherId}
                  onChange={handleChange}
                  placeholder="Create your Teacher ID"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-teacher-id">Confirm Your ID *</label>
                <input
                  id="confirm-teacher-id"
                  type="text"
                  name="confirmTeacherId"
                  required
                  minLength={3}
                  maxLength={40}
                  pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{2,39}"}
                  value={formData.confirmTeacherId}
                  onChange={handleChange}
                  placeholder="Confirm your Teacher ID"
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
                  pattern="[A-Za-z0-9._\-]+"
                  title="Use 3–32 letters, numbers, dots, underscores or hyphens."
                  required
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose username"
                />
                <small>Use 3–32 letters, numbers, dots, underscores or hyphens.</small>
              </div>

              <div className="form-group">
                <label>Institution</label>
                <input type="text" value={institutionName} readOnly />
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
              {isSubmitting ? "Registering..." : "Register"}
            </button>

          </form>

          <p className="auth-switch">
            Already registered? <Link to="/teacher/login">Sign in</Link>
          </p>
            </>
          )}
        </div>

      </div>

    </div>
  );
}

export default TeacherRegister;