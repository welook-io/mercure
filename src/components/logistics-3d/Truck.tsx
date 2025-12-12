"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface TruckProps {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  label?: string;
  shipmentCount?: number;
  onClick?: () => void;
  isSelected?: boolean;
  animate?: boolean;
  animationProgress?: number;
}

export function Truck({
  position,
  rotation = [0, 0, 0],
  color = "#F97316",
  label,
  shipmentCount = 0,
  onClick,
  isSelected = false,
  animate = false,
  animationProgress = 0,
}: TruckProps) {
  const groupRef = useRef<THREE.Group>(null);
  const wheelsRef = useRef<THREE.Group>(null);

  // Animación de ruedas
  useFrame((_, delta) => {
    if (wheelsRef.current && animate) {
      wheelsRef.current.children.forEach((wheel) => {
        wheel.rotation.x += delta * 5;
      });
    }
    // Pequeño rebote cuando está seleccionado
    if (groupRef.current && isSelected) {
      groupRef.current.position.y = position[1] + Math.sin(Date.now() * 0.005) * 0.05;
    }
  });

  return (
    <group
      ref={groupRef}
      position={position}
      rotation={rotation}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
    >
      {/* Cabina */}
      <mesh position={[0.6, 0.4, 0]} castShadow>
        <boxGeometry args={[0.5, 0.5, 0.6]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.4} />
      </mesh>

      {/* Parabrisas */}
      <mesh position={[0.85, 0.45, 0]}>
        <boxGeometry args={[0.05, 0.3, 0.5]} />
        <meshStandardMaterial color="#1a1a2e" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Carrocería/Container */}
      <mesh position={[-0.3, 0.5, 0]} castShadow>
        <boxGeometry args={[1.2, 0.7, 0.7]} />
        <meshStandardMaterial 
          color={isSelected ? "#fff" : "#e5e5e5"} 
          metalness={0.1} 
          roughness={0.6} 
        />
      </mesh>

      {/* Techo del container */}
      <mesh position={[-0.3, 0.86, 0]}>
        <boxGeometry args={[1.2, 0.02, 0.7]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.2} roughness={0.5} />
      </mesh>

      {/* Chasis */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.8, 0.1, 0.5]} />
        <meshStandardMaterial color="#262626" metalness={0.5} roughness={0.6} />
      </mesh>

      {/* Ruedas */}
      <group ref={wheelsRef}>
        {/* Ruedas delanteras */}
        <mesh position={[0.6, 0.1, 0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
        <mesh position={[0.6, 0.1, -0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>

        {/* Ruedas traseras (dobles) */}
        <mesh position={[-0.5, 0.1, 0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
        <mesh position={[-0.5, 0.1, -0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
        <mesh position={[-0.8, 0.1, 0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
        <mesh position={[-0.8, 0.1, -0.35]} rotation={[Math.PI / 2, 0, 0]} castShadow>
          <cylinderGeometry args={[0.12, 0.12, 0.1, 16]} />
          <meshStandardMaterial color="#1a1a1a" metalness={0.3} roughness={0.8} />
        </mesh>
      </group>

      {/* Luces delanteras */}
      <mesh position={[0.88, 0.3, 0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.88, 0.3, -0.2]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.5} />
      </mesh>

      {/* Badge con cantidad de envíos */}
      {shipmentCount > 0 && (
        <Html position={[0, 1.2, 0]} center distanceFactor={8}>
          <div 
            className={`
              px-2 py-1 rounded-full text-xs font-bold shadow-lg cursor-pointer
              transition-all duration-200
              ${isSelected 
                ? 'bg-orange-500 text-white scale-110' 
                : 'bg-white text-neutral-800 hover:bg-orange-50'
              }
            `}
            style={{ whiteSpace: 'nowrap' }}
          >
            📦 {shipmentCount} envíos
          </div>
        </Html>
      )}

      {/* Label del camión */}
      {label && (
        <Html position={[0, -0.3, 0]} center distanceFactor={10}>
          <div className="text-xs text-neutral-500 font-medium bg-white/80 px-1.5 py-0.5 rounded">
            {label}
          </div>
        </Html>
      )}

      {/* Glow effect cuando está seleccionado */}
      {isSelected && (
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2, 1, 0.9]} />
          <meshBasicMaterial color="#F97316" transparent opacity={0.1} />
        </mesh>
      )}
    </group>
  );
}

