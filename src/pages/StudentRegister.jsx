import { Link, useNavigate } from "react-router-dom";
import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/useAuth";
import BrandLogoImage from "../components/BrandLogoImage";
import { listAvailableBranches } from "../services/branchService";

const institutionName = "Government Polytechnic, Masab Tank";
const collegeId = "MASB-001";

function StudentRegister() {
  const navigate = useNavigate();
  const { register } = useAuth();

  const [formData, setFormData] = useState({
    studentId: "",
    branchId: "",
    academicBatch: "",
    studyYear: "1",
    semester: "1",
    fullName: "",
    email: "",
    mobile: "",
    username: "",
    password: "",
    confirmPassword: "",
    institution: institutionName
  });
  const [branches, setBranches] = useState([]);
  const [isLoadingBranches, setIsLoadingBranches] = useState(true);
  const [branchLoadError, setBranchLoadError] = useState("");
  const [error, setError] = useState("");
  const [validationErrors, setValidationErrors] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredStudent, setRegisteredStudent] = useState(null);

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
      [formData.studentId, formData.branchId, formData.academicBatch, formData.fullName,
        formData.email, formData.username, formData.institution].some((value) => !String(value).trim()) ||
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
    if (formData.studentId.trim().length < 3) {
      setError("Student ID must be at least 3 characters.");
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
      const student = await register("student", {
        ...details,
        name: formData.fullName.trim(),
        branchId: formData.branchId,
        studyYear: Number(formData.studyYear),
        semester: Number(formData.semester)
      });
      setRegisteredStudent(student);
      setIsRegistered(true);
    } catch (requestError) {
      const field = requestError.errors?.[0]?.field;
      const message = field === "studentId"
        ? "This student ID is already registered."
        : field === "email"
          ? "This email address is already registered."
          : field === "username"
            ? "This username is already taken."
            : field === "branchId"
              ? "Select a valid active branch."
              : requestError.status >= 500 || !requestError.status
                ? "Unable to complete registration. Please try again."
                : requestError.message;
      setError(message);
      setValidationErrors(
        ["studentId", "email", "username", "branchId"].includes(field) ? [] : requestError.errors || []
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-page student-auth-register">

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
        </div>

        <div className="register-card">

          {isRegistered ? (
            <div className="registration-success" role="status">
              <h2>Registration submitted successfully.</h2>
              <p>Your registration is waiting for the class incharge assigned to your selected branch and academic class to verify it. You can sign in after approval.</p>
              {registeredStudent && (
                <div className="registration-enrollment-notice">
                  <strong>Submitted academic details</strong>
                  <p>Branch: {registeredStudent.branch}</p>
                  <p>Course year: {registeredStudent.studyYear}</p>
                  <p>Semester: {registeredStudent.semester}</p>
                  <p>Academic batch: {registeredStudent.academicBatch}</p>
                </div>
              )}
              <button
                type="button"
                className="auth-button"
                onClick={() => navigate("/student/login", { replace: true })}
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
          {branchLoadError && (
            <div className="error-message" role="alert">
              <p>Unable to load the college branches: {branchLoadError}</p>
              <button type="button" className="auth-button" onClick={() => void loadBranches()}
                disabled={isLoadingBranches}>
                {isLoadingBranches ? "Loading branches..." : "Retry loading branches"}
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>

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
                  required
                  value={formData.studentId}
                  onChange={handleChange}
                  placeholder="e.g. 2026-IT-041"
                />
                <small>Enter your official student ID. It is reviewed by the class incharge during approval.</small>
              </div>

              <div className="form-group">
                <label htmlFor="student-college">College</label>
                <input id="student-college" type="text"
                  value={`${institutionName} (${collegeId})`} readOnly />
              </div>

              <div className="form-group">
                <label htmlFor="student-branch">Branch *</label>
                <select
                  id="student-branch"
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  required
                  disabled={isLoadingBranches || branches.length === 0}
                >
                  <option value="">
                    {isLoadingBranches
                      ? "Loading college branches..."
                      : branches.length === 0
                        ? "No active branches available"
                        : "Select your branch"}
                  </option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} ({branch.code})
                    </option>
                  ))}
                </select>
                {!isLoadingBranches && !branchLoadError && branches.length === 0 && (
                  <small>No active branches are configured for {institutionName}. Contact your college administrator.</small>
                )}
                {!isLoadingBranches && branches.length > 0 && (
                  <small>Choose from all active branches registered for {institutionName}.</small>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="student-course-year">Course Year *</label>
                <select
                  id="student-course-year"
                  name="studyYear"
                  value={formData.studyYear}
                  onChange={handleChange}
                  required
                >
                  {[1, 2, 3].map((year) => (
                    <option key={year} value={String(year)}>{year}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="student-semester">Semester *</label>
                <select
                  id="student-semester"
                  name="semester"
                  value={formData.semester}
                  onChange={handleChange}
                  required
                >
                  {[1, 2, 3, 4, 5, 6].map((semester) => (
                    <option key={semester} value={String(semester)}>{semester}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="student-academic-year">Academic Batch *</label>
                <input
                  id="student-academic-year"
                  type="text"
                  name="academicBatch"
                  value={formData.academicBatch}
                  onChange={handleChange}
                  placeholder="2026-2029"
                  required
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
                  minLength={7}
                  maxLength={30}
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
                  pattern="[A-Za-z0-9._\-]+"
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

            <div className="registration-enrollment-notice" role="note">
              <strong>Class incharge approval required</strong>
              <p>After registration, your assigned class incharge will review your account details and approve your login access before you can sign in.</p>
            </div>

            <button
              type="submit"
              className="auth-button"
              disabled={isSubmitting || isLoadingBranches || branches.length === 0}
            >
              {isSubmitting ? "Registering..." : "Register"}
            </button>

          </form>

          <p className="auth-switch">
            Already have an account? <Link to="/student/login">Sign in</Link>
          </p>
            </>
          )}
        </div>

      </div>

    </div>
  );
}

export default StudentRegister;