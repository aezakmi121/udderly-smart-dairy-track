
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Navbar } from "@/components/Navbar";
import Index from "./pages/Index";
import Cows from "./pages/Cows";
import MilkProduction from "./pages/MilkProduction";
import Analytics from "./pages/Analytics";
import Farmers from "./pages/Farmers";
import Auth from "./pages/Auth";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <div className="min-h-screen bg-gray-50">
                    <Navbar />
                    <main className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
                      <Routes>
                        <Route path="/" element={<Index />} />
                        <Route path="/cows" element={<Cows />} />
                        <Route path="/milk-production" element={<MilkProduction />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/farmers" element={<Farmers />} />
                      </Routes>
                    </main>
                  </div>
                </ProtectedRoute>
              }
            />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
