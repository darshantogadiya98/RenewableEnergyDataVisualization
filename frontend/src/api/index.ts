// src/api/index.ts
import { refreshApi } from "./auth";

const BASE = import.meta.env.VITE_API_BASE_URL;
// const BASE =
//   "http://energy-dashboard-env.eba-paf3yb2j.us-west-2.elasticbeanstalk.com";

export const apiFetch = async (path: string, opts: RequestInit = {}) => {
  // build headers
  const accessToken = sessionStorage.getItem("token");
  const refreshToken = sessionStorage.getItem("refresh_token");
  const headers: Record<string, string> = {
    ...Object(opts.headers),
    ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };

  // first attempt
  let res = await fetch(BASE + path, {
    ...opts,
    headers,
    credentials: "include",
  });

  // if unauthorized, try refreshing
  if (res.status === 401 && refreshToken) {
    try {
      const { access_token, refresh_token } = await refreshApi(refreshToken);
      // store new tokens
      sessionStorage.setItem("token", access_token);
      sessionStorage.setItem("refresh_token", refresh_token);
      // retry original request with new access token
      headers.Authorization = `Bearer ${access_token}`;
      res = await fetch(BASE + path, {
        ...opts,
        headers,
        credentials: "include",
      });
    } catch {
      // refresh failed—clear session and rethrow
      sessionStorage.removeItem("token");
      sessionStorage.removeItem("refresh_token");
      throw new Error("Session expired. Please log in again.");
    }
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `API error ${res.status}`);
  }

  return res.json();
};
