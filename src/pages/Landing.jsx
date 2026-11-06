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
        <h1 className="landing-header-title">Authentication</h1>
      </header>

      <main className="landing-main">
        <section className="landing-hero" aria-labelledby="landing-title">
          <div className="landing-hero-logo" aria-label="SmartExam logo">
            <BrandLogoImage />
          </div>
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
            <Link to="/admin/login" className="landing-role-card">
              <span className="landing-role-icon teacher-icon">
                <TeacherIcon />
              </span>
              <span className="landing-role-copy">
                <strong>College Administrator</strong>
                <span>Review teacher registrations and assign class incharges.</span>
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
