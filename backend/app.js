import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { isAllowedClientOrigin } from "./config/env.js";
import { errorMiddleware, notFoundMiddleware } from "./middleware/errorMiddleware.js";
import { sendError } from "./utils/apiResponse.js";
import authRoutes from "./routes/authRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";
import attemptRoutes from "./routes/attemptRoutes.js";
import branchRoutes from "./routes/branchRoutes.js";
import branchAdminRoutes from "./routes/branchAdminRoutes.js";
import resultRoutes from "./routes/resultRoutes.js";
import progressRoutes from "./routes/progressRoutes.js";
import proctoringRoutes from "./routes/proctoringRoutes.js";
import subjectRoutes from "./routes/subjectRoutes.js";
import studentRoutes from "./routes/studentRoutes.js";
import teacherDashboardRoutes from "./routes/teacherDashboardRoutes.js";
import testRoutes from "./routes/testRoutes.js";
import teacherAssignmentRoutes from "./routes/teacherAssignmentRoutes.js";

const app = express();

app.disable("x-powered-by");
app.use(helmet());
app.use(cors({
    origin(origin, callback) {
        callback(null, !origin || isAllowedClientOrigin(origin));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"]
}));
app.use((request, response, next) => {
    if (["GET", "HEAD", "OPTIONS"].includes(request.method)) return next();
    const origin = request.get("origin");
    if (origin && !isAllowedClientOrigin(origin)) {
        return sendError(response, 403, "This origin is not allowed to modify SmartExam data.");
    }
    return next();
});
app.use(express.json({ limit: "2mb" }));
app.use(cookieParser());

app.get("/api/health", (_request, response) => {
    response.json({ success: true, message: "SmartExam API is ready.", data: { status: "ok" } });
});

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/attempts", attemptRoutes);
app.use("/api/branches", branchRoutes);
app.use("/api/branch-admin", branchAdminRoutes);
app.use("/api/results", resultRoutes);
app.use("/api/progress", progressRoutes);
app.use("/api/proctoring", proctoringRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/teacher", teacherDashboardRoutes);
app.use("/api/tests", testRoutes);
app.use("/api/teacher/assignments", teacherAssignmentRoutes);
app.use(notFoundMiddleware);
app.use(errorMiddleware);

export default app;
