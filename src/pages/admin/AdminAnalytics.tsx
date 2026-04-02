import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, PieChart, Pie, Cell
} from "recharts";
import { CalendarIcon, ChevronDown, ChevronUp, Eye, ShoppingCart, CreditCard, DollarSign, Users, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import AnimatedFunnel from "@/components/admin/live-view/AnimatedFunnel";

const BRAZIL_STATES = [
  "São Paulo", "Rio de Janeiro", "Minas Gerais", "Bahia", "Paraná",
  "Rio Grande do Sul", "Ceará", "Pernambuco", "Pará", "Santa Catarina",
  "Goiás", "Maranhão", "Amazonas", "Espírito Santo", "Paraíba",
];

function sessionToState(sessionId: string): string {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash |= 0;
  }
  return BRAZIL_STATES[Math.abs(hash) % BRAZIL_STATES.length];
}

function extractPageName(url: string | null): string {
  if (!url) return "Página inicial";
  try {
    const path = new URL(url).pathname;
    if (path === "/" || path === "") return "Página inicial";
    if (path.startsWith("/product/")) return path.replace("/product/", "Produto: ");
    if (path.startsWith("/loja/")) return path.replace("/loja/", "Loja: ");
    if (path.startsWith("/checkout/")) return path.replace("/checkout/", "Checkout: ");
    return path;
  } catch {
    if (url === "/" || url === "") return "Página inicial";
    if (url.startsWith("/product/")) return url.replace("/product/", "Produto: ");
    if (url.startsWith("/loja/")) return url.replace("/loja/", "Loja: ");
    if (url.startsWith("/checkout/")) return url.replace("/checkout/", "Checkout: ");
    return url;
  }
}

const quickPeriods = [
  { label: "Hoje", days: 0 },
  { label: "7 dias", days: 7 },
  { label: "15 dias", days: 15 },
  { label: "30 dias", days: 30 },
];

const CHART_COLORS = [
  "hsl(263, 70%, 50%)", "hsl(142, 71%, 45%)", "hsl(221, 83%, 53%)",
  "hsl(38, 92%, 50%)", "hsl(346, 77%, 50%)", "hsl(180, 65%, 45%)",
];

