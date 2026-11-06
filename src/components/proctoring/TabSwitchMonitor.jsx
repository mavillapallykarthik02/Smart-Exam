import { useEffect, useState } from "react";

function TabSwitchMonitor({ onWarning, warningThreshold = 3 }) {
    const [activityLog, setActivityLog] = useState([]);

    useEffect(() => {
        const recordEvent = (type, message) => {
            setActivityLog((current) => {
                const nextItem = { type, message, timestamp: new Date().toISOString() };
                return [nextItem, ...current].slice(0, 20);
            });
            onWarning?.({ type, message, severity: "medium" });
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === "hidden") {
                recordEvent("tab_switch", "Warning: You have left the examination window. This activity has been recorded.");
            }
        };

        const handleBlur = () => {
            recordEvent("window_focus_loss", "Warning: The browser lost focus while the examination was active.");
        };

        const handlePageHide = () => {
            recordEvent("page_hidden", "The examination page was hidden or navigated away from.");
        };

        document.addEventListener("visibilitychange", handleVisibilityChange);
        window.addEventListener("blur", handleBlur);
        window.addEventListener("pagehide", handlePageHide);

        return () => {
            document.removeEventListener("visibilitychange", handleVisibilityChange);
            window.removeEventListener("blur", handleBlur);
            window.removeEventListener("pagehide", handlePageHide);
        };
    }, [onWarning, warningThreshold]);

    return (
        <div style={{ padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #dfe6ee" }}>
            <strong>Tab switch monitoring</strong>
            <div style={{ marginTop: 8, color: "#475569", fontSize: 13 }}>
                {activityLog.length === 0 ? "No tab switch events have been recorded yet." : `${activityLog.length} activity entries recorded.`}
                <div style={{ marginTop: 8 }}>
                    {activityLog.slice(0, 3).map((entry, index) => (
                        <div key={`${entry.type}-${index}`}>
                            {new Date(entry.timestamp).toLocaleTimeString()} · {entry.type}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export default TabSwitchMonitor;
