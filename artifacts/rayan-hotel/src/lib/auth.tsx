import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useGetMe } from "@workspace/api-client-react";
import { setAuthTokenGetter } from "@workspace/api-client-react/src/custom-fetch";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: "super_admin" | "manager" | "employee";
  isBlocked: boolean;
  isPremium: boolean;
  avatarUrl?: string | null;
  createdAt: string;
}

interface AuthContextType {
  token: string | null;
  setToken: (token: string | null, remember?: boolean) => void;
  logout: () => void;
  user: AuthUser | null;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function getStoredToken(): string | null {
  return localStorage.getItem("rayan_token") || sessionStorage.getItem("rayan_token");
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setTokenState] = useState<string | null>(getStoredToken);
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();

  useEffect(() => {
    const stored = getStoredToken();
    if (stored) setAuthTokenGetter(() => stored);
  }, []);

  const setToken = (newToken: string | null, remember = true) => {
    if (newToken) {
      if (remember) {
        localStorage.setItem("rayan_token", newToken);
        sessionStorage.removeItem("rayan_token");
      } else {
        sessionStorage.setItem("rayan_token", newToken);
        localStorage.removeItem("rayan_token");
      }
      setAuthTokenGetter(() => newToken);
    } else {
      localStorage.removeItem("rayan_token");
      sessionStorage.removeItem("rayan_token");
      setAuthTokenGetter(null);
    }
    setTokenState(newToken);
  };

  const logout = () => {
    setToken(null);
    queryClient.clear();
    setLocation("/login");
  };

  const { data: user, isLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      retry: false,
      queryKey: ["getMe"],
    }
  });

  useEffect(() => {
    if (error && token) {
      setToken(null);
      queryClient.clear();
      setLocation("/login");
    }
  }, [error]);

  return (
    <AuthContext.Provider value={{ token, setToken, logout, user: (user as AuthUser) || null, isLoading: !!token && isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within AuthProvider");
  return context;
}
