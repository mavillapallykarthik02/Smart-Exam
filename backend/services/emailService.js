import { config } from "../config/env.js";

export async function sendPasswordResetEmail({ to, resetUrl, role }) {
    if (!config.brevoApiKey || !config.brevoSenderEmail) {
        const error = new Error("Brevo password-reset delivery is not configured.");
        error.statusCode = 503;
        throw error;
    }

    const accountType = role === "admin" ? "administrator" : role;
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: {
            accept: "application/json",
            "api-key": config.brevoApiKey,
            "content-type": "application/json"
        },
        signal: AbortSignal.timeout(10_000),
        body: JSON.stringify({
            sender: {
                name: config.brevoSenderName,
                email: config.brevoSenderEmail
            },
            to: [{ email: to }],
            subject: "Reset your SmartExam password",
            textContent: `A password reset was requested for your SmartExam ${accountType} account. Open this link to choose a new password: ${resetUrl}\n\nThis link expires in one hour. If you did not request this, you can ignore this email.`,
            htmlContent: `<p>A password reset was requested for your SmartExam ${accountType} account.</p><p><a href="${resetUrl}">Reset your password</a></p><p>This link expires in one hour. If you did not request this, you can ignore this email.</p>`
        })
    });

    if (!response.ok) {
        const error = new Error(`Brevo email delivery failed with status ${response.status}.`);
        error.statusCode = 502;
        throw error;
    }
}
