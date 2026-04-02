import { useEffect, useState, useCallback, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Percent, ShoppingCart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import LiveGlobe from "@/components/admin/live-view/LiveGlobe";
import AnimatedFunnel from "@/components/admin/live-view/AnimatedFunnel";
import ClientBehavior from "@/components/admin/live-view/ClientBehavior";
import SessionsByLocation from "@/components/admin/live-view/SessionsByLocation";
import PagesVisited from "@/components/admin/live-view/PagesVisited";

interface SessionData {
  session_id: string;
  page_url: string | null;
  last_seen_at: string;
  city?: string | null;
  region?: string | null;
  country?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

interface LiveStats {
  visitors: number;
  revenue: number;
  orders: number;
  paidOrders: number;
  conversionRate: number;
  avgTicket: number;
}

const AdminLiveView = () => {
  const [stats, setStats] = useState<LiveStats>({
    visitors: 0, revenue: 0, orders: 0, paidOrders: 0, conversionRate: 0, avgTicket: 0,
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [todaySessions, setTodaySessions] = useState<{ session_id: string }[]>([]);
  const [todayEvents, setTodayEvents] = useState<{ event_type: string; page_url: string | null; created_at: string }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ label: string; value: number; pct: number }[]>([]);
  const [behavior, setBehavior] = useState({ activeCarts: 0, inCheckout: 0, purchased: 0 });

  const fetchData = useCallback(async () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [sessionsRes, ordersRes, eventsRes, todaySessionsRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id, page_url, last_seen_at").gte("last_seen_at", fiveMinAgo),
      supabase.from("orders").select("id, total, payment_status, created_at").gte("created_at", todayStart),
      supabase.from("page_events").select("event_type, page_url, created_at").gte("created_at", todayStart),
      supabase.from("visitor_sessions").select("session_id").gte("last_seen_at", todayStart),
    ]);

    const activeSessions = sessionsRes.data || [];
    const uniqueSessions = new Map<string, SessionData>();
    activeSessions.forEach(s => {
      if (!uniqueSessions.has(s.session_id)) uniqueSessions.set(s.session_id, s);
    });
    const sessionsArr = Array.from(uniqueSessions.values());
    setSessions(sessionsArr);

    const todayAll = todaySessionsRes.data || [];
    const uniqueToday = new Map<string, { session_id: string }>();
    todayAll.forEach(s => { if (!uniqueToday.has(s.session_id)) uniqueToday.set(s.session_id, s); });
    setTodaySessions(Array.from(uniqueToday.values()));

    const events = (eventsRes.data || []) as { event_type: string; page_url: string | null; created_at: string }[];
    setTodayEvents(events);

    const orders = ordersRes.data || [];
    const paidOrders = orders.filter(o => o.payment_status === "paid" || o.payment_status === "approved");
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const checkoutViews = events.filter(e => e.event_type === "checkout_view").length;
    const conversionRate = checkoutViews > 0 ? (paidOrders.length / checkoutViews) * 100 : 0;

    const checkoutActive = sessionsArr.filter(s => s.page_url?.includes("/checkout")).length;
    setBehavior({
      activeCarts: sessionsArr.length,
      inCheckout: checkoutActive,
      purchased: paidOrders.length,
    });

    setStats({
      visitors: uniqueSessions.size,
      revenue,
      orders: orders.length,
      paidOrders: paidOrders.length,
      conversionRate,
      avgTicket: paidOrders.length > 0 ? revenue / paidOrders.length : 0,
    });

    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      value: 0,
    }));
    paidOrders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      hours[h].value += Number(o.total);
    });
    setHourlyData(hours);

    const pageViews = events.filter(e => e.event_type === "page_view").length;
    const pixGenerated = orders.length;
    const total = pageViews || 1;
    setFunnelData([
      { label: "Acessos", value: pageViews, pct: 100 },
      { label: "Checkout", value: checkoutViews, pct: Math.round((checkoutViews / total) * 100) },
      { label: "PIX Gerado", value: pixGenerated, pct: Math.round((pixGenerated / total) * 100) },
      { label: "Pagos", value: paidOrders.length, pct: Math.round((paidOrders.length / total) * 100) },
    ]);
  }, []);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground">Radar de Vendas</h1>
            <span className="flex items-center gap-1.5 bg-marketplace-green/10 text-marketplace-green text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-marketplace-green opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-marketplace-green" />
              </span>
              ao vivo
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">Monitoramento em tempo real</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left column */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Visitantes", value: String(stats.visitors), icon: Users },
              { label: "Vendas (hoje)", value: formatCurrency(stats.revenue), icon: DollarSign },
              { label: "Pedidos", value: String(stats.orders), icon: ShoppingCart },
              { label: "Pagos", value: String(stats.paidOrders), icon: ShoppingCart },
              { label: "Conversão", value: `${stats.conversionRate.toFixed(1)}%`, icon: Percent },
              { label: "Ticket médio", value: formatCurrency(stats.avgTicket), icon: DollarSign },
            ].map((card) => (
              <Card key={card.label} className="border-border">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <card.icon className="w-3.5 h-3.5" /> {card.label}
                  </span>
                  <p className="text-2xl font-bold text-foreground mt-1">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <ClientBehavior
            activeCarts={behavior.activeCarts}
            inCheckout={behavior.inCheckout}
            purchased={behavior.purchased}
          />

          <Card className="border-border">
            <CardContent className="p-4">
              <span className="text-sm font-medium text-foreground">Histórico de Vendas (hoje)</span>
              <div className="h-[180px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="liveRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(263, 70%, 50%)" strokeWidth={2} fill="url(#liveRevenueGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border">
            <CardContent className="p-5">
              <AnimatedFunnel data={funnelData} />
            </CardContent>
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {/* Interactive Globe */}
          <Card className="border-border relative overflow-hidden" style={{ height: 420 }}>
            <CardContent className="p-0 h-full relative">
              <div className="absolute top-4 right-4 z-10 rounded-xl p-3 border border-border bg-card/90 backdrop-blur">
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="w-2 h-2 rounded-full bg-marketplace-green" />
                  <span className="text-xs text-muted-foreground">Visitantes Ativos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-primary" />
                  <span className="text-xs text-muted-foreground">Servidor</span>
                </div>
              </div>

              <div className="absolute bottom-4 left-4 z-10">
                <p className="text-4xl font-bold text-foreground">{stats.visitors}</p>
                <p className="text-sm text-muted-foreground">visitantes ativos</p>
              </div>

              <Suspense fallback={<div className="w-full h-full flex items-center justify-center text-muted-foreground">Carregando globo...</div>}>
                <LiveGlobe
                  visitors={sessions.map(s => ({ session_id: s.session_id }))}
                  className="w-full h-full"
                />
              </Suspense>
            </CardContent>
          </Card>

          {/* Pages Visited */}
          <PagesVisited
            todayEvents={todayEvents}
            liveSessions={sessions.map(s => ({ page_url: s.page_url }))}
          />

          {/* Sessions by Location */}
          <SessionsByLocation
            liveSessions={sessions.map(s => ({ session_id: s.session_id }))}
            todaySessions={todaySessions}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminLiveView;
