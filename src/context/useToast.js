import { useContext } from "react";
import { ToastContext } from "./toast-context";

export function useToast() {
    const notify = useContext(ToastContext);
    if (!notify) throw new Error("useToast must be used within ToastProvider.");
    return notify;
}
