import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Users, ShoppingCart, DollarSign, Percent, TrendingDown, TrendingUp, Clock } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface SessionData {
  session_id: string;
  page_url: string | null;
  last_seen_at: string;
}

interface LiveStats {
  visitors: number;
  sales: number;
  revenue: number;
  orders: number;
  paidOrders: number;
  conversionRate: number;
  avgTicket: number;
}

const AdminLiveView = () => {
  const [stats, setStats] = useState<LiveStats>({
    visitors: 0, sales: 0, revenue: 0, orders: 0, paidOrders: 0, conversionRate: 0, avgTicket: 0,
  });
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ label: string; value: number; pct: string }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();
  const dotsRef = useRef<{ x: number; y: number; pulse: number; speed: number }[]>([]);

  const fetchData = useCallback(async () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [sessionsRes, ordersRes, eventsRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id, page_url, last_seen_at").gte("last_seen_at", fiveMinAgo),
      supabase.from("orders").select("id, total, payment_status").gte("created_at", todayStart),
      supabase.from("page_events").select("event_type, created_at").gte("created_at", todayStart),
    ]);

    const activeSessions = sessionsRes.data || [];
    const uniqueSessions = new Map<string, SessionData>();
    activeSessions.forEach(s => {
      if (!uniqueSessions.has(s.session_id)) uniqueSessions.set(s.session_id, s);
    });
    setSessions(Array.from(uniqueSessions.values()));

    const orders = ordersRes.data || [];
    const paidOrders = orders.filter(o => o.payment_status === "paid" || o.payment_status === "approved");
    const revenue = paidOrders.reduce((sum, o) => sum + Number(o.total), 0);

    const events = eventsRes.data || [];
    const checkoutViews = events.filter(e => e.event_type === "checkout_view").length;
    const conversionRate = checkoutViews > 0 ? (paidOrders.length / checkoutViews) * 100 : 0;

    setStats({
      visitors: uniqueSessions.size,
      sales: revenue,
      revenue,
      orders: orders.length,
      paidOrders: paidOrders.length,
      conversionRate,
      avgTicket: paidOrders.length > 0 ? revenue / paidOrders.length : 0,
    });

    // Hourly revenue
    const hours: { hour: string; value: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const h = new Date(now.getTime() - i * 4 * 3600000);
      const label = i === 0 ? "Agora" : `${(i * 4)}h`;
      const start = new Date(h.getTime() - 4 * 3600000).toISOString();
      const end = h.toISOString();
      const periodRevenue = paidOrders
        .filter(o => (o as any).created_at >= start && (o as any).created_at < end)
        .reduce((sum, o) => sum + Number(o.total), 0);
      hours.push({ hour: label, value: periodRevenue });
    }
    setHourlyData(hours);

    // Funnel
    const pageViews = events.filter(e => e.event_type === "page_view").length;
    const pixGenerated = events.filter(e => e.event_type === "pix_generated").length;
    const total = pageViews || 1;
    setFunnelData([
      { label: "Leads Hoje", value: pageViews, pct: "100%" },
      { label: "Checkout", value: checkoutViews, pct: `${Math.round((checkoutViews / total) * 100)}%` },
      { label: "PIX Gerado", value: pixGenerated, pct: `${Math.round((pixGenerated / total) * 100)}%` },
      { label: "Pagos", value: paidOrders.length, pct: `${Math.round((paidOrders.length / total) * 100)}%` },
    ]);
  }, []);

  // Globe animation
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth * window.devicePixelRatio;
      canvas.height = canvas.offsetHeight * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    const w = () => canvas.offsetWidth;
    const h = () => canvas.offsetHeight;

    const drawGlobe = (time: number) => {
      const width = w();
      const height = h();
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.38;

      // Glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.3);
      glow.addColorStop(0, "rgba(124, 58, 237, 0.08)");
      glow.addColorStop(0.5, "rgba(124, 58, 237, 0.03)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Globe outline
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(124, 58, 237, 0.2)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Grid lines
      const gridCount = 8;
      ctx.strokeStyle = "rgba(124, 58, 237, 0.07)";
      ctx.lineWidth = 0.5;

      // Latitude lines
      for (let i = 1; i < gridCount; i++) {
        const y = cy - r + (2 * r * i) / gridCount;
        const latR = Math.sqrt(r * r - (y - cy) * (y - cy));
        ctx.beginPath();
        ctx.ellipse(cx, y, latR, latR * 0.08, 0, 0, Math.PI * 2);
        ctx.stroke();
      }

      // Longitude lines (rotating)
      for (let i = 0; i < 6; i++) {
        const angle = (i / 6) * Math.PI + time * 0.0003;
        ctx.beginPath();
        for (let j = 0; j <= 40; j++) {
          const t = (j / 40) * Math.PI;
          const x = cx + r * Math.sin(t) * Math.cos(angle);
          const y = cy - r * Math.cos(t);
          j === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Dotted edge pattern
      for (let i = 0; i < 60; i++) {
        const angle = (i / 60) * Math.PI * 2;
        const dotR = r + 8;
        const x = cx + dotR * Math.cos(angle);
        const y = cy + dotR * Math.sin(angle);
        ctx.beginPath();
        ctx.arc(x, y, 1, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(124, 58, 237, 0.15)";
        ctx.fill();
      }

      // Active visitor dots
      while (dotsRef.current.length < sessions.length) {
        const angle = Math.random() * Math.PI * 2;
        const latAngle = (Math.random() - 0.5) * Math.PI;
        dotsRef.current.push({
          x: cx + r * 0.85 * Math.cos(latAngle) * Math.cos(angle + time * 0.0003),
          y: cy + r * 0.85 * Math.sin(latAngle),
          pulse: Math.random() * Math.PI * 2,
          speed: 0.5 + Math.random() * 1.5,
        });
      }
      while (dotsRef.current.length > Math.max(sessions.length, 0)) {
        dotsRef.current.pop();
      }

      dotsRef.current.forEach((dot, i) => {
        dot.pulse += 0.03 * dot.speed;
        const scale = 1 + 0.3 * Math.sin(dot.pulse);
        const dotSize = 4 * scale;

        // Glow
        const dotGlow = ctx.createRadialGradient(dot.x, dot.y, 0, dot.x, dot.y, dotSize * 3);
        dotGlow.addColorStop(0, "rgba(34, 197, 94, 0.4)");
        dotGlow.addColorStop(1, "transparent");
        ctx.fillStyle = dotGlow;
        ctx.fillRect(dot.x - dotSize * 3, dot.y - dotSize * 3, dotSize * 6, dotSize * 6);

        // Dot
        ctx.beginPath();
        ctx.arc(dot.x, dot.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(34, 197, 94, 0.9)";
        ctx.fill();
      });
    };

    const animate = (time: number) => {
      drawGlobe(time);
      animFrameRef.current = requestAnimationFrame(animate);
    };
    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener("resize", resize);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [sessions.length]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 15000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const formatCurrency = (v: number) => `R$ ${v.toFixed(2).replace(".", ",")}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-white">Radar de Vendas</h1>
            <span className="flex items-center gap-1.5 bg-green-500/10 text-green-400 text-xs font-medium px-2.5 py-1 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
              </span>
              ao vivo
            </span>
          </div>
          <p className="text-sm text-white/40 mt-1">Monitoramento em tempo real da sua loja</p>
        </div>
        <div className="text-right text-xs text-white/30">
          {new Date().toLocaleDateString("pt-BR", { day: "numeric", month: "short", year: "numeric" })}
          {" · "}
          {new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Stats */}
        <div className="space-y-4">
          {/* Top stat cards */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Visitantes
                </span>
              </div>
              <p className="text-3xl font-bold text-white">{stats.visitors}</p>
            </div>
            <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-white/40 flex items-center gap-1.5">
                  <DollarSign className="w-3.5 h-3.5" /> Vendas (hoje)
                </span>
              </div>
              <p className="text-3xl font-bold text-white">
                <span className="text-base text-white/50 mr-0.5">R$</span>
                {stats.revenue.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
              <span className="text-xs text-white/40">Pedidos</span>
              <p className="text-2xl font-bold text-white mt-1">{stats.orders}</p>
            </div>
            <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
              <span className="text-xs text-white/40">Pedidos Pagos</span>
              <p className="text-2xl font-bold text-white mt-1">{stats.paidOrders}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
              <span className="text-xs text-white/40 flex items-center gap-1.5">
                <Percent className="w-3.5 h-3.5" /> Conversão
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                {stats.conversionRate.toFixed(1)}<span className="text-lg text-white/50">%</span>
              </p>
            </div>
            <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
              <span className="text-xs text-white/40 flex items-center gap-1.5">
                <DollarSign className="w-3.5 h-3.5" /> Ticket Médio
              </span>
              <p className="text-2xl font-bold text-white mt-1">
                <span className="text-base text-white/50 mr-0.5">R$</span>
                {stats.avgTicket.toFixed(2).replace(".", ",")}
              </p>
            </div>
          </div>

          {/* Sales History Chart */}
          <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Histórico de Vendas</span>
            </div>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={hourlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="hour" tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "rgba(255,255,255,0.3)", fontSize: 11 }} axisLine={false} tickLine={false}
                    tickFormatter={(v) => `R$ ${v.toFixed(0)}`}
                  />
                  <Tooltip
                    contentStyle={{ background: "#1a1333", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff" }}
                    formatter={(value: number) => [formatCurrency(value), "Receita"]}
                  />
                  <Bar dataKey="value" fill="url(#purpleGradient)" radius={[4, 4, 0, 0]} />
                  <defs>
                    <linearGradient id="purpleGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#a855f7" />
                      <stop offset="100%" stopColor="#6b21a8" />
                    </linearGradient>
                  </defs>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Funnel */}
          <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-white">Funil de Conversão</span>
              <span className="text-xs text-white/30">
                {stats.conversionRate.toFixed(0)}% conversão
              </span>
            </div>
            <div className="space-y-3">
              {funnelData.map((item, i) => (
                <div key={item.label}>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-white/50">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{item.value}</span>
                      <span className="text-xs text-white/30">{item.pct}</span>
                    </div>
                  </div>
                  <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: item.pct,
                        background: i === 0 ? "#a855f7" : i === 1 ? "#7c3aed" : i === 2 ? "#6d28d9" : "#22c55e",
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Globe */}
        <div className="bg-[#1a1333] border border-white/[0.06] rounded-xl p-4 relative overflow-hidden min-h-[500px]">
          {/* Legend */}
          <div className="absolute top-4 right-4 z-10 bg-[#0f0a1e]/90 rounded-lg p-3 border border-white/[0.06]">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 rounded-full bg-green-500" />
              <span className="text-xs text-white/60">Visitantes Ativos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-purple-500" />
              <span className="text-xs text-white/60">Sua Loja</span>
            </div>
          </div>

          {/* Active count */}
          <div className="absolute bottom-4 left-4 z-10">
            <p className="text-4xl font-bold text-white">{stats.visitors}</p>
            <p className="text-sm text-white/40">visitantes ativos</p>
          </div>

          <canvas
            ref={canvasRef}
            className="w-full h-full min-h-[500px]"
            style={{ display: "block" }}
          />
        </div>
      </div>
    </div>
  );
};

export default AdminLiveView;
