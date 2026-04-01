import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { formatCurrency, formatDateTime } from "@/components/admin/orders/order-utils";
import { MessageCircle, RefreshCw, Search, ShoppingCart } from "lucide-react";
import { toast } from "sonner";

interface AbandonedCart {
  id: string;
  customer_name: string | null;
  customer_email: string | null;
  customer_phone: string | null;
  product_id: string | null;
  product_variant: string | null;
  total: number | null;
  created_at: string;
  product?: { title: string | null } | null;
}

const AdminAbandonedCarts = () => {
  const [carts, setCarts] = useState<AbandonedCart[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCarts = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("abandoned_carts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      const rows = (data || []) as AbandonedCart[];
      const productIds = Array.from(new Set(rows.map((c) => c.product_id).filter(Boolean))) as string[];

      if (productIds.length) {
        const { data: products } = await supabase.from("products").select("id, title").in("id", productIds);
        const productMap = new Map((products || []).map((p: any) => [p.id, p.title]));
        rows.forEach((c) => {
          if (c.product_id) c.product = { title: productMap.get(c.product_id) ?? null };
        });
      }

      setCarts(rows);
    } catch {
      toast.error("Erro ao carregar carrinhos abandonados");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCarts();
  }, [fetchCarts]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return carts;
    return carts.filter((c) =>
      [c.customer_name, c.customer_email, c.customer_phone, c.product?.title]
        .some((v) => String(v || "").toLowerCase().includes(q))
    );
  }, [carts, search]);

  const stats = useMemo(() => {
    const totalValue = carts.reduce((sum, c) => sum + Number(c.total || 0), 0);
    const avg = carts.length ? totalValue / carts.length : 0;
    return { count: carts.length, totalValue, avg };
  }, [carts]);

  const openWhatsApp = (phone: string | null, name: string | null) => {
    if (!phone) return;
    const clean = phone.replace(/\D/g, "");
    const fullPhone = clean.startsWith("55") ? clean : `55${clean}`;
    const message = encodeURIComponent(
      `Olá ${name || ""}! Notamos que você iniciou uma compra em nossa loja mas não finalizou. Posso te ajudar com algo?`
    );
    window.open(`https://wa.me/${fullPhone}?text=${message}`, "_blank");
  };

  return (
    <div className="space-y-6">
      <Card className="border-border">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-[0.28em] text-muted-foreground">Vendas</p>
              <div>
                <h1 className="text-3xl font-semibold tracking-tight text-foreground">Carrinhos Abandonados</h1>
                <p className="text-sm text-muted-foreground">Visualize e recupere carrinhos abandonados pelos clientes</p>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={fetchCarts} className="gap-2 self-start xl:self-auto">
              <RefreshCw className="h-4 w-4" />
              Atualizar
            </Button>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Total de Carrinhos</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{stats.count}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Valor Total</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(stats.totalValue)}</p>
            </div>
            <div className="rounded-2xl border border-border bg-muted/40 p-4">
              <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">Média por Carrinho</p>
              <p className="mt-2 text-2xl font-semibold text-foreground">{formatCurrency(stats.avg)}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="overflow-hidden border-border">
        <CardContent className="space-y-5 p-4 md:p-6">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 xl:max-w-md">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por nome ou email..."
                className="h-11 rounded-2xl border-border bg-background pl-11"
              />
            </div>
            <p className="text-sm text-muted-foreground ml-auto">
              {filtered.length} de {carts.length} carrinhos
            </p>
          </div>

          {loading ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center text-sm text-muted-foreground">
              Carregando...
            </div>
          ) : filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-20 text-center text-sm text-muted-foreground">
              Nenhum carrinho abandonado encontrado.
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-background overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Cliente</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Produto</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Valor</TableHead>
                    <TableHead className="text-[11px] uppercase tracking-[0.18em]">Data</TableHead>
                    <TableHead className="text-right text-[11px] uppercase tracking-[0.18em]">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((cart) => (
                    <TableRow key={cart.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted">
                            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                          </div>
                          <div className="space-y-0.5">
                            <p className="font-medium text-foreground">{cart.customer_name || "—"}</p>
                            <p className="text-xs text-muted-foreground">{cart.customer_email || "—"}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-foreground">{cart.product?.title || "—"}</TableCell>
                      <TableCell className="font-semibold text-foreground">{formatCurrency(cart.total)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{formatDateTime(cart.created_at)}</TableCell>
                      <TableCell className="text-right">
                        {cart.customer_phone && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openWhatsApp(cart.customer_phone, cart.customer_name)}
                            className="gap-2 text-green-600 hover:text-green-700 hover:bg-green-50 dark:hover:bg-green-950"
                          >
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminAbandonedCarts;
