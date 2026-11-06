import { analyzeRiskEvents } from "../services/riskAnalysisService.js";
import { getTeacherProctoringData } from "../services/proctoringService.js";
import { sendSuccess } from "../utils/apiResponse.js";

export const getRiskSummary = async (request, response) => {
    const events = Array.isArray(request.body?.events) ? request.body.events : [];
    const report = analyzeRiskEvents(events);
    return sendSuccess(response, { report }, "Risk summary generated successfully.");
};

export const getProctoringEvents = async (request, response) => {
    const dashboard = await getTeacherProctoringData(request.user.id);
    return sendSuccess(response, { dashboard });
};

export const getStoredRiskSummary = async (request, response) => {
    const dashboard = await getTeacherProctoringData(request.user.id);
    const events = dashboard.incidents.flatMap((incident) => incident.events.map((event) => ({
        type: event.type,
        timestamp: event.occurredAt
    })));
    const report = analyzeRiskEvents(events);
    return sendSuccess(response, { report });
};

export default {
    getRiskSummary,
    getProctoringEvents,
    getStoredRiskSummary
};
