// src/context/auth.tsx
"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import axiosInst from "../api/apiClient"; // <- ★ REAL axios
import {
  loginApi,
  registerApi,
  refreshApi,
  getUserApi,
  UserOut,
} from "../api/auth";

/* ---------------- helpers ---------------- */
const decode = (t: string) => {
  try {
    return JSON.parse(atob(t.split(".")[1])) as { exp?: number; sub?: string };
  } catch {
    return {};
  }
};
const delay = (sec: number) => sec * 1_000;

/* ---------------- types ------------------ */
interface AuthCtx {
  user: UserOut | null;
  isAuthenticated: boolean;
  login: (e: string, p: string) => Promise<void>;
  register: (e: string, f: string, p: string) => Promise<void>;
  logout: () => void;
}

const Ctx = createContext<AuthCtx>({
  user: null,
  isAuthenticated: false,
  login: async () => {},
  register: async () => {},
  logout: () => {},
});

/* ====================================================== */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [access, setAccess] = useState(() =>
    sessionStorage.getItem("access_token")
  );
  const [refresh, setRefresh] = useState(() =>
    sessionStorage.getItem("refresh_token")
  );
  const [user, setUser] = useState<UserOut | null>(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
      return null;
    }
  });

  /* --------------- logout helper --------------- */
  const logout = useCallback(() => {
    setAccess(null);
    setRefresh(null);
    setUser(null);
    sessionStorage.clear();
    localStorage.removeItem("user");
  }, []);

  /* --------------- fetch profile --------------- */
  useEffect(() => {
    if (!access) {
      setUser(null);
      return;
    }
    const { sub } = decode(access);
    if (!sub) return logout();

    getUserApi(sub)
      .then((me) => {
        setUser(me);
        localStorage.setItem("user", JSON.stringify(me));
      })
      .catch(logout);
  }, [access, logout]);

  /* --------------- auto‑refresh --------------- */
  useEffect(() => {
    if (!access || !refresh) return;
    const { exp } = decode(access);
    if (!exp) return logout();

    const wait = Math.max((exp - Date.now() / 1_000) / 2, 5); // half TTL, min 5 s
    const id = setTimeout(async () => {
      try {
        const { access_token, refresh_token } = await refreshApi(refresh);
        sessionStorage.setItem("access_token", access_token);
        sessionStorage.setItem("refresh_token", refresh_token);
        setAccess(access_token);
        setRefresh(refresh_token);
      } catch {
        logout();
      }
    }, delay(wait));

    return () => clearTimeout(id);
  }, [access, refresh, logout]);

  /* --------------- axios interceptors ---------- */
  useEffect(() => {
    /* attach bearer */
    const reqId = axiosInst.interceptors.request.use((cfg) => {
      if (access) cfg.headers!.Authorization = `Bearer ${access}`;
      return cfg;
    });

    /* 401 → single retry via refresh */
    const resId = axiosInst.interceptors.response.use(
      (r) => r,
      async (err) => {
        const cfg: any = err.config;
        if (err.response?.status === 401 && refresh && !cfg._retry) {
          cfg._retry = true;
          try {
            const { access_token, refresh_token } = await refreshApi(refresh);
            sessionStorage.setItem("access_token", access_token);
            sessionStorage.setItem("refresh_token", refresh_token);
            setAccess(access_token);
            setRefresh(refresh_token);
            cfg.headers.Authorization = `Bearer ${access_token}`;
            return axiosInst.request(cfg);
          } catch {
            logout();
          }
        }
        return Promise.reject(err);
      }
    );
    return () => {
      axiosInst.interceptors.request.eject(reqId);
      axiosInst.interceptors.response.eject(resId);
    };
  }, [access, refresh, logout]);

  /* --------------- public actions --------------- */
  const login = useCallback(async (email: string, pw: string) => {
    const { access_token, refresh_token } = await loginApi(email, pw);
    sessionStorage.setItem("access_token", access_token);
    sessionStorage.setItem("refresh_token", refresh_token);
    setAccess(access_token);
    setRefresh(refresh_token);
  }, []);

  const register = useCallback(
    (e: string, f: string, p: string) => registerApi(e, f, p),
    []
  );

  /* --------------------------------------------- */
  const value: AuthCtx = {
    user,
    isAuthenticated: Boolean(access && user),
    login,
    register,
    logout,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};

export const useAuth = () => useContext(Ctx);
