import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { listAvailableBranches } from "../services/branchService";
import BrandLogoImage from "../components/BrandLogoImage";

function StudentRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    studentId: "",
    fullName: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
    branch: "",
    institution: "",
    year: ""
  });
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [branchLoadError, setBranchLoadError] = useState("");

  const loadBranches = useCallback(async () => {
    setIsLoadingBranches(true);
    setBranchLoadError("");
    try {
      setBranches(await listAvailableBranches());
    } catch (requestError) {
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

    if (
      !formData.studentId ||
      !formData.fullName ||
      !formData.email ||
      !formData.mobile ||
      !formData.username ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.branch ||
      !formData.institution ||
      !formData.year
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9-]{2,29}$/u.test(formData.studentId.trim())) {
      setError("Student ID must be 3–30 letters, numbers, or hyphens and start with a letter or number.");
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
      await register("student", {
        ...details,
        name: formData.fullName.trim()
      });
      navigate("/student/dashboard", { replace: true });
    } catch (requestError) {
      setError(requestError.message);
      setValidationErrors(requestError.errors || []);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page">

      <div className="auth-brand">
        <Link to="/" className="logo">
          <BrandLogoImage />
          <span>SmartExam</span>
        </Link>
      </div>

      <div className="register-container">

        <div className="register-heading">
          <span className="auth-badge">STUDENT REGISTRATION</span>

          <h1>Create your SmartExam account</h1>

          <p>
            Register as a student to access examinations,
            results and personalized progress tracking.
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
                <label htmlFor="student-id">Student ID *</label>
                <input
                  id="student-id"
                  type="text"
                  name="studentId"
                  autoComplete="off"
                  minLength={3}
                  maxLength={30}
                  pattern="[A-Za-z0-9][A-Za-z0-9-]{2,29}"
                  title="Use 3–30 letters, numbers, or hyphens; start with a letter or number."
                  required
                  value={formData.studentId}
                  onChange={handleChange}
                  placeholder="e.g. CSE2026001"
                />
              </div>

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

            </div>

            <div className="form-section-title">
              Account Security
            </div>

            <div className="form-grid">

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

            <div className="form-section-title">
              Academic Information
            </div>

            <div className="form-grid">

              <div className="form-group">
                <label>Branch *</label>

                <select
                  name="branch"
                  required
                  value={formData.branch}
                  onChange={handleChange}
                  disabled={isLoadingBranches || Boolean(branchLoadError) || branches.length === 0}
                >
                  <option value="">
                    {isLoadingBranches ? "Loading branches..." : "Select Branch"}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                {branchLoadError && (
                  <small className="error-message" role="alert">{branchLoadError}</small>
                )}
                {!isLoadingBranches && !branchLoadError && branches.length === 0 && (
                  <div className="branch-empty-notice" role="status">
                    <p>No active branches are set up yet. A teacher must create and activate a branch before students can register.</p>
                    <Link to="/teacher/login">Teacher sign in</Link>
                    <Link to="/teacher/register">Teacher registration</Link>
                    <button type="button" onClick={loadBranches}>Refresh branches</button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Year / Semester *</label>

                <select
                  name="year"
                  required
                  value={formData.year}
                  onChange={handleChange}
                >
                  <option value="">Select Year</option>
                  <option value="1-1">1st Year - 1st Semester</option>
                  <option value="1-2">1st Year - 2nd Semester</option>
                  <option value="2-1">2nd Year - 1st Semester</option>
                  <option value="2-2">2nd Year - 2nd Semester</option>
                  <option value="3-1">3rd Year - 1st Semester</option>
                  <option value="3-2">3rd Year - 2nd Semester</option>
                  <option value="4-1">4th Year - 1st Semester</option>
                  <option value="4-2">4th Year - 2nd Semester</option>
                </select>
              </div>

              <div className="form-group form-full">
                <label>College / Institution *</label>

                <input
                  type="text"
                  name="institution"
                  autoComplete="organization"
                  required
                  value={formData.institution}
                  onChange={handleChange}
                  placeholder="Enter college or institution"
                />
              </div>

            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={isSubmitting || isLoadingBranches || Boolean(branchLoadError) || branches.length === 0}
            >
              {isSubmitting ? "Creating account..." : "Create Student Account"}
            </button>

          </form>

          <p className="auth-switch">
            Already have an account?

            <Link to="/student/login">
              Sign in
            </Link>
          </p>

        </div>

      </div>

    </div>
  );
}

export default StudentRegister;