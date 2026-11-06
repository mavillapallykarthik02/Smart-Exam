import { useEffect, useRef, useState } from "react";
import { createFaceDetectionService } from "./FaceDetectionService.js";

function CameraMonitor({ onIncident }) {
    const videoRef = useRef(null);
    const serviceRef = useRef(null);
    const [status, setStatus] = useState("idle");
    const [faceCount, setFaceCount] = useState(0);
    const [message, setMessage] = useState("Waiting for camera permission.");
    const [error, setError] = useState("");

    useEffect(() => {
        serviceRef.current = createFaceDetectionService();

        const mount = async () => {
            if (!videoRef.current || typeof navigator === "undefined") {
                setStatus("unsupported");
                setMessage("Camera monitoring is not supported in this environment.");
                return;
            }

            try {
                const result = await serviceRef.current.start(videoRef.current);
                setStatus(result.status || "ready");
                setFaceCount(result.faceCount || 0);
                setMessage("The camera is active and monitoring the examination environment.");
            } catch (requestError) {
                const nextError = requestError instanceof Error ? requestError.message : "Unable to access the camera.";
                setError(nextError);
                setStatus("permission_denied");
                setMessage("Camera permissions are required for examination monitoring.");
                onIncident?.({ type: "camera_permission", message: nextError, severity: "medium" });
            }
        };

        void mount();

        return () => {
            serviceRef.current?.stop();
        };
    }, [onIncident]);

    useEffect(() => {
        if (!serviceRef.current) return;

        const timer = window.setInterval(() => {
            const state = serviceRef.current.getState();
            setFaceCount(state.faceCount || 0);
            setStatus(state.status || "ready");

            if (state.status === "multiple_faces") {
                const messageText = "Multiple faces detected in the webcam feed.";
                setMessage(messageText);
                onIncident?.({ type: "multiple_faces", message: messageText, severity: "high" });
            } else if (state.status === "face_missing") {
                const messageText = "No face was detected for the current monitoring interval.";
                setMessage(messageText);
                onIncident?.({ type: "face_absence", message: messageText, severity: "medium" });
            }
        }, 4000);

        return () => window.clearInterval(timer);
    }, [onIncident]);

    return (
        <div style={{ border: "1px solid #dfe6ee", borderRadius: 12, padding: 12, background: "#ffffff" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <strong>Camera monitor</strong>
                <span style={{ fontSize: 12, textTransform: "uppercase", color: status === "permission_denied" ? "#b91c1c" : "#0f172a" }}>
                    {status}
                </span>
            </div>
            <video
                ref={videoRef}
                autoPlay
                muted
                playsInline
                style={{ width: "100%", maxWidth: 420, borderRadius: 12, background: "#0f172a", minHeight: 220 }}
            />
            <p style={{ margin: "10px 0 0", color: "#475569" }}>Detected faces: {faceCount}</p>
            <p style={{ margin: "8px 0 0", color: "#475569" }}>{message}</p>
            {error && <p style={{ margin: "8px 0 0", color: "#b91c1c" }}>{error}</p>}
        </div>
    );
}

export default CameraMonitor;
