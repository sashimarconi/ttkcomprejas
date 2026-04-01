import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";

interface VisitorPoint {
  lat: number;
  lng: number;
  size: number;
  id: string;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

interface LiveGlobeProps {
  visitors: { session_id: string }[];
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

export default function LiveGlobe({ visitors, className }: LiveGlobeProps) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const containerRef = useRef<HTMLDivElement>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then(r => r.json())
      .then((topoData: Topology) => {
        const land = topojson.feature(topoData, topoData.objects.land);
        const features = (land as any).features || [land];
        setPolygons(features);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  const points: VisitorPoint[] = useMemo(() => {
    return visitors.map(v => {
      const { lat, lng } = sessionToCoords(v.session_id);
      return { lat, lng, size: 0.6, id: v.session_id };
    });
  }, [visitors]);

  const arcs: ArcData[] = useMemo(() => {
    return points.map(p => ({
      startLat: p.lat,
      startLng: p.lng,
      endLat: SERVER_LAT,
      endLng: SERVER_LNG,
    }));
  }, [points]);

  const serverPoint = useMemo(() => [
    { lat: SERVER_LAT, lng: SERVER_LNG, size: 1.2, id: "server", color: "#a78bfa" }
  ], []);

  const handleGlobeReady = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: -15, lng: -50, altitude: 2.5 }, 1000);

      const controls = globeRef.current.controls();
      if (controls) {
        (controls as any).autoRotate = false;
        (controls as any).enableDamping = true;
        (controls as any).dampingFactor = 0.1;
        (controls as any).minDistance = 200;
        (controls as any).maxDistance = 600;
        (controls as any).rotateSpeed = 0.5;
        (controls as any).zoomSpeed = 0.8;
      }
    }
  }, []);

  const allPoints = useMemo(() => [...points, ...serverPoint], [points, serverPoint]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    >
      {polygons.length > 0 && dimensions.width > 0 && (
        <Globe
          ref={globeRef}
          width={dimensions.width}
          height={dimensions.height}
          onGlobeReady={handleGlobeReady}
          globeImageUrl=""
          backgroundColor="rgba(0,0,0,0)"
          showAtmosphere={true}
          atmosphereColor="#6c3ce0"
          atmosphereAltitude={0.15}

          polygonsData={polygons}
          polygonCapColor={() => "rgba(100, 60, 200, 0.15)"}
          polygonSideColor={() => "rgba(100, 60, 200, 0.05)"}
          polygonStrokeColor={() => "rgba(140, 100, 230, 0.4)"}
          polygonAltitude={0.006}

          pointsData={allPoints}
          pointLat="lat"
          pointLng="lng"
          pointColor={(d: any) => d.color || "#4ADE80"}
          pointAltitude={0.02}
          pointRadius="size"
          pointsMerge={false}

          arcsData={arcs}
          arcStartLat="startLat"
          arcStartLng="startLng"
          arcEndLat="endLat"
          arcEndLng="endLng"
          arcColor={() => ["rgba(74, 222, 128, 0.6)", "rgba(167, 139, 250, 0.6)"]}
          arcAltitude={0.15}
          arcStroke={0.5}
          arcDashLength={0.4}
          arcDashGap={0.2}
          arcDashAnimateTime={2000}
        />
      )}
    </div>
  );
}
