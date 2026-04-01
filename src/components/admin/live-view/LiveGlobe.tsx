import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import Globe, { GlobeMethods } from "react-globe.gl";

interface VisitorPoint {
  lat: number;
  lng: number;
  size: number;
  id: string;
}

interface LiveGlobeProps {
  visitors: { session_id: string }[];
  className?: string;
}

// Convert session_id to a pseudo-random lat/lng in Brazil area
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
  const [geoData, setGeoData] = useState<any>(null);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });

  // Fetch lightweight GeoJSON
  useEffect(() => {
    fetch("https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json")
      .then(r => r.json())
      .then(topoData => {
        // Convert TopoJSON to GeoJSON
        const topojson = require("topojson-client");
        const land = topojson.feature(topoData, topoData.objects.land);
        setGeoData(land);
      })
      .catch(() => {
        // Fallback: try GeoJSON directly
        fetch("https://raw.githubusercontent.com/johan/world.geo.json/master/countries.geo.json")
          .then(r => r.json())
          .then(setGeoData)
          .catch(console.error);
      });
  }, []);

  // Set initial camera position (centered on South America)
  useEffect(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: -15, lng: -50, altitude: 2.5 }, 0);
      
      // Configure controls
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 200;
        controls.maxDistance = 600;
        controls.rotateSpeed = 0.5;
        controls.zoomSpeed = 0.8;
      }
    }
  }, [geoData]);

  // Responsive sizing
  useEffect(() => {
    if (!containerRef.current) return;
    const obs = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect;
      setDimensions({ width, height: Math.max(height, 300) });
    });
    obs.observe(containerRef.current);
    return () => obs.disconnect();
  }, []);

  // Map visitors to points
  const points: VisitorPoint[] = useMemo(() => {
    return visitors.map(v => {
      const { lat, lng } = sessionToCoords(v.session_id);
      return { lat, lng, size: 0.6, id: v.session_id };
    });
  }, [visitors]);

  const handleGlobeReady = useCallback(() => {
    if (globeRef.current) {
      globeRef.current.pointOfView({ lat: -15, lng: -50, altitude: 2.5 }, 1000);
      
      const controls = globeRef.current.controls();
      if (controls) {
        controls.autoRotate = false;
        controls.enableDamping = true;
        controls.dampingFactor = 0.1;
        controls.minDistance = 200;
        controls.maxDistance = 600;
      }
    }
  }, []);

  return (
    <div ref={containerRef} className={className} style={{ width: "100%", height: "100%", minHeight: 300 }}>
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
        
        // Polygons for continents
        polygonsData={geoData?.features || (geoData?.type === "FeatureCollection" ? geoData.features : geoData ? [geoData] : [])}
        polygonCapColor={() => "rgba(100, 60, 200, 0.15)"}
        polygonSideColor={() => "rgba(100, 60, 200, 0.05)"}
        polygonStrokeColor={() => "rgba(140, 100, 230, 0.4)"}
        polygonAltitude={0.006}
        
        // Hex layer for continent dots
        hexPolygonsData={geoData?.features || (geoData?.type === "FeatureCollection" ? geoData.features : geoData ? [geoData] : [])}
        hexPolygonResolution={3}
        hexPolygonMargin={0.4}
        hexPolygonUseDots={true}
        hexPolygonColor={() => "rgba(139, 108, 224, 0.6)"}
        hexPolygonAltitude={0.007}
        
        // Visitor points
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#4ADE80"}
        pointAltitude={0.02}
        pointRadius="size"
        pointsMerge={false}
      />
    </div>
  );
}
