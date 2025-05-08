// src/api/auth.ts
import api from "./apiClient";
import type { AxiosError } from "axios";
import { handleApiError } from "./apiClient";

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
}

export interface UserOut {
  id: string;
  email: string;
  full_name: string;
  created_at: string;
}

/**
 * Login with email/password, store tokens in sessionStorage.
 */
export const loginApi = async (
  email: string,
  password: string
): Promise<LoginResponse> => {
  try {
    const { data } = await api.post<LoginResponse>(
      "/users/login",
      { email, password },
      { headers: { "Content-Type": "application/json" } }
    );
    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("refresh_token", data.refresh_token);
    return data;
  } catch (err) {
    handleApiError(err as AxiosError);
    throw err;
  }
};

/**
 * Register a new user, no tokens returned.
 */
export const registerApi = async (
  email: string,
  full_name: string,
  password: string
): Promise<void> => {
  try {
    await api.post(
      "/users/register",
      { email, full_name, password },
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    handleApiError(err as AxiosError);
    throw err;
  }
};

/**
 * Refresh tokens using the stored refresh_token.
 */
export const refreshApi = async (
  refresh_token: string
): Promise<LoginResponse> => {
  try {
    const { data } = await api.post<LoginResponse>(
      "/users/refresh",
      { refresh_token },
      { headers: { "Content-Type": "application/json" } }
    );
    sessionStorage.setItem("access_token", data.access_token);
    sessionStorage.setItem("refresh_token", data.refresh_token);
    return data;
  } catch (err) {
    handleApiError(err as AxiosError);
    throw err;
  }
};

/**
 * Fetch a single user's profile by ID.
 * Requires that you're already authenticated (bearer token in sessionStorage).
 */
export const getUserApi = async (userId: string): Promise<UserOut> => {
  try {
    const { data } = await api.get<UserOut>(`/users/${userId}`);
    return data;
  } catch (err) {
    handleApiError(err as AxiosError);
    throw err;
  }
};

export default {
  loginApi,
  registerApi,
  refreshApi,
  getUserApi,
};
