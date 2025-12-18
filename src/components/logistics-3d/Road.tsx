"use client";

import { useMemo } from "react";
import * as THREE from "three";

interface RoadProps {
  start: [number, number, number];
  end: [number, number, number];
  width?: number;
}

export function Road({ start, end, width = 0.8 }: RoadProps) {
  const { points, length, rotation } = useMemo(() => {
    const dx = end[0] - start[0];
    const dz = end[2] - start[2];
    const len = Math.sqrt(dx * dx + dz * dz);
    const rot = Math.atan2(dz, dx);
    
    // Crear puntos para líneas de carril
    const pts: [number, number, number][] = [];
    const segments = Math.floor(len / 0.5);
    for (let i = 0; i < segments; i++) {
      const t = i / segments;
      pts.push([
        start[0] + dx * t,
        0.02,
        start[2] + dz * t,
      ]);
    }
    
    return { points: pts, length: len, rotation: rot };
  }, [start, end]);

  const midPoint: [number, number, number] = [
    (start[0] + end[0]) / 2,
    0.01,
    (start[2] + end[2]) / 2,
  ];

  return (
    <group>
      {/* Asfalto principal */}
      <mesh 
        position={midPoint} 
        rotation={[0, -rotation, 0]}
        receiveShadow
      >
        <boxGeometry args={[length, 0.02, width]} />
        <meshStandardMaterial color="#404040" roughness={0.9} />
      </mesh>

      {/* Bordes de la carretera */}
      <mesh 
        position={[midPoint[0], 0.02, midPoint[2] + width / 2 - 0.02]} 
        rotation={[0, -rotation, 0]}
      >
        <boxGeometry args={[length, 0.02, 0.04]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>
      <mesh 
        position={[midPoint[0], 0.02, midPoint[2] - width / 2 + 0.02]} 
        rotation={[0, -rotation, 0]}
      >
        <boxGeometry args={[length, 0.02, 0.04]} />
        <meshStandardMaterial color="#fafafa" />
      </mesh>

      {/* Líneas del centro (discontinuas) */}
      {points.filter((_, i) => i % 2 === 0).map((point, i) => (
        <mesh 
          key={i} 
          position={point}
          rotation={[0, -rotation, 0]}
        >
          <boxGeometry args={[0.3, 0.01, 0.05]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      ))}

      {/* Marcas de distancia cada cierto tramo */}
      {points.filter((_, i) => i % 8 === 0 && i > 0 && i < points.length - 1).map((point, i) => (
        <mesh 
          key={`marker-${i}`} 
          position={[point[0], 0.03, point[2] + 0.5]}
        >
          <boxGeometry args={[0.02, 0.15, 0.02]} />
          <meshStandardMaterial color="#ffffff" />
        </mesh>
      ))}
    </group>
  );
}

// Componente para terreno/paisaje
export function Terrain() {
  return (
    <group>
      {/* Suelo base */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial color="#d4d4d4" />
      </mesh>

      {/* Áreas verdes */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-8, 0, 2]} receiveShadow>
        <circleGeometry args={[2, 32]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[8, 0, -2]} receiveShadow>
        <circleGeometry args={[1.5, 32]} />
        <meshStandardMaterial color="#86efac" />
      </mesh>

      {/* Algunos "árboles" simples */}
      {[[-8, 2], [-7.5, 1.5], [8, -1.5], [7.5, -2.5]].map(([x, z], i) => (
        <group key={i} position={[x, 0, z]}>
          {/* Tronco */}
          <mesh position={[0, 0.2, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.4, 8]} />
            <meshStandardMaterial color="#8b5a2b" />
          </mesh>
          {/* Copa */}
          <mesh position={[0, 0.5, 0]}>
            <sphereGeometry args={[0.25, 8, 8]} />
            <meshStandardMaterial color="#22c55e" />
          </mesh>
        </group>
      ))}
    </group>
  );
}


