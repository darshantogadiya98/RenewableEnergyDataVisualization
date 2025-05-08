// src/api/favourites.ts
import api, { handleApiError } from "./apiClient";
import type { AxiosError } from "axios";

export interface FavouriteIn {
  name: string;
  config_json: any;
}

export interface Favourite {
  id: string;
  name: string;
  config_json: any;
  created_at: string;
}

export const fetchFavourites = async (): Promise<Favourite[]> => {
  try {
    const response = await api.get<Favourite[]>("/favourites/");
    console.log("FAVOURITES::", response.data);
    return response.data;
  } catch (err) {
    handleApiError(err as AxiosError);
    return [];
  }
};

export const createFavourite = async (
  payload: FavouriteIn
): Promise<Favourite | null> => {
  try {
    const response = await api.post<Favourite>("/favourites/", payload);
    console.log("FAV_CREATE::", response.data);
    return response.data;
  } catch (err) {
    handleApiError(err as AxiosError);
    return null;
  }
};

export const removeFavourite = async (id: string): Promise<boolean> => {
  try {
    await api.delete(`/favourites/${id}`);
    console.log("FAV_DELETE::", id);
    return true;
  } catch (err) {
    handleApiError(err as AxiosError);
    return false;
  }
};
