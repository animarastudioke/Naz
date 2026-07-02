"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { Permission } from "@kazihq/shared";
import { api, storeTokens, clearTokens } from "./api";

interface CurrentBusiness {
  id: string;
  name: string;
  slug: string;
}
interface CurrentUser {
  id: string;
  fullName: string;
  email: string;
}

interface AuthState {
  user: CurrentUser | null;
  business: CurrentBusiness | null;
  permissions: Permission[];
  loading: boolean;
  setSession: (data: { user: CurrentUser; business: CurrentBusiness; accessToken: string; refreshToken: string }) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [business, setBusiness] = useState<CurrentBusiness | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const cachedUser = localStorage.getItem("kazihq_user");
    const cachedBusiness = localStorage.getItem("kazihq_business");
    if (cachedUser && cachedBusiness) {
      setUser(JSON.parse(cachedUser));
      setBusiness(JSON.parse(cachedBusiness));
    }
    setLoading(false);
  }, []);

  const setSession: AuthState["setSession"] = ({ user, business, accessToken, refreshToken }) => {
    storeTokens(accessToken, refreshToken);
    localStorage.setItem("kazihq_user", JSON.stringify(user));
    localStorage.setItem("kazihq_business", JSON.stringify(business));
    setUser(user);
    setBusiness(business);
  };

  const logout = () => {
    clearTokens();
    localStorage.removeItem("kazihq_user");
    localStorage.removeItem("kazihq_business");
    setUser(null);
    setBusiness(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, business, permissions: [], loading, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (!auth.loading && !auth.user) router.replace("/login");
  }, [auth.loading, auth.user, router]);
  return auth;
}

// Re-export for convenience in pages that only need the API helper.
export { api };
