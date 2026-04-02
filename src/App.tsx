import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import ProductPage from "./pages/ProductPage";
import StorePage from "./pages/StorePage";
import AdminLogin from "./pages/AdminLogin";
import AdminLayout from "./components/admin/AdminLayout";
import AdminProducts from "./pages/admin/AdminProducts";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminOrders from "./pages/admin/AdminOrders";
import AdminReviews from "./pages/admin/AdminReviews";
import AdminBadges from "./pages/admin/AdminBadges";
import AdminGateways from "./pages/admin/AdminGateways";
import AdminShipping from "./pages/admin/AdminShipping";
import AdminOrderBumps from "./pages/admin/AdminOrderBumps";
import CheckoutPage from "./pages/CheckoutPage";
import AdminCheckoutBuilder from "./pages/admin/AdminCheckoutBuilder";
import AdminProductBuilder from "./pages/admin/AdminProductBuilder";
import AdminPixels from "./pages/admin/AdminPixels";
import AdminStores from "./pages/admin/AdminStores";
import AdminLiveView from "./pages/admin/AdminLiveView";
import AdminAbandonedCarts from "./pages/admin/AdminAbandonedCarts";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
            <Route path="stores" element={<AdminStores />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
