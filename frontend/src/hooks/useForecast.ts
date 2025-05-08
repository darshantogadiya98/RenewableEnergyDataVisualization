// src/hooks/useForecast.ts
import { useQuery } from "@tanstack/react-query";
import { fetchForecast, ForecastModel } from "../api/forecast";

export const useForecast = (
  metric: string,
  horizon = 24,
  model: ForecastModel = "hw",
  enabled = false
) =>
  useQuery<[string, number][]>({
    queryKey: ["forecast", metric, horizon, model],
    queryFn: () => fetchForecast(metric, horizon, model),
    enabled,
  });
