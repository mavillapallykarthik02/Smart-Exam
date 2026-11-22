import { useEffect } from "react";

const MESSAGE_SELECTOR = [
    ".error-message",
    ".success-message",
    ".approval-notice",
    ".logout-error",
    '[role="alert"]:not(.auth-status)'
].join(", ");

const DISMISS_DELAY_MS = 3000;

function findMessages(node) {
    const element = node.nodeType === Node.ELEMENT_NODE
        ? node
        : node.parentElement;
    if (!element) return [];

    const messages = new Set();
    if (element.matches(MESSAGE_SELECTOR)) messages.add(element);
    const parentMessage = element.closest(MESSAGE_SELECTOR);
    if (parentMessage) messages.add(parentMessage);
    element.querySelectorAll(MESSAGE_SELECTOR).forEach((message) => messages.add(message));
    return [...messages];
}

export default function AutoDismissMessages() {
    useEffect(() => {
        const timers = new Map();
        const dismissAfterDelay = (message) => {
            const existingTimer = timers.get(message);
            if (existingTimer) window.clearTimeout(existingTimer);

            message.classList.remove("message-auto-dismissed");
            message.removeAttribute("aria-hidden");

            const timer = window.setTimeout(() => {
                if (message.isConnected) {
                    message.classList.add("message-auto-dismissed");
                    message.setAttribute("aria-hidden", "true");
                }
                timers.delete(message);
            }, DISMISS_DELAY_MS);
            timers.set(message, timer);
        };

        document.querySelectorAll(MESSAGE_SELECTOR).forEach(dismissAfterDelay);
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === "characterData") {
                    findMessages(mutation.target).forEach(dismissAfterDelay);
                    return;
                }
                mutation.addedNodes.forEach((node) => {
                    findMessages(node).forEach(dismissAfterDelay);
                });
            });
        });

        observer.observe(document.body, {
            childList: true,
            characterData: true,
            subtree: true
        });

        return () => {
            observer.disconnect();
            timers.forEach((timer) => window.clearTimeout(timer));
        };
    }, []);

    return null;
}
