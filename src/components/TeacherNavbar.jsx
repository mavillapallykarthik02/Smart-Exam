import { Link } from "react-router-dom";
import LogoutButton from "./LogoutButton";
import BrandLogoImage from "./BrandLogoImage";

function TeacherNavbar({ active }) {
    const links = [
        ["Dashboard", "/teacher/dashboard"],
        ["Students", "/teacher/students"],
        ["Branches", "/teacher/branches"],
        ["Subjects", "/teacher/subjects"],
        ["Tests", "/teacher/tests"],
        ["Results", "/teacher/results"],
        ["Answers", "/teacher/answers"],
        ["Account", "/teacher/account"]
    ];

    return (
        <header className="teacher-navbar">
            <div className="teacher-logo">
                <BrandLogoImage />
                <div><h2>SmartExam</h2><p>Teacher Panel</p></div>
            </div>
            <nav className="teacher-nav">
                {links.map(([label, path]) => (
                    <Link
                        key={path}
                        to={path}
                        className={active === label ? "teacher-nav-active" : ""}
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
