function ProctoringWarnings({ warnings = [] }) {
    if (!warnings.length) {
        return (
            <div style={{ padding: 12, borderRadius: 12, background: "#f8fafc", border: "1px solid #dfe6ee", color: "#475569" }}>
                No examination warnings have been triggered yet.
            </div>
        );
    }

    return (
        <div style={{ padding: 12, borderRadius: 12, background: "#fff7ed", border: "1px solid #fed7aa", color: "#9a4d00" }}>
            <strong>Warning log</strong>
            <ul style={{ margin: "8px 0 0 18px" }}>
                {warnings.map((warning, index) => (
                    <li key={`${warning.type}-${index}`}>
                        {warning.message}
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ProctoringWarnings;
