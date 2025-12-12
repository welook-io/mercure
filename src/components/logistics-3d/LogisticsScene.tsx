"use client";

import { Suspense, useState, useEffect, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Environment, Html, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { Truck } from "./Truck";
import { Warehouse } from "./Warehouse";
import { Road, Terrain } from "./Road";

// Tipos de datos
interface ShipmentData {
  id: number;
  deliveryNoteNumber: string | null;
  status: string;
  senderName: string;
  recipientName: string;
  packageCount: number;
  weightKg: number;
}

interface TripData {
  id: number;
  origin: string;
  destination: string;
  status: string;
  vehiclePlate: string | null;
  shipments: ShipmentData[];
  progress: number; // 0-1
}

interface WarehouseData {
  id: string;
  name: string;
  city: string;
  position: [number, number, number];
  shipments: ShipmentData[];
  trucks: TripData[];
}

interface LogisticsSceneProps {
  warehouseData: WarehouseData[];
  tripsInTransit: TripData[];
  onSelectShipments: (shipments: ShipmentData[], title: string) => void;
}

// Componente de camión animado en ruta
function AnimatedTruck({
  trip,
  startPos,
  endPos,
  onSelect,
  isSelected,
}: {
  trip: TripData;
  startPos: [number, number, number];
  endPos: [number, number, number];
  onSelect: () => void;
  isSelected: boolean;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const [position, setPosition] = useState<[number, number, number]>([0, 0, 0]);
  const [rotation, setRotation] = useState<[number, number, number]>([0, 0, 0]);

  useEffect(() => {
    // Calcular posición basada en progreso
    const t = trip.progress;
    const x = startPos[0] + (endPos[0] - startPos[0]) * t;
    const z = startPos[2] + (endPos[2] - startPos[2]) * t;
    
    // Calcular rotación para que mire hacia el destino
    const angle = Math.atan2(endPos[2] - startPos[2], endPos[0] - startPos[0]);
    
    setPosition([x, 0, z]);
    setRotation([0, -angle + Math.PI, 0]);
  }, [trip.progress, startPos, endPos]);

  // Animación suave del progreso
  useFrame(() => {
    if (groupRef.current) {
      // Pequeña oscilación vertical para simular movimiento
      groupRef.current.position.y = Math.sin(Date.now() * 0.008) * 0.02;
    }
  });

  return (
    <group ref={groupRef} position={position} rotation={rotation}>
      <Truck
        position={[0, 0, 0]}
        color="#F97316"
        label={trip.vehiclePlate || `Viaje #${trip.id}`}
        shipmentCount={trip.shipments.length}
        onClick={onSelect}
        isSelected={isSelected}
        animate={true}
      />
    </group>
  );
}

// Escena principal
function Scene({
  warehouseData,
  tripsInTransit,
  onSelectShipments,
}: LogisticsSceneProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Posiciones de los depósitos
  const bsasPos: [number, number, number] = [-6, 0, 0];
  const jujuyPos: [number, number, number] = [6, 0, 0];

  const handleWarehouseClick = (warehouse: WarehouseData) => {
    setSelectedItem(`warehouse-${warehouse.id}`);
    onSelectShipments(
      warehouse.shipments,
      `${warehouse.name} - ${warehouse.city}`
    );
  };

  const handleTripClick = (trip: TripData) => {
    setSelectedItem(`trip-${trip.id}`);
    onSelectShipments(
      trip.shipments,
      `En ruta: ${trip.origin} → ${trip.destination}`
    );
  };

  const bsasWarehouse = warehouseData.find(w => w.id === "bsas");
  const jujuyWarehouse = warehouseData.find(w => w.id === "jujuy");

  return (
    <>
      {/* Cámara */}
      <PerspectiveCamera makeDefault position={[0, 8, 12]} fov={50} />
      
      {/* Controles de órbita */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={5}
        maxDistance={25}
      />

      {/* Iluminación */}
      <ambientLight intensity={0.6} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[-10, 10, -10]} intensity={0.3} />

      {/* Entorno */}
      <Environment preset="city" />
      <fog attach="fog" args={["#f5f5f5", 15, 40]} />

      {/* Terreno */}
      <Terrain />

      {/* Carretera principal */}
      <Road start={[-4, 0, 0]} end={[4, 0, 0]} width={1} />

      {/* Depósito Buenos Aires */}
      {bsasWarehouse && (
        <Warehouse
          position={bsasPos}
          name={bsasWarehouse.name}
          city={bsasWarehouse.city}
          shipmentCount={bsasWarehouse.shipments.length}
          truckCount={bsasWarehouse.trucks.length}
          onClick={() => handleWarehouseClick(bsasWarehouse)}
          isSelected={selectedItem === `warehouse-${bsasWarehouse.id}`}
          color="#3b82f6"
        />
      )}

      {/* Depósito Jujuy */}
      {jujuyWarehouse && (
        <Warehouse
          position={jujuyPos}
          name={jujuyWarehouse.name}
          city={jujuyWarehouse.city}
          shipmentCount={jujuyWarehouse.shipments.length}
          truckCount={jujuyWarehouse.trucks.length}
          onClick={() => handleWarehouseClick(jujuyWarehouse)}
          isSelected={selectedItem === `warehouse-${jujuyWarehouse.id}`}
          color="#22c55e"
        />
      )}

      {/* Camiones en depósitos */}
      {warehouseData.flatMap(warehouse =>
        warehouse.trucks.map((trip, i) => {
          const basePos = warehouse.id === "bsas" ? bsasPos : jujuyPos;
          const offset = warehouse.id === "bsas" ? 2.5 : -2.5;
          return (
            <Truck
              key={`parked-${trip.id}`}
              position={[basePos[0] + offset, 0, basePos[2] + 2 + i * 0.8]}
              rotation={[0, warehouse.id === "bsas" ? Math.PI / 2 : -Math.PI / 2, 0]}
              color="#F97316"
              label={trip.vehiclePlate || `#${trip.id}`}
              shipmentCount={trip.shipments.length}
              onClick={() => handleTripClick(trip)}
              isSelected={selectedItem === `trip-${trip.id}`}
            />
          );
        })
      )}

      {/* Camiones en tránsito */}
      {tripsInTransit.map(trip => {
        const isGoingToJujuy = trip.destination.toLowerCase().includes("jujuy");
        const startP = isGoingToJujuy ? bsasPos : jujuyPos;
        const endP = isGoingToJujuy ? jujuyPos : bsasPos;
        
        return (
          <AnimatedTruck
            key={`transit-${trip.id}`}
            trip={trip}
            startPos={[startP[0] + 3, 0, startP[2]]}
            endPos={[endP[0] - 3, 0, endP[2]]}
            onSelect={() => handleTripClick(trip)}
            isSelected={selectedItem === `trip-${trip.id}`}
          />
        );
      })}

      {/* Label de ruta */}
      <Html position={[0, 0.5, 1]} center>
        <div className="text-xs text-neutral-400 bg-white/80 px-2 py-1 rounded shadow">
          Ruta Nacional 9 • ~1.500 km
        </div>
      </Html>
    </>
  );
}

// Componente exportable con Canvas
export function LogisticsScene3D(props: LogisticsSceneProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-100 to-neutral-100 rounded-lg overflow-hidden">
      <Canvas shadows>
        <Suspense fallback={
          <Html center>
            <div className="flex items-center gap-2 text-neutral-500">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Cargando escena 3D...
            </div>
          </Html>
        }>
          <Scene {...props} />
        </Suspense>
      </Canvas>
    </div>
  );
}

export type { ShipmentData, TripData, WarehouseData };
