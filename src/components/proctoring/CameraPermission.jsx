import { useEffect, useState } from "react";

function CameraPermission({ onReady, onError, onPermissionChange }) {
    const [permissionState, setPermissionState] = useState("idle");
    const [message, setMessage] = useState("Allow camera access before starting the examination.");

    useEffect(() => {
        const updatePermissionState = async () => {
            if (!navigator.mediaDevices?.getUserMedia) {
                const nextState = "unsupported";
                setPermissionState(nextState);
                setMessage("This browser does not support webcam access.");
                onPermissionChange?.(nextState);
                return;
            }

            try {
                const permissionStatus = await navigator.permissions?.query({ name: "camera" }).catch(() => null);
                const nextState = permissionStatus?.state ?? "prompt";
                setPermissionState(nextState);
                setMessage(
                    nextState === "granted"
                        ? "Camera permission is available."
                        : nextState === "denied"
                            ? "Camera permission was denied. Please enable it in the browser settings."
                            : "Camera access is required for verification."
                );
                onPermissionChange?.(nextState);
            } catch {
                setPermissionState("prompt");
                setMessage("Check the browser camera settings to continue.");
                onPermissionChange?.("prompt");
            }
        };

        void updatePermissionState();
    }, [onPermissionChange]);

    const requestAccess = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false
            });
            stream.getTracks().forEach((track) => track.stop());
            const nextState = "granted";
            setPermissionState(nextState);
            setMessage("Camera permission granted. The webcam is ready for monitoring.");
            onPermissionChange?.(nextState);
            onReady?.();
        } catch (error) {
            const nextState = "denied";
            setPermissionState(nextState);
            setMessage("Camera permission was denied. Please re-enable access and try again.");
            onPermissionChange?.(nextState);
            onError?.(error instanceof Error ? error.message : "Camera permission denied.");
        }
    };

    return (
        <div style={{ padding: "12px 16px", border: "1px solid #dfe6ee", borderRadius: 12, background: "#f8fafc" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                <strong>Camera permission</strong>
                <span style={{ fontSize: 12, color: permissionState === "granted" ? "#0d9488" : permissionState === "denied" ? "#b91c1c" : "#475569" }}>
                    {permissionState}
                </span>
            </div>
            <p style={{ margin: "8px 0", color: "#475569" }}>{message}</p>
            <button
                type="button"
                onClick={requestAccess}
                style={{
                    border: "none",
                    background: "#0f172a",
                    color: "#ffffff",
                    borderRadius: 8,
                    padding: "8px 14px",
                    cursor: "pointer"
                }}
            >
                Allow camera access
            </button>
        </div>
    );
}

export default CameraPermission;
