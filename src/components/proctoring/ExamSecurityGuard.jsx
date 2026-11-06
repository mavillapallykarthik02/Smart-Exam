import { useState } from "react";
import BrowserActivityMonitor from "./BrowserActivityMonitor.jsx";
import ProctoringCamera from "./ProctoringCamera.jsx";
import ProctoringWarnings from "./ProctoringWarnings.jsx";

function ExamSecurityGuard() {
    const [warnings, setWarnings] = useState([]);

    return (
        <div style={{ display: "grid", gap: 16 }}>
            <div style={{ display: "grid", gap: 16, gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
                <BrowserActivityMonitor onWarning={(entry) => setWarnings((current) => [entry, ...current].slice(0, 8))} />
                <ProctoringCamera />
            </div>
            <ProctoringWarnings warnings={warnings} />
        </div>
    );
}

export default ExamSecurityGuard;
