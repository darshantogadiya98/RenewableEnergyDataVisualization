// src/api/alerts.ts
import api, { handleApiError } from "./apiClient";
import type { AxiosError } from "axios";

export interface AlertIn {
  metric: string;
  threshold: number;
  direction: "above" | "below";
}

export interface Alert {
  id: string;
  metric: string;
  threshold: number;
  direction: "above" | "below";
  created_at: string;
}

export const fetchAlerts = async (): Promise<Alert[]> => {
  try {
    const response = await api.get<Alert[]>("/alerts/");
    console.log("ALERTS::", response.data);
    return response.data;
  } catch (err) {
    handleApiError(err as AxiosError);
    return [];
  }
};

export const createAlert = async (payload: AlertIn): Promise<Alert | null> => {
  try {
    console.log("Alert Create Payload:>", payload);
    const response = await api.post<Alert>("/alerts/", payload);
    console.log("ALERT_CREATE::", response.data);
    return response.data;
  } catch (err) {
    handleApiError(err as AxiosError);
    return null;
  }
};

export const removeAlert = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`/alerts/${id}`);
    console.log("ALERT_DELETE::", id);
    return true;
  } catch (err) {
    handleApiError(err as AxiosError);
    return false;
  }
};
