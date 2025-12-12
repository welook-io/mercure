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
  status: string;
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

// Depósito 3D simple
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

// Camión 3D simple (sin animaciones)
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
      {/* Cabina */}
      <mesh position={[0.5, 0.35, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Parabrisas */}
      <mesh position={[0.72, 0.38, 0]}>
        <boxGeometry args={[0.02, 0.25, 0.4]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Container */}
      <mesh position={[-0.2, 0.4, 0]} castShadow>
        <boxGeometry args={[1, 0.6, 0.55]} />
        <meshStandardMaterial color={isSelected ? "#fff" : "#e5e5e5"} />
      </mesh>

      {/* Chasis */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.5, 0.08, 0.4]} />
        <meshStandardMaterial color="#262626" />
      </mesh>

      {/* Ruedas (cajas simples, sin cilindros) */}
      <mesh position={[0.5, 0.1, 0.25]}>
        <boxGeometry args={[0.15, 0.2, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.5, 0.1, -0.25]}>
        <boxGeometry args={[0.15, 0.2, 0.08]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.4, 0.1, 0.25]}>
        <boxGeometry args={[0.18, 0.2, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.4, 0.1, -0.25]}>
        <boxGeometry args={[0.18, 0.2, 0.1]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Borde cuando seleccionado */}
      {isSelected && (
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[1.7, 0.8, 0.7]} />
          <meshBasicMaterial color="#F97316" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

// Camión en ruta (siempre de BS AS a Jujuy = izquierda a derecha)
function TruckOnRoute({
  trip,
  onSelect,
  isSelected,
}: {
  trip: TripData;
  onSelect: () => void;
  isSelected: boolean;
}) {
  // Siempre de izquierda (-3) a derecha (+3)
  const x = -3 + 6 * trip.progress;

  return (
    <group position={[x, 0, 0]}>
      <Truck3D
        position={[0, 0, 0]}
        rotation={[0, Math.PI, 0]}
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

// Carretera simple
function Road() {
  return (
    <group>
      {/* Asfalto */}
      <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[14, 1.2]} />
        <meshStandardMaterial color="#404040" />
      </mesh>

      {/* Líneas blancas */}
      <mesh position={[0, 0.02, 0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.02, -0.55]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[14, 0.05]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>

      {/* Líneas amarillas centro (discontinuas) */}
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

  const bsasPos: [number, number, number] = [-5, 0, -2];
  const jujuyPos: [number, number, number] = [5, 0, -2];

  const handleWarehouseClick = (warehouse: WarehouseData) => {
    setSelectedItem(`warehouse-${warehouse.id}`);
    onSelectShipments(warehouse.shipments, `${warehouse.name} - ${warehouse.city}`);
  };

  const handleTripClick = (trip: TripData) => {
    setSelectedItem(`trip-${trip.id}`);
    onSelectShipments(trip.shipments, `En ruta: ${trip.origin} → ${trip.destination}`);
  };

  const bsas = warehouseData.find(w => w.id === "bsas");
  const jujuy = warehouseData.find(w => w.id === "jujuy");

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
          truckCount={bsas.trucks.length}
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
          truckCount={jujuy.trucks.length}
          onClick={() => handleWarehouseClick(jujuy)}
          isSelected={selectedItem === "warehouse-jujuy"}
        />
      )}

      {/* Camiones estacionados en BS AS */}
      {bsas?.trucks.map((trip, i) => (
        <group key={`bsas-truck-${trip.id}`}>
          <Truck3D
            position={[bsasPos[0] + 2.5, 0, bsasPos[2] + 1.5 + i * 1]}
            rotation={[0, Math.PI / 2, 0]}
            onClick={() => handleTripClick(trip)}
            isSelected={selectedItem === `trip-${trip.id}`}
          />
          <Html position={[bsasPos[0] + 2.5, 0.9, bsasPos[2] + 1.5 + i * 1]} center>
            <div className="bg-white/90 rounded px-2 py-1 text-[10px] shadow cursor-pointer"
                 onClick={() => handleTripClick(trip)}>
              <span className="font-medium">{trip.vehiclePlate || `#${trip.id}`}</span>
              <span className="text-neutral-400 ml-1">• {trip.shipments.length} env.</span>
            </div>
          </Html>
        </group>
      ))}

      {/* Camiones estacionados en Jujuy */}
      {jujuy?.trucks.map((trip, i) => (
        <group key={`jujuy-truck-${trip.id}`}>
          <Truck3D
            position={[jujuyPos[0] - 2.5, 0, jujuyPos[2] + 1.5 + i * 1]}
            rotation={[0, -Math.PI / 2, 0]}
            onClick={() => handleTripClick(trip)}
            isSelected={selectedItem === `trip-${trip.id}`}
          />
          <Html position={[jujuyPos[0] - 2.5, 0.9, jujuyPos[2] + 1.5 + i * 1]} center>
            <div className="bg-white/90 rounded px-2 py-1 text-[10px] shadow cursor-pointer"
                 onClick={() => handleTripClick(trip)}>
              <span className="font-medium">{trip.vehiclePlate || `#${trip.id}`}</span>
              <span className="text-neutral-400 ml-1">• {trip.shipments.length} env.</span>
            </div>
          </Html>
        </group>
      ))}

      {/* Camiones en tránsito (siempre de BS AS a Jujuy) */}
      {tripsInTransit.map(trip => (
        <TruckOnRoute
          key={`transit-${trip.id}`}
          trip={trip}
          onSelect={() => handleTripClick(trip)}
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
        camera={{ position: [0, 10, 12], fov: 45, near: 0.1, far: 100 }}
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
