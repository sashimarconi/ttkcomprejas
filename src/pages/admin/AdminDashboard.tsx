import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, Eye, ShoppingCart, QrCode, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from "recharts";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Stats {
  onlineNow: number;
  todayVisits: number;
  todayCheckouts: number;
  todayPix: number;
  todayOrders: number;
  todayRevenue: number;
}

interface HourlyData {
  hour: string;
  visits: number;
  checkouts: number;
  pix: number;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--destructive))", "hsl(var(--chart-3, 142 71% 45%))", "hsl(var(--chart-4, 47 96% 53%))"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ onlineNow: 0, todayVisits: 0, todayCheckouts: 0, todayPix: 0, todayOrders: 0, todayRevenue: 0 });
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; visits: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [onlineRes, visitsRes, checkoutsRes, pixRes, ordersRes] = await Promise.all([
      supabase.from("visitor_sessions").select("id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo),
      supabase.from("page_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", todayStart),
      supabase.from("page_events").select("id", { count: "exact", head: true }).eq("event_type", "checkout_view").gte("created_at", todayStart),
      supabase.from("page_events").select("id", { count: "exact", head: true }).eq("event_type", "pix_generated").gte("created_at", todayStart),
      supabase.from("orders").select("id, total").gte("created_at", todayStart),
    ]);

    const orders = ordersRes.data || [];
    const revenue = orders.reduce((sum, o) => sum + Number(o.total), 0);

    setStats({
      onlineNow: onlineRes.count || 0,
      todayVisits: visitsRes.count || 0,
      todayCheckouts: checkoutsRes.count || 0,
      todayPix: pixRes.count || 0,
      todayOrders: orders.length,
      todayRevenue: revenue,
    });
  };

  const fetchHourlyData = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const { data: events } = await supabase
      .from("page_events")
      .select("event_type, created_at")
      .gte("created_at", todayStart);

    const hours: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, "0")}h`,
      visits: 0,
      checkouts: 0,
      pix: 0,
    }));

    (events || []).forEach((e) => {
      const h = new Date(e.created_at).getHours();
      if (e.event_type === "page_view") hours[h].visits++;
      if (e.event_type === "checkout_view") hours[h].checkouts++;
      if (e.event_type === "pix_generated") hours[h].pix++;
    });

    setHourlyData(hours);
  };

  const fetchWeeklyData = async () => {
    const days: { day: string; visits: number; orders: number }[] = [];
    const dayNames = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), d.getDate()).toISOString();
      const end = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).toISOString();

      const [vRes, oRes] = await Promise.all([
        supabase.from("page_events").select("id", { count: "exact", head: true }).eq("event_type", "page_view").gte("created_at", start).lt("created_at", end),
        supabase.from("orders").select("id", { count: "exact", head: true }).gte("created_at", start).lt("created_at", end),
      ]);

      days.push({ day: dayNames[d.getDay()], visits: vRes.count || 0, orders: oRes.count || 0 });
    }

    setWeeklyData(days);
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      await Promise.all([fetchStats(), fetchHourlyData(), fetchWeeklyData()]);
      setLoading(false);
    };
    load();

    const interval = setInterval(fetchStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const statCards = [
    { label: "Online agora", value: stats.onlineNow, icon: Users, color: "text-green-500", bg: "bg-green-500/10" },
    { label: "Visitas hoje", value: stats.todayVisits, icon: Eye, color: "text-blue-500", bg: "bg-blue-500/10" },
    { label: "Checkouts", value: stats.todayCheckouts, icon: ShoppingCart, color: "text-orange-500", bg: "bg-orange-500/10" },
    { label: "PIX gerados", value: stats.todayPix, icon: QrCode, color: "text-purple-500", bg: "bg-purple-500/10" },
    { label: "Pedidos hoje", value: stats.todayOrders, icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { label: "Receita hoje", value: `R$ ${stats.todayRevenue.toFixed(2).replace(".", ",")}`, icon: Clock, color: "text-rose-500", bg: "bg-rose-500/10" },
  ];

  const funnelData = [
    { name: "Visitas", value: stats.todayVisits },
    { name: "Checkout", value: stats.todayCheckouts },
    { name: "PIX gerado", value: stats.todayPix },
    { name: "Pedidos", value: stats.todayOrders },
  ];

  if (loading) {
    return <div className="flex items-center justify-center py-20"><p className="text-muted-foreground">Carregando dashboard...</p></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">Visão geral em tempo real da sua loja</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => (
          <Card key={card.label} className="relative overflow-hidden">
            <CardContent className="p-4">
              <div className={`w-10 h-10 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{card.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{card.label}</p>
              {card.label === "Online agora" && (
                <span className="absolute top-3 right-3 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                </span>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <Tabs defaultValue="hourly" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hourly">Hoje por hora</TabsTrigger>
          <TabsTrigger value="weekly">Últimos 7 dias</TabsTrigger>
          <TabsTrigger value="funnel">Funil</TabsTrigger>
        </TabsList>

        <TabsContent value="hourly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Eventos por hora — Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={hourlyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="hour" className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis className="text-xs" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="visits" fill="hsl(210, 100%, 56%)" name="Visitas" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="checkouts" fill="hsl(35, 100%, 55%)" name="Checkouts" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="pix" fill="hsl(270, 70%, 55%)" name="PIX" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="weekly">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Últimos 7 dias</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={weeklyData}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis dataKey="day" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Line type="monotone" dataKey="visits" stroke="hsl(210, 100%, 56%)" strokeWidth={2} name="Visitas" dot={{ fill: "hsl(210, 100%, 56%)" }} />
                    <Line type="monotone" dataKey="orders" stroke="hsl(142, 71%, 45%)" strokeWidth={2} name="Pedidos" dot={{ fill: "hsl(142, 71%, 45%)" }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="funnel">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funil de conversão — Hoje</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[300px] flex items-center justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={funnelData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis dataKey="name" type="category" tick={{ fill: "hsl(var(--muted-foreground))" }} width={80} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8 }} />
                    <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                      {funnelData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AdminDashboard;