const AdminAnalytics = () => {
  const [dateRange, setDateRange] = useState<{ from: Date; to: Date }>({
    from: new Date(new Date().setHours(0, 0, 0, 0)),
    to: new Date(),
  });
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  // Data
  const [sessions, setSessions] = useState<{ session_id: string; created_at: string }[]>([]);
  const [events, setEvents] = useState<{ event_type: string; page_url: string | null; created_at: string }[]>([]);
  const [orders, setOrders] = useState<{ total: number; payment_status: string; created_at: string }[]>([]);

  // Expandable sections
  const [statesExpanded, setStatesExpanded] = useState(false);
  const [pagesExpanded, setPagesExpanded] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const from = dateRange.from.toISOString();
    const to = dateRange.to.toISOString();

    const [sessionsRes, eventsRes, ordersRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id, created_at").gte("last_seen_at", from).lte("created_at", to),
      supabase.from("page_events").select("event_type, page_url, created_at").gte("created_at", from).lte("created_at", to),
      supabase.from("orders").select("total, payment_status, created_at").gte("created_at", from).lte("created_at", to),
    ]);

    const uniqueSessions = new Map<string, { session_id: string; created_at: string }>();
    (sessionsRes.data || []).forEach(s => {
      if (!uniqueSessions.has(s.session_id)) uniqueSessions.set(s.session_id, s);
    });
    setSessions(Array.from(uniqueSessions.values()));
    setEvents((eventsRes.data || []) as any);
    setOrders((ordersRes.data || []) as any);
    setLoading(false);
  }, [dateRange]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const setQuickPeriod = (days: number) => {
    const now = new Date();
    const from = days === 0
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    setDateRange({ from, to: now });
    setFilterOpen(false);
  };

  const periodLabel = useMemo(() => {
    const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
    const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
    if (diffDays <= 1) return "Hoje";
    return `${format(dateRange.from, "dd/MM")} - ${format(dateRange.to, "dd/MM")}`;
  }, [dateRange]);

  // Computed stats
  const paidOrders = orders.filter(o => o.payment_status === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + Number(o.total), 0);
  const pageViews = events.filter(e => e.event_type === "page_view").length;
  const checkoutViews = events.filter(e => e.event_type === "checkout_view").length;
  const pixGenerated = orders.length; // All orders = PIX generated
  const conversionRate = checkoutViews > 0 ? (paidOrders.length / checkoutViews) * 100 : 0;

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  // Funnel data
  const funnelData = useMemo(() => {
    const total = pageViews || 1;
    return [
      { label: "Acessos", value: pageViews, pct: 100 },
      { label: "Checkout", value: checkoutViews, pct: Math.round((checkoutViews / total) * 100) },
      { label: "PIX Gerado", value: pixGenerated, pct: Math.round((pixGenerated / total) * 100) },
      { label: "Pagos", value: paidOrders.length, pct: Math.round((paidOrders.length / total) * 100) },
    ];
  }, [pageViews, checkoutViews, pixGenerated, paidOrders.length]);

  // Revenue by day/hour
  const revenueChart = useMemo(() => {
    const diffMs = dateRange.to.getTime() - dateRange.from.getTime();
    const isToday = diffMs <= 24 * 60 * 60 * 1000;

    if (isToday) {
      const hours = Array.from({ length: 24 }, (_, i) => ({ label: `${String(i).padStart(2, "0")}h`, value: 0 }));
      paidOrders.forEach(o => {
        const h = new Date(o.created_at).getHours();
        hours[h].value += Number(o.total);
      });
      return hours;
    }

    const dayMap = new Map<string, number>();
    paidOrders.forEach(o => {
      const day = format(new Date(o.created_at), "dd/MM");
      dayMap.set(day, (dayMap.get(day) || 0) + Number(o.total));
    });
    return Array.from(dayMap.entries()).map(([label, value]) => ({ label, value }));
  }, [paidOrders, dateRange]);

  // Sessions by state
  const stateData = useMemo(() => {
    const stateMap = new Map<string, number>();
    sessions.forEach(s => {
      const state = sessionToState(s.session_id);
      stateMap.set(state, (stateMap.get(state) || 0) + 1);
    });
    return Array.from(stateMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count);
  }, [sessions]);

  // Pages accessed
  const pageData = useMemo(() => {
    const pageMap = new Map<string, number>();
    events.filter(e => e.event_type === "page_view").forEach(e => {
      const name = extractPageName(e.page_url);
      pageMap.set(name, (pageMap.get(name) || 0) + 1);
    });
    return Array.from(pageMap.entries())
      .map(([page, count]) => ({ page, count }))
      .sort((a, b) => b.count - a.count);
  }, [events]);

  // Traffic by hour (bar chart)
  const trafficByHour = useMemo(() => {
    const hours = Array.from({ length: 24 }, (_, i) => ({ hour: `${String(i).padStart(2, "0")}h`, visits: 0 }));
    events.filter(e => e.event_type === "page_view").forEach(e => {
      const h = new Date(e.created_at).getHours();
      hours[h].visits++;
    });
    return hours;
  }, [events]);

  // Device distribution (simulated from sessions)
  const deviceData = useMemo(() => {
    // Simulate device distribution based on session hashes
    let mobile = 0, desktop = 0;
    sessions.forEach(s => {
      let hash = 0;
      for (let i = 0; i < s.session_id.length; i++) {
        hash = ((hash << 5) - hash) + s.session_id.charCodeAt(i);
        hash |= 0;
      }
      if (Math.abs(hash) % 3 === 0) desktop++;
      else mobile++;
    });
    return [
      { name: "Mobile", value: mobile },
      { name: "Desktop", value: desktop },
    ].filter(d => d.value > 0);
  }, [sessions]);

  const visibleStates = statesExpanded ? stateData : stateData.slice(0, 4);
  const visiblePages = pagesExpanded ? pageData : pageData.slice(0, 4);
  const maxStateCount = stateData[0]?.count || 1;
  const maxPageCount = pageData[0]?.count || 1;

  const kpiCards = [
    { label: "Visitantes únicos", value: String(sessions.length), icon: Users },
    { label: "Visualizações", value: String(pageViews), icon: Eye },
    { label: "Pedidos", value: String(orders.length), icon: ShoppingCart },
    { label: "Vendas aprovadas", value: String(paidOrders.length), icon: CreditCard },
    { label: "Receita total", value: formatCurrency(totalRevenue), icon: DollarSign },
    { label: "Conversão", value: `${conversionRate.toFixed(1)}%`, icon: TrendingUp },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Análises</h1>
          <p className="text-sm text-muted-foreground mt-1">Dados detalhados de tráfego e vendas</p>
        </div>

        <Popover open={filterOpen} onOpenChange={setFilterOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <CalendarIcon className="h-4 w-4" />
              {periodLabel}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="end">
            <div className="p-3 border-b border-border">
              <div className="flex gap-2 flex-wrap">
                {quickPeriods.map(p => (
                  <Button key={p.days} variant="outline" size="sm" onClick={() => setQuickPeriod(p.days)}>
                    {p.label}
                  </Button>
                ))}
              </div>
            </div>
            <Calendar
              mode="range"
              selected={{ from: dateRange.from, to: dateRange.to }}
              onSelect={(range) => {
                if (range?.from) {
                  setDateRange({ from: range.from, to: range.to || range.from });
                }
              }}
              numberOfMonths={2}
              className={cn("p-3 pointer-events-auto")}
            />
          </PopoverContent>
        </Popover>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
            {kpiCards.map((card) => (
              <Card key={card.label} className="border-border">
                <CardContent className="p-4">
                  <span className="text-xs text-muted-foreground flex items-center gap-1.5">
                    <card.icon className="w-3.5 h-3.5" /> {card.label}
                  </span>
                  <p className="text-xl font-bold text-foreground mt-1">{card.value}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Revenue Chart */}
            <Card className="border-border">
              <CardContent className="p-5">
                <span className="text-sm font-medium text-foreground">Histórico de Vendas</span>
                <div className="h-[220px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={revenueChart}>
                      <defs>
                        <linearGradient id="analyticsRevGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0.3} />
                          <stop offset="100%" stopColor="hsl(263, 70%, 50%)" stopOpacity={0.02} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="label" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                        formatter={(value: number) => [formatCurrency(value), "Receita"]}
                      />
                      <Area type="monotone" dataKey="value" stroke="hsl(263, 70%, 50%)" strokeWidth={2} fill="url(#analyticsRevGrad)" dot={false} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Traffic by Hour */}
            <Card className="border-border">
              <CardContent className="p-5">
                <span className="text-sm font-medium text-foreground">Tráfego por Horário</span>
                <div className="h-[220px] mt-3">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trafficByHour}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      />
                      <Bar dataKey="visits" fill="hsl(263, 70%, 50%)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Funnel */}
          <Card className="border-border">
            <CardContent className="p-5">
              <AnimatedFunnel data={funnelData} />
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Sessions by State */}
            <Card className="border-border">
              <CardContent className="p-5">
                <span className="text-sm font-medium text-foreground mb-4 block">Sessões por Estado</span>
                {visibleStates.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem dados no período</p>
                ) : (
                  <div className="space-y-3">
                    {visibleStates.map((s) => (
                      <div key={s.state}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground">{s.state}</span>
                          <span className="text-xs font-semibold text-foreground">{s.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-primary transition-all duration-500" style={{ width: `${(s.count / maxStateCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {stateData.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-xs text-muted-foreground gap-1" onClick={() => setStatesExpanded(!statesExpanded)}>
                    {statesExpanded ? <>Mostrar menos <ChevronUp className="w-3 h-3" /></> : <>Ver tudo ({stateData.length}) <ChevronDown className="w-3 h-3" /></>}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Pages Accessed */}
            <Card className="border-border">
              <CardContent className="p-5">
                <span className="text-sm font-medium text-foreground mb-4 block">Páginas Acessadas</span>
                {visiblePages.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem dados no período</p>
                ) : (
                  <div className="space-y-3">
                    {visiblePages.map((p) => (
                      <div key={p.page}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-foreground truncate max-w-[180px]">{p.page}</span>
                          <span className="text-xs font-semibold text-foreground">{p.count}</span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-muted overflow-hidden">
                          <div className="h-full rounded-full bg-marketplace-green transition-all duration-500" style={{ width: `${(p.count / maxPageCount) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {pageData.length > 4 && (
                  <Button variant="ghost" size="sm" className="w-full mt-3 text-xs text-muted-foreground gap-1" onClick={() => setPagesExpanded(!pagesExpanded)}>
                    {pagesExpanded ? <>Mostrar menos <ChevronUp className="w-3 h-3" /></> : <>Ver tudo ({pageData.length}) <ChevronDown className="w-3 h-3" /></>}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Device Distribution */}
            <Card className="border-border">
              <CardContent className="p-5">
                <span className="text-sm font-medium text-foreground mb-4 block">Dispositivos</span>
                {deviceData.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Sem dados no período</p>
                ) : (
                  <div className="flex flex-col items-center">
                    <div className="h-[180px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deviceData}
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={75}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            {deviceData.map((_, i) => (
                              <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="flex gap-4 mt-2">
                      {deviceData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-1.5 text-xs">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[i] }} />
                          <span className="text-muted-foreground">{d.name}: {d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminAnalytics;
