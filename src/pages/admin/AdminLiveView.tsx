import { useEffect, useState, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Users, DollarSign, Percent, ShoppingCart } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface SessionData {
  session_id: string;
  page_url: string | null;
  last_seen_at: string;
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
  const [hourlyData, setHourlyData] = useState<{ hour: string; value: number }[]>([]);
  const [funnelData, setFunnelData] = useState<{ label: string; value: number; pct: number }[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>();

  const fetchData = useCallback(async () => {
    const now = new Date();
    const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

    const [sessionsRes, ordersRes, eventsRes] = await Promise.all([
      supabase.from("visitor_sessions").select("session_id, page_url, last_seen_at").gte("last_seen_at", fiveMinAgo),
      supabase.from("orders").select("id, total, payment_status, created_at").gte("created_at", todayStart),
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
      revenue,
      orders: orders.length,
      paidOrders: paidOrders.length,
      conversionRate,
      avgTicket: paidOrders.length > 0 ? revenue / paidOrders.length : 0,
    });

    // Hourly revenue (24h)
    const hours = Array.from({ length: 24 }, (_, i) => ({
      hour: `${String(i).padStart(2, "0")}h`,
      value: 0,
    }));
    paidOrders.forEach(o => {
      const h = new Date(o.created_at).getHours();
      hours[h].value += Number(o.total);
    });
    setHourlyData(hours);

    // Funnel
    const pageViews = events.filter(e => e.event_type === "page_view").length;
    const pixGenerated = events.filter(e => e.event_type === "pix_generated").length;
    const total = pageViews || 1;
    setFunnelData([
      { label: "Acessos", value: pageViews, pct: 100 },
      { label: "Checkout", value: checkoutViews, pct: Math.round((checkoutViews / total) * 100) },
      { label: "PIX Gerado", value: pixGenerated, pct: Math.round((pixGenerated / total) * 100) },
      { label: "Pagos", value: paidOrders.length, pct: Math.round((paidOrders.length / total) * 100) },
    ]);
  }, []);

  // Globe with world outline
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

    // Simplified world map continents as polylines (lon/lat degrees)
    const continents = [
      // South America
      [[-80,10],[-77,8],[-75,5],[-80,-2],[-75,-15],[-70,-18],[-65,-22],[-57,-25],[-53,-33],[-58,-38],[-65,-42],[-68,-47],[-72,-50],[-75,-52],[-68,-55],[-63,-52],[-58,-40],[-48,-28],[-44,-23],[-38,-15],[-35,-10],[-35,-5],[-50,2],[-60,5],[-70,10],[-75,12],[-80,10]],
      // North America
      [[-130,50],[-125,48],[-120,34],[-117,32],[-105,30],[-100,28],[-97,25],[-90,28],[-82,25],[-80,30],[-75,35],[-70,42],[-65,45],[-60,47],[-55,50],[-60,55],[-70,58],[-75,62],[-80,65],[-85,68],[-100,70],[-120,68],[-135,60],[-140,58],[-150,60],[-165,63],[-168,66],[-165,70],[-155,72],[-140,70],[-130,68],[-125,60],[-130,50]],
      // Africa
      [[-15,35],[-5,36],[10,37],[15,33],[12,32],[10,30],[10,20],[15,15],[20,10],[30,5],[35,0],[40,-5],[42,-12],[38,-20],[35,-25],[30,-30],[28,-34],[20,-35],[18,-30],[12,-25],[10,-18],[8,-5],[5,5],[0,6],[-5,10],[-15,12],[-17,15],[-16,20],[-15,28],[-15,35]],
      // Europe
      [[-10,36],[-5,36],[0,40],[2,43],[5,44],[8,44],[12,42],[15,40],[20,40],[25,37],[30,42],[28,45],[25,42],[20,45],[15,45],[10,47],[6,49],[2,49],[-5,48],[-10,44],[-10,36]],
      // Asia
      [[30,42],[35,42],[40,42],[45,40],[50,38],[55,37],[60,35],[65,35],[70,30],[75,28],[80,25],[85,22],[90,22],[95,20],[100,15],[105,20],[110,22],[115,25],[120,25],[125,30],[130,35],[135,35],[140,40],[145,44],[140,50],[135,55],[140,60],[150,60],[160,65],[170,67],[180,68],[180,70],[170,72],[160,70],[150,65],[140,60],[130,55],[125,50],[120,52],[110,55],[100,55],[90,50],[80,50],[70,55],[60,55],[50,52],[40,50],[35,45],[30,42]],
      // Australia
      [[115,-35],[118,-32],[120,-25],[130,-15],[135,-12],[140,-18],[145,-15],[150,-23],[153,-28],[150,-35],[145,-38],[140,-38],[136,-36],[130,-35],[125,-34],[115,-35]],
    ];

    const project = (lon: number, lat: number, cx: number, cy: number, r: number, rotation: number) => {
      const lonRad = ((lon + rotation) * Math.PI) / 180;
      const latRad = (lat * Math.PI) / 180;
      const x = cx + r * Math.cos(latRad) * Math.sin(lonRad);
      const y = cy - r * Math.sin(latRad);
      const visible = Math.cos(latRad) * Math.cos(lonRad) > -0.1;
      return { x, y, visible };
    };

    const drawGlobe = (time: number) => {
      const width = w();
      const height = h();
      ctx.clearRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const r = Math.min(width, height) * 0.38;
      const rotation = time * 0.008;

      // Background glow
      const glow = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.3);
      glow.addColorStop(0, "hsla(263, 70%, 50%, 0.06)");
      glow.addColorStop(1, "transparent");
      ctx.fillStyle = glow;
      ctx.fillRect(0, 0, width, height);

      // Globe circle
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = "hsla(263, 70%, 50%, 0.15)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Grid
      ctx.strokeStyle = "hsla(263, 70%, 50%, 0.05)";
      ctx.lineWidth = 0.5;
      for (let lat = -60; lat <= 60; lat += 30) {
        ctx.beginPath();
        for (let lon = -180; lon <= 180; lon += 3) {
          const p = project(lon, lat, cx, cy, r, rotation);
          if (!p.visible) continue;
          if (lon === -180 || !project(lon - 3, lat, cx, cy, r, rotation).visible) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }
      for (let lon = -180; lon < 180; lon += 30) {
        ctx.beginPath();
        for (let lat = -90; lat <= 90; lat += 3) {
          const p = project(lon, lat, cx, cy, r, rotation);
          if (!p.visible) continue;
          if (lat === -90 || !project(lon, lat - 3, cx, cy, r, rotation).visible) {
            ctx.moveTo(p.x, p.y);
          } else {
            ctx.lineTo(p.x, p.y);
          }
        }
        ctx.stroke();
      }

      // Draw continents
      ctx.strokeStyle = "hsla(263, 70%, 60%, 0.35)";
      ctx.fillStyle = "hsla(263, 70%, 50%, 0.08)";
      ctx.lineWidth = 1;

      continents.forEach(continent => {
        ctx.beginPath();
        let started = false;
        continent.forEach(([lon, lat]) => {
          const p = project(lon, lat, cx, cy, r * 0.95, rotation);
          if (!p.visible) { started = false; return; }
          if (!started) { ctx.moveTo(p.x, p.y); started = true; }
          else ctx.lineTo(p.x, p.y);
        });
        ctx.stroke();
        ctx.fill();
      });

      // Active visitor dots at random positions on globe
      const sessionCount = sessions.length;
      for (let i = 0; i < sessionCount; i++) {
        const seed = i * 137.5;
        const lat = -60 + ((seed * 7.31) % 120);
        const lon = -180 + ((seed * 13.17) % 360);
        const p = project(lon, lat, cx, cy, r * 0.9, rotation);
        if (!p.visible) continue;

        const pulse = 1 + 0.3 * Math.sin(time * 0.003 + i);
        const dotSize = 4 * pulse;

        const dotGlow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, dotSize * 3);
        dotGlow.addColorStop(0, "hsla(142, 71%, 45%, 0.5)");
        dotGlow.addColorStop(1, "transparent");
        ctx.fillStyle = dotGlow;
        ctx.fillRect(p.x - dotSize * 3, p.y - dotSize * 3, dotSize * 6, dotSize * 6);

        ctx.beginPath();
        ctx.arc(p.x, p.y, dotSize, 0, Math.PI * 2);
        ctx.fillStyle = "hsla(142, 71%, 45%, 0.9)";
        ctx.fill();
      }
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
  const totalConversion = funnelData.length > 0 && funnelData[0].value > 0
    ? ((funnelData[funnelData.length - 1].value / funnelData[0].value) * 100).toFixed(1)
    : "0.0";

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

          <Card className="border-border">
            <CardContent className="p-4">
              <span className="text-sm font-medium text-foreground">Valor em Vendas (hoje)</span>
              <div className="h-[180px] mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={hourlyData}>
                    <defs>
                      <linearGradient id="liveRevenueGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(348, 83%, 47%)" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="hsl(348, 83%, 47%)" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="hour" tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip
                      contentStyle={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: 8, color: "hsl(var(--foreground))" }}
                      formatter={(value: number) => [formatCurrency(value), "Receita"]}
                    />
                    <Area type="monotone" dataKey="value" stroke="hsl(348, 83%, 47%)" strokeWidth={2} fill="url(#liveRevenueGrad)" dot={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Visual Funnel */}
          <Card className="border-border">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-semibold text-foreground">Conversão por Etapas</span>
                <span className="text-xs text-muted-foreground">Taxa total: {totalConversion}%</span>
              </div>
              <p className="text-3xl font-bold text-foreground mb-1">{totalConversion}%</p>
              <p className="text-xs text-muted-foreground mb-5">
                {funnelData[funnelData.length - 1]?.value || 0} pedidos pagos · {funnelData[0]?.value || 0} acessos
              </p>

              {/* SVG Funnel shape */}
              <div className="relative w-full mb-6">
                <svg viewBox="0 0 400 140" className="w-full" preserveAspectRatio="xMidYMid meet">
                  {funnelData.map((item, i) => {
                    const steps = funnelData.length;
                    const segW = 400 / steps;
                    const x = i * segW;
                    const topShrink = i * 18;
                    const botShrink = (i + 1) * 18;
                    const colors = ["hsl(263,70%,25%)", "hsl(263,60%,40%)", "hsl(263,55%,55%)", "hsl(263,50%,70%)"];

                    return (
                      <g key={item.label}>
                        <polygon
                          points={`${x},${topShrink} ${x + segW},${botShrink} ${x + segW},${140 - botShrink} ${x},${140 - topShrink}`}
                          fill={colors[i] || colors[0]}
                          opacity={0.9}
                        />
                        <text
                          x={x + segW / 2}
                          y={70}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize="13"
                          fontWeight="bold"
                        >
                          {item.value.toLocaleString("pt-BR")}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              </div>

              {/* Labels below funnel */}
              <div className="grid grid-cols-4 gap-2 text-center">
                {funnelData.map((item) => (
                  <div key={item.label}>
                    <p className="text-xs font-semibold text-foreground">{item.label}</p>
                    <p className="text-lg font-bold text-foreground">{item.pct}%</p>
                    <p className="text-[10px] text-muted-foreground">{item.value} de {funnelData[0]?.value || 0}</p>
                  </div>
                ))}
              </div>

              <div className="mt-4 rounded-xl bg-muted/50 py-2 px-4 text-center">
                <span className="text-xs text-muted-foreground">
                  <span className="inline-block w-2 h-2 rounded-full bg-marketplace-green mr-1.5" />
                  Taxa de Conversão Total: {totalConversion}%
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right: Globe */}
        <Card className="border-border relative overflow-hidden min-h-[500px]">
          <CardContent className="p-0 h-full">
            <div className="absolute top-4 right-4 z-10 rounded-xl p-3 border border-border bg-card/90 backdrop-blur">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="w-2 h-2 rounded-full bg-marketplace-green" />
                <span className="text-xs text-muted-foreground">Visitantes Ativos</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-primary" />
                <span className="text-xs text-muted-foreground">Sua Loja</span>
              </div>
            </div>

            <div className="absolute bottom-4 left-4 z-10">
              <p className="text-4xl font-bold text-foreground">{stats.visitors}</p>
              <p className="text-sm text-muted-foreground">visitantes ativos</p>
            </div>

            <canvas
              ref={canvasRef}
              className="w-full h-full min-h-[500px]"
              style={{ display: "block" }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminLiveView;
