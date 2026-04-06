import { useEffect, useRef, useState, useMemo, useCallback } from "react";

interface LiveGlobeProps {
  visitors: { session_id: string; latitude?: number | null; longitude?: number | null }[];
  className?: string;
}

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

function project(lat: number, lng: number, width: number, height: number, pan: { x: number; y: number }, zoom: number) {
  const cx = width / 2;
  const cy = height / 2;
  const baseX = ((lng + 180) / 360) * width;
  const latRad = (lat * Math.PI) / 180;
  const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
  const baseY = height / 2 - (mercN / Math.PI) * (height / 2);
  return {
    x: (baseX - cx) * zoom + cx + pan.x,
    y: (baseY - cy) * zoom + cy + pan.y,
  };
}

export default function LiveGlobe({ visitors, className }: LiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 300 });
  const [worldPath, setWorldPath] = useState("");
  const [zoom, setZoom] = useState(2.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, panX: 0, panY: 0 });

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) setDimensions({ width, height });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Center on Brazil initially
  useEffect(() => {
    const { width, height } = dimensions;
    const cx = width / 2;
    const cy = height / 2;
    const targetX = ((-50 + 180) / 360) * width;
    const latRad = (-15 * Math.PI) / 180;
    const mercN = Math.log(Math.tan(Math.PI / 4 + latRad / 2));
    const targetY = height / 2 - (mercN / Math.PI) * (height / 2);
    setPan({ x: -(targetX - cx) * 2.8, y: -(targetY - cy) * 2.8 });
  }, [dimensions.width, dimensions.height]);

  // Build world path per zoom/pan
  const buildPath = useCallback((topoData: any, w: number, h: number, p: { x: number; y: number }, z: number) => {
    import("topojson-client").then(topojson => {
      const land = topojson.feature(topoData, topoData.objects.land) as any;
      const features = land.features || [land];
      let path = "";
      for (const feature of features) {
        const coords = feature.geometry?.coordinates || [];
        const rings = feature.geometry?.type === "MultiPolygon"
          ? coords.flatMap((poly: any) => poly)
          : coords;
        for (const ring of rings) {
          if (!Array.isArray(ring) || ring.length < 2) continue;
          const pts = ring.map(([lng, lat]: [number, number]) => project(lat, lng, w, h, p, z));
          path += `M${pts.map((pt: any) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`).join("L")}Z `;
        }
      }
      setWorldPath(path);
    });
  }, []);

  const topoRef = useRef<any>(null);

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then(r => r.json())
      .then(data => {
        topoRef.current = data;
        buildPath(data, dimensions.width, dimensions.height, pan, zoom);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (topoRef.current) {
      buildPath(topoRef.current, dimensions.width, dimensions.height, pan, zoom);
    }
  }, [dimensions.width, dimensions.height, pan.x, pan.y, zoom, buildPath]);

  const points = useMemo(() => {
    return visitors.map(v => {
      const hasReal = v.latitude != null && v.longitude != null && v.latitude !== 0 && v.longitude !== 0;
      const lat = hasReal ? v.latitude! : sessionToCoords(v.session_id).lat;
      const lng = hasReal ? v.longitude! : sessionToCoords(v.session_id).lng;
      return { ...project(lat, lng, dimensions.width, dimensions.height, pan, zoom), id: v.session_id };
    });
  }, [visitors, dimensions, pan, zoom]);

  // Zoom with wheel
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    setZoom(z => Math.max(0.8, Math.min(15, z * (e.deltaY < 0 ? 1.15 : 0.87))));
  }, []);

  // Pan with drag
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, panX: pan.x, panY: pan.y };
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging) return;
    setPan({
      x: dragStart.current.panX + (e.clientX - dragStart.current.x),
      y: dragStart.current.panY + (e.clientY - dragStart.current.y),
    });
  }, [dragging]);

  const handleMouseUp = useCallback(() => setDragging(false), []);

  // Pulse animation
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => setPulse(p => (p + 1) % 120), 40);
    return () => clearInterval(interval);
  }, []);

  const dotRadius = Math.max(2, 4 / Math.sqrt(zoom));

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", overflow: "hidden", cursor: dragging ? "grabbing" : "grab" }}
    >
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        style={{ display: "block" }}
      >
        <defs>
          <radialGradient id="dot-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width="100%" height="100%" fill="transparent" />

        {worldPath && (
          <path
            d={worldPath}
            fill="rgba(100, 60, 200, 0.1)"
            stroke="rgba(140, 100, 230, 0.3)"
            strokeWidth={0.5}
          />
        )}

        {points.map((p) => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={dotRadius * 2.5} fill="url(#dot-glow)" opacity={0.5 + Math.sin(pulse / 15) * 0.2} />
            <circle cx={p.x} cy={p.y} r={dotRadius} fill="#4ADE80" opacity={0.9} />
          </g>
        ))}
      </svg>
    </div>
  );
}
