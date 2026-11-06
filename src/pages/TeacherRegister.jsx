import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import BrandLogoImage from "../components/BrandLogoImage";
import { listAvailableBranches } from "../services/branchService";

const institutionName = "Government Polytechnic, Masab Tank";
const collegeId = "MASB-001";

function TeacherRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [branchLoadError, setBranchLoadError] = useState("");
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
    institution: institutionName,
    departmentName: "",
    branchId: "",
    designation: "",
    teacherId: "",
    confirmTeacherId: ""
  });
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registrationNotice, setRegistrationNotice] = useState("");

  const loadBranches = useCallback(async () => {
    setIsLoadingBranches(true);
    setBranchLoadError("");
    try {
      const availableBranches = await listAvailableBranches(institutionName);
      setBranches(availableBranches);
      setFormData((current) => ({
        ...current,
        branchId: availableBranches.some((branch) => branch.id === current.branchId)
          ? current.branchId
          : ""
      }));
    } catch (requestError) {
      setBranches([]);
      setBranchLoadError(requestError.message);
    } finally {
      setIsLoadingBranches(false);
    }
  }, []);

  useEffect(() => {
    Promise.resolve().then(loadBranches);
  }, [loadBranches]);

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
      [formData.fullName, formData.email, formData.mobile, formData.username,
        formData.departmentName, formData.branchId, formData.designation, formData.teacherId]
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
    const normalizedTeacherId = formData.teacherId.trim().toUpperCase();
    const normalizedConfirmTeacherId = formData.confirmTeacherId.trim().toUpperCase();
    if (normalizedTeacherId !== normalizedConfirmTeacherId) {
      setError("Create Your ID and Confirm Your ID do not match.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{2,39}$/u.test(normalizedTeacherId)) {
      setError("Teacher ID must be 3–40 characters using letters, numbers, hyphens or underscores.");
      return;
    }
    if (formData.username.trim().length < 3) {
      setError("Username must be at least 3 characters.");
      return;
    }
    if (formData.mobile.trim().length < 7) {
      setError("Enter a valid mobile number.");
      return;
    }

    setError("");
    setIsSubmitting(true);
    const details = { ...formData };
    delete details.fullName;
    delete details.confirmPassword;
    details.branchName = branches.find((branch) => branch.id === formData.branchId)?.name || "";
    try {
      await register("teacher", {
        ...details,
        teacherId: normalizedTeacherId,
        confirmTeacherId: normalizedConfirmTeacherId,
        name: formData.fullName.trim()
      });
      setRegistrationNotice("Your registration is waiting for administrator verification. You can sign in after it is approved.");
      setIsRegistered(true);
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
              <h2>Registration submitted successfully.</h2>
              <p>{registrationNotice}</p>
              <button
                type="button"
                className="auth-button"
                onClick={() => navigate("/teacher/login", { replace: true })}
              >
                Return to Login
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
                <label>Mobile Number *</label>
                <input
                  type="tel"
                  name="mobile"
                  autoComplete="tel"
                  required
                  value={formData.mobile}
                  onChange={handleChange}
                  placeholder="Enter verified contact number"
                />
              </div>

              <div className="form-group">
                <label htmlFor="teacher-id">Employee ID *</label>

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
                  placeholder="Enter your college Employee ID"
                />
              </div>

              <div className="form-group">
                <label htmlFor="confirm-teacher-id">Confirm Employee ID *</label>
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
                  placeholder="Confirm your Employee ID"
                />
              </div>
              <div className="form-group">
                <label htmlFor="teacher-department">Department *</label>
                <input
                  id="teacher-department"
                  type="text"
                  name="departmentName"
                  required
                  maxLength={120}
                  value={formData.departmentName}
                  onChange={handleChange}
                  placeholder="Enter department"
                />
              </div>
              <div className="form-group">
                <label htmlFor="teacher-branch">Branch *</label>
                <select
                  id="teacher-branch"
                  name="branchId"
                  required
                  value={formData.branchId}
                  onChange={handleChange}
                  disabled={isLoadingBranches || branches.length === 0}
                >
                  <option value="">
                    {isLoadingBranches
                      ? "Loading available branches..."
                      : branches.length
                        ? "Select your branch"
                        : "No active branches available"}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                {branchLoadError ? (
                  <small role="alert">
                    Unable to load branches: {branchLoadError}{" "}
                    <button type="button" onClick={() => void loadBranches()}
                      disabled={isLoadingBranches}>
                      {isLoadingBranches ? "Loading..." : "Retry"}
                    </button>
                  </small>
                ) : (
                  <small>Only active branches configured by the administrator are listed.</small>
                )}
              </div>
              <div className="form-group">
                <label htmlFor="teacher-designation">Designation *</label>
                <select
                  id="teacher-designation"
                  name="designation"
                  required
                  value={formData.designation}
                  onChange={handleChange}
                >
                  <option value="">Select designation</option>
                  <option value="Lecturer">Lecturer</option>
                  <option value="Class Teacher">Class Teacher</option>
                  <option value="HOD">HOD</option>
                  <option value="Guest Teacher">Guest Teacher</option>
                </select>
                <small>This is your designation; the administrator controls staff permissions and class assignments.</small>
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
                <label>College</label>
                <input type="text" value={`${institutionName} (${collegeId})`} readOnly />
              </div>

              <div className="registration-enrollment-notice" role="note">
                <strong>Verification required</strong>
                <p>Your Employee ID and college affiliation will be reviewed by an administrator. Examination-management access is enabled only after approval. Staff roles are assigned by the administrator.</p>
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