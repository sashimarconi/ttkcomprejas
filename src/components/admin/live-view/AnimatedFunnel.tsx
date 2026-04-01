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
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), 100);
    return () => clearTimeout(timer);
  }, [data]);

  if (data.length === 0 || !data[0].value) return null;

  const total = data[0].value || 1;
  const totalConversion = ((data[data.length - 1]?.value || 0) / total * 100).toFixed(1);

  // SVG dimensions
  const svgW = 800;
  const svgH = 200;
  const padY = 20;

  // Each step has a percentage height proportional to its value
  const heights = data.map(d => {
    const ratio = animated ? d.value / total : 1;
    return Math.max(ratio * (svgH - padY * 2), 20);
  });

  const segW = svgW / data.length;
  const colors = ["hsl(263,70%,30%)", "hsl(263,55%,45%)", "hsl(270,50%,58%)", "hsl(275,45%,72%)"];
  const midY = svgH / 2;

  // Build a single continuous funnel path
  // Top edge goes left to right, bottom edge goes right to left
  const buildFunnelPaths = () => {
    const paths: string[] = [];

    for (let i = 0; i < data.length; i++) {
      const x0 = i * segW;
      const x1 = (i + 1) * segW;
      const h0 = heights[i] / 2;
      const h1 = i < data.length - 1 ? heights[i + 1] / 2 : heights[i] / 2 * 0.7;

      // Control points for smooth bezier between sections
      const cx = x0 + segW * 0.6;
      const cx2 = x0 + segW * 0.4;

      const topLeft = midY - h0;
      const topRight = midY - h1;
      const botLeft = midY + h0;
      const botRight = midY + h1;

      // Create a path for this segment using cubic bezier for smooth narrowing
      const path = `
        M ${x0},${topLeft}
        C ${cx},${topLeft} ${cx2},${topRight} ${x1},${topRight}
        L ${x1},${botRight}
        C ${cx2},${botRight} ${cx},${botLeft} ${x0},${botLeft}
        Z
      `;

      paths.push(path);
    }

    return paths;
  };

  const paths = buildFunnelPaths();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">Conversão por Etapas</span>
        <span className="text-xs text-muted-foreground">Taxa total: {totalConversion}%</span>
      </div>

      <div className="flex items-baseline gap-3">
        <p className="text-3xl font-bold text-foreground">{totalConversion}%</p>
        <p className="text-xs text-muted-foreground">
          {data[data.length - 1]?.value || 0} pedidos pagos · {total} acessos
        </p>
      </div>

      {/* SVG Funnel */}
      <div className="w-full">
        <svg viewBox={`0 0 ${svgW} ${svgH}`} className="w-full" preserveAspectRatio="xMidYMid meet">
          <defs>
            {colors.map((color, i) => (
              <linearGradient key={i} id={`fg-${i}`} x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor={i === 0 ? color : colors[i - 1]} />
                <stop offset="100%" stopColor={color} />
              </linearGradient>
            ))}
          </defs>
          {paths.map((path, i) => (
            <g key={i}>
              <path
                d={path}
                fill={`url(#fg-${i})`}
                opacity={0.9}
                style={{ transition: "all 1s ease-out" }}
              />
              {/* Percentage text centered in segment */}
              <text
                x={i * segW + segW / 2}
                y={midY + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="white"
                fontSize="16"
                fontWeight="bold"
              >
                {data[i].pct.toFixed(data[i].pct === 100 ? 1 : 2)}
              </text>
            </g>
          ))}
        </svg>
      </div>

      {/* Média de Conversão por Etapa */}
      <div className="border-t border-border pt-4">
        <p className="text-xs font-medium text-muted-foreground mb-3">Média de Conversão por Etapa</p>
        <div className="flex justify-between text-center">
          {data.map((item) => (
            <div key={item.label} className="flex-1">
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-lg font-bold text-foreground">{item.pct}%</p>
              <p className="text-[10px] text-muted-foreground">{item.value} de {total}</p>
            </div>
          ))}
        </div>
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
