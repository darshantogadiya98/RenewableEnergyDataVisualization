import axios, { AxiosRequestConfig, AxiosError } from "axios";

// Common error handler
export function handleApiError(error: AxiosError): never {
  if (error.response) {
    // Server responded with a status code outside 2xx
    const msg = error.response.data?.message || error.response.statusText;
    throw new Error(`API Error: ${msg}`);
  } else if (error.request) {
    // Request was made but no response
    throw new Error("Network error: No response from server");
  } else {
    // Something else happened
    throw new Error(error.message);
  }
}

// Create axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL,
  withCredentials: true,
});

// Attach access token
api.interceptors.request.use((config: AxiosRequestConfig) => {
  const token = sessionStorage.getItem("access_token");
  if (token && config.headers) {
    config.headers["Authorization"] = `Bearer ${token}`;
  }
  return config;
});

// Refresh logic and error handling
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const axiosError = error as AxiosError;
    if (axiosError.response?.status === 401) {
      const refresh = sessionStorage.getItem("refresh_token");
      if (refresh) {
        try {
          const res = await api.post<{
            access_token: string;
            refresh_token: string;
          }>("/users/refresh", { refresh_token: refresh });
          const { access_token, refresh_token } = res.data;
          sessionStorage.setItem("access_token", access_token);
          sessionStorage.setItem("refresh_token", refresh_token);
          // retry
          const original = axiosError.config;
          original.headers = original.headers || {};
          original.headers["Authorization"] = `Bearer ${access_token}`;
          return api.request(original);
        } catch (e) {
          // failed refresh
          sessionStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    handleApiError(axiosError);
  }
);

export default api;
