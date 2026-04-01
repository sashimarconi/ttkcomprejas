import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { toast } from "sonner";
import { OrderDetailsView } from "@/components/admin/orders/OrderDetailsView";
import { OrdersListView } from "@/components/admin/orders/OrdersListView";
import { getEffectiveStatus, isUuid, matchesDateFilter } from "@/components/admin/orders/order-utils";
import type { AdminOrderRecord, DateFilter, OrderStats, StatusFilter } from "@/components/admin/orders/types";
import { supabase } from "@/integrations/supabase/client";

interface ProductSummary {
  id: string;
  title: string | null;
}

interface ShippingSummary {
  id: string;
  name: string | null;
}

interface VariantSummary {
  id: string;
  name: string;
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<AdminOrderRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [searchParams, setSearchParams] = useSearchParams();

  const fetchOrders = useCallback(async () => {
    setLoading(true);

    try {
      const { data, error } = await supabase.from("orders").select("*").order("created_at", { ascending: false });

      if (error) {
        throw error;
      }

      const rows = (data || []) as AdminOrderRecord[];
      const productIds = Array.from(new Set(rows.map((order) => order.product_id).filter((value): value is string => Boolean(value))));
      const shippingIds = Array.from(new Set(rows.map((order) => order.shipping_option_id).filter((value): value is string => Boolean(value))));
      const variantIds = Array.from(
        new Set(rows.map((order) => order.product_variant).filter((value): value is string => Boolean(value) && isUuid(value))),
      );

      const productPromise = productIds.length
        ? supabase
            .from("products")
            .select("id, title")
            .in("id", productIds)
            .then((result) => ({ data: (result.data || []) as ProductSummary[], error: result.error }))
        : Promise.resolve({ data: [] as ProductSummary[], error: null });

      const shippingPromise = shippingIds.length
        ? supabase
            .from("shipping_options")
            .select("id, name")
            .in("id", shippingIds)
            .then((result) => ({ data: (result.data || []) as ShippingSummary[], error: result.error }))
        : Promise.resolve({ data: [] as ShippingSummary[], error: null });

      const variantPromise = variantIds.length
        ? supabase
            .from("product_variants")
            .select("id, name")
            .in("id", variantIds)
            .then((result) => ({ data: (result.data || []) as VariantSummary[], error: result.error }))
        : Promise.resolve({ data: [] as VariantSummary[], error: null });

      const [productsResult, shippingResult, variantResult] = await Promise.all([
        productPromise,
        shippingPromise,
        variantPromise,
      ]);

      if (productsResult.error) throw productsResult.error;
      if (shippingResult.error) throw shippingResult.error;
      if (variantResult.error) throw variantResult.error;

      const productMap = new Map(productsResult.data.map((product) => [product.id, product.title]));
      const shippingMap = new Map(shippingResult.data.map((shipping) => [shipping.id, shipping.name]));
      const variantMap = new Map(variantResult.data.map((variant) => [variant.id, variant.name]));

      setOrders(
        rows.map((order) => ({
          ...order,
          product: order.product_id ? { title: productMap.get(order.product_id) ?? null } : null,
          shipping_option: order.shipping_option_id ? { name: shippingMap.get(order.shipping_option_id) ?? null } : null,
          variant_name: order.product_variant
            ? variantMap.get(order.product_variant) ?? (isUuid(order.product_variant) ? null : order.product_variant)
            : null,
        })),
      );
    } catch (error) {
      console.error("Erro ao carregar pedidos:", error);
      toast.error("Não foi possível carregar os pedidos");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrders();

    const interval = window.setInterval(fetchOrders, 10000);
    const handleFocus = () => fetchOrders();

    window.addEventListener("focus", handleFocus);

    return () => {
      window.clearInterval(interval);
      window.removeEventListener("focus", handleFocus);
    };
  }, [fetchOrders]);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const effectiveStatus = getEffectiveStatus(order);

        if (statusFilter !== "all" && effectiveStatus !== statusFilter) {
          return false;
        }

        if (!matchesDateFilter(order, dateFilter)) {
          return false;
        }

        const normalizedSearch = search.trim().toLowerCase();
        if (!normalizedSearch) {
          return true;
        }

        const searchableValues = [
          order.id,
          order.customer_name,
          order.customer_email,
          order.customer_phone,
          order.customer_document,
          order.transaction_id,
          order.product?.title,
          order.variant_name,
          order.product_variant,
          order.shipping_option?.name,
        ];

        return searchableValues.some((value) => String(value || "").toLowerCase().includes(normalizedSearch));
      }),
    [dateFilter, orders, search, statusFilter],
  );

  const stats = useMemo<OrderStats>(
    () => ({
      total: orders.length,
      paid: orders.filter((order) => getEffectiveStatus(order) === "paid").length,
      pending: orders.filter((order) => getEffectiveStatus(order) === "pending").length,
      abandoned: orders.filter((order) => getEffectiveStatus(order) === "abandoned").length,
      copied: orders.filter((order) => Boolean(order.pix_copied)).length,
    }),
    [orders],
  );

  const selectedOrderId = searchParams.get("order");
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) ?? null;

  const openOrderDetails = (orderId: string) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set("order", orderId);
    setSearchParams(nextParams);
  };

  const closeOrderDetails = () => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete("order");
    setSearchParams(nextParams);
  };

  if (selectedOrder) {
    return <OrderDetailsView order={selectedOrder} onBack={closeOrderDetails} onRefresh={fetchOrders} />;
  }

  return (
    <OrdersListView
      orders={orders}
      filteredOrders={filteredOrders}
      loading={loading}
      search={search}
      statusFilter={statusFilter}
      dateFilter={dateFilter}
      stats={stats}
      onSearchChange={setSearch}
      onStatusFilterChange={setStatusFilter}
      onDateFilterChange={setDateFilter}
      onRefresh={fetchOrders}
      onSelectOrder={openOrderDetails}
    />
  );
};

export default AdminOrders;
