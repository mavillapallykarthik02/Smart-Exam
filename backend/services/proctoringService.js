import { Attempt } from "../models/Attempt.js";
import { Test } from "../models/Test.js";
import { analyzeRiskEvents, riskEventLabel } from "./riskAnalysisService.js";

const serializeAttempt = (attempt) => {
    const events = attempt.securityEvents.map((event) => ({
        id: event.id,
        type: event.type,
        label: riskEventLabel(event.type),
        occurredAt: event.occurredAt
    }));
    const report = analyzeRiskEvents(events.map((event) => ({
        type: event.type,
        timestamp: event.occurredAt
    })));

    return {
        id: attempt.id,
        student: {
            id: attempt.student?.id || "",
            name: attempt.student?.name || "Student",
            studentId: attempt.student?.studentId || ""
        },
        test: {
            id: attempt.test?.id || "",
            title: attempt.test?.title || "Archived test"
        },
        status: attempt.status,
        startedAt: attempt.startedAt,
        lastEventAt: events.at(-1)?.occurredAt || null,
        eventCount: events.length,
        risk: report.summary.severity,
        findings: report.findings,
        events: events.reverse()
    };
};

export async function getTeacherProctoringData(teacherId) {
    const tests = await Test.find({ createdBy: teacherId }).select("_id");
    const testIds = tests.map((test) => test._id);
    if (testIds.length === 0) {
        return {
            summary: { activeAttempts: 0, flaggedAttempts: 0, securityEvents: 0 },
            incidents: []
        };
    }

    const [activeAttempts, eventTotals, attemptsWithEvents] = await Promise.all([
        Attempt.countDocuments({ test: { $in: testIds }, status: "IN_PROGRESS" }),
        Attempt.aggregate([
            {
                $match: {
                    test: { $in: testIds },
                    "securityEvents.0": { $exists: true }
                }
            },
            { $project: { eventCount: { $size: "$securityEvents" } } },
            {
                $group: {
                    _id: null,
                    flaggedAttempts: { $sum: 1 },
                    securityEvents: { $sum: "$eventCount" }
                }
            }
        ]),
        Attempt.find({
            test: { $in: testIds },
            "securityEvents.0": { $exists: true }
        })
            .populate("student", "name studentId")
            .populate("test", "title")
            .select("student test status startedAt securityEvents")
            .sort({ updatedAt: -1 })
            .limit(100)
    ]);

    const incidents = attemptsWithEvents.map(serializeAttempt);
    return {
        summary: {
            activeAttempts,
            flaggedAttempts: eventTotals[0]?.flaggedAttempts || 0,
            securityEvents: eventTotals[0]?.securityEvents || 0
        },
        incidents
    };
}

export default { getTeacherProctoringData };
