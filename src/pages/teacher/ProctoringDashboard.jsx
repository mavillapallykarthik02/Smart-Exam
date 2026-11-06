import { useCallback, useEffect, useState } from "react";
import TeacherNavbar from "../../components/TeacherNavbar.jsx";
import { getProctoringEvents } from "../../services/proctoringService";

function formatTimestamp(value) {
    return value ? new Date(value).toLocaleString() : "—";
}

function ProctoringDashboard() {
    const [dashboard, setDashboard] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState("");

    const loadDashboard = useCallback(async () => {
        setError("");
        setIsLoading(true);
        try {
            setDashboard(await getProctoringEvents());
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(loadDashboard);
    }, [loadDashboard]);

    const summary = dashboard?.summary;
    const metrics = [
        { label: "Active examinations", value: summary?.activeAttempts ?? 0 },
        { label: "Attempts with security events", value: summary?.flaggedAttempts ?? 0 },
        { label: "Recorded security events", value: summary?.securityEvents ?? 0 }
    ];

    return (
        <div className="teacher-page">
            <TeacherNavbar active="Proctoring" />
            <main className="teacher-dashboard" style={{ gap: 24 }}>
                <section className="teacher-welcome">
                    <div>
                        <span className="page-badge">PROCTORING</span>
                        <h1>Examination integrity dashboard</h1>
                        <p>Review browser security events reported by students during your examinations.</p>
                    </div>
                    <button type="button" onClick={loadDashboard} disabled={isLoading}>
                        {isLoading ? "Refreshing..." : "Refresh"}
                    </button>
                </section>

                {error && (
                    <div className="error-message" role="alert">
                        <p>{error}</p>
                        <button type="button" onClick={loadDashboard}>Retry</button>
                    </div>
                )}

                <section
                    aria-label="Proctoring summary"
                    style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))" }}
                >
                    {metrics.map((item) => (
                        <div
                            key={item.label}
                            style={{ background: "#ffffff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0" }}
                        >
                            <div style={{ color: "#0f172a", fontSize: 28, fontWeight: 700 }}>{item.value}</div>
                            <div style={{ color: "#475569", marginTop: 8 }}>{item.label}</div>
                        </div>
                    ))}
                </section>

                <section style={{ background: "#ffffff", borderRadius: 16, padding: 20, border: "1px solid #e2e8f0" }}>
                    <h2 style={{ marginTop: 0 }}>Security event review</h2>
                    {isLoading ? (
                        <p aria-live="polite">Loading recorded security events...</p>
                    ) : dashboard?.incidents.length ? (
                        <div style={{ display: "grid", gap: 16 }}>
                            {dashboard.incidents.map((incident) => (
                                <article
                                    key={incident.id}
                                    style={{ border: "1px solid #e2e8f0", borderRadius: 12, padding: 16 }}
                                >
                                    <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", gap: 12 }}>
                                        <div>
                                            <strong>{incident.student.name}</strong>
                                            <div style={{ color: "#64748b", marginTop: 4 }}>
                                                {incident.student.studentId || "Student ID unavailable"} · {incident.test.title}
                                            </div>
                                        </div>
                                        <div>
                                            <strong>{incident.risk.toUpperCase()} RISK</strong>
                                            <div style={{ color: "#64748b", marginTop: 4 }}>
                                                {incident.eventCount} event{incident.eventCount === 1 ? "" : "s"} · {incident.status.replaceAll("_", " ")}
                                            </div>
                                        </div>
                                    </div>
                                    <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
                                        {incident.events.map((event) => (
                                            <li key={event.id} style={{ marginTop: 8 }}>
                                                {event.label} · {formatTimestamp(event.occurredAt)}
                                            </li>
                                        ))}
                                    </ul>
                                </article>
                            ))}
                        </div>
                    ) : (
                        <p>No security events have been recorded for your examinations.</p>
                    )}
                    <p style={{ color: "#64748b", marginBottom: 0, marginTop: 16 }}>
                        Browser monitoring is limited to signals the browser can report; it cannot guarantee prevention of all forms of cheating.
                    </p>
                </section>
            </main>
        </div>
    );
}

export default ProctoringDashboard;
