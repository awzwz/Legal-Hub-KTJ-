import type { ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import NotFound from "./pages/NotFound.tsx";

const ACCESS_TOKEN_KEY = "legalhub_access_token";

/** В production-сборке без мока главная требует JWT (как на EC2 с RELAX_AUTH=false). */
function RequireSession({ children }: { children: ReactNode }) {
  const forceMock = import.meta.env.VITE_FORCE_MOCK === "true";
  if (forceMock) return <>{children}</>;
  if (!import.meta.env.PROD) return <>{children}</>;
  const has =
    typeof window !== "undefined" && !!localStorage.getItem(ACCESS_TOKEN_KEY);
  if (!has) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <RequireSession>
                <Index />
              </RequireSession>
            }
          />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
