"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  apiGet,
  apiLogin,
  apiRegister,
  clearTokens,
  storeTokens,
  type LoginResponse,
  type UserResponse,
} from "./api";

// ---------------------------------------------------------------------------
// Context shape
// ---------------------------------------------------------------------------

interface AuthContextValue {
  user: UserResponse | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  /** Rehydrate user from stored token on mount. */
  useEffect(() => {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("lexicon_access_token")
        : null;

    if (!token) {
      setIsLoading(false);
      return;
    }

    apiGet<UserResponse>("/auth/me")
      .then(setUser)
      .catch(() => {
        clearTokens();
      })
      .finally(() => setIsLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const data: LoginResponse = await apiLogin(email, password);
    storeTokens(data.access_token, data.refresh_token);
    const me = await apiGet<UserResponse>("/auth/me");
    setUser(me);
  }, []);

  const register = useCallback(
    async (email: string, password: string, fullName: string) => {
      const data: LoginResponse = await apiRegister(email, password, fullName);
      storeTokens(data.access_token, data.refresh_token);
      const me = await apiGet<UserResponse>("/auth/me");
      setUser(me);
    },
    [],
  );

  const logout = useCallback(() => {
    clearTokens();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
