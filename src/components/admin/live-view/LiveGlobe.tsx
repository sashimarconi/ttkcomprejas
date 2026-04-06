import { useEffect, useRef, useState, useMemo } from "react";

interface LiveGlobeProps {
  visitors: { session_id: string; latitude?: number | null; longitude?: number | null }[];
  className?: string;
}

const SERVER_LAT = -23.55;
const SERVER_LNG = -46.63;

function sessionToCoords(sessionId: string): { lat: number; lng: number } {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash |= 0;
  }
  const lat = -15 + ((Math.abs(hash) % 20) - 10);
  const lng = -50 + ((Math.abs(hash >> 8) % 20) - 10);
  return { lat, lng };
}

// Simple Mercator projection
function project(lat: number, lng: number, width: number, height: number) {
  const x = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const y = height / 2 - (mercN / Math.PI) * (height / 2);
  return { x, y };
}

export default function LiveGlobe({ visitors, className }: LiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [worldPath, setWorldPath] = useState<string>("");

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Load simplified world outline
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then(r => r.json())
      .then(async (topoData) => {
        const topojson = await import("topojson-client");
        const land = topojson.feature(topoData, topoData.objects.land) as any;
        const features = land.features || [land];
        // Build SVG path from GeoJSON
        const { width, height } = dimensions;
        let path = "";
        for (const feature of features) {
          const coords = feature.geometry?.coordinates || [];
          const rings = feature.geometry?.type === "MultiPolygon"
            ? coords.flatMap((poly: any) => poly)
            : coords;
          for (const ring of rings) {
            if (!Array.isArray(ring) || ring.length < 2) continue;
            const pts = ring.map(([lng, lat]: [number, number]) => project(lat, lng, width, height));
            path += `M${pts.map((p: any) => `${p.x},${p.y}`).join("L")}Z `;
          }
        }
        setWorldPath(path);
      })
      .catch(console.error);
  }, [dimensions.width, dimensions.height]);

  const points = useMemo(() => {
    return visitors.map(v => {
      const hasReal = v.latitude != null && v.longitude != null && v.latitude !== 0 && v.longitude !== 0;
      const lat = hasReal ? v.latitude! : sessionToCoords(v.session_id).lat;
      const lng = hasReal ? v.longitude! : sessionToCoords(v.session_id).lng;
      return { ...project(lat, lng, dimensions.width, dimensions.height), id: v.session_id };
    });
  }, [visitors, dimensions]);

  const serverPt = useMemo(
    () => project(SERVER_LAT, SERVER_LNG, dimensions.width, dimensions.height),
    [dimensions]
  );

  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => (p + 1) % 60), 50);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
    >
      <svg width={dimensions.width} height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}>
        <rect width="100%" height="100%" fill="transparent" />

        {/* World map */}
        {worldPath && (
          <path
            d={worldPath}
            fill="rgba(100, 60, 200, 0.12)"
            stroke="rgba(140, 100, 230, 0.35)"
            strokeWidth={0.5}
          />
        )}

        {/* Arcs from visitors to server */}
        {points.map((p) => {
          const midX = (p.x + serverPt.x) / 2;
          const midY = Math.min(p.y, serverPt.y) - 30;
          return (
            <path
              key={p.id}
              d={`M${p.x},${p.y} Q${midX},${midY} ${serverPt.x},${serverPt.y}`}
              fill="none"
              stroke="rgba(74, 222, 128, 0.3)"
              strokeWidth={1}
              strokeDasharray="4 3"
              strokeDashoffset={-pulse}
            />
          );
        })}

        {/* Visitor dots */}
        {points.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={3} fill="#4ADE80" opacity={0.8} />
            <circle cx={p.x} cy={p.y} r={6} fill="none" stroke="#4ADE80" strokeWidth={0.5} opacity={0.4 + Math.sin(pulse / 10) * 0.2} />
          </g>
        ))}

        {/* Server dot */}
        <circle cx={serverPt.x} cy={serverPt.y} r={5} fill="#a78bfa" opacity={0.9} />
        <circle cx={serverPt.x} cy={serverPt.y} r={10} fill="none" stroke="#a78bfa" strokeWidth={0.5} opacity={0.3 + Math.sin(pulse / 8) * 0.2} />
      </svg>
    </div>
  );
}
