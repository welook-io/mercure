"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";

interface WarehouseProps {
  position: [number, number, number];
  name: string;
  city: string;
  shipmentCount?: number;
  truckCount?: number;
  onClick?: () => void;
  isSelected?: boolean;
  color?: string;
}

export function Warehouse({
  position,
  name,
  city,
  shipmentCount = 0,
  truckCount = 0,
  onClick,
  isSelected = false,
  color = "#3b82f6",
}: WarehouseProps) {
  const roofRef = useRef<THREE.Mesh>(null);
  const buildingRef = useRef<THREE.Group>(null);

  // Efecto de pulso cuando está seleccionado
  useFrame(() => {
    if (buildingRef.current && isSelected) {
      const scale = 1 + Math.sin(Date.now() * 0.003) * 0.02;
      buildingRef.current.scale.set(scale, scale, scale);
    } else if (buildingRef.current) {
      buildingRef.current.scale.set(1, 1, 1);
    }
  });

  return (
    <group position={position}>
      <group
        ref={buildingRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick?.();
        }}
      >
        {/* Base/Plataforma */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <boxGeometry args={[4, 0.1, 3]} />
          <meshStandardMaterial color="#525252" metalness={0.3} roughness={0.8} />
        </mesh>

        {/* Edificio principal */}
        <RoundedBox 
          args={[3.5, 1.5, 2.5]} 
          radius={0.05} 
          position={[0, 0.85, 0]}
          castShadow
          receiveShadow
        >
          <meshStandardMaterial 
            color={isSelected ? "#fff" : "#fafafa"} 
            metalness={0.1} 
            roughness={0.7}
          />
        </RoundedBox>

        {/* Techo inclinado */}
        <mesh ref={roofRef} position={[0, 1.8, 0]} castShadow>
          <boxGeometry args={[3.7, 0.15, 2.7]} />
          <meshStandardMaterial color={color} metalness={0.4} roughness={0.5} />
        </mesh>

        {/* Puertas de carga (3 bahías) */}
        {[-1, 0, 1].map((x, i) => (
          <group key={i} position={[x, 0.6, 1.26]}>
            {/* Marco de la puerta */}
            <mesh>
              <boxGeometry args={[0.8, 1, 0.05]} />
              <meshStandardMaterial color="#a3a3a3" metalness={0.3} roughness={0.6} />
            </mesh>
            {/* Puerta (cortina) */}
            <mesh position={[0, 0, 0.03]}>
              <boxGeometry args={[0.7, 0.9, 0.02]} />
              <meshStandardMaterial color="#737373" metalness={0.5} roughness={0.4} />
            </mesh>
            {/* Indicador de bahía */}
            <Html position={[0, 0.7, 0.1]} center distanceFactor={12}>
              <div className="text-[10px] font-bold text-neutral-500">
                {i + 1}
              </div>
            </Html>
          </group>
        ))}

        {/* Ventanas laterales */}
        {[-0.8, 0.8].map((x, i) => (
          <mesh key={i} position={[x, 1.2, -1.26]}>
            <boxGeometry args={[0.6, 0.4, 0.05]} />
            <meshStandardMaterial color="#93c5fd" metalness={0.8} roughness={0.2} />
          </mesh>
        ))}

        {/* Letrero con nombre */}
        <mesh position={[0, 1.4, 1.27]}>
          <boxGeometry args={[2, 0.3, 0.02]} />
          <meshStandardMaterial color={color} metalness={0.3} roughness={0.5} />
        </mesh>

        {/* Líneas decorativas en el techo */}
        {[-1.5, 1.5].map((x, i) => (
          <mesh key={i} position={[x, 1.88, 0]}>
            <boxGeometry args={[0.1, 0.02, 2.7]} />
            <meshStandardMaterial color="#525252" metalness={0.4} roughness={0.5} />
          </mesh>
        ))}
      </group>

      {/* Info del depósito */}
      <Html position={[0, 2.5, 0]} center distanceFactor={6}>
        <div 
          className={`
            bg-white rounded-lg shadow-xl px-3 py-2 cursor-pointer
            transition-all duration-200 border-2
            ${isSelected ? 'border-orange-500 scale-105' : 'border-transparent hover:border-neutral-200'}
          `}
          style={{ minWidth: '120px' }}
        >
          <div className="text-xs font-bold text-neutral-800">{name}</div>
          <div className="text-[10px] text-neutral-500">{city}</div>
          <div className="flex gap-2 mt-1.5 text-[10px]">
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
              📦 {shipmentCount}
            </span>
            <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
              🚚 {truckCount}
            </span>
          </div>
        </div>
      </Html>

      {/* Indicador de actividad */}
      {shipmentCount > 0 && (
        <pointLight
          position={[0, 0.5, 2]}
          color="#22c55e"
          intensity={0.5}
          distance={3}
        />
      )}
    </group>
  );
}











