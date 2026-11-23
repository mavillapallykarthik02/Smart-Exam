import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import TeacherNavbar from "../components/TeacherNavbar";
import { listSubjects } from "../services/subjectService";

function TeacherSubjects() {
    const [subjects, setSubjects] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadSubjects = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setSubjects(await listSubjects());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadSubjects);
    }, [loadSubjects]);

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Subjects" />
            <main className="teacher-dashboard">
                <div className="teacher-page-heading">
                    <div>
                        <span className="page-badge">ASSIGNED SUBJECTS</span>
                        <h1>My Subjects</h1>
                        <p>Subjects published by your branch administrator and assigned to you.</p>
                    </div>
                    <Link className="teacher-primary-button" to="/teacher/tests">Manage Tests</Link>
                </div>

                {error && <div className="error-message" role="alert">{error}</div>}
                {isLoading ? (
                    <div className="teacher-empty-state">Loading assigned subjects...</div>
                ) : subjects.length === 0 ? (
                    <div className="teacher-empty-state">
                        <h3>No subjects assigned</h3>
                        <p>Your branch administrator must approve your branch access and assign a subject before you can create tests.</p>
                    </div>
                ) : (
                    <div className="teacher-management-table">
                        <div className="management-table-header" style={{ gridTemplateColumns: "1.2fr 0.8fr 1.2fr 0.8fr" }}>
                            <div>Subject</div><div>Branch</div><div>Class assignment</div><div>Status</div>
                        </div>
                        {subjects.map((subject) => (
                            <div className="management-table-row" key={subject.id}
                                style={{ gridTemplateColumns: "1.2fr 0.8fr 1.2fr 0.8fr" }}>
                                <div><strong>{subject.name}</strong><small>{subject.code}</small></div>
                                <div>{subject.branchName || "-"}</div>
                                <div>{subject.academicBatch || "-"} · Year {subject.studyYear || "-"}, Semester {subject.semester || "-"}</div>
                                <div><span className={subject.isActive ? "status-active" : "status-inactive"}>
                                    {subject.isActive ? "Published" : "Unpublished"}
                                </span></div>
                            </div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}

export default TeacherSubjects;
