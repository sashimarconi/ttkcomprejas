import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Percent, ShoppingCart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import LiveGlobe from "@/components/admin/live-view/LiveGlobe";
import AnimatedFunnel from "@/components/admin/live-view/AnimatedFunnel";
import ClientBehavior from "@/components/admin/live-view/ClientBehavior";
import SessionsByLocation from "@/components/admin/live-view/SessionsByLocation";
import PagesVisited from "@/components/admin/live-view/PagesVisited";

async function fetchAllRows<T>(
  queryFn: (from: number, to: number) => ReturnType<ReturnType<typeof supabase.from>["select"]>,
  pageSize = 1000
): Promise<T[]> {
  const all: T[] = [];
  let page = 0;
  while (true) {
    const { data, error } = await queryFn(page * pageSize, (page + 1) * pageSize - 1);
    if (error || !data || data.length === 0) break;
    all.push(...(data as T[]));
    if (data.length < pageSize) break;
    page++;
  }
  return all;
}

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
  const [todaySessions, setTodaySessions] = useState<{ session_id: string; city?: string | null; region?: string | null; country?: string | null }[]>([]);
  const [todayEvents, setTodayEvents] = useState<{ session_id: string; event_type: string; page_url: string | null; created_at: string }[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ label: string; value: number; pct: number }[]>([]);
  const [behavior, setBehavior] = useState({ activeCarts: 0, inCheckout: 0, purchased: 0 });

  const fetchData = useCallback(async () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const verifiedFilter = "is_bot.is.null,is_bot.eq.false";
    const [sessionsRes, ordersRes, todaySessionsRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id, page_url, last_seen_at, city, region, country, latitude, longitude").gte("last_seen_at", fiveMinAgo).eq("has_interaction", true).not("user_agent", "is", null).or(verifiedFilter),
      supabase.from("orders").select("id, total, payment_status, created_at").gte("created_at", todayStart),
      supabase.from("visitor_sessions").select("session_id, city, region, country").gte("last_seen_at", todayStart).eq("has_interaction", true).not("user_agent", "is", null).or(verifiedFilter),
    ]);

    const allEvents = await fetchAllRows<{ session_id: string; event_type: string; page_url: string | null; created_at: string }>(
      (from, to) => supabase.from("page_events").select("session_id, event_type, page_url, created_at").gte("created_at", todayStart).range(from, to)
    );

    const activeCutoffMs = new Date(fiveMinAgo).getTime();
    const activeSessions = sessionsRes.data || [];
    const recentEvents = allEvents.filter((event) => new Date(event.created_at).getTime() >= activeCutoffMs);
    const uniqueSessions = new Map<string, SessionData>();

    activeSessions.forEach((session) => {
      if (!uniqueSessions.has(session.session_id)) uniqueSessions.set(session.session_id, session);
    });

    recentEvents.forEach((event) => {
      const existing = uniqueSessions.get(event.session_id);

      if (!existing) {
        uniqueSessions.set(event.session_id, {
          session_id: event.session_id,
          page_url: event.page_url,
          last_seen_at: event.created_at,
          city: null,
          region: null,
          country: null,
          latitude: null,
          longitude: null,
        });
        return;
      }

      if (new Date(event.created_at).getTime() > new Date(existing.last_seen_at).getTime()) {
        uniqueSessions.set(event.session_id, {
          ...existing,
          page_url: event.page_url ?? existing.page_url,
          last_seen_at: event.created_at,
        });
      }
    });

    const sessionsArr = Array.from(uniqueSessions.values()).sort(
      (a, b) => new Date(b.last_seen_at).getTime() - new Date(a.last_seen_at).getTime()
    );
    setSessions(sessionsArr);

    const todayAll = todaySessionsRes.data || [];
    const uniqueToday = new Map<string, { session_id: string; city?: string | null; region?: string | null; country?: string | null }>();
    todayAll.forEach((session) => {
      if (!uniqueToday.has(session.session_id)) uniqueToday.set(session.session_id, session);
    });
    const todaySessionsArr = Array.from(uniqueToday.values());
    setTodaySessions(todaySessionsArr);

    const events = allEvents;
    setTodayEvents(events);

    const orders = ordersRes.data || [];
    const paidOrders = orders.filter((order) => order.payment_status === "paid" || order.payment_status === "approved");
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);

    const checkoutViews = events.filter((event) => event.event_type === "checkout_view").length;
    const conversionRate = checkoutViews > 0 ? (paidOrders.length / checkoutViews) * 100 : 0;

    const activeSessionIds = new Set(sessionsArr.map((session) => session.session_id));
    const latestEventBySession = new Map<string, { page_url: string | null; created_at: string }>();

    events.forEach((event) => {
      if (!activeSessionIds.has(event.session_id) || !event.page_url) return;

      const current = latestEventBySession.get(event.session_id);
      if (!current || new Date(event.created_at).getTime() > new Date(current.created_at).getTime()) {
        latestEventBySession.set(event.session_id, {
          page_url: event.page_url,
          created_at: event.created_at,
        });
      }
    });

    const checkoutSessionIds = new Set(
      sessionsArr
        .filter((session) => {
          const latestEvent = latestEventBySession.get(session.session_id);
          const currentPage = latestEvent?.page_url ?? session.page_url;
          return currentPage?.includes("/checkout");
        })
        .map((session) => session.session_id)
    );

    setBehavior({
      activeCarts: Math.max(sessionsArr.length - checkoutSessionIds.size, 0),
      inCheckout: checkoutSessionIds.size,
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
    paidOrders.forEach((order) => {
      const hour = new Date(order.created_at).getHours();
      hours[hour].value += Number(order.total);
    });
    setHourlyData(hours);

    const pageViews = events.filter((event) => event.event_type === "page_view").length;
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

              <LiveGlobe
                visitors={sessions.map(s => ({ session_id: s.session_id, latitude: s.latitude, longitude: s.longitude }))}
                className="w-full h-full"
              />
            </CardContent>
          </Card>

          {/* Pages Visited */}
          <PagesVisited
            todayEvents={todayEvents}
            liveSessions={sessions.map(s => ({ page_url: s.page_url }))}
          />

          {/* Sessions by Location */}
          <SessionsByLocation
            liveSessions={sessions.map(s => ({ session_id: s.session_id, city: s.city, region: s.region, country: s.country }))}
            todaySessions={todaySessions}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminLiveView;
