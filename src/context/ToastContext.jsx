import { useCallback, useEffect, useState } from "react";
import { ToastContext } from "./toast-context";

function ToastItem({ toast, onDismiss }) {
    useEffect(() => {
        const timer = window.setTimeout(() => onDismiss(toast.id), 2750);
        return () => window.clearTimeout(timer);
    }, [onDismiss, toast.id]);

    const isLoginSuccess = toast.type === "success" && /signed in successfully/iu.test(toast.message);
    const title = isLoginSuccess
        ? "Login Successful"
        : toast.type === "error"
            ? "Unable to Complete"
            : toast.type === "info"
                ? "Notice"
                : "Success";
    const message = isLoginSuccess ? "Welcome back to your account." : toast.message;

    return (
        <div className={`app-toast app-toast--${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
            <span className="app-toast-icon" aria-hidden="true">
                {toast.type === "error" ? "!" : toast.type === "success" ? "✓" : "i"}
            </span>
            <strong className="app-toast-title">{title}</strong>
            <p>{message}</p>
        </div>
    );
}

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);
    const dismiss = useCallback((id) => {
        setToasts((current) => current.filter((toast) => toast.id !== id));
    }, []);

    const notify = useCallback((message, type = "success") => {
        if (!message) return;
        const id = `${Date.now()}-${Math.random()}`;
        setToasts([{ id, message, type }]);
    }, []);

    useEffect(() => {
        const handleToast = (event) => {
            const { message, type } = event.detail || {};
            notify(message, type);
        };
        window.addEventListener("smartexam:toast", handleToast);
        return () => window.removeEventListener("smartexam:toast", handleToast);
    }, [notify]);

    return (
        <ToastContext.Provider value={notify}>
            {children}
            <div className="app-toast-region" aria-label="Notifications">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
}

