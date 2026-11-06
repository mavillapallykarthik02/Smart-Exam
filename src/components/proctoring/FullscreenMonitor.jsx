import { useEffect, useState } from "react";

function FullscreenMonitor({ onWarning }) {
    const [status, setStatus] = useState("fullscreen_ready");

    useEffect(() => {
        const handleFullscreenChange = () => {
            const fullscreenActive = !!document.fullscreenElement;
            setStatus(fullscreenActive ? "fullscreen_active" : "fullscreen_exited");
            if (!fullscreenActive) {
                onWarning?.({
                    type: "fullscreen_exit",
                    message: "Warning: The examination left full-screen mode. This activity has been recorded.",
                    severity: "high"
                });
            }
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, [onWarning]);

    return (
        <div style={{ padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #dfe6ee" }}>
            <strong>Fullscreen monitor</strong>
            <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>
                {status === "fullscreen_active" ? "The examination is running in full-screen mode." : "The browser has left full-screen mode."}
            </div>
        </div>
    );
}

export default FullscreenMonitor;
