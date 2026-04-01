import type { AdminOrderRecord, DateFilter, OrderStatus } from "./types";

export const orderStatusOptions: Array<{ value: "all" | OrderStatus; label: string }> = [
  { value: "all", label: "Todos" },
  { value: "paid", label: "Pagos" },
  { value: "pending", label: "Pendentes" },
  { value: "expired", label: "Expirados" },
];

export const orderDateOptions: Array<{ value: DateFilter; label: string }> = [
  { value: "all", label: "Todo período" },
  { value: "today", label: "Hoje" },
  { value: "week", label: "Últimos 7 dias" },
  { value: "month", label: "Este mês" },
];

const statusMeta: Record<OrderStatus, { label: string; className: string }> = {
  pending: {
    label: "Pendente",
    className: "border-blue-200 bg-blue-50 text-blue-600 dark:border-blue-800 dark:bg-blue-950 dark:text-blue-400",
  },
  paid: {
    label: "Pago",
    className: "border-marketplace-green/20 bg-marketplace-green-light text-marketplace-green",
  },
  expired: {
    label: "Expirado",
    className: "border-marketplace-red/20 bg-marketplace-red-light text-marketplace-red",
  },
};

export const getOrderStatusMeta = (status: OrderStatus) => statusMeta[status] ?? statusMeta.pending;

export const isUuid = (value: string) =>
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);

export const getEffectiveStatus = (order: AdminOrderRecord): OrderStatus => {
  if (order.payment_status === "paid") return "paid";
  if (order.payment_status === "expired") return "expired";
  return "pending";
};

export const matchesDateFilter = (order: AdminOrderRecord, filter: DateFilter) => {
  if (filter === "all") return true;

  const createdAt = new Date(order.created_at);
  const now = new Date();

  if (filter === "today") {
    return createdAt.toDateString() === now.toDateString();
  }

  if (filter === "week") {
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return createdAt >= weekAgo;
  }

  if (filter === "month") {
    return createdAt.getMonth() === now.getMonth() && createdAt.getFullYear() === now.getFullYear();
  }

  return true;
};

export const formatCurrency = (value: number | null | undefined) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

export const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

export const formatDate = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "--";
  }

  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
};

export const getShortOrderId = (id: string) => `#${id.slice(0, 8)}`;

export const getDisplayVariantLabel = (order: AdminOrderRecord) => {
  if (order.variant_name) return order.variant_name;
  if (!order.product_variant || isUuid(order.product_variant)) return null;
  return order.product_variant;
};

export const getPaymentMethodLabel = (method: string) => {
  const normalized = method.trim().toLowerCase();
  if (normalized === "pix") return "Pix";
  if (!normalized) return "Não informado";
  return normalized.toUpperCase();
};

export const getCustomerInitials = (name: string) => {
  const initials = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("");

  return initials || "CL";
};

export const isQrImageSource = (value?: string | null) => {
  if (!value) return false;

  const normalized = value.trim();
  return normalized.startsWith("data:image/") || normalized.startsWith("http://") || normalized.startsWith("https://") || normalized.startsWith("/");
};
