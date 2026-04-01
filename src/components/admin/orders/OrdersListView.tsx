import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CheckCircle2, CircleAlert, Clock3, CopyCheck, Eye, Filter, Package2, RefreshCw, Search, Wallet } from "lucide-react";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { formatCurrency, formatDateTime, getDisplayVariantLabel, getPaymentMethodLabel, getShortOrderId, orderDateOptions, orderStatusOptions } from "./order-utils";
import type { AdminOrderRecord, DateFilter, OrderStats, StatusFilter } from "./types";

interface OrdersListViewProps {
  orders: AdminOrderRecord[];
  filteredOrders: AdminOrderRecord[];
  loading: boolean;
  search: string;
  statusFilter: StatusFilter;
  dateFilter: DateFilter;
  stats: OrderStats;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: StatusFilter) => void;
  onDateFilterChange: (value: DateFilter) => void;
  onRefresh: () => void;
  onSelectOrder: (id: string) => void;
}

export const OrdersListView = ({
  orders,
  filteredOrders,
  loading,
  search,
  statusFilter,
  dateFilter,
  stats,
  onSearchChange,
  onStatusFilterChange,
  onDateFilterChange,
  onRefresh,
  onSelectOrder,
}: OrdersListViewProps) => {
  const [filterOpen, setFilterOpen] = useState(false);

  const statCards = [
    { label: "Pedidos totais", value: stats.total, icon: Package2, tone: "text-foreground" },
    { label: "Pagos", value: stats.paid, icon: Wallet, tone: "text-marketplace-green" },
    { label: "Pendentes", value: stats.pending, icon: Clock3, tone: "text-marketplace-yellow" },
    { label: "Pix copiado", value: stats.copied, icon: CopyCheck, tone: "text-marketplace-blue" },
  ];

  const activeFilterCount = (statusFilter !== "all" ? 1 : 0) + (dateFilter !== "all" ? 1 : 0);

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Vendas</p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Pedidos</h1>
                <p className="text-sm text-muted-foreground">Gerencie pedidos pagos, pendentes e os cliques no botão de copiar PIX.</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={onRefresh} className="gap-2 self-start xl:self-auto">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            {statCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-border bg-muted/40 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{card.label}</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">{card.value}</p>
                  </div>
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-card shadow-sm">
                    <card.icon className={cn("h-5 w-5", card.tone)} />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border">
        <CardContent className="space-y-5 p-4 md:p-6">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex items-center gap-3 flex-1">
              <div className="relative flex-1 xl:max-w-md">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(event) => onSearchChange(event.target.value)}
                  placeholder="Buscar por ID, cliente, e-mail, telefone..."
                  className="h-11 rounded-2xl border-border bg-background pl-11"
                />
              </div>

              <Popover open={filterOpen} onOpenChange={setFilterOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="gap-2 relative">
                    <Filter className="h-4 w-4" />
                    Filtrar
                    {activeFilterCount > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                        {activeFilterCount}
                      </span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-72 p-0" align="start">
                  <div className="p-4 space-y-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Status</p>
                      <div className="flex flex-wrap gap-2">
                        {orderStatusOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => onStatusFilterChange(option.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              statusFilter === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-muted text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Período</p>
                      <div className="flex flex-wrap gap-2">
                        {orderDateOptions.map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => onDateFilterChange(option.value)}
                            className={cn(
                              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                              dateFilter === option.value
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-border bg-background text-muted-foreground hover:text-foreground",
                            )}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {activeFilterCount > 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="w-full text-muted-foreground"
                        onClick={() => {
                          onStatusFilterChange("all");
                          onDateFilterChange("all");
                        }}
                      >
                        Limpar filtros
                      </Button>
                    )}
                  </div>
                </PopoverContent>
              </Popover>
            </div>

            <p className="text-sm text-muted-foreground">
              {filteredOrders.length} de {orders.length} pedidos
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center text-sm text-muted-foreground">
              Carregando pedidos...
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center text-sm text-muted-foreground">
              Nenhum pedido encontrado com os filtros atuais.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">ID</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Cliente</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Produto</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Data</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Total</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Status</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Pix copiado</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-[0.18em]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => {
                    const variantLabel = getDisplayVariantLabel(order);
                    return (
                      <TableRow key={order.id}>
                        <TableCell className="whitespace-nowrap font-semibold text-foreground">{getShortOrderId(order.id)}</TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_email}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{order.product?.title || "Produto removido"}</p>
                            {variantLabel ? <p className="text-xs text-muted-foreground">Variante: {variantLabel}</p> : null}
                          </div>
                        </TableCell>
                        <TableCell className="whitespace-nowrap text-sm text-muted-foreground">{formatDateTime(order.created_at)}</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold text-foreground">{formatCurrency(order.total)}</TableCell>
                        <TableCell><OrderStatusBadge order={order} /></TableCell>
                        <TableCell className="text-center">
                          {order.pix_copied ? (
                            <CheckCircle2 className="h-5 w-5 text-marketplace-green inline-block" />
                          ) : (
                            <X className="h-5 w-5 text-muted-foreground/40 inline-block" />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => onSelectOrder(order.id)} className="gap-2">
                            <Eye className="h-4 w-4" />Ver
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
