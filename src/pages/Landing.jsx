import { Link } from "react-router-dom";
import BrandLogoImage from "../components/BrandLogoImage";
import "../index.css";

function Landing() {
  return (
    <div className="landing-page">

      <header className="main-header">
        <div className="logo">
          <BrandLogoImage />
          <span>SmartExam</span>
        </div>

        <nav className="header-nav">
          <a href="#features">Features</a>
          <a href="#about">About</a>
          <Link to="/student/login" className="nav-login">
            Login
          </Link>
        </nav>
      </header>

      <main>

        <section className="hero-section">

          <div className="hero-content">
            <div className="hero-badge">
              Smart • Secure • Simple
            </div>

            <h1>
              Your Complete
              <span> Online Examination </span>
              Platform
            </h1>

            <p>
              SmartExam provides a modern examination experience for
              students and powerful test management tools for teachers.
            </p>

            <div className="hero-buttons">
              <Link to="/student/register" className="primary-button">
                Join as Student
              </Link>

              <Link to="/teacher/register" className="secondary-button">
                Join as Teacher
              </Link>
            </div>
          </div>

          <div className="hero-card">
            <div className="exam-card-header">
              <span>Your examination workspace</span>
            </div>

            <div className="exam-card-body">
              <h3>Exams created by your teachers</h3>
              <p>Sign in to see published tests for your branch, or create an account to get started.</p>
              <Link to="/student/login" className="branch-button">View student exams</Link>
            </div>
          </div>

        </section>

        <section id="features" className="features-section">

          <div className="section-heading">
            <span>POWERFUL FEATURES</span>
            <h2>Everything you need for online examinations</h2>
            <p>
              SmartExam brings students and teachers together in one
              organized examination platform.
            </p>
          </div>

          <div className="feature-grid">

            <div className="feature-card">
              <div className="feature-icon">📝</div>
              <h3>Online Tests</h3>
              <p>
                Take structured examinations with questions,
                marks and time limits.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">⌨️</div>
              <h3>Typing Exams</h3>
              <p>
                Complete typing questions and have submitted responses evaluated.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>
                Monitor scores, subject performance and
                improvement over multiple attempts.
              </p>
            </div>

            <div className="feature-card">
              <div className="feature-icon">✅</div>
              <h3>Answer Review</h3>
              <p>
                Review submitted answers, marks and explanations after evaluation.
              </p>
            </div>

          </div>

        </section>

        <section id="about" className="role-section">

          <div className="section-heading">
            <span>CHOOSE YOUR ROLE</span>
            <h2>Designed for Students and Teachers</h2>
          </div>

          <div className="role-grid">

            <div className="role-card student-role">
              <div className="role-icon">🎓</div>

              <h3>Student</h3>

              <p>
                Access tests, complete examinations, view results,
                track progress and practice again.
              </p>

              <Link to="/student/login">
                Student Login →
              </Link>
            </div>

            <div className="role-card teacher-role">
              <div className="role-icon">👨‍🏫</div>

              <h3>Teacher</h3>

              <p>
                Create tests, manage questions, monitor students
                and analyze examination results.
              </p>

              <Link to="/teacher/login">
                Teacher Login →
              </Link>
            </div>

          </div>

        </section>

      </main>

      <footer className="main-footer">
        <div className="logo">
          <BrandLogoImage />
          <span>SmartExam</span>
        </div>

        <p>© 2026 SmartExam. Online Examination Platform.</p>
      </footer>

    </div>
  );
}

export default Landing;