// Keeps track of who is logged in and shares it with every component.
//   const { user, login, logout } = useAuth();
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, tokenStore } from "../api/client.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(Boolean(tokenStore.get()));

  // On page load: if we have a saved token, ask the server who it belongs to
  useEffect(() => {
    if (!tokenStore.get()) return;
    api("/auth/me")
      .then(data => setUser(data.user))
      .catch(() => tokenStore.clear())
      .finally(() => setChecking(false));
  }, []);

  // The API client fires this event when the server says the token expired
  useEffect(() => {
    const onLogout = () => setUser(null);
    window.addEventListener("smartstock:logout", onLogout);
    return () => window.removeEventListener("smartstock:logout", onLogout);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await api("/auth/login", { method: "POST", body: { email, password } });
    tokenStore.set(data.token);
    setUser(data.user);
    return data.user;
  }, []);

  const logout = useCallback(() => {
    tokenStore.clear();
    setUser(null);
  }, []);

  const value = useMemo(() => ({
    user,
    checking,
    login,
    logout,
    canSeeAllBranches: user?.role === "admin" || user?.role === "manager",
    hasRole: (...roles) => Boolean(user && roles.includes(user.role))
  }), [user, checking, login, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
