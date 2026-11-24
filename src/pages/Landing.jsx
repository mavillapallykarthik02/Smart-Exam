import { Link } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";

function StudentIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="m5 17 19-9 19 9-19 9-19-9Z" />
      <path d="M13 21v10c6 5 16 5 22 0V21" />
      <path d="M43 18v12" />
      <circle cx="43" cy="33" r="2" />
    </svg>
  );
}

function TeacherIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <rect x="5" y="7" width="38" height="27" rx="3" />
      <path d="M12 15h13M12 21h9M14 41l10-7 10 7" />
      <circle cx="33" cy="18" r="4" />
      <path d="M27 29c1-4 3-6 6-6s5 2 6 6" />
    </svg>
  );
}

function BranchAdminIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="M7 40h34M11 40V18l13-8 13 8v22" />
      <path d="M18 22h3m8 0h3m-14 8h3m8 0h3m-8 10v-8h4v8" />
    </svg>
  );
}

function CollegeAdminIcon() {
  return (
    <svg viewBox="0 0 48 48" fill="none" aria-hidden="true">
      <path d="m6 18 18-10 18 10H6Z" />
      <path d="M9 22h30M12 22v16m8-16v16m8-16v16m8-16v16M7 42h34" />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function Landing() {
  return (
    <div className="landing-page">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="SmartExam home">
          <BrandLogoImage />
          <span className="landing-brand-copy">
            <strong>SMARTEXAM</strong>
          </span>
        </Link>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <span className="landing-badge">
            <span className="landing-badge-dot" />
            Smart Online Examination
          </span>
          <h1 id="landing-title">Welcome to SmartExam</h1>
          <p>Choose your role to continue to the right login experience.</p>

          <div className="landing-role-list">
            <Link to="/student/login" className="landing-role-card">
              <span className="landing-role-icon student-icon">
                <StudentIcon />
              </span>
              <span className="landing-role-copy">
                <strong>Student</strong>
                <span>
                  Attend online examinations, practice tests, view results and
                  track your progress.
                </span>
              </span>
              <span className="landing-role-arrow">
                <ArrowIcon />
              </span>
            </Link>

            <Link to="/teacher/login" className="landing-role-card">
              <span className="landing-role-icon teacher-icon">
                <TeacherIcon />
              </span>
              <span className="landing-role-copy">
                <strong>Teacher</strong>
                <span>
                  Create tests, manage questions, view student results and
                  monitor performance.
                </span>
              </span>
              <span className="landing-role-arrow">
                <ArrowIcon />
              </span>
            </Link>
            <Link to="/branch-admin/login" className="landing-role-card">
              <span className="landing-role-icon branch-admin-icon">
                <BranchAdminIcon />
              </span>
              <span className="landing-role-copy">
                <strong>Branch Administrator</strong>
                <span>Manage teacher approvals and monitor branch performance.</span>
              </span>
              <span className="landing-role-arrow">
                <ArrowIcon />
              </span>
            </Link>
            <Link to="/admin/login" className="landing-role-card">
              <span className="landing-role-icon college-admin-icon">
                <CollegeAdminIcon />
              </span>
              <span className="landing-role-copy">
                <strong>College Administrator</strong>
                <span>Review Branch Administrator registrations and manage institution performance.</span>
              </span>
              <span className="landing-role-arrow">
                <ArrowIcon />
              </span>
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Landing;
