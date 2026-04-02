import { Suspense, lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";

const ProductPage = lazy(() => import("./pages/ProductPage"));
const StorePage = lazy(() => import("./pages/StorePage"));
const CheckoutPage = lazy(() => import("./pages/CheckoutPage"));
const AdminLogin = lazy(() => import("./pages/AdminLogin"));
const AdminLayout = lazy(() => import("./components/admin/AdminLayout"));
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminLiveView = lazy(() => import("./pages/admin/AdminLiveView"));
const AdminAnalytics = lazy(() => import("./pages/admin/AdminAnalytics"));
const AdminOrders = lazy(() => import("./pages/admin/AdminOrders"));
const AdminAbandonedCarts = lazy(() => import("./pages/admin/AdminAbandonedCarts"));
const AdminProducts = lazy(() => import("./pages/admin/AdminProducts"));
const AdminReviews = lazy(() => import("./pages/admin/AdminReviews"));
const AdminBadges = lazy(() => import("./pages/admin/AdminBadges"));
const AdminGateways = lazy(() => import("./pages/admin/AdminGateways"));
const AdminShipping = lazy(() => import("./pages/admin/AdminShipping"));
const AdminOrderBumps = lazy(() => import("./pages/admin/AdminOrderBumps"));
const AdminCheckoutBuilder = lazy(() => import("./pages/admin/AdminCheckoutBuilder"));
const AdminProductBuilder = lazy(() => import("./pages/admin/AdminProductBuilder"));
const AdminPixels = lazy(() => import("./pages/admin/AdminPixels"));
const AdminWebhooks = lazy(() => import("./pages/admin/AdminWebhooks"));
const AdminNotifications = lazy(() => import("./pages/admin/AdminNotifications"));
const AdminStores = lazy(() => import("./pages/admin/AdminStores"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const RouteLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <p className="text-sm text-muted-foreground">Carregando...</p>
  </div>
);

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Suspense fallback={<RouteLoader />}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/product/:slug" element={<ProductPage />} />
            <Route path="/loja/:slug" element={<StorePage />} />
            <Route path="/checkout/:slug" element={<CheckoutPage />} />
            <Route path="/admin/login" element={<AdminLogin />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboard />} />
              <Route path="live-view" element={<AdminLiveView />} />
              <Route path="analytics" element={<AdminAnalytics />} />
              <Route path="orders" element={<AdminOrders />} />
              <Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
              <Route path="products" element={<AdminProducts />} />
              <Route path="reviews" element={<AdminReviews />} />
              <Route path="badges" element={<AdminBadges />} />
              <Route path="gateways" element={<AdminGateways />} />
              <Route path="shipping" element={<AdminShipping />} />
              <Route path="order-bumps" element={<AdminOrderBumps />} />
              <Route path="checkout-builder" element={<AdminCheckoutBuilder />} />
              <Route path="product-builder" element={<AdminProductBuilder />} />
              <Route path="pixels" element={<AdminPixels />} />
              <Route path="webhooks" element={<AdminWebhooks />} />
              <Route path="notifications" element={<AdminNotifications />} />
              <Route path="stores" element={<AdminStores />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
