import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { apiRequest } from "../services/api";

const AuthContext = createContext(null);

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
            if (error.status === 401) {
                setUser(null);
                return;
            }
            setAuthError(error.message);
        } finally {
            setIsLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshUser();
    }, [refreshUser]);

    const login = useCallback(async (role, credentials) => {
        const result = await apiRequest(`/auth/${role}/login`, {
            method: "POST",
            body: credentials
        });
        setUser(result.user);
        setAuthError("");
        return result.user;
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

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider.");
    }
    return context;
}
