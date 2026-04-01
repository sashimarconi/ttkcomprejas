import { useRef, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

// More realistic continent boundary data [lon, lat]
const CONTINENT_BOUNDS: [number, number][][] = [
  // South America (detailed)
  [[-81,8],[-79,9],[-77,8],[-74,11],[-72,12],[-72,10],[-71,8],[-70,7],[-67,6],[-63,10],[-61,10],[-60,8],[-58,7],[-57,6],[-53,4],[-51,4],[-50,2],[-49,0],[-48,-1],[-45,-2],[-42,-3],[-39,-4],[-37,-5],[-35,-7],[-35,-10],[-36,-12],[-38,-14],[-39,-17],[-40,-20],[-41,-22],[-43,-23],[-45,-23],[-47,-25],[-48,-27],[-49,-29],[-50,-30],[-51,-31],[-52,-33],[-53,-34],[-53,-33],[-54,-31],[-57,-30],[-58,-34],[-60,-37],[-62,-38],[-64,-40],[-65,-42],[-66,-45],[-67,-46],[-68,-48],[-69,-50],[-70,-52],[-72,-53],[-74,-52],[-74,-49],[-73,-45],[-72,-42],[-71,-40],[-70,-37],[-70,-33],[-70,-27],[-70,-22],[-70,-18],[-71,-15],[-75,-14],[-76,-12],[-77,-10],[-78,-5],[-79,-2],[-80,0],[-80,2],[-78,3],[-77,4],[-78,6],[-79,7],[-81,8]],
  // North America
  [[-168,66],[-165,64],[-160,60],[-150,60],[-140,60],[-138,57],[-136,58],[-132,55],[-130,50],[-127,48],[-124,45],[-123,40],[-120,35],[-117,33],[-115,31],[-112,31],[-108,31],[-105,30],[-103,29],[-100,28],[-97,26],[-95,29],[-93,30],[-90,29],[-88,30],[-85,30],[-83,29],[-82,25],[-81,25],[-80,26],[-80,30],[-78,33],[-76,35],[-75,38],[-73,40],[-71,41],[-70,42],[-67,44],[-66,44],[-65,47],[-60,47],[-55,48],[-53,47],[-55,52],[-58,55],[-62,58],[-68,60],[-72,62],[-75,64],[-80,64],[-85,66],[-90,68],[-95,70],[-100,72],[-110,73],[-120,71],[-130,70],[-140,70],[-150,71],[-155,72],[-160,72],[-165,70],[-168,66]],
  // Africa
  [[-17,15],[-16,18],[-16,20],[-15,24],[-13,28],[-10,32],[-5,35],[0,36],[3,37],[8,37],[10,37],[11,33],[10,32],[10,30],[15,25],[20,20],[25,15],[30,10],[33,8],[38,5],[40,2],[42,-2],[44,-12],[40,-16],[38,-20],[36,-25],[33,-28],[30,-30],[28,-33],[25,-34],[20,-35],[18,-32],[15,-27],[12,-20],[12,-15],[10,-10],[8,-5],[6,0],[5,5],[2,5],[0,5],[-5,5],[-8,5],[-12,5],[-15,10],[-17,15]],
  // Europe
  [[-10,36],[-8,38],[-9,39],[-8,42],[-5,43],[-2,43],[0,43],[3,43],[5,44],[7,44],[10,44],[13,43],[16,42],[18,40],[20,40],[22,40],[24,38],[26,40],[28,41],[30,42],[32,42],[30,45],[28,46],[25,42],[23,44],[20,45],[18,46],[15,45],[13,46],[11,47],[8,48],[5,48],[3,49],[0,49],[-3,48],[-5,48],[-8,44],[-10,44],[-10,36]],
  // Asia
  [[30,42],[35,42],[40,42],[45,40],[50,37],[55,37],[60,38],[65,40],[68,38],[70,35],[72,33],[75,30],[78,28],[80,22],[83,20],[88,22],[90,22],[92,20],[95,16],[98,16],[100,14],[102,15],[105,18],[108,20],[110,20],[115,22],[117,23],[120,22],[122,25],[125,30],[127,33],[130,34],[132,35],[135,35],[140,40],[142,43],[145,44],[143,47],[140,50],[135,55],[140,60],[145,62],[150,60],[155,60],[162,65],[170,68],[175,70],[180,70],[180,50],[155,50],[150,45],[145,40],[142,38],[140,36],[135,30],[130,25],[125,20],[120,16],[115,10],[110,5],[108,2],[105,5],[103,8],[100,10],[98,12],[95,10],[93,7],[90,10],[88,15],[85,18],[82,20],[78,22],[75,25],[72,28],[68,30],[65,30],[60,30],[55,30],[50,30],[48,30],[45,33],[42,37],[40,38],[37,37],[35,36],[33,35],[30,35],[28,33],[26,35],[25,37],[30,42]],
  // Australia
  [[114,-22],[115,-26],[115,-30],[115,-34],[117,-35],[120,-35],[122,-34],[125,-33],[128,-32],[130,-30],[132,-25],[134,-20],[136,-15],[136,-12],[138,-12],[140,-15],[142,-12],[143,-10],[145,-15],[146,-19],[148,-20],[150,-23],[152,-25],[153,-27],[153,-30],[152,-33],[150,-35],[148,-37],[146,-38],[144,-38],[142,-38],[140,-38],[138,-36],[136,-35],[132,-35],[128,-34],[124,-34],[120,-35],[118,-35],[116,-34],[115,-31],[114,-26],[114,-22]],
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

function GlobeSphere({ visitors }: { visitors: { session_id: string }[] }) {
  const globeRef = useRef<THREE.Group>(null);
  const landDotsRef = useRef<THREE.InstancedMesh>(null);
  const oceanDotsRef = useRef<THREE.InstancedMesh>(null);
  const visitorDotsRef = useRef<THREE.InstancedMesh>(null);

  // Generate land dots with finer resolution
  const landDots = useMemo(() => {
    const dots: THREE.Vector3[] = [];
    const step = 2.5;
    for (let lat = -70; lat <= 75; lat += step) {
      for (let lon = -180; lon <= 180; lon += step) {
        if (isLand(lon, lat)) {
          dots.push(latLonToVec3(lat, lon, 2));
        }
      }
    }
    return dots;
  }, []);

  // Sparse ocean grid
  const oceanDots = useMemo(() => {
    const dots: THREE.Vector3[] = [];
    const step = 10;
    for (let lat = -70; lat <= 75; lat += step) {
      for (let lon = -180; lon <= 180; lon += step) {
        if (!isLand(lon, lat)) {
          dots.push(latLonToVec3(lat, lon, 2));
        }
      }
    }
    return dots;
  }, []);

  // Visitor positions based on session_id hash (Brazil area)
  const visitorPositions = useMemo(() => {
    return visitors.map((v) => {
      let hash = 0;
      for (let i = 0; i < v.session_id.length; i++) {
        hash = ((hash << 5) - hash) + v.session_id.charCodeAt(i);
        hash |= 0;
      }
      const lat = -20 + ((Math.abs(hash) % 30) - 15);
      const lon = -48 + ((Math.abs(hash >> 8) % 20) - 10);
      return { position: latLonToVec3(lat, lon, 2.04), id: v.session_id };
    });
  }, [visitors]);

  // Set land dot instances
  useEffect(() => {
    if (!landDotsRef.current) return;
    const dummy = new THREE.Object3D();
    landDots.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.updateMatrix();
      landDotsRef.current!.setMatrixAt(i, dummy.matrix);
    });
    landDotsRef.current.instanceMatrix.needsUpdate = true;
  }, [landDots]);

  // Set ocean dot instances
  useEffect(() => {
    if (!oceanDotsRef.current) return;
    const dummy = new THREE.Object3D();
    oceanDots.forEach((pos, i) => {
      dummy.position.copy(pos);
      dummy.updateMatrix();
      oceanDotsRef.current!.setMatrixAt(i, dummy.matrix);
    });
    oceanDotsRef.current.instanceMatrix.needsUpdate = true;
  }, [oceanDots]);

  // Set visitor dot instances
  useEffect(() => {
    if (!visitorDotsRef.current || visitorPositions.length === 0) return;
    const dummy = new THREE.Object3D();
    visitorPositions.forEach((v, i) => {
      dummy.position.copy(v.position);
      dummy.updateMatrix();
      visitorDotsRef.current!.setMatrixAt(i, dummy.matrix);
    });
    visitorDotsRef.current.instanceMatrix.needsUpdate = true;
  }, [visitorPositions]);

  // Auto-rotation + pulse visitor dots
  useFrame((_, delta) => {
    if (globeRef.current) {
      globeRef.current.rotation.y += delta * 0.06;
    }
    if (visitorDotsRef.current && visitorPositions.length > 0) {
      const time = Date.now() * 0.003;
      const dummy = new THREE.Object3D();
      visitorPositions.forEach((v, i) => {
        const scale = 1 + 0.5 * Math.sin(time + i * 1.7);
        dummy.position.copy(v.position);
        dummy.scale.setScalar(scale);
        dummy.updateMatrix();
        visitorDotsRef.current!.setMatrixAt(i, dummy.matrix);
      });
      visitorDotsRef.current.instanceMatrix.needsUpdate = true;
    }
  });

  const landDotGeo = useMemo(() => new THREE.SphereGeometry(0.025, 6, 6), []);
  const oceanDotGeo = useMemo(() => new THREE.SphereGeometry(0.018, 4, 4), []);
  const visitorDotGeo = useMemo(() => new THREE.SphereGeometry(0.055, 8, 8), []);

  return (
    <group ref={globeRef}>
      {/* Dark globe sphere */}
      <mesh>
        <sphereGeometry args={[1.97, 64, 64]} />
        <meshBasicMaterial color="#0f0a2a" transparent opacity={0.95} />
      </mesh>

      {/* Outer glow */}
      <mesh scale={[2.15, 2.15, 2.15]}>
        <sphereGeometry args={[1, 64, 64]} />
        <meshBasicMaterial color="#6c3ce0" transparent opacity={0.03} side={THREE.BackSide} />
      </mesh>

      {/* Ocean dots */}
      {oceanDots.length > 0 && (
        <instancedMesh ref={oceanDotsRef} args={[oceanDotGeo, undefined, oceanDots.length]}>
          <meshBasicMaterial color="#1e1550" transparent opacity={0.25} />
        </instancedMesh>
      )}

      {/* Land dots */}
      {landDots.length > 0 && (
        <instancedMesh ref={landDotsRef} args={[landDotGeo, undefined, landDots.length]}>
          <meshBasicMaterial color="#8b6ce0" transparent opacity={0.75} />
        </instancedMesh>
      )}

      {/* Visitor dots */}
      {visitorPositions.length > 0 && (
        <instancedMesh ref={visitorDotsRef} args={[visitorDotGeo, undefined, visitorPositions.length]}>
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} />
        </instancedMesh>
      )}
    </group>
  );
}

function SceneSetup() {
  const { camera } = useThree();
  useEffect(() => {
    camera.position.set(0, 0, 5.5);
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
