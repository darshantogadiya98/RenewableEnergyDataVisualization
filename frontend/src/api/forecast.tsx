// src/api/forecast.ts
import api, { handleApiError } from "./apiClient";
import type { AxiosError } from "axios";

export type ForecastModel = "hw" | "prophet" | "xgb" | "lgbm";

export const fetchForecast = async (
  metric: string,
  horizon = 24,
  model: ForecastModel = "hw"
): Promise<[string, number][]> => {
  try {
    const response = await api.get<[string, number][]>(`/forecast/${metric}`, {
      params: { horizon, model },
    });
    console.log("FORECAST::", response.data);
    return response.data;
  } catch (err) {
    handleApiError(err as AxiosError);
    return [];
  }
};
