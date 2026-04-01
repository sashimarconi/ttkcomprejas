import { useEffect, useState } from "react";

interface FunnelStep {
  label: string;
  value: number;
  pct: number;
}

interface AnimatedFunnelProps {
  data: FunnelStep[];
}

export default function AnimatedFunnel({ data }: AnimatedFunnelProps) {
  const [animatedPcts, setAnimatedPcts] = useState<number[]>(data.map(() => 0));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPcts(data.map(d => d.pct));
    }, 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (data.length === 0 || !data[0].value) return null;

  const total = data[0].value || 1;
  const totalConversion = ((data[data.length - 1]?.value || 0) / total * 100).toFixed(1);

  // SVG funnel with flowing bezier curves
  const svgW = 600;
  const svgH = 180;
  const colors = ["hsl(263,70%,30%)", "hsl(263,60%,45%)", "hsl(270,55%,58%)", "hsl(275,50%,72%)"];

  // Calculate widths for each step
  const widths = data.map(d => {
    const ratio = d.value / total;
    return Math.max(ratio * svgW * 0.9, 40);
  });

  const segW = svgW / data.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-sm font-semibold text-foreground">Conversão por Etapas</span>
        </div>
        <span className="text-xs text-muted-foreground">Taxa total: {totalConversion}%</span>
      </div>

      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-bold text-foreground">{totalConversion}%</p>
        <p className="text-xs text-muted-foreground">
          {data[data.length - 1]?.value || 0} pedidos pagos · {total} acessos
        </p>
      </div>

      {/* SVG Funnel with flowing shapes */}
      <div className="w-full">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {colors.map((color, i) => (
              <linearGradient key={i} id={`funnel-grad-${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={colors[Math.max(0, i - 1)] || color} />
                <stop offset="100%" stopColor={color} />
              </linearGradient>
            ))}
          </defs>
          {data.map((item, i) => {
            const x1 = i * segW;
            const x2 = (i + 1) * segW;
            const cx = x1 + segW * 0.5;

            const prevHalfH = (i === 0 ? svgH * 0.9 : widths[i - 1] * (svgH / svgW) * 2.5) / 2;
            const currHalfH = (widths[i] * (svgH / svgW) * 2.5) / 2;
            const nextHalfH = i < data.length - 1
              ? (widths[i + 1] * (svgH / svgW) * 2.5) / 2
              : currHalfH * 0.7;

            const topY1 = svgH / 2 - prevHalfH;
            const topY2 = svgH / 2 - nextHalfH;
            const botY1 = svgH / 2 + prevHalfH;
            const botY2 = svgH / 2 + nextHalfH;

            const path = `
              M ${x1},${topY1}
              C ${cx},${topY1} ${cx},${topY2} ${x2},${topY2}
              L ${x2},${botY2}
              C ${cx},${botY2} ${cx},${botY1} ${x1},${botY1}
              Z
            `;

            return (
              <g key={item.label}>
                <path
                  d={path}
                  fill={`url(#funnel-grad-${i})`}
                  opacity={0.9}
                  style={{
                    transition: "all 1s ease-out",
                  }}
                />
                <text
                  x={x1 + segW / 2}
                  y={svgH / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize="14"
                  fontWeight="bold"
                >
                  {item.pct.toFixed(0) === "100" ? "100.0" : item.pct.toFixed(2)}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Labels below */}
      <div className="flex justify-between text-center">
        {data.map((item) => (
          <div key={item.label} className="flex-1">
            <p className="text-xs font-semibold text-foreground">{item.label}</p>
            <p className="text-lg font-bold text-foreground">{item.pct}%</p>
            <p className="text-[10px] text-muted-foreground">{item.value} de {total}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl bg-muted/50 py-2.5 px-4 text-center">
        <span className="text-xs text-muted-foreground flex items-center justify-center gap-1.5">
          <span className="inline-block w-2 h-2 rounded-full bg-marketplace-green" />
          Taxa de Conversão Total: {totalConversion}%
        </span>
      </div>
    </div>
  );
}
