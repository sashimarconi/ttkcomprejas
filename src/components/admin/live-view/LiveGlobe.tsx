import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";

interface LiveGlobeProps {
  visitors: { session_id: string; latitude?: number | null; longitude?: number | null }[];
  className?: string;
}

function sessionToCoords(sessionId: string): [number, number] {
  let hash = 0;
  for (let i = 0; i < sessionId.length; i++) {
    hash = ((hash << 5) - hash) + sessionId.charCodeAt(i);
    hash |= 0;
  }
  return [
    -15 + ((Math.abs(hash) % 20) - 10),
    -50 + ((Math.abs(hash >> 8) % 20) - 10),
  ];
}

// All projection math is pure — no async, no side effects
function projectPt(lat: number, lng: number, w: number, h: number, panX: number, panY: number, z: number) {
  const cx = w / 2;
  const cy = h / 2;
  const bx = ((lng + 180) / 360) * w;
  const latRad = (lat * Math.PI) / 180;
  const by = h / 2 - (Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) * (h / 2);
  return [(bx - cx) * z + cx + panX, (by - cy) * z + cy + panY] as const;
}

type Ring = [number, number][];

export default function LiveGlobe({ visitors, className }: LiveGlobeProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [dims, setDims] = useState({ w: 400, h: 300 });
  const [rings, setRings] = useState<Ring[]>([]);
  const [zoom, setZoom] = useState(2.8);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragging = useRef(false);
  const dragStart = useRef({ mx: 0, my: 0, px: 0, py: 0 });

  // Observe container size
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const obs = new ResizeObserver(([e]) => {
      const { width, height } = e.contentRect;
      if (width > 0 && height > 0) setDims({ w: width, h: height });
    });
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  // Center on Brazil on mount
  useEffect(() => {
    const { w, h } = dims;
    const cx = w / 2;
    const cy = h / 2;
    const tx = ((-50 + 180) / 360) * w;
    const latRad = (-15 * Math.PI) / 180;
    const ty = h / 2 - (Math.log(Math.tan(Math.PI / 4 + latRad / 2)) / Math.PI) * (h / 2);
    setPan({ x: -(tx - cx) * 2.8, y: -(ty - cy) * 2.8 });
  }, [dims.w, dims.h]);

  // Load world topology once → extract rings (lat/lng arrays)
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then(r => r.json())
      .then((topo: Topology) => {
        const land = topojson.feature(topo, topo.objects.land) as any;
        const features = land.features || [land];
        const allRings: Ring[] = [];
        for (const f of features) {
          const coords = f.geometry?.coordinates || [];
          const polys = f.geometry?.type === "MultiPolygon"
            ? coords.flatMap((p: any) => p)
            : coords;
          for (const ring of polys) {
            if (Array.isArray(ring) && ring.length >= 2) {
              allRings.push(ring as Ring);
            }
          }
        }
        setRings(allRings);
      })
      .catch(console.error);
  }, []);

  // Build SVG path string synchronously from cached rings
  const worldPath = useMemo(() => {
    if (!rings.length) return "";
    const { w, h } = dims;
    const parts: string[] = [];
    for (const ring of rings) {
      let d = "";
      for (let i = 0; i < ring.length; i++) {
        const [px, py] = projectPt(ring[i][1], ring[i][0], w, h, pan.x, pan.y, zoom);
        d += i === 0 ? `M${px.toFixed(1)},${py.toFixed(1)}` : `L${px.toFixed(1)},${py.toFixed(1)}`;
      }
      parts.push(d + "Z");
    }
    return parts.join(" ");
  }, [rings, dims.w, dims.h, pan.x, pan.y, zoom]);

  // Visitor points — only real geolocated ones
  const points = useMemo(() => {
    return visitors
      .filter(v => v.latitude != null && v.longitude != null && v.latitude !== 0 && v.longitude !== 0)
      .map(v => {
        const [x, y] = projectPt(v.latitude!, v.longitude!, dims.w, dims.h, pan.x, pan.y, zoom);
        return { x, y, id: v.session_id };
    });
  }, [visitors, dims, pan.x, pan.y, zoom]);

  // Zoom — native listener to prevent page scroll (React onWheel is passive)
  const svgRef = useRef<SVGSVGElement>(null);
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      setZoom(z => Math.max(0.8, Math.min(15, z * (e.deltaY < 0 ? 1.15 : 0.87))));
    };
    svg.addEventListener("wheel", handler, { passive: false });
    return () => svg.removeEventListener("wheel", handler);
  }, []);

  // Pan
  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true;
    dragStart.current = { mx: e.clientX, my: e.clientY, px: pan.x, py: pan.y };
    (e.target as Element).setPointerCapture(e.pointerId);
  }, [pan.x, pan.y]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return;
    setPan({
      x: dragStart.current.px + (e.clientX - dragStart.current.mx),
      y: dragStart.current.py + (e.clientY - dragStart.current.my),
    });
  }, []);

  const handlePointerUp = useCallback(() => { dragging.current = false; }, []);

  // Pulse
  const [pulse, setPulse] = useState(0);
  useEffect(() => {
    let raf: number;
    let start = performance.now();
    const tick = (now: number) => {
      setPulse(((now - start) / 40) % 120);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const r = Math.max(2, 4 / Math.sqrt(zoom));

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", overflow: "hidden", touchAction: "none" }}
    >
      <svg
        ref={svgRef}
        width={dims.w}
        height={dims.h}
        style={{ display: "block", cursor: dragging.current ? "grabbing" : "grab" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <defs>
          <radialGradient id="vg">
            <stop offset="0%" stopColor="#4ADE80" stopOpacity="0.6" />
            <stop offset="100%" stopColor="#4ADE80" stopOpacity="0" />
          </radialGradient>
        </defs>

        {worldPath && (
          <path d={worldPath} fill="rgba(100,60,200,0.1)" stroke="rgba(140,100,230,0.3)" strokeWidth={0.5} />
        )}

        {points.map(p => (
          <g key={p.id}>
            <circle cx={p.x} cy={p.y} r={r * 2.5} fill="url(#vg)" opacity={0.5 + Math.sin(pulse / 15) * 0.2} />
            <circle cx={p.x} cy={p.y} r={r} fill="#4ADE80" opacity={0.9} />
          </g>
        ))}
      </svg>
    </div>
  );
}
