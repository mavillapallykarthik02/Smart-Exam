import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import TeacherNavbar from "../components/TeacherNavbar";
import { getTeacherDashboard } from "../services/teacherService";

function TeacherDashboard() {
    const { user: teacher } = useAuth();

    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [resourceError, setResourceError] = useState("");


    /* =====================================================
       LOAD DASHBOARD COUNTS
    ===================================================== */

    const updateCounts = useCallback(async () => {
        setResourceError("");
        setIsLoading(true);
        setDashboard(null);
        try {
            setDashboard(await getTeacherDashboard());
        } catch (error) {
            setResourceError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(updateCounts);
    }, [updateCounts]);


    return (

        <div className="teacher-page">

            <TeacherNavbar active="Dashboard" />

            {/* =================================================
                MAIN DASHBOARD
            ================================================= */}

            <main className="teacher-dashboard">

                {resourceError && (
                    <div className="error-message" role="alert">
                        <p>Unable to load dashboard statistics: {resourceError}</p>
                        <button type="button" onClick={updateCounts}>Retry</button>
                    </div>
                )}
                {isLoading && <div className="teacher-empty-state" aria-live="polite">
                    Loading dashboard statistics...
                </div>}


                {/* =================================================
                    WELCOME SECTION
                ================================================= */}

                <section className="teacher-welcome">

                    <div>

                        <span className="page-badge">
                            TEACHER DASHBOARD
                        </span>

                        <h1>
                            Welcome,{" "}
                            {teacher.name}
                        </h1>

                        <p>
                            Manage your assigned classes,
                            examinations, branches,
                            subjects and results
                            from one place.
                        </p>

                    </div>


                    <div className="teacher-welcome-info">

                        <div className="teacher-avatar">
                            {(
                                teacher.name ||
                                "T"
                            )
                                .charAt(0)
                                .toUpperCase()}
                        </div>

                        <div>

                            <strong>
                                {teacher.name}
                            </strong>

                            <span>
                                {teacher.institution}
                            </span>

                            <small>
                                ID:{" "}
                                {teacher.teacherId}
                            </small>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    STATISTICS
                ================================================= */}

                <section className="teacher-stats-grid">


                    {/* STUDENTS */}

                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            👨‍🎓
                        </div>

                        <div>

                            <h3>
                                {dashboard?.students.total ?? "—"}
                            </h3>

                            <p>
                                Managed Students
                            </p>

                        </div>

                    </div>


                    {/* TESTS */}

                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            📝
                        </div>

                        <div>

                            <h3>
                                {dashboard?.tests.total ?? "—"}
                            </h3>

                            <p>
                                Total Tests
                            </p>

                        </div>

                    </div>


                    {/* BRANCHES */}

                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            🏫
                        </div>

                        <div>

                            <h3>
                                {dashboard?.branches ?? "—"}
                            </h3>

                            <p>
                                Branches
                            </p>

                        </div>

                    </div>


                    {/* SUBJECTS */}

                    <div className="teacher-stat-card">

                        <div className="stat-icon">
                            📚
                        </div>

                        <div>

                            <h3>
                                {dashboard?.subjects ?? "—"}
                            </h3>

                            <p>
                                Subjects
                            </p>

                        </div>

                    </div>

                </section>


                {/* =================================================
                    QUICK ACTIONS
                ================================================= */}

                <section className="teacher-section">

                    <div className="teacher-section-heading">

                        <div>

                            <span className="page-badge">
                                QUICK ACTIONS
                            </span>

                            <h2>
                                Examination Management
                            </h2>

                            <p>
                                Quickly access the most
                                frequently used teacher
                                functions.
                            </p>

                        </div>

                    </div>


                    <div className="teacher-quick-actions">


                        {/* CREATE TEST */}

                        <Link
                            to="/teacher/tests"
                            className="teacher-action-card"
                        >

                            <div className="action-card-icon">
                                📝
                            </div>

                            <div>

                                <h3>
                                    Create Test
                                </h3>

                                <p>
                                    Create and publish
                                    examination tests.
                                </p>

                            </div>

                            <span className="action-arrow">
                                →
                            </span>

                        </Link>


                        {/* STUDENTS */}

                        <Link
                            to="/teacher/students"
                            className="teacher-action-card"
                        >

                            <div className="action-card-icon">
                                👨‍🎓
                            </div>

                            <div>

                                <h3>
                                    View Students
                                </h3>

                                <p>
                                    View and manage
                                    registered students.
                                </p>

                            </div>

                            <span className="action-arrow">
                                →
                            </span>

                        </Link>


                        {/* BRANCHES */}

                        <Link
                            to="/teacher/branches"
                            className="teacher-action-card"
                        >

                            <div className="action-card-icon">
                                🏫
                            </div>

                            <div>

                                <h3>
                                    Manage Branches
                                </h3>

                                <p>
                                    Add and manage academic
                                    branches.
                                </p>

                            </div>

                            <span className="action-arrow">
                                →
                            </span>

                        </Link>


                        {/* SUBJECTS */}

                        <Link
                            to="/teacher/subjects"
                            className="teacher-action-card"
                        >

                            <div className="action-card-icon">
                                📚
                            </div>

                            <div>

                                <h3>
                                    Manage Subjects
                                </h3>

                                <p>
                                    Assign subjects to
                                    branches.
                                </p>

                            </div>

                            <span className="action-arrow">
                                →
                            </span>

                        </Link>


                        {/* RESULTS */}

                        <Link
                            to="/teacher/results"
                            className="teacher-action-card"
                        >

                            <div className="action-card-icon">
                                📊
                            </div>

                            <div>

                                <h3>
                                    View Results
                                </h3>

                                <p>
                                    Analyze student
                                    examination results.
                                </p>

                            </div>

                            <span className="action-arrow">
                                →
                            </span>

                        </Link>


                        {/* ANSWERS */}

                        <Link
                            to="/teacher/answers"
                            className="teacher-action-card"
                        >

                            <div className="action-card-icon">
                                📄
                            </div>

                            <div>

                                <h3>
                                    View Answers
                                </h3>

                                <p>
                                    Review student
                                    submitted answers.
                                </p>

                            </div>

                            <span className="action-arrow">
                                →
                            </span>

                        </Link>

                    </div>

                </section>


                {/* =================================================
                    MANAGEMENT OVERVIEW
                ================================================= */}

                <section className="teacher-overview-grid">


                    {/* TEST MANAGEMENT */}

                    <div className="teacher-overview-card">

                        <div className="overview-card-header">

                            <div>

                                <span className="page-badge">
                                    TESTS
                                </span>

                                <h2>
                                    Test Management
                                </h2>

                            </div>

                            <span className="overview-icon">
                                📝
                            </span>

                        </div>


                        <div className="overview-stat">

                            <strong>
                                {dashboard?.tests.total ?? "—"}
                            </strong>

                            <span>
                                Tests Available
                            </span>

                        </div>


                        <Link
                            to="/teacher/tests"
                            className="teacher-secondary-button"
                        >
                            Manage Tests
                        </Link>

                    </div>


                    {/* RESULT MANAGEMENT */}

                    <div className="teacher-overview-card">

                        <div className="overview-card-header">

                            <div>

                                <span className="page-badge">
                                    RESULTS
                                </span>

                                <h2>
                                    Result Management
                                </h2>

                            </div>

                            <span className="overview-icon">
                                📊
                            </span>

                        </div>


                        <div className="overview-stat">

                            <strong>{dashboard ? `${dashboard.results.averagePercentage}%` : "—"}</strong>

                            <span>
                            Average across {dashboard?.results.attempts ?? "—"} submissions
                            </span>

                        </div>


                        <Link
                            to="/teacher/results"
                            className="teacher-secondary-button"
                        >
                            View Results
                        </Link>

                    </div>


                </section>


                {/* =================================================
                    ACCOUNT BANNER
                ================================================= */}

                <section className="teacher-account-banner">

                    <div>

                        <span className="page-badge">
                            ACCOUNT
                        </span>

                        <h2>
                            Manage Your Teacher Profile
                        </h2>

                        <p>
                            Update your personal,
                            institution and account
                            information.
                        </p>

                    </div>


                    <Link
                        to="/teacher/account"
                        className="teacher-primary-button"
                    >
                        Manage Account
                    </Link>

                </section>


            </main>

        </div>
    );
}

export default TeacherDashboard;