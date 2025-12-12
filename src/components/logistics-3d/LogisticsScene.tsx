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

// Camión grande (larga distancia)
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
      {/* Cabina (al frente, hacia +X) */}
      <mesh position={[0.6, 0.35, 0]} castShadow>
        <boxGeometry args={[0.4, 0.4, 0.5]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Parabrisas */}
      <mesh position={[0.82, 0.38, 0]}>
        <boxGeometry args={[0.02, 0.25, 0.4]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Container/Acoplado */}
      <mesh position={[-0.3, 0.4, 0]} castShadow>
        <boxGeometry args={[1.2, 0.6, 0.55]} />
        <meshStandardMaterial color={isSelected ? "#fff" : "#e5e5e5"} />
      </mesh>

      {/* Chasis */}
      <mesh position={[0, 0.1, 0]}>
        <boxGeometry args={[1.8, 0.08, 0.4]} />
        <meshStandardMaterial color="#262626" />
      </mesh>

      {/* Ruedas */}
      {[0.6, -0.3, -0.6].map((x, i) => (
        <group key={i}>
          <mesh position={[x, 0.1, 0.25]}>
            <boxGeometry args={[0.12, 0.18, 0.06]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
          <mesh position={[x, 0.1, -0.25]}>
            <boxGeometry args={[0.12, 0.18, 0.06]} />
            <meshStandardMaterial color="#1a1a1a" />
          </mesh>
        </group>
      ))}

      {/* Selección */}
      {isSelected && (
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[2, 0.8, 0.7]} />
          <meshBasicMaterial color="#F97316" transparent opacity={0.15} />
        </mesh>
      )}
    </group>
  );
}

// Van de reparto (última milla)
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
      {/* Cabina */}
      <mesh position={[0.25, 0.25, 0]} castShadow>
        <boxGeometry args={[0.35, 0.35, 0.4]} />
        <meshStandardMaterial color={color} />
      </mesh>

      {/* Parabrisas */}
      <mesh position={[0.44, 0.28, 0]}>
        <boxGeometry args={[0.02, 0.2, 0.32]} />
        <meshStandardMaterial color="#1a1a2e" />
      </mesh>

      {/* Caja de carga */}
      <mesh position={[-0.15, 0.28, 0]} castShadow>
        <boxGeometry args={[0.5, 0.4, 0.42]} />
        <meshStandardMaterial color={isSelected ? "#fff" : "#f5f5f5"} />
      </mesh>

      {/* Chasis */}
      <mesh position={[0, 0.08, 0]}>
        <boxGeometry args={[0.9, 0.06, 0.35]} />
        <meshStandardMaterial color="#262626" />
      </mesh>

      {/* Ruedas */}
      <mesh position={[0.25, 0.08, 0.2]}>
        <boxGeometry args={[0.1, 0.14, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[0.25, 0.08, -0.2]}>
        <boxGeometry args={[0.1, 0.14, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.25, 0.08, 0.2]}>
        <boxGeometry args={[0.1, 0.14, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>
      <mesh position={[-0.25, 0.08, -0.2]}>
        <boxGeometry args={[0.1, 0.14, 0.05]} />
        <meshStandardMaterial color="#1a1a1a" />
      </mesh>

      {/* Selección */}
      {isSelected && (
        <mesh position={[0, 0.25, 0]}>
          <boxGeometry args={[1, 0.6, 0.55]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.15} />
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

  const bsasPos: [number, number, number] = [-5, 0, -2];
  const jujuyPos: [number, number, number] = [5, 0, -2];

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

      {/* Camiones CARGANDO en BS AS (al costado del depósito) */}
      {loadingTrucks.map((trip, i) => (
        <ParkedTruck
          key={`loading-${trip.id}`}
          trip={trip}
          position={[bsasPos[0] + 2.5, 0, bsasPos[2] + 1.5 + i * 1.2]}
          rotation={[0, -Math.PI / 2, 0]} // Mirando hacia el depósito
          status="loading"
          onSelect={() => handleTripClick(trip, `Cargando: ${trip.vehiclePlate || `Viaje #${trip.id}`}`)}
          isSelected={selectedItem === `trip-${trip.id}`}
        />
      ))}

      {/* Camiones DESCARGANDO en Jujuy (al costado del depósito) */}
      {unloadingTrucks.map((trip, i) => (
        <ParkedTruck
          key={`unloading-${trip.id}`}
          trip={trip}
          position={[jujuyPos[0] - 2.5, 0, jujuyPos[2] + 1.5 + i * 1.2]}
          rotation={[0, Math.PI / 2, 0]} // Mirando hacia el depósito
          status="unloading"
          onSelect={() => handleTripClick(trip, `Descargando: ${trip.vehiclePlate || `Viaje #${trip.id}`}`)}
          isSelected={selectedItem === `trip-${trip.id}`}
        />
      ))}

      {/* Van de REPARTO en Jujuy (saliendo del depósito) */}
      {repartoShipments.length > 0 && (
        <DeliveryVan
          shipmentCount={repartoShipments.length}
          position={[jujuyPos[0] + 2.5, 0, jujuyPos[2] + 2]}
          rotation={[0, Math.PI / 4, 0]} // Saliendo hacia afuera
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
