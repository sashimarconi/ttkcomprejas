import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import Globe from "globe.gl";
import type { GlobeInstance } from "globe.gl";
import * as topojson from "topojson-client";
import type { Topology } from "topojson-specification";

interface VisitorPoint {
  lat: number;
  lng: number;
  size: number;
  id: string;
  color?: string;
}

interface ArcData {
  startLat: number;
  startLng: number;
  endLat: number;
  endLng: number;
}

interface LiveGlobeProps {
  visitors: { session_id: string; latitude?: number | null; longitude?: number | null }[];
  className?: string;
}

const SERVER_LAT = -23.55;
const SERVER_LNG = -46.63;
const ATMOSPHERE_COLOR = "#6c3ce0";
const VISITOR_COLOR = "#4ADE80";
const SERVER_COLOR = "#a78bfa";
const POLYGON_CAP_COLOR = "rgba(100, 60, 200, 0.15)";
const POLYGON_SIDE_COLOR = "rgba(100, 60, 200, 0.05)";
const POLYGON_STROKE_COLOR = "rgba(140, 100, 230, 0.4)";
const ARC_START_COLOR = "rgba(74, 222, 128, 0.6)";
const ARC_END_COLOR = "rgba(167, 139, 250, 0.6)";
const TRANSPARENT_BG = "rgba(0,0,0,0)";

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
  const containerRef = useRef<HTMLDivElement>(null);
  const globeInstanceRef = useRef<GlobeInstance | null>(null);
  const [polygons, setPolygons] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  useEffect(() => {
    let isMounted = true;

    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then((response) => response.json())
      .then((topoData: Topology) => {
        if (!isMounted) return;
        const land = topojson.feature(topoData, topoData.objects.land);
        const features = (land as any).features || [land];
        setPolygons(features);
      })
      .catch(console.error);

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;

      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setDimensions({ width, height });
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  const points = useMemo<VisitorPoint[]>(() => {
    return visitors.map((visitor) => {
      const hasRealCoords = visitor.latitude != null
        && visitor.longitude != null
        && visitor.latitude !== 0
        && visitor.longitude !== 0;

      const fallbackCoords = sessionToCoords(visitor.session_id);

      return {
        lat: hasRealCoords ? visitor.latitude! : fallbackCoords.lat,
        lng: hasRealCoords ? visitor.longitude! : fallbackCoords.lng,
        size: 0.6,
        id: visitor.session_id,
      };
    });
  }, [visitors]);

  const arcs = useMemo<ArcData[]>(() => {
    return points.map((point) => ({
      startLat: point.lat,
      startLng: point.lng,
      endLat: SERVER_LAT,
      endLng: SERVER_LNG,
    }));
  }, [points]);

  const allPoints = useMemo<VisitorPoint[]>(() => {
    return [
      ...points,
      { lat: SERVER_LAT, lng: SERVER_LNG, size: 1.2, id: "server", color: SERVER_COLOR },
    ];
  }, [points]);

  const configureGlobe = useCallback((globe: GlobeInstance) => {
    globe
      .backgroundColor(TRANSPARENT_BG)
      .showAtmosphere(true)
      .atmosphereColor(ATMOSPHERE_COLOR)
      .atmosphereAltitude(0.15)
      .pointLat("lat")
      .pointLng("lng")
      .pointColor((datum: object) => (datum as VisitorPoint).color || VISITOR_COLOR)
      .pointAltitude(0.02)
      .pointRadius("size")
      .pointsMerge(false)
      .arcStartLat("startLat")
      .arcStartLng("startLng")
      .arcEndLat("endLat")
      .arcEndLng("endLng")
      .arcColor(() => [ARC_START_COLOR, ARC_END_COLOR])
      .arcAltitude(0.15)
      .arcStroke(0.5)
      .arcDashLength(0.4)
      .arcDashGap(0.2)
      .arcDashAnimateTime(2000)
      .polygonCapColor(() => POLYGON_CAP_COLOR)
      .polygonSideColor(() => POLYGON_SIDE_COLOR)
      .polygonStrokeColor(() => POLYGON_STROKE_COLOR)
      .polygonAltitude(0.006);

    globe.pointOfView({ lat: -15, lng: -50, altitude: 2.5 }, 1000);

    const controls = globe.controls();
    if (controls) {
      const orbitControls = controls as any;
      orbitControls.autoRotate = false;
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.1;
      orbitControls.minDistance = 200;
      orbitControls.maxDistance = 600;
      orbitControls.rotateSpeed = 0.5;
      orbitControls.zoomSpeed = 0.8;
    }
  }, []);

  useEffect(() => {
    if (!containerRef.current || globeInstanceRef.current) return;

    const globe = new Globe(containerRef.current);
    globeInstanceRef.current = globe;
    configureGlobe(globe);

    return () => {
      const currentGlobe = globeInstanceRef.current;
      globeInstanceRef.current = null;

      if (!currentGlobe) return;

      try {
        currentGlobe.pauseAnimation();
        currentGlobe.enablePointerInteraction(false);
        currentGlobe.pointsData([]);
        currentGlobe.arcsData([]);
        currentGlobe.polygonsData([]);
      } catch (error) {
        console.warn("LiveGlobe cleanup warning:", error);
      }

      try {
        currentGlobe.controls()?.dispose?.();
      } catch (error) {
        console.warn("LiveGlobe controls cleanup warning:", error);
      }

      try {
        currentGlobe.postProcessingComposer()?.dispose?.();
      } catch (error) {
        console.warn("LiveGlobe post-processing cleanup warning:", error);
      }

      try {
        const renderer = currentGlobe.renderer();
        renderer.dispose();
        (renderer as any).forceContextLoss?.();
      } catch (error) {
        console.warn("LiveGlobe renderer cleanup warning:", error);
      }

      try {
        containerRef.current?.replaceChildren();
      } catch (error) {
        console.warn("LiveGlobe DOM cleanup warning:", error);
      }
    };
  }, [configureGlobe]);

  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.width(dimensions.width).height(dimensions.height);
  }, [dimensions]);

  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.polygonsData(polygons);
  }, [polygons]);

  useEffect(() => {
    const globe = globeInstanceRef.current;
    if (!globe) return;

    globe.pointsData(allPoints).arcsData(arcs);
  }, [allPoints, arcs]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}
    />
  );
}
