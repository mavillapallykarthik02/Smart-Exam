import { useState } from "react";
import CameraMonitor from "./CameraMonitor.jsx";
import CameraPermission from "./CameraPermission.jsx";

function ProctoringCamera() {
    const [permissionReady, setPermissionReady] = useState(false);
    const [warnings, setWarnings] = useState([]);

    const handleIncident = (incident) => {
        setWarnings((current) => {
            const nextList = [incident, ...current].slice(0, 5);
            return nextList;
        });
    };

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <CameraPermission
                onReady={() => setPermissionReady(true)}
                onPermissionChange={(state) => setPermissionReady(state === "granted")}
                onError={(message) => handleIncident({ type: "camera_error", message, severity: "medium" })}
            />

            {permissionReady ? (
                <CameraMonitor onIncident={handleIncident} />
            ) : (
                <div style={{ padding: 16, border: "1px dashed #cbd5e1", borderRadius: 12, color: "#475569" }}>
                    Webcam monitoring will start once the student grants permission.
                </div>
            )}

            {warnings.length > 0 && (
                <div style={{ padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a4d00" }}>
                    <strong>Recent proctoring notes</strong>
                    <ul style={{ margin: "8px 0 0 18px" }}>
                        {warnings.map((warning, index) => (
                            <li key={`${warning.type}-${index}`}>
                                <strong>{warning.type.replace(/_/g, " ")}</strong>: {warning.message}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default ProctoringCamera;
