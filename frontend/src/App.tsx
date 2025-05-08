"use client";
import React, { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider, useAuth } from "./context/auth";
import { EnergyDataProvider } from "./context/data";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";

// Redirects to login if unauthenticated
function ProtectedRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? children : <Navigate to="/login" replace />;
}

// Redirects to dashboard if authenticated
function UnauthRoute({ children }: { children: JSX.Element }) {
  const { isAuthenticated } = useAuth();
  return isAuthenticated ? <Navigate to="/" replace /> : children;
}

const queryClient = new QueryClient();

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <EnergyDataProvider>
          <BrowserRouter>
            <Routes>
              <Route
                path="/login"
                element={
                  <UnauthRoute>
                    <AuthPage />
                  </UnauthRoute>
                }
              />
              <Route
                path="/register"
                element={
                  <UnauthRoute>
                    <AuthPage />
                  </UnauthRoute>
                }
              />
              <Route path="/" element={<Navigate to="/dashboard" replace />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </EnergyDataProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
