// src/api/energy.ts
import api from "./apiClient";
import { handleApiError } from "./apiClient";
import { AxiosError } from "axios";

export interface EnergyRow {
  id: string;
  timestamp: string;
  consumption_kwh: number;
  production_kwh: number;
  nuclear_kwh: number;
  wind_kwh: number;
  hydroelectric_kwh: number;
  oil_and_gas_kwh: number;
  coal_kwh: number;
  solar_kwh: number;
  biomass_kwh: number;
}

/**
 * Fetch all energy readings from the API
 */
export const fetchEnergyData = async (): Promise<EnergyRow[]> => {
  try {
    const response = await api.get<EnergyRow[]>("/energy/");
    console.log("ENERGYDATA::", response);
    return response.data;
  } catch (err) {
    handleApiError(err as AxiosError);
  }
};
