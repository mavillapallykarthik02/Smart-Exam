const defaultRiskConfig = {
    tabSwitch: { weight: 3, label: "Repeated tab switching", threshold: 3 },
    focusLoss: { weight: 2, label: "Window focus loss", threshold: 2 },
    fullscreenExit: { weight: 4, label: "Full-screen exit", threshold: 2 },
    copyEvent: { weight: 1, label: "Copy event", threshold: 1 },
    pasteEvent: { weight: 1, label: "Paste event", threshold: 1 },
    cutEvent: { weight: 1, label: "Cut event", threshold: 1 },
    contextMenu: { weight: 1, label: "Context menu usage", threshold: 1 },
    shortcutUse: { weight: 1, label: "Restricted keyboard shortcut", threshold: 1 },
    reload: { weight: 2, label: "Page reload or interruption", threshold: 2 },
    cameraDisconnection: { weight: 5, label: "Camera disconnection", threshold: 1 },
    faceAbsence: { weight: 4, label: "Prolonged face absence", threshold: 2 },
    multipleFaces: { weight: 5, label: "Multiple visible faces", threshold: 1 },
    unknown: { weight: 1, label: "Unclassified event", threshold: 1 }
};

export const riskEventLabel = (eventType) => defaultRiskConfig[eventType]?.label || "Unclassified event";

const normalizeEventType = (eventOrType) => {
    if (!eventOrType) return "unknown";
    if (typeof eventOrType === "string") {
        return eventOrType.trim().toLowerCase();
    }
    return String(eventOrType.type || eventOrType.eventType || "unknown").trim().toLowerCase();
};

const getRiskConfig = (eventType, config = defaultRiskConfig) => {
    return config[eventType] ?? config.unknown;
};

export function classifyEvent(event, config = defaultRiskConfig) {
    const type = normalizeEventType(event);
    const settings = getRiskConfig(type, config);
    const repeatedCount = Number(event?.count ?? event?.repeatedCount ?? 1);
    const weight = Number(event?.weight ?? settings.weight ?? 1);
    const countScore = Math.max(0, repeatedCount - (settings.threshold ?? 0)) * weight;
    const riskScore = Math.max(weight, countScore + weight);

    return {
        type,
        label: settings.label,
        weight,
        riskScore,
        severity: riskScore >= 8 ? "high" : riskScore >= 4 ? "medium" : "low",
        message: `Detected ${settings.label.toLowerCase()} during the examination.`
    };
}

export function analyzeRiskEvents(events = [], config = defaultRiskConfig) {
    const grouped = new Map();

    for (const event of events) {
        const type = normalizeEventType(event);
        const settings = getRiskConfig(type, config);
        const current = grouped.get(type) ?? {
            type,
            label: settings.label,
            count: 0,
            totalRiskScore: 0,
            lastSeenAt: null
        };

        current.count += Number(event?.count ?? event?.repeatedCount ?? 1);
        current.lastSeenAt = event?.timestamp ?? current.lastSeenAt;
        const scored = classifyEvent({ ...event, type, count: current.count }, config);
        current.totalRiskScore = scored.riskScore;
        grouped.set(type, current);
    }

    const findings = [...grouped.values()].map((entry) => ({
        type: entry.type,
        label: entry.label,
        count: entry.count,
        totalRiskScore: entry.totalRiskScore,
        lastSeenAt: entry.lastSeenAt,
        severity: entry.totalRiskScore >= 8 ? "high" : entry.totalRiskScore >= 4 ? "medium" : "low"
    }));

    const totalRiskScore = findings.reduce((sum, item) => sum + item.totalRiskScore, 0);
    const severity = totalRiskScore >= 20 ? "high" : totalRiskScore >= 8 ? "medium" : "low";
    const summary = {
        totalEvents: events.length,
        totalRiskScore,
        severity,
        indicatorCount: findings.length,
        recommendations: severity === "high"
            ? [
                "Review live exam evidence and request additional verification from the student.",
                "Document the incident timeline before any policy decision."
            ]
            : severity === "medium"
                ? [
                    "Monitor the student for additional activity before escalating.",
                    "Capture notes and available evidence for a teacher review."
                ]
                : [
                    "No immediate intervention is required based on the current risk profile."
                ]
    };

    return {
        config: defaultRiskConfig,
        summary,
        findings,
        generatedAt: new Date().toISOString()
    };
}

export const buildRiskSummary = analyzeRiskEvents;

export default {
    defaultRiskConfig,
    classifyEvent,
    analyzeRiskEvents,
    buildRiskSummary
};
