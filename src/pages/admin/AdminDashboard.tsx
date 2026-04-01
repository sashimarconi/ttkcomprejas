import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, Eye, ShoppingCart, QrCode, TrendingUp, DollarSign } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Cell } from "recharts";

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

const COLORS = ["#a855f7", "#7c3aed", "#22c55e", "#f59e0b"];

const AdminDashboard = () => {
  const [stats, setStats] = useState<Stats>({ onlineNow: 0, todayVisits: 0, todayCheckouts: 0, todayPix: 0, todayOrders: 0, todayRevenue: 0 });
  const [hourlyData, setHourlyData] = useState<HourlyData[]>([]);
  const [weeklyData, setWeeklyData] = useState<{ day: string; visits: number; orders: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"hourly" | "weekly" | "funnel">("hourly");

  const fetchStats = async () => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();

    const [onlineRes, visitsRes, checkoutsRes, pixRes, ordersRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id", { count: "exact", head: true }).gte("last_seen_at", fiveMinAgo),
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
    const { data: events } = await supabase.from("page_events").select("event_type, created_at").gte("created_at", todayStart);

    const hours: HourlyData[] = Array.from({ length: 24 }, (_, i) => ({
      hour: `${i.toString().padStart(2, "0")}h`,
      visits: 0, checkouts: 0, pix: 0,
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
    { label: "Visitantes agora", value: stats.onlineNow, icon: Users, live: true },
    { label: "Checkouts iniciados", value: stats.todayCheckouts, icon: ShoppingCart },
    { label: "Vendas geradas (hoje)", value: `R$ ${stats.todayRevenue.toFixed(2).replace(".", ",")}`, icon: DollarSign },
    { label: "Conversão do Checkout", value: `${stats.todayCheckouts > 0 ? ((stats.todayOrders / stats.todayCheckouts) * 100).toFixed(1) : "0.0"}%`, icon: TrendingUp },
  ];

  const funnelData = [
    { name: "Visitas", value: stats.todayVisits },
    { name: "Checkout", value: stats.todayCheckouts },
    { name: "PIX gerado", value: stats.todayPix },
    { name: "Pedidos", value: stats.todayOrders },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
      </div>
    );
  }

  const tooltipStyle = {
    background: "#1a1333",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    color: "#fff",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-sm text-white/40">Visão geral em tempo real da sua loja</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <div
            key={card.label}
            className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-5 relative overflow-hidden"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2 text-white/40">
                <card.icon className="w-4 h-4" />
                <span className="text-xs font-medium">{card.label}</span>
              </div>
              {card.live && (
                <span className="flex items-center gap-1 text-[10px] text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full">
                  <span className="relative flex h-1.5 w-1.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-green-500" />
                  </span>
                  LIVE
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-white">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Charts with custom tabs */}
      <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl overflow-hidden">
        <div className="flex border-b border-white/[0.06]">
          {[
            { key: "hourly", label: "Hoje por hora" },
            { key: "weekly", label: "Últimos 7 dias" },
            { key: "funnel", label: "Funil" },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`px-5 py-3 text-sm font-medium transition-colors relative ${
                activeTab === tab.key
                  ? "text-purple-400"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              {tab.label}
              {activeTab === tab.key && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-500" />
              )}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === "hourly" && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="visits" fill="#818cf8" name="Visitas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="checkouts" fill="#f59e0b" name="Checkouts" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="pix" fill="#a855f7" name="PIX" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === "weekly" && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="day" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Line type="monotone" dataKey="visits" stroke="#818cf8" strokeWidth={2} name="Visitas" dot={{ fill: "#818cf8" }} />
                  <Line type="monotone" dataKey="orders" stroke="#22c55e" strokeWidth={2} name="Pedidos" dot={{ fill: "#22c55e" }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === "funnel" && (
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={funnelData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis dataKey="name" type="category" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} width={80} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Bar dataKey="value" radius={[0, 6, 6, 0]}>
                    {funnelData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
