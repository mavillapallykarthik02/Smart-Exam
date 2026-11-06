import { useCallback, useEffect, useState } from "react";
import StudentNavbar from "../components/StudentNavbar";
import { useAuth } from "../context/useAuth";
import {
    connectToTeacher,
    disconnectFromTeacher,
    listConnectedTeachers
} from "../services/studentTeacherService";

function StudentAccount() {
    const { user: student } = useAuth();
    const [teacherId, setTeacherId] = useState("");
    const [connections, setConnections] = useState([]);
    const [isLoadingConnections, setIsLoadingConnections] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [message, setMessage] = useState("");

    const loadConnections = useCallback(async () => {
        setError("");
        try {
            setConnections(await listConnectedTeachers());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoadingConnections(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadConnections);
    }, [loadConnections]);

    const handleConnect = async (event) => {
        event.preventDefault();
        if (isSubmitting) return;
        if (!teacherId.trim()) {
            setError("Enter a Teacher ID to connect.");
            return;
        }

        setError("");
        setMessage("");
        setIsSubmitting(true);
        try {
            const connection = await connectToTeacher(teacherId.trim());
            setConnections((current) => [...current, connection]);
            setTeacherId("");
            setMessage("Successfully connected to Teacher!");
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDisconnect = async (connection) => {
        if (!window.confirm(`Disconnect from ${connection.teacher.name}?`)) return;
        setError("");
        setMessage("");
        try {
            await disconnectFromTeacher(connection.teacher.teacherId);
            setConnections((current) => current.filter((item) => item.id !== connection.id));
            setMessage(`Disconnected from ${connection.teacher.name}.`);
        } catch (requestError) {
            setError(requestError.message);
        }
    };

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

                {error && <div className="error-message" role="alert">{error}</div>}
                {message && <div className="success-message" role="status">{message}</div>}

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
                            <p><strong>Polytechnic PIN:</strong> {student.studentId}</p>
                        </div>

                    </div>


                    <div className="profile-details">

                        <div>
                            <label>Polytechnic PIN</label>
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

                        <div>
                            <label>Academic Batch</label>
                            <strong>{student.academicBatch}</strong>
                        </div>

                        <div>
                            <label>Year of Study / Semester</label>
                            <strong>{student.studyYear} / {student.semester}</strong>
                        </div>

                    </div>

                </section>

                <section className="profile-card student-teacher-connections">
                    <div className="student-connections-heading">
                        <div>
                            <p className="dashboard-label">CONNECTED TEACHERS</p>
                            <h2>Manage Teacher Connections</h2>
                            <p>Teacher connections are optional. Your administrator-assigned branch and class determine which subjects and tests you can access.</p>
                        </div>
                    </div>

                    <form className="student-connect-form" onSubmit={handleConnect}>
                        <div className="form-group">
                            <label htmlFor="connect-teacher-id">Enter Teacher ID</label>
                            <input
                                id="connect-teacher-id"
                                value={teacherId}
                                onChange={(event) => setTeacherId(event.target.value)}
                                minLength={3}
                                maxLength={40}
                                pattern={"[A-Za-z0-9][A-Za-z0-9_\\-]{2,39}"}
                                placeholder="Enter Teacher ID"
                                required
                            />
                        </div>
                        <button className="branch-button" type="submit" disabled={isSubmitting}>
                            {isSubmitting ? "Connecting..." : "Connect Teacher"}
                        </button>
                    </form>

                    <div className="student-connected-list">
                        {isLoadingConnections ? (
                            <p role="status">Loading connected teachers...</p>
                        ) : connections.length === 0 ? (
                            <p>You are not connected to any teachers yet.</p>
                        ) : connections.map((connection) => (
                            <article className="student-connected-teacher" key={connection.id}>
                                <div>
                                    <h3>{connection.teacher.name}</h3>
                                    <p><strong>Teacher ID:</strong> {connection.teacher.teacherId}</p>
                                    <p><strong>Institution:</strong> {connection.teacher.institution}</p>
                                    <p><strong>Connected:</strong> {new Date(connection.connectedAt).toLocaleDateString()}</p>
                                    <span className="connected-status">{connection.status}</span>
                                </div>
                                <button
                                    className="student-disconnect-button"
                                    type="button"
                                    onClick={() => handleDisconnect(connection)}
                                >
                                    Disconnect
                                </button>
                            </article>
                        ))}
                    </div>
                </section>

            </main>

        </div>
    );
}

export default StudentAccount;