import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { getEffectiveStatus, getOrderStatusMeta } from "./order-utils";
import type { AdminOrderRecord } from "./types";

interface OrderStatusBadgeProps {
  order: AdminOrderRecord;
  className?: string;
}

export const OrderStatusBadge = ({ order, className }: OrderStatusBadgeProps) => {
  const meta = getOrderStatusMeta(getEffectiveStatus(order));

  return (
    <Badge
      variant="outline"
      className={cn("justify-center rounded-full px-3 py-1 text-xs font-medium", meta.className, className)}
    >
      {meta.label}
    </Badge>
  );
};
