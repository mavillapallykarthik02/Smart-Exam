import { NavLink } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import LogoutButton from "./LogoutButton";
import BrandLogoImage from "./BrandLogoImage";

function StudentNavbar() {
    const { user } = useAuth();
    return (
        <header className="student-navbar">

            <div className="student-logo">
                <BrandLogoImage />
                <span className="student-brand-text">
                    <strong>SmartExam</strong>
                    <small>ID: {user.studentId}</small>
                </span>
            </div>

            <nav className="student-nav-links">

                <NavLink to="/student/dashboard">
                    Home
                </NavLink>

                <NavLink to="/student/branches">
                    Branches
                </NavLink>

                <NavLink to="/student/subjects">
                    Subjects
                </NavLink>

                <NavLink to="/student/tests">
                    Tests
                </NavLink>

                <NavLink to="/student/results">
                    Results
                </NavLink>

                <NavLink to="/student/progress">
                    Progress
                </NavLink>

                <NavLink to="/student/account">
                    Account
                </NavLink>

            </nav>

            <LogoutButton role="student" className="student-logout" />

        </header>
    );
}

export default StudentNavbar;