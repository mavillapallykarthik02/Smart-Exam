import nodemailer from "nodemailer";
import { config } from "../config/env.js";

export async function sendPasswordResetEmail({ to, resetUrl, role }) {
    if (!config.gmailUser || !config.gmailAppPassword) {
        const error = new Error("Gmail password-reset delivery is not configured.");
        error.statusCode = 503;
        throw error;
    }

    const transporter = nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: config.gmailUser,
            pass: config.gmailAppPassword
        }
    });
    const accountType = role === "admin" ? "administrator" : role;
    await transporter.sendMail({
        from: config.gmailFrom || `SmartExam <${config.gmailUser}>`,
        to,
        subject: "Reset your SmartExam password",
        text: `A password reset was requested for your SmartExam ${accountType} account. Open this link to choose a new password: ${resetUrl}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.`,
        html: `<p>A password reset was requested for your SmartExam ${accountType} account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`
    });
}
