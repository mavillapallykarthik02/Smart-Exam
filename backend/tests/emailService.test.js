import assert from "node:assert/strict";
import process from "node:process";
import { test } from "node:test";

process.env.NODE_ENV = "test";
process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/smartexam-email-test";
process.env.JWT_SECRET = "email-service-test-secret-with-at-least-32-characters";
process.env.FIELD_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
process.env.BREVO_API_KEY = "test-brevo-api-key";
process.env.BREVO_SENDER_EMAIL = "no-reply@example.test";
process.env.BREVO_SENDER_NAME = "SmartExam Tests";

const [{ config }, { sendPasswordResetEmail }] = await Promise.all([
    import("../config/env.js"),
    import("../services/emailService.js")
]);

test("password reset email uses Brevo HTTPS API and its configured sender", async () => {
    const originalFetch = globalThis.fetch;
    let requestUrl;
    let requestOptions;
    globalThis.fetch = async (url, options) => {
        requestUrl = url;
        requestOptions = options;
        return { ok: true, status: 201 };
    };

    try {
        await sendPasswordResetEmail({
            to: "student@example.test",
            resetUrl: "https://smartexam.example/password-reset/student?token=sample",
            role: "student"
        });
    } finally {
        globalThis.fetch = originalFetch;
    }

    assert.equal(requestUrl, "https://api.brevo.com/v3/smtp/email");
    assert.equal(requestOptions.method, "POST");
    assert.equal(requestOptions.headers["api-key"], "test-brevo-api-key");
    const message = JSON.parse(requestOptions.body);
    assert.deepEqual(message.sender, {
        name: "SmartExam Tests",
        email: "no-reply@example.test"
    });
    assert.deepEqual(message.to, [{ email: "student@example.test" }]);
    assert.match(message.textContent, /password reset was requested/u);
    assert.match(message.htmlContent, /password-reset\/student/u);
});

test("password reset email reports provider failures without exposing the API key", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = async () => ({ ok: false, status: 401 });

    try {
        await assert.rejects(
            sendPasswordResetEmail({
                to: "student@example.test",
                resetUrl: "https://smartexam.example/reset",
                role: "student"
            }),
            (error) => {
                assert.equal(error.statusCode, 502);
                assert.match(error.message, /401/u);
                assert.equal(error.message.includes(config.brevoApiKey), false);
                return true;
            }
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});
