"use client";

import { Suspense, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Html } from "@react-three/drei";

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
  status: string; // loading, in_transit, arrived
  vehiclePlate: string | null;
  shipments: ShipmentData[];
  progress: number;
  departureTime: string | null;
  estimatedArrival: string | null;
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

// Depósito 3D
function Warehouse3D({
  position,
  name,
  city,
  color,
  shipmentCount,
  truckCount,
  onClick,
  isSelected,
}: {
  position: [number, number, number];
  name: string;
  city: string;
  color: string;
  shipmentCount: number;
  truckCount: number;
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <group position={position}>
      {/* Plataforma */}
      <mesh position={[0, 0.05, 0]} receiveShadow>
        <boxGeometry args={[3.5, 0.1, 2.5]} />
        <meshStandardMaterial color="#525252" />
      </mesh>

      {/* Edificio */}
      <mesh position={[0, 0.8, 0]} castShadow onClick={onClick}>
        <boxGeometry args={[3, 1.4, 2]} />
        <meshStandardMaterial color={isSelected ? "#fff" : "#fafafa"} />
      </mesh>

      {/* Techo */}
      <mesh position={[0, 1.55, 0]} castShadow>
        <boxGeometry args={[3.2, 0.1, 2.2]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Puertas */}
      {[-0.8, 0, 0.8].map((x, i) => (
        <mesh key={i} position={[x, 0.5, 1.01]}>
          <boxGeometry args={[0.6, 0.8, 0.02]} />
          <meshStandardMaterial color="#737373" />
        </mesh>
      ))}

      {/* Info */}
      <Html position={[0, 2.2, 0]} center>
        <div 
          className={`bg-white rounded-lg shadow-lg px-3 py-2 cursor-pointer border-2
            ${isSelected ? 'border-orange-500' : 'border-transparent hover:border-neutral-200'}`}
          onClick={onClick}
          style={{ minWidth: '120px' }}
        >
          <div className="text-xs font-bold text-neutral-800">{name}</div>
          <div className="text-[10px] text-neutral-500">{city}</div>
          <div className="flex gap-2 mt-1.5 text-[10px]">
            <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">📦 {shipmentCount}</span>
            <span className="bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">🚚 {truckCount}</span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Camión grande (larga distancia) - con más detalle
function Truck3D({
  position,
  rotation = [0, 0, 0],
  color = "#F97316",
  onClick,
  isSelected,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      {/* === CABINA === */}
      {/* Cuerpo principal cabina */}
      <mesh position={[0.65, 0.38, 0]} castShadow>
        <boxGeometry args={[0.45, 0.45, 0.55]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
      </mesh>
      
      {/* Techo cabina (ligeramente más ancho) */}
      <mesh position={[0.65, 0.62, 0]}>
        <boxGeometry args={[0.47, 0.03, 0.57]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Parabrisas frontal */}
      <mesh position={[0.89, 0.42, 0]}>
        <boxGeometry args={[0.02, 0.28, 0.45]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      
      {/* Ventanas laterales */}
      <mesh position={[0.65, 0.45, 0.28]}>
        <boxGeometry args={[0.3, 0.18, 0.02]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.65, 0.45, -0.28]}>
        <boxGeometry args={[0.3, 0.18, 0.02]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>

      {/* Faros delanteros */}
      <mesh position={[0.88, 0.25, 0.18]}>
        <boxGeometry args={[0.02, 0.08, 0.1]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.88, 0.25, -0.18]}>
        <boxGeometry args={[0.02, 0.08, 0.1]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.3} />
      </mesh>

      {/* Parrilla frontal */}
      <mesh position={[0.88, 0.28, 0]}>
        <boxGeometry args={[0.02, 0.12, 0.25]} />
        <meshStandardMaterial color="#404040" metalness={0.6} roughness={0.4} />
      </mesh>

      {/* Espejos retrovisores */}
      <mesh position={[0.75, 0.5, 0.35]}>
        <boxGeometry args={[0.05, 0.08, 0.03]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>
      <mesh position={[0.75, 0.5, -0.35]}>
        <boxGeometry args={[0.05, 0.08, 0.03]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>

      {/* === CONTAINER/ACOPLADO === */}
      {/* Cuerpo del container */}
      <mesh position={[-0.35, 0.45, 0]} castShadow>
        <boxGeometry args={[1.3, 0.65, 0.6]} />
        <meshStandardMaterial color={isSelected ? "#fff" : "#e8e8e8"} metalness={0.1} roughness={0.8} />
      </mesh>
      
      {/* Techo del container */}
      <mesh position={[-0.35, 0.78, 0]}>
        <boxGeometry args={[1.32, 0.02, 0.62]} />
        <meshStandardMaterial color="#d4d4d4" metalness={0.2} />
      </mesh>

      {/* Líneas decorativas del container */}
      <mesh position={[-0.35, 0.45, 0.305]}>
        <boxGeometry args={[1.28, 0.5, 0.01]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>
      <mesh position={[-0.35, 0.45, -0.305]}>
        <boxGeometry args={[1.28, 0.5, 0.01]} />
        <meshStandardMaterial color="#d0d0d0" />
      </mesh>

      {/* Puertas traseras del container */}
      <mesh position={[-1.005, 0.45, 0.15]}>
        <boxGeometry args={[0.02, 0.55, 0.28]} />
        <meshStandardMaterial color="#ccc" />
      </mesh>
      <mesh position={[-1.005, 0.45, -0.15]}>
        <boxGeometry args={[0.02, 0.55, 0.28]} />
        <meshStandardMaterial color="#ccc" />
      </mesh>

      {/* === CHASIS === */}
      <mesh position={[0.1, 0.12, 0]}>
        <boxGeometry args={[2, 0.06, 0.35]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.4} roughness={0.6} />
      </mesh>

      {/* Tanque de combustible (lado derecho) */}
      <mesh position={[0.2, 0.18, 0.32]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.08, 0.08, 0.25, 12]} />
        <meshStandardMaterial color="#444" metalness={0.5} roughness={0.5} />
      </mesh>

      {/* === RUEDAS (cilíndricas) === */}
      {/* Rueda delantera */}
      <group position={[0.65, 0.12, 0]}>
        <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, 0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.09, 8]} />
          <meshStandardMaterial color="#666" metalness={0.7} />
        </mesh>
        <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.12, 0.12, 0.08, 16]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
        </mesh>
        <mesh position={[0, 0, -0.28]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.06, 0.06, 0.09, 8]} />
          <meshStandardMaterial color="#666" metalness={0.7} />
        </mesh>
      </group>

      {/* Ruedas traseras dobles */}
      {[-0.25, -0.55].map((x, i) => (
        <group key={i} position={[x, 0.12, 0]}>
          {/* Rueda izquierda exterior */}
          <mesh position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.07, 8]} />
            <meshStandardMaterial color="#666" metalness={0.7} />
          </mesh>
          {/* Rueda izquierda interior */}
          <mesh position={[0, 0, 0.24]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          {/* Rueda derecha exterior */}
          <mesh position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, -0.32]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.05, 0.05, 0.07, 8]} />
            <meshStandardMaterial color="#666" metalness={0.7} />
          </mesh>
          {/* Rueda derecha interior */}
          <mesh position={[0, 0, -0.24]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.12, 0.12, 0.06, 16]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        </group>
      ))}

      {/* Luces traseras */}
      <mesh position={[-1.005, 0.2, 0.22]}>
        <boxGeometry args={[0.02, 0.06, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-1.005, 0.2, -0.22]}>
        <boxGeometry args={[0.02, 0.06, 0.06]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>

      {/* Selección */}
      {isSelected && (
        <mesh position={[0, 0.4, 0]}>
          <boxGeometry args={[2.2, 0.9, 0.8]} />
          <meshBasicMaterial color="#F97316" transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}

// Van de reparto (última milla) - con más detalle
function Van3D({
  position,
  rotation = [0, 0, 0],
  color = "#22c55e",
  onClick,
  isSelected,
}: {
  position: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
  onClick?: () => void;
  isSelected?: boolean;
}) {
  return (
    <group position={position} rotation={rotation} onClick={onClick}>
      {/* === CABINA === */}
      <mesh position={[0.28, 0.28, 0]} castShadow>
        <boxGeometry args={[0.38, 0.38, 0.44]} />
        <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
      </mesh>

      {/* Techo cabina */}
      <mesh position={[0.28, 0.48, 0]}>
        <boxGeometry args={[0.4, 0.02, 0.46]} />
        <meshStandardMaterial color={color} metalness={0.4} />
      </mesh>

      {/* Parabrisas */}
      <mesh position={[0.48, 0.32, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.36]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>

      {/* Ventanas laterales */}
      <mesh position={[0.28, 0.35, 0.225]}>
        <boxGeometry args={[0.25, 0.15, 0.02]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>
      <mesh position={[0.28, 0.35, -0.225]}>
        <boxGeometry args={[0.25, 0.15, 0.02]} />
        <meshStandardMaterial color="#87CEEB" metalness={0.9} roughness={0.1} transparent opacity={0.7} />
      </mesh>

      {/* Faros */}
      <mesh position={[0.48, 0.18, 0.12]}>
        <boxGeometry args={[0.02, 0.06, 0.08]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.3} />
      </mesh>
      <mesh position={[0.48, 0.18, -0.12]}>
        <boxGeometry args={[0.02, 0.06, 0.08]} />
        <meshStandardMaterial color="#fef08a" emissive="#fef08a" emissiveIntensity={0.3} />
      </mesh>

      {/* Espejos */}
      <mesh position={[0.35, 0.38, 0.28]}>
        <boxGeometry args={[0.04, 0.06, 0.02]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>
      <mesh position={[0.35, 0.38, -0.28]}>
        <boxGeometry args={[0.04, 0.06, 0.02]} />
        <meshStandardMaterial color="#333" metalness={0.5} />
      </mesh>

      {/* === CAJA DE CARGA === */}
      <mesh position={[-0.18, 0.32, 0]} castShadow>
        <boxGeometry args={[0.55, 0.45, 0.46]} />
        <meshStandardMaterial color={isSelected ? "#fff" : "#f0f0f0"} metalness={0.1} roughness={0.8} />
      </mesh>

      {/* Puerta trasera */}
      <mesh position={[-0.46, 0.32, 0]}>
        <boxGeometry args={[0.02, 0.4, 0.4]} />
        <meshStandardMaterial color="#e0e0e0" />
      </mesh>

      {/* Manija puerta */}
      <mesh position={[-0.48, 0.32, 0.1]}>
        <boxGeometry args={[0.02, 0.04, 0.06]} />
        <meshStandardMaterial color="#666" metalness={0.6} />
      </mesh>

      {/* === CHASIS === */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[1, 0.05, 0.38]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* === RUEDAS === */}
      {[0.28, -0.28].map((x, i) => (
        <group key={i} position={[x, 0.1, 0]}>
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, 0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.07, 8]} />
            <meshStandardMaterial color="#888" metalness={0.6} />
          </mesh>
          <mesh position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.1, 0.1, 0.06, 14]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
          <mesh position={[0, 0, -0.22]} rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.07, 8]} />
            <meshStandardMaterial color="#888" metalness={0.6} />
          </mesh>
        </group>
      ))}

      {/* Luces traseras */}
      <mesh position={[-0.47, 0.15, 0.18]}>
        <boxGeometry args={[0.02, 0.05, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>
      <mesh position={[-0.47, 0.15, -0.18]}>
        <boxGeometry args={[0.02, 0.05, 0.05]} />
        <meshStandardMaterial color="#ef4444" emissive="#ef4444" emissiveIntensity={0.2} />
      </mesh>

      {/* Selección */}
      {isSelected && (
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[1.1, 0.6, 0.6]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.12} />
        </mesh>
      )}
    </group>
  );
}

// Camión en ruta (BS AS → Jujuy)
function TruckOnRoute({
  trip,
  onSelect,
  isSelected,
}: {
  trip: TripData;
  onSelect: () => void;
  isSelected: boolean;
}) {
  // De izquierda (-3) a derecha (+3), cabina mirando a derecha
  const x = -3 + 6 * trip.progress;

  return (
    <group position={[x, 0, 0]}>
      <Truck3D
        position={[0, 0, 0]}
        rotation={[0, 0, 0]} // Cabina hacia +X (derecha = Jujuy)
        onClick={onSelect}
        isSelected={isSelected}
      />
      
      {/* Info del viaje */}
      <Html position={[0, 1.3, 0]} center>
        <div 
          className={`bg-white rounded-lg shadow-xl px-3 py-2 cursor-pointer border-2 min-w-[130px]
            ${isSelected ? 'border-orange-500' : 'border-transparent hover:border-orange-200'}`}
          onClick={onSelect}
        >
          <div className="text-xs font-bold text-orange-600 flex items-center gap-1">
            🚚 {trip.vehiclePlate || `Viaje #${trip.id}`}
          </div>
          <div className="text-[10px] text-neutral-500">Buenos Aires → Jujuy</div>
          {(trip.departureTime || trip.estimatedArrival) && (
            <div className="mt-1 pt-1 border-t border-neutral-100 text-[10px] space-y-0.5">
              {trip.departureTime && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Salió:</span>
                  <span className="font-medium">{trip.departureTime}</span>
                </div>
              )}
              {trip.estimatedArrival && (
                <div className="flex justify-between">
                  <span className="text-neutral-400">Llega:</span>
                  <span className="font-medium text-green-600">{trip.estimatedArrival}</span>
                </div>
              )}
            </div>
          )}
          <div className="mt-1 pt-1 border-t border-neutral-100">
            <span className="text-[10px] bg-orange-50 text-orange-700 px-1.5 py-0.5 rounded">
              📦 {trip.shipments.length} envíos
            </span>
          </div>
        </div>
      </Html>
    </group>
  );
}

