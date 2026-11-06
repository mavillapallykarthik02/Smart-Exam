import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import StudentNavbar from "../components/StudentNavbar";
import { getStudentSubjectDetails, listStudentSubjects } from "../services/subjectService";

function StudentSubjects() {
    const { subjectId } = useParams();
    const [subjects, setSubjects] = useState([]);
    const [selectedSubject, setSelectedSubject] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadPageData = useCallback(async () => {
        setIsLoading(true);
        setError("");
        try {
            if (subjectId) {
                setSelectedSubject(await getStudentSubjectDetails(subjectId));
                return;
            }
            setSelectedSubject(null);
            setSubjects(await listStudentSubjects());
        } catch (requestError) {
            setError(requestError.message);
            setSubjects([]);
            setSelectedSubject(null);
        } finally {
            setIsLoading(false);
        }
    }, [subjectId]);

    useEffect(() => {
        Promise.resolve().then(loadPageData);
    }, [loadPageData]);

    return (
        <div className="student-page">
            <StudentNavbar />
            <main className="student-content">
                {subjectId ? selectedSubject ? (
                    <>
                        <div className="page-title student-subject-detail-heading">
                            <div>
                                <p className="dashboard-label">{selectedSubject.code}</p>
                                <h1>{selectedSubject.name}</h1>
                                <p>{selectedSubject.description || selectedSubject.branch.name}</p>
                            </div>
                            <Link className="branch-button" to="/student/subjects">All Subjects</Link>
                        </div>

                        <section className="student-subject-teacher">
                            <p>Assigned Teacher</p>
                            <h2>{selectedSubject.teacher.name}</h2>
                            <span>{selectedSubject.teacher.teacherId} · {selectedSubject.teacher.institution}</span>
                        </section>

                        <section className="student-subject-test-section">
                            <div className="student-subject-section-heading">
                                <div>
                                    <p className="dashboard-label">TEST SERIES</p>
                                    <h2>Tests for This Subject</h2>
                                </div>
                                <span>{selectedSubject.tests.length} tests</span>
                            </div>
                            {selectedSubject.tests.length ? (
                                <div className="student-subject-test-list">
                                    {selectedSubject.tests.map((test) => (
                                        <article className="student-subject-test" key={test.id}>
                                            <div>
                                                <h3>{test.title}</h3>
                                                <p>{test.totalQuestions} questions · {test.duration} minutes · {test.totalMarks} marks</p>
                                            </div>
                                            <span className={`student-test-state student-test-state--${test.status.toLowerCase()}`}>
                                                {test.status.replace("_", " ")}
                                            </span>
                                            {test.status === "COMPLETED" ? (
                                                <Link to="/student/results">View Results</Link>
                                            ) : test.status === "AVAILABLE" || test.status === "IN_PROGRESS" ? (
                                                <Link to={`/student/tests/${test.id}`}>
                                                    {test.status === "IN_PROGRESS" ? "Continue" : "Open Test"}
                                                </Link>
                                            ) : (
                                                <button type="button" disabled>
                                                    {test.status === "UPCOMING" ? "Not Open Yet" : "Window Closed"}
                                                </button>
                                            )}
                                        </article>
                                    ))}
                                </div>
                            ) : (
                                <div className="teacher-empty-state">
                                    <h3>No published tests</h3>
                                    <p>Tests published by this teacher for this subject will appear here.</p>
                                </div>
                            )}
                        </section>

                    </>
                ) : isLoading ? (
                    <div className="teacher-empty-state" aria-live="polite">Loading subject...</div>
                ) : error ? (
                    <div className="error-message" role="alert">{error}</div>
                ) : null : (
                    <>
                        <div className="page-title">
                            <p className="dashboard-label">SUBJECTS</p>
                            <h1>My Subjects</h1>
                            <p>Subjects assigned to your branch and academic class.</p>
                        </div>
                        {error && <div className="error-message" role="alert">{error}</div>}
                        {isLoading ? (
                            <div className="teacher-empty-state" aria-live="polite">Loading subjects...</div>
                        ) : error ? null : subjects.length === 0 ? (
                            <div className="teacher-empty-state">
                                <h3>No subjects assigned to your branch</h3>
                                <p>Check back later or contact your institution administrator if you think subjects should be available.</p>
                            </div>
                        ) : (
                            <div className="student-subject-list" role="list">
                                {subjects.map((subject, index) => (
                                    <div role="listitem" key={subject.id}>
                                        <Link
                                            className="student-subject-row"
                                            to={`/student/subjects/${subject.id}`}
                                        >
                                            <span className="student-subject-number">
                                                {String(index + 1).padStart(2, "0")}
                                            </span>
                                            <span className="student-subject-name">{subject.name}</span>
                                            <span className="student-subject-teacher-name">
                                                {subject.teacher?.name || "Teacher"}
                                            </span>
                                        </Link>
                                    </div>
                                ))}
                            </div>
                        )}
                    </>
                )}
            </main>
        </div>
    );
}

export default StudentSubjects;
