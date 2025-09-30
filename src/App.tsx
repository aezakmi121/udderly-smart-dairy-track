
import React from 'react';
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { InstallPrompt } from "@/components/layout/InstallPrompt";
import { MainLayout } from "@/components/layout/MainLayout";

import { routes } from "@/config/routes";
import { ProtectedRoute as RouteProtectedRoute } from "@/components/common/ProtectedRoute";
import { ErrorBoundary } from "@/components/common/ErrorBoundary";
import { EnhancedToastProvider } from "@/components/ui/enhanced-toast";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const AppContent = () => {
  const enhancedToast = useEnhancedToast();

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <EnhancedToastProvider toasts={enhancedToast.toasts} onClose={enhancedToast.removeToast}>
            <Toaster />
            <BrowserRouter>
              <AuthProvider>
                <Routes>
                  <Route path="/auth" element={<Auth />} />
                  <Route
                    path="/*"
                    element={
                      <ProtectedRoute>
                        <MainLayout>
                          <Routes>
                            <Route path="/" element={
                              <RouteProtectedRoute>
                                {React.createElement(routes[0].component)}
                              </RouteProtectedRoute>
                            } />
                            {routes.map((route) => (
                              <Route
                                key={route.path}
                                path={route.path}
                                element={
                                  <RouteProtectedRoute permission={route.permission}>
                                    {React.createElement(route.component)}
                                  </RouteProtectedRoute>
                                }
                              />
                            ))}
                          </Routes>
                        </MainLayout>
                      </ProtectedRoute>
                    }
                  />
                </Routes>
              </AuthProvider>
              <InstallPrompt />
            </BrowserRouter>
          </EnhancedToastProvider>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
};

const App = () => <AppContent />;

export default App;
