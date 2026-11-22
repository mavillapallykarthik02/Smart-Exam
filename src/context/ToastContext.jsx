import { useCallback, useEffect, useState } from "react";
import { ToastContext } from "./toast-context";

function ToastItem({ toast, onDismiss }) {
    useEffect(() => {
        const timer = window.setTimeout(() => onDismiss(toast.id), 4500);
        return () => window.clearTimeout(timer);
    }, [onDismiss, toast.id]);

    return (
        <div className={`app-toast app-toast--${toast.type}`} role={toast.type === "error" ? "alert" : "status"}>
            <span className="app-toast-icon" aria-hidden="true">
                {toast.type === "error" ? "!" : toast.type === "success" ? "✓" : "i"}
            </span>
            <p>{toast.message}</p>
            <button type="button" onClick={() => onDismiss(toast.id)} aria-label="Dismiss notification">
                ×
            </button>
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
        setToasts((current) => [...current, { id, message, type }].slice(-4));
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

