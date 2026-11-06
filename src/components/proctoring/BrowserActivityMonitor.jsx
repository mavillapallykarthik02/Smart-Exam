import { useEffect, useState } from "react";
import FullscreenMonitor from "./FullscreenMonitor.jsx";
import TabSwitchMonitor from "./TabSwitchMonitor.jsx";

function BrowserActivityMonitor({ onWarning }) {
    const [events, setEvents] = useState([]);

    useEffect(() => {
        const recordEvent = (type, message, severity = "medium") => {
            const incident = {
                type,
                message,
                severity,
                timestamp: new Date().toISOString()
            };
            setEvents((current) => [incident, ...current].slice(0, 12));
            onWarning?.(incident);
        };

        const handleCopy = () => recordEvent("copy_event", "Copy event detected. Copying content from the examination is restricted.", "medium");
        const handleCut = () => recordEvent("cut_event", "Cut event detected. Editing and copy actions are restricted.", "medium");
        const handlePaste = () => recordEvent("paste_event", "Paste event detected. Exam content should not be pasted from external sources.", "medium");
        const handleContextMenu = (event) => {
            event.preventDefault();
            recordEvent("context_menu", "Context menu usage was blocked during the examination.", "low");
        };
        const handleReload = () => recordEvent("reload", "The page reload was detected and may interrupt the exam session.", "high");

        document.addEventListener("copy", handleCopy);
        document.addEventListener("cut", handleCut);
        document.addEventListener("paste", handlePaste);
        document.addEventListener("contextmenu", handleContextMenu);
        window.addEventListener("beforeunload", handleReload);

        return () => {
            document.removeEventListener("copy", handleCopy);
            document.removeEventListener("cut", handleCut);
            document.removeEventListener("paste", handlePaste);
            document.removeEventListener("contextmenu", handleContextMenu);
            window.removeEventListener("beforeunload", handleReload);
        };
    }, [onWarning]);

    return (
        <div style={{ display: "grid", gap: 12 }}>
            <TabSwitchMonitor onWarning={onWarning} />
            <FullscreenMonitor onWarning={onWarning} />
            {events.length > 0 && (
                <div style={{ padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa" }}>
                    <strong>Recent browser activity</strong>
                    <ul style={{ margin: "8px 0 0 18px", color: "#9a4d00" }}>
                        {events.map((entry, index) => (
                            <li key={`${entry.type}-${index}`}>{entry.message}</li>
                        ))}
                    </ul>
                </div>
            )}
        </div>
    );
}

export default BrowserActivityMonitor;
