import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/AuthContext";

function StudentAccount() {
    const { user: student } = useAuth();

    return (
        <div className="student-page">

            <StudentNavbar />

            <main className="student-content">

                <div className="page-title">

                    <p className="dashboard-label">
                        ACCOUNT
                    </p>

                    <h1>My Profile</h1>

                    <p>
                        View your SmartExam account information.
                    </p>

                </div>


                <section className="profile-card">

                    <div className="profile-header">

                        <div className="large-profile-circle">
                            {student.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                            <h2>
                                {student.name}
                            </h2>

                            <p>
                                @{student.username}
                            </p>

                            <span className="account-role">
                                STUDENT
                            </span>
                            <p><strong>Student ID:</strong> {student.studentId}</p>
                        </div>

                    </div>


                    <div className="profile-details">

                        <div>
                            <label>Student ID</label>
                            <strong>{student.studentId}</strong>
                        </div>

                        <div>
                            <label>Email</label>
                            <strong>{student.email}</strong>
                        </div>

                        <div>
                            <label>Mobile Number</label>
                            <strong>{student.mobile}</strong>
                        </div>

                        <div>
                            <label>Branch</label>
                            <strong>{student.branch}</strong>
                        </div>

                        <div>
                            <label>Institution</label>
                            <strong>{student.institution}</strong>
                        </div>

                        <div>
                            <label>Year / Semester</label>
                            <strong>{student.year}</strong>
                        </div>

                    </div>

                </section>

            </main>

        </div>
    );
}

export default StudentAccount;