// Camión estacionado con estado (Cargando/Descargando)
function ParkedTruck({
  trip,
  position,
  rotation,
  status,
  onSelect,
  isSelected,
}: {
  trip: TripData;
  position: [number, number, number];
  rotation: [number, number, number];
  status: "loading" | "unloading";
  onSelect: () => void;
  isSelected: boolean;
}) {
  const statusLabel = status === "loading" ? "⏳ Cargando" : "📦 Descargando";
  const statusColor = status === "loading" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";

  return (
    <group>
      <Truck3D
        position={position}
        rotation={rotation}
        onClick={onSelect}
        isSelected={isSelected}
      />
      <Html position={[position[0], position[1] + 1, position[2]]} center>
        <div 
          className={`bg-white rounded-lg shadow-lg px-2.5 py-1.5 cursor-pointer border-2 min-w-[100px]
            ${isSelected ? 'border-orange-500' : 'border-transparent hover:border-neutral-200'}`}
          onClick={onSelect}
        >
          <div className="text-[10px] font-bold text-neutral-700">
            {trip.vehiclePlate || `#${trip.id}`}
          </div>
          <div className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded ${statusColor}`}>
            {statusLabel}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">
            {trip.shipments.length} envíos
          </div>
        </div>
      </Html>
    </group>
  );
}

// Van de reparto
function DeliveryVan({
  shipmentCount,
  position,
  rotation,
  onClick,
  isSelected,
}: {
  shipmentCount: number;
  position: [number, number, number];
  rotation: [number, number, number];
  onClick: () => void;
  isSelected: boolean;
}) {
  return (
    <group>
      <Van3D
        position={position}
        rotation={rotation}
        onClick={onClick}
        isSelected={isSelected}
      />
      <Html position={[position[0], position[1] + 0.8, position[2]]} center>
        <div 
          className={`bg-white rounded-lg shadow px-2 py-1 cursor-pointer border-2
            ${isSelected ? 'border-green-500' : 'border-transparent hover:border-green-200'}`}
          onClick={onClick}
        >
          <div className="text-[10px] font-bold text-green-600">🚐 Reparto</div>
          <div className="text-[10px] text-neutral-500">{shipmentCount} envíos</div>
        </div>
      </Html>
    </group>
  );
}

// Carretera
function Road() {
  return (
    <group>
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 1.2]} />
        <meshStandardMaterial color="#404040" />
      </mesh>
      <mesh position={[0, 0.02, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.02, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      {Array.from({ length: 12 }).map((_, i) => (
        <mesh key={i} position={[-5.5 + i, 0.02, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.4, 0.06]} />
          <meshStandardMaterial color="#fef08a" />
        </mesh>
      ))}
    </group>
  );
}

// Escena principal
function Scene({ warehouseData, tripsInTransit, onSelectShipments }: LogisticsSceneProps) {
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  // Posiciones ajustadas para vista lateral
  const bsasPos: [number, number, number] = [-6, 0, 0];
  const jujuyPos: [number, number, number] = [6, 0, 0];

  const handleWarehouseClick = (warehouse: WarehouseData) => {
    setSelectedItem(`warehouse-${warehouse.id}`);
    onSelectShipments(warehouse.shipments, `${warehouse.name} - ${warehouse.city}`);
  };

  const handleTripClick = (trip: TripData, label?: string) => {
    setSelectedItem(`trip-${trip.id}`);
    onSelectShipments(trip.shipments, label || `Viaje: ${trip.origin} → ${trip.destination}`);
  };

  const handleRepartoClick = (shipments: ShipmentData[], city: string) => {
    setSelectedItem(`reparto-${city}`);
    onSelectShipments(shipments, `En reparto - ${city}`);
  };

  const bsas = warehouseData.find(w => w.id === "bsas");
  const jujuy = warehouseData.find(w => w.id === "jujuy");

  // Camiones cargando en BS AS (status = loading)
  const loadingTrucks = bsas?.trucks.filter(t => t.status === "loading") || [];
  
  // Camiones descargando en Jujuy (status = arrived)
  const unloadingTrucks = jujuy?.trucks.filter(t => t.status === "arrived") || [];

  // Envíos en reparto en Jujuy
  const repartoShipments = jujuy?.shipments.filter(s => s.status === "en_reparto") || [];

  return (
    <>
      {/* Iluminación */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[5, 10, 5]} intensity={1} castShadow />
      <directionalLight position={[-5, 8, -5]} intensity={0.3} />

      {/* Suelo */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#e5e5e5" />
      </mesh>

      {/* Carretera */}
      <Road />

      {/* Depósito Buenos Aires */}
      {bsas && (
        <Warehouse3D
          position={bsasPos}
          name={bsas.name}
          city={bsas.city}
          color="#3b82f6"
          shipmentCount={bsas.shipments.length}
          truckCount={loadingTrucks.length}
          onClick={() => handleWarehouseClick(bsas)}
          isSelected={selectedItem === "warehouse-bsas"}
        />
      )}

      {/* Depósito Jujuy */}
      {jujuy && (
        <Warehouse3D
          position={jujuyPos}
          name={jujuy.name}
          city={jujuy.city}
          color="#22c55e"
          shipmentCount={jujuy.shipments.length}
          truckCount={unloadingTrucks.length}
          onClick={() => handleWarehouseClick(jujuy)}
          isSelected={selectedItem === "warehouse-jujuy"}
        />
      )}

      {/* Camiones CARGANDO en BS AS (al lado derecho del depósito) */}
      {loadingTrucks.map((trip, i) => (
        <ParkedTruck
          key={`loading-${trip.id}`}
          trip={trip}
          position={[bsasPos[0] + 2.2 + i * 2, 0, bsasPos[2] - 2]}
          rotation={[0, 0, 0]} // Mirando hacia Jujuy
          status="loading"
          onSelect={() => handleTripClick(trip, `Cargando: ${trip.vehiclePlate || `Viaje #${trip.id}`}`)}
          isSelected={selectedItem === `trip-${trip.id}`}
        />
      ))}

      {/* Camiones DESCARGANDO en Jujuy (al lado izquierdo del depósito) */}
      {unloadingTrucks.map((trip, i) => (
        <ParkedTruck
          key={`unloading-${trip.id}`}
          trip={trip}
          position={[jujuyPos[0] - 2.2 - i * 2, 0, jujuyPos[2] - 2]}
          rotation={[0, Math.PI, 0]} // Mirando hacia BS AS (acaba de llegar)
          status="unloading"
          onSelect={() => handleTripClick(trip, `Descargando: ${trip.vehiclePlate || `Viaje #${trip.id}`}`)}
          isSelected={selectedItem === `trip-${trip.id}`}
        />
      ))}

      {/* Van de REPARTO en Jujuy (saliendo hacia adelante) */}
      {repartoShipments.length > 0 && (
        <DeliveryVan
          shipmentCount={repartoShipments.length}
          position={[jujuyPos[0] + 2, 0, jujuyPos[2] + 2.5]}
          rotation={[0, Math.PI / 2, 0]} // Saliendo hacia adelante
          onClick={() => handleRepartoClick(repartoShipments, "Jujuy")}
          isSelected={selectedItem === "reparto-Jujuy"}
        />
      )}

      {/* Camiones en TRÁNSITO (en la ruta) */}
      {tripsInTransit.map(trip => (
        <TruckOnRoute
          key={`transit-${trip.id}`}
          trip={trip}
          onSelect={() => handleTripClick(trip, `En ruta: Buenos Aires → Jujuy`)}
          isSelected={selectedItem === `trip-${trip.id}`}
        />
      ))}
    </>
  );
}

export function LogisticsScene3D(props: LogisticsSceneProps) {
  return (
    <div className="w-full h-full bg-gradient-to-b from-sky-100 to-neutral-200 rounded-lg overflow-hidden">
      <Canvas
        shadows
        camera={{ position: [0, 4, 16], fov: 40, near: 0.1, far: 100 }}
      >
        <Suspense fallback={
          <Html center>
            <div className="flex items-center gap-2 text-neutral-500">
              <div className="w-4 h-4 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
              Cargando...
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












