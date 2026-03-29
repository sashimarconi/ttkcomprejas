import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Filter, RefreshCw, ShoppingCart, AlertTriangle } from "lucide-react";

interface Order {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_document: string;
  payment_status: string;
  payment_method: string;
  total: number;
  subtotal: number;
  shipping_cost: number | null;
  bumps_total: number | null;
  product_variant: string | null;
  transaction_id: string | null;
  pix_expires_at: string | null;
  created_at: string;
  pix_copied: boolean | null;
  product_id: string | null;
}

const statusColors: Record<string, string> = {
  pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
  paid: "bg-green-500/10 text-green-600 border-green-500/20",
  expired: "bg-red-500/10 text-red-600 border-red-500/20",
  abandoned: "bg-gray-500/10 text-gray-600 border-gray-500/20",
};

const statusLabels: Record<string, string> = {
  pending: "Pendente",
  paid: "Pago",
  expired: "Expirado",
  abandoned: "Abandonado",
};

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("all");
  const [tab, setTab] = useState("all");

  const fetchOrders = async () => {
    setLoading(true);
    let query = supabase.from("orders").select("*").order("created_at", { ascending: false });

    const { data, error } = await query;
    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const isAbandoned = (order: Order) => {
    if (order.payment_status !== "pending") return false;
    if (!order.pix_expires_at) return false;
    return new Date(order.pix_expires_at) < new Date();
  };

  const getEffectiveStatus = (order: Order) => {
    if (isAbandoned(order)) return "abandoned";
    return order.payment_status;
  };

  const filterByDate = (order: Order) => {
    if (dateFilter === "all") return true;
    const created = new Date(order.created_at);
    const now = new Date();
    if (dateFilter === "today") {
      return created.toDateString() === now.toDateString();
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return created >= weekAgo;
    }
    if (dateFilter === "month") {
      return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear();
    }
    return true;
  };

  const filtered = orders.filter((o) => {
    const effectiveStatus = getEffectiveStatus(o);

    // Tab filter
    if (tab === "abandoned" && effectiveStatus !== "abandoned") return false;
    if (tab === "paid" && effectiveStatus !== "paid") return false;
    if (tab === "pending" && effectiveStatus !== "pending") return false;

    // Status filter
    if (statusFilter !== "all" && effectiveStatus !== statusFilter) return false;

    // Date filter
    if (!filterByDate(o)) return false;

    // Search
    if (search) {
      const s = search.toLowerCase();
      return (
        o.customer_name.toLowerCase().includes(s) ||
        o.customer_email.toLowerCase().includes(s) ||
        o.customer_phone.includes(s) ||
        o.customer_document.includes(s) ||
        (o.transaction_id && o.transaction_id.toLowerCase().includes(s))
      );
    }
    return true;
  });

  const abandonedCount = orders.filter((o) => isAbandoned(o)).length;
  const paidCount = orders.filter((o) => o.payment_status === "paid").length;
  const pendingCount = orders.filter((o) => o.payment_status === "pending" && !isAbandoned(o)).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pedidos</h1>
          <p className="text-sm text-muted-foreground">{orders.length} pedidos no total</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchOrders}>
          <RefreshCw className="w-4 h-4 mr-1" /> Atualizar
        </Button>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="all" className="gap-1.5">
            <ShoppingCart className="w-3.5 h-3.5" /> Todos ({orders.length})
          </TabsTrigger>
          <TabsTrigger value="paid" className="gap-1.5">
            Pagos ({paidCount})
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-1.5">
            Pendentes ({pendingCount})
          </TabsTrigger>
          <TabsTrigger value="abandoned" className="gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5" /> Abandonados ({abandonedCount})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, email, telefone, CPF ou transação..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <Filter className="w-4 h-4 mr-1" />
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos status</SelectItem>
                <SelectItem value="paid">Pago</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="expired">Expirado</SelectItem>
                <SelectItem value="abandoned">Abandonado</SelectItem>
              </SelectContent>
            </Select>
            <Select value={dateFilter} onValueChange={setDateFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Período" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo período</SelectItem>
                <SelectItem value="today">Hoje</SelectItem>
                <SelectItem value="week">Últimos 7 dias</SelectItem>
                <SelectItem value="month">Este mês</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum pedido encontrado</div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Contato</TableHead>
                    <TableHead>Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Método</TableHead>
                    <TableHead>PIX copiado</TableHead>
                    <TableHead>Data</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((order) => {
                    const effectiveStatus = getEffectiveStatus(order);
                    return (
                      <TableRow key={order.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium text-foreground">{order.customer_name}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_document}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="text-sm text-foreground">{order.customer_email}</p>
                            <p className="text-xs text-muted-foreground">{order.customer_phone}</p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <p className="font-semibold text-foreground">
                            R$ {Number(order.total).toFixed(2).replace(".", ",")}
                          </p>
                          {order.shipping_cost ? (
                            <p className="text-xs text-muted-foreground">
                              Frete: R$ {Number(order.shipping_cost).toFixed(2).replace(".", ",")}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={statusColors[effectiveStatus] || ""}>
                            {statusLabels[effectiveStatus] || effectiveStatus}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground uppercase">
                          {order.payment_method}
                        </TableCell>
                        <TableCell>
                          {order.pix_copied ? (
                            <Badge variant="outline" className="bg-green-500/10 text-green-600 border-green-500/20">Sim</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-gray-500/10 text-gray-500 border-gray-500/20">Não</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {new Date(order.created_at).toLocaleDateString("pt-BR")}{" "}
                          {new Date(order.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
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

export default AdminOrders;
