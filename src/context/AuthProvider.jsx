import { useCallback, useEffect, useMemo, useState } from "react";
import { AuthContext } from "./auth-context";
import { apiRequest } from "../services/api";

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [authError, setAuthError] = useState("");

    const refreshUser = useCallback(async () => {
        setIsLoading(true);
        setAuthError("");

        try {
            const result = await apiRequest("/auth/me");
            setUser(result.user);
        } catch (error) {
            if ([401, 403].includes(error.status)) {
                setUser(null);
                setAuthError("");
                return;
            }
            setAuthError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        Promise.resolve().then(refreshUser);
    }, [refreshUser]);

    const login = useCallback(async (role, credentials) => {
        try {
            const result = await apiRequest(`/auth/${role}/login`, {
                method: "POST",
                body: credentials
            });
            setUser(result.user);
            setAuthError("");
            return result.user;
        } catch (error) {
            setUser(null);
            throw error;
        }
    }, []);

    const register = useCallback(async (role, details) => {
        const result = await apiRequest(`/auth/${role}/register`, {
            method: "POST",
            body: details
        });
        return result.user;
    }, []);

    const updateProfile = useCallback(async (changes) => {
        const result = await apiRequest("/auth/me", {
            method: "PUT",
            body: changes
        });
        setUser(result.user);
        return result.user;
    }, []);

    const logout = useCallback(async () => {
        await apiRequest("/auth/logout", { method: "POST" });
        setUser(null);
        setAuthError("");
    }, []);

    const value = useMemo(() => ({
        user,
        isLoading,
        authError,
        refreshUser,
        login,
        register,
        updateProfile,
        logout
    }), [user, isLoading, authError, refreshUser, login, register, updateProfile, logout]);

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
