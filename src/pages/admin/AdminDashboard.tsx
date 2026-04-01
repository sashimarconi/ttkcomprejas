import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, ShoppingCart, TrendingUp, DollarSign, CheckCircle2, Package2, CalendarDays, Filter } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { format, subDays, startOfDay, endOfDay, eachHourOfInterval, startOfHour, isWithinInterval } from "date-fns";
import { ptBR } from "date-fns/locale";
import type { DateRange } from "react-day-picker";

interface Stats {
  onlineNow: number;
  visits: number;
  checkouts: number;
  pendingOrders: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
  paidRevenue: number;
  conversionRate: number;
}

const quickPeriods = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
];

const AdminDashboard = () => {
  const [dateRange, setDateRange] = useState<DateRange | undefined>({
    from: new Date(),
    to: new Date(),
  });
  const [stats, setStats] = useState<Stats>({
    onlineNow: 0, visits: 0, checkouts: 0, pendingOrders: 0,
    totalOrders: 0, paidOrders: 0, totalRevenue: 0, paidRevenue: 0, conversionRate: 0,
  });
  const [revenueData, setRevenueData] = useState<{ hour: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterOpen, setFilterOpen] = useState(false);

  const rangeStart = dateRange?.from ? startOfDay(dateRange.from) : startOfDay(new Date());
  const rangeEnd = dateRange?.to ? endOfDay(dateRange.to) : endOfDay(new Date());

  const fetchAll = async () => {
    setLoading(true);
    const startISO = rangeStart.toISOString();
    const endISO = rangeEnd.toISOString();
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const [onlineRes, eventsRes, ordersRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo),
      supabase.from("page_events").select("event_type, created_at").gte("created_at", startISO).lte("created_at", endISO),
      supabase.from("orders").select("id, total, payment_status, created_at").gte("created_at", startISO).lte("created_at", endISO),
    ]);

    const events = eventsRes.data || [];
    const orders = ordersRes.data || [];
    const paid = orders.filter(o => o.payment_status === "paid" || o.payment_status === "approved");
    const paidRevenue = paid.reduce((s, o) => s + Number(o.total), 0);
    const totalRevenue = orders.reduce((s, o) => s + Number(o.total), 0);
    const checkouts = events.filter(e => e.event_type === "checkout_view").length;
    const visits = events.filter(e => e.event_type === "page_view").length;
    const pixGen = events.filter(e => e.event_type === "pix_generated").length;

    setStats({
      onlineNow: onlineRes.count || 0,
      visits,
      checkouts,
      pixGenerated: pixGen,
      totalOrders: orders.length,
      paidOrders: paid.length,
      totalRevenue,
      paidRevenue,
      conversionRate: checkouts > 0 ? (paid.length / checkouts) * 100 : 0,
    });

    // Build hourly revenue chart for today range
    const isToday = dateRange?.from?.toDateString() === new Date().toDateString() && (!dateRange.to || dateRange.to.toDateString() === new Date().toDateString());
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      value: 0,
    }));

    if (isToday) {
      paid.forEach(o => {
        const h = new Date(o.created_at).getHours();
        hours[h].value += Number(o.total);
      });
    } else {
      // Group by day instead
      const dayMap = new Map<string, number>();
      paid.forEach(o => {
        const key = new Date(o.created_at).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
        dayMap.set(key, (dayMap.get(key) || 0) + Number(o.total));
      });
      const dayEntries = Array.from(dayMap.entries()).sort();
      setRevenueData(dayEntries.map(([day, value]) => ({ hour: day, value })));
      setLoading(false);
      return;
    }

    setRevenueData(hours);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
    const interval = setInterval(async () => {
      const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      const { count } = await supabase.from("visitor_sessions").select("session_id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo);
      setStats(prev => ({ ...prev, onlineNow: count || 0 }));
    }, 15000);
    return () => clearInterval(interval);
  }, [dateRange]);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  const periodLabel = useMemo(() => {
    if (!dateRange?.from) return "Selecionar período";
    const from = format(dateRange.from, "dd/MM/yyyy");
    const to = dateRange.to ? format(dateRange.to, "dd/MM/yyyy") : from;
    return from === to ? from : `${from} — ${to}`;
  }, [dateRange]);

  const statCards = [
    { label: "Visitantes agora", value: String(stats.onlineNow), icon: Users, live: true, tone: "text-marketplace-green" },
    { label: "Visitas", value: String(stats.visits), icon: TrendingUp, tone: "text-marketplace-blue" },
    { label: "Checkouts", value: String(stats.checkouts), icon: ShoppingCart, tone: "text-marketplace-yellow" },
    { label: "PIX gerados", value: String(stats.pixGenerated), icon: DollarSign, tone: "text-marketplace-orange" },
    { label: "Pedidos totais", value: String(stats.totalOrders), icon: Package2, tone: "text-foreground" },
    { label: "Vendas aprovadas", value: String(stats.paidOrders), icon: CheckCircle2, tone: "text-marketplace-green" },
    { label: "Receita total", value: formatCurrency(stats.totalRevenue), icon: DollarSign, tone: "text-foreground" },
    { label: "Receita aprovada", value: formatCurrency(stats.paidRevenue), icon: DollarSign, tone: "text-marketplace-green" },
    { label: "Conversão", value: `${stats.conversionRate.toFixed(1)}%`, icon: TrendingUp, tone: "text-primary" },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Visão geral da sua loja</p>
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarDays className="h-4 w-4" />
              {periodLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b border-border">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Período rápido</p>
              <div className="flex flex-wrap gap-2">
                {quickPeriods.map((p) => (
                  <button
                    key={p.label}
                    className={cn(
                      "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                      dateRange?.from?.toDateString() === (p.days === 0 ? new Date() : subDays(new Date(), p.days)).toDateString()
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => {
                      setDateRange({
                        from: p.days === 0 ? new Date() : subDays(new Date(), p.days),
                        to: new Date(),
                      });
                      setFilterOpen(false);
                    }}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
            <Calendar
              mode="range"
              selected={dateRange}
              onSelect={(range) => {
                setDateRange(range);
                if (range?.from && range?.to) setFilterOpen(false);
              }}
              locale={ptBR}
              numberOfMonths={1}
              className="p-3"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="border-border">
            <CardContent className="p-4">
              <div className="flex items-center justify-between gap-2 mb-2">
                <span className="text-xs font-medium text-muted-foreground">{card.label}</span>
                {card.live && (
                  <span className="flex items-center gap-1 text-[9px] text-marketplace-green font-semibold bg-marketplace-green/10 px-1.5 py-0.5 rounded-full">
                    <span className="relative flex h-1.5 w-1.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marketplace-green opacity-75" />
                      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-marketplace-green" />
                    </span>
                    LIVE
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <card.icon className={cn("w-4 h-4 shrink-0", card.tone)} />
                <p className="text-xl font-bold text-foreground truncate">{card.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border">
        <CardContent className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-marketplace-red" />
              <span className="text-sm font-semibold text-foreground">Valor em Vendas</span>
            </div>
            <span className="text-xs text-muted-foreground">{periodLabel}</span>
          </div>
          <div className="h-[260px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData}>
                <defs>
                  <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(348, 83%, 47%)" stopOpacity={0.3} />
                    <stop offset="100%" stopColor="hsl(348, 83%, 47%)" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="hour"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => `R$ ${v}`}
                />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 12,
                    color: "hsl(var(--foreground))",
                  }}
                  formatter={(value: number) => [formatCurrency(value), "Receita"]}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(348, 83%, 47%)"
                  strokeWidth={2}
                  fill="url(#revenueGrad)"
                  dot={false}
                  activeDot={{ r: 5, fill: "hsl(348, 83%, 47%)", stroke: "hsl(var(--card))", strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;
