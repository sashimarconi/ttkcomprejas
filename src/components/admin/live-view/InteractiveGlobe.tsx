import { useRef, useMemo, useEffect, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// Simplified continent data as arrays of [lon, lat] boundary points
const CONTINENT_BOUNDS: [number, number][][] = [
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

function isPointInPolygon(px: number, py: number, polygon: [number, number][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > py) !== (yj > py) && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function isLand(lon: number, lat: number): boolean {
  return CONTINENT_BOUNDS.some(c => isPointInPolygon(lon, lat, c));
}

function latLonToVec3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

interface VisitorDot {
  position: THREE.Vector3;
  id: string;
}

function GlobeSphere({ visitors }: { visitors: { session_id: string }[] }) {
  const globeRef = useRef<THREE.Group>(null);
  const dotsRef = useRef<THREE.InstancedMesh>(null);
  const visitorDotsRef = useRef<THREE.InstancedMesh>(null);
  const glowRef = useRef<THREE.Mesh>(null);

  // Generate land dots
  const landDots = useMemo(() => {
    const dots: THREE.Vector3[] = [];
    const step = 3;
    for (let lat = -80; lat <= 80; lat += step) {
      for (let lon = -180; lon <= 180; lon += step) {
        if (isLand(lon, lat)) {
          dots.push(latLonToVec3(lat, lon, 2));
        }
      }
    }
    return dots;
  }, []);

  // Generate grid dots (ocean)
  const gridDots = useMemo(() => {
    const dots: THREE.Vector3[] = [];
    const step = 8;
    for (let lat = -80; lat <= 80; lat += step) {
      for (let lon = -180; lon <= 180; lon += step) {
        if (!isLand(lon, lat)) {
          dots.push(latLonToVec3(lat, lon, 2));
        }
      }
    }
    return dots;
  }, []);

  // Visitor positions - deterministic based on session_id
  const visitorPositions = useMemo<VisitorDot[]>(() => {
    return visitors.map((v) => {
      let hash = 0;
      for (let i = 0; i < v.session_id.length; i++) {
        hash = ((hash << 5) - hash) + v.session_id.charCodeAt(i);
        hash |= 0;
      }
      // Default to Brazil area with some spread
      const lat = -25 + ((Math.abs(hash) % 40) - 20);
      const lon = -50 + ((Math.abs(hash >> 8) % 30) - 15);
      return { position: latLonToVec3(lat, lon, 2.05), id: v.session_id };
    });
  }, [visitors]);

  // Set instance matrices for land dots
  useEffect(() => {
    if (!dotsRef.current) return;
    const dummy = new THREE.Object3D();
    landDots.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.updateMatrix();
      dotsRef.current!.setMatrixAt(i, dummy.matrix);
    });
    dotsRef.current.instanceMatrix.needsUpdate = true;
  }, [landDots]);

  // Set instance matrices for visitor dots
  useEffect(() => {
    if (!visitorDotsRef.current) return;
    const dummy = new THREE.Object3D();
    visitorPositions.forEach((v, i) => {
      dummy.position.copy(v.position);
      dummy.updateMatrix();
      visitorDotsRef.current!.setMatrixAt(i, dummy.matrix);
    });
    visitorDotsRef.current.instanceMatrix.needsUpdate = true;
  }, [visitorPositions]);

  // Slow auto-rotation
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.05;
    }
    // Pulse visitor dots
    if (visitorDotsRef.current && visitorPositions.length > 0) {
      const time = Date.now() * 0.003;
      const dummy = new THREE.Object3D();
      visitorPositions.forEach((v, i) => {
        const scale = 1 + 0.4 * Math.sin(time + i * 1.5);
        dummy.position.copy(v.position);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        visitorDotsRef.current!.setMatrixAt(i, dummy.matrix);
      });
      visitorDotsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const dotGeometry = useMemo(() => new THREE.SphereGeometry(0.03, 6, 6), []);
  const visitorDotGeometry = useMemo(() => new THREE.SphereGeometry(0.06, 8, 8), []);

  return (
    <group ref={globeRef}>
      {/* Globe sphere outline */}
      <mesh>
        <sphereGeometry args={[1.98, 64, 64]} />
        <meshBasicMaterial color="#1a1040" transparent opacity={0.9} />
      </mesh>

      {/* Atmosphere glow */}
      <mesh ref={glowRef} scale={[2.3, 2.3, 2.3]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#6c3ce0" transparent opacity={0.04} side={THREE.BackSide} />
      </mesh>

      {/* Grid dots (ocean) */}
      {gridDots.length > 0 && (
        <instancedMesh args={[dotGeometry, undefined, gridDots.length]}>
          <meshBasicMaterial color="#2d1f5e" transparent opacity={0.3} />
        </instancedMesh>
      )}

      {/* Land dots */}
      {landDots.length > 0 && (
        <instancedMesh ref={dotsRef} args={[dotGeometry, undefined, landDots.length]}>
          <meshBasicMaterial color="#7c5ce0" transparent opacity={0.7} />
        </instancedMesh>
      )}

      {/* Visitor dots */}
      {visitorPositions.length > 0 && (
        <instancedMesh ref={visitorDotsRef} args={[visitorDotGeometry, undefined, visitorPositions.length]}>
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} />
        </instancedMesh>
      )}
    </group>
  );
}

function SceneSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 5);
  }, [camera]);
  return null;
}

interface InteractiveGlobeProps {
  visitors: { session_id: string }[];
  className?: string;
}

export default function InteractiveGlobe({ visitors, className }: InteractiveGlobeProps) {
  return (
    <div className={className} style={{ width: "100%", height: "100%" }}>
      <Canvas
        gl={{ antialias: true, alpha: true }}
        style={{ background: "transparent" }}
        camera={{ fov: 45, near: 0.1, far: 100 }}
      >
        <SceneSetup />
        <ambientLight intensity={0.5} />
        <GlobeSphere visitors={visitors} />
        <OrbitControls
          enableZoom={true}
          enablePan={false}
          minDistance={3.5}
          maxDistance={8}
          rotateSpeed={0.5}
          autoRotate={false}
        />
      </Canvas>
    </div>
  );
}
