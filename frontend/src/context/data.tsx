/* ────────── src/context/data.tsx ───────────────────────────────────────── */
"use client";

import { createContext, useContext, ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { fetchEnergyData, EnergyRow } from "../api/energy";

/* ------------------------------------------------------------------ */
/*  Context shape                                                     */
/* ------------------------------------------------------------------ */
interface EnergyCtx {
  data?: EnergyRow[];
  isLoading: boolean;
  error?: unknown;
}

const EnergyDataContext = createContext<EnergyCtx>({
  isLoading: false,
});

/* ------------------------------------------------------------------ */
/*  Provider – *function* export keeps HMR happy                      */
/* ------------------------------------------------------------------ */
export function EnergyDataProvider({ children }: { children: ReactNode }) {
  const {
    data,
    isPending, //  v‑5 name
    error,
  } = useQuery({
    queryKey: ["energy-data"],
    queryFn: fetchEnergyData, // ← comes from src/api/energy.ts
    refetchInterval: 300_000, // refresh every 5 minutes
    staleTime: 55_000,
  });

  return (
    <EnergyDataContext.Provider value={{ data, isLoading: isPending, error }}>
      {children}
    </EnergyDataContext.Provider>
  );
}

/* ------------------------------------------------------------------ */
/*  Hook – stable function export as well                             */
/* ------------------------------------------------------------------ */
export function useEnergyData() {
  return useContext(EnergyDataContext);
}
