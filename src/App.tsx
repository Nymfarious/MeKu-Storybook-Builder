import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/hooks/useAuth";
import ProtectedRoute from "@/components/ProtectedRoute";
import Layout from "./components/Layout";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import NotFound from "./pages/NotFound";
import GraphicNovelBuilder from "./pages/GraphicNovelBuilder";
import Assets from "./pages/Assets";  
import Settings from "./pages/Settings";
import Props from "./pages/Props";
import SavedPages from "./pages/SavedPages";
import Storybook from "./pages/Storybook";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/auth" element={<Auth />} />
            <Route path="/" element={
              <ProtectedRoute>
                <Layout>
                  <Index />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/graphic-novel-builder" element={
              <ProtectedRoute>
                <Layout>
                  <GraphicNovelBuilder />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/assets" element={
              <ProtectedRoute>
                <Layout>
                  <Assets />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/settings" element={
              <ProtectedRoute>
                <Layout>
                  <Settings />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/props" element={
              <ProtectedRoute>
                <Layout>
                  <Props />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/saved-pages" element={
              <ProtectedRoute>
                <Layout>
                  <SavedPages />
                </Layout>
              </ProtectedRoute>
            } />
            <Route path="/storybook/:id" element={
              <ProtectedRoute>
                <Layout>
                  <Storybook />
                </Layout>
              </ProtectedRoute>
            } />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
