import { Link } from "react-router-dom";
import { useAuth } from "../context/useAuth";
import LogoutButton from "./LogoutButton";
import BrandLogoImage from "./BrandLogoImage";

function TeacherNavbar({ active }) {
    const { user } = useAuth();
    const staffRoleLabels = {
        class_teacher: "Class Teacher",
        hod: "HOD",
        principal: "Principal",
        guest_lecturer: "Guest Lecturer"
    };
    const links = [
        ["Dashboard", "/teacher/dashboard"],
        ["Students", "/teacher/students"],
        ["Branches", "/teacher/branches"],
        ["Subjects", "/teacher/subjects"],
        ["Tests", "/teacher/tests"],
        ["Results", "/teacher/results"],
        ["Proctoring", "/teacher/proctoring"],
        ["Answers", "/teacher/answers"],
        ["Account", "/teacher/account"]
    ];
    if (user?.staffRole === "class_teacher") {
        links.splice(2, 0, ["Approvals", "/teacher/student-approvals"]);
    }

    return (
        <header className="teacher-navbar">
            <div className="teacher-logo">
                <BrandLogoImage />
                <div><h2>SmartExam</h2>
                    <p>{staffRoleLabels[user?.staffRole] || "Teacher"} Panel</p>
                </div>
            </div>
            <nav className="teacher-nav">
                {links.map(([label, path]) => (
                    <Link
                        key={path}
                        to={path}
                        className={active === label ? "teacher-nav-active" : ""}
                        aria-current={active === label ? "page" : undefined}
                    >
                        {label}
                    </Link>
                ))}
            </nav>
            <LogoutButton role="teacher" className="teacher-logout" />
        </header>
    );
}

export default TeacherNavbar;
