"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { Navbar } from "@/components/layout/navbar";
import { supabase } from "@/lib/supabase";
import { 
  X, 
  Package, 
  Truck, 
  MapPin, 
  RefreshCw, 
  Maximize2,
  Box,
  Weight,
  User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ShipmentData, TripData, WarehouseData } from "@/components/logistics-3d";

// Importar Three.js dinámicamente para evitar SSR issues
const LogisticsScene3D = dynamic(
  () => import("@/components/logistics-3d").then(mod => mod.LogisticsScene3D),
  { 
    ssr: false,
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-neutral-100 rounded-lg">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-neutral-500">Inicializando vista 3D...</span>
        </div>
      </div>
    )
  }
);

// Helper para obtener nombre de entidad
function getEntityName(entity: { legal_name: string } | { legal_name: string }[] | null): string {
  if (!entity) return "—";
  if (Array.isArray(entity)) return entity[0]?.legal_name || "—";
  return entity.legal_name || "—";
}

export default function CentrosLogisticosPage() {
  const [warehouseData, setWarehouseData] = useState<WarehouseData[]>([]);
  const [tripsInTransit, setTripsInTransit] = useState<TripData[]>([]);
  const [selectedShipments, setSelectedShipments] = useState<ShipmentData[]>([]);
  const [selectedTitle, setSelectedTitle] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date());

  const fetchData = async () => {
    setIsLoading(true);
    
    try {
      // Obtener envíos por estado
      const { data: shipments } = await supabase
        .from("mercure_shipments")
        .select(`
          id, delivery_note_number, status, package_quantity, weight_kg,
          sender:mercure_entities!sender_id(legal_name),
          recipient:mercure_entities!recipient_id(legal_name),
          trip_id
        `)
        .in("status", [
          "ingresada", "consolidada", "en_transito", 
          "en_descarga", "disponible", "en_reparto"
        ]);

      // Obtener viajes activos
      const { data: trips } = await supabase
        .from("mercure_trips")
        .select(`
          id, origin, destination, status, departure_date,
          vehicle:mercure_vehicles(plate)
        `)
        .in("status", ["loading", "in_transit", "arrived"]);

      // Procesar datos
      const allShipments = (shipments || []).map(s => ({
        id: s.id,
        deliveryNoteNumber: s.delivery_note_number,
        status: s.status,
        senderName: getEntityName(s.sender),
        recipientName: getEntityName(s.recipient),
        packageCount: s.package_quantity || 0,
        weightKg: s.weight_kg || 0,
        tripId: s.trip_id,
      }));

      // Envíos en BS AS (ingresada, consolidada pero sin trip, o en_reparto en BS AS)
      const bsasShipments = allShipments.filter(s => 
        s.status === "ingresada" || 
        (s.status === "consolidada" && !s.tripId)
      );

      // Envíos en Jujuy (disponible, en_descarga, en_reparto)
      const jujuyShipments = allShipments.filter(s => 
        s.status === "disponible" || 
        s.status === "en_descarga" ||
        s.status === "en_reparto"
      );

      // Procesar viajes
      const processedTrips: TripData[] = (trips || []).map(t => {
        const tripShipments = allShipments.filter(s => s.tripId === t.id);
        const vehicleData = t.vehicle as { plate: string } | { plate: string }[] | null;
        const plate = Array.isArray(vehicleData) ? vehicleData[0]?.plate : vehicleData?.plate;
        
        // Calcular progreso basado en tiempo (simulado)
        let progress = 0;
        if (t.status === "in_transit") {
          // Simular progreso basado en hora del día
          const now = new Date();
          progress = (now.getHours() % 12) / 12;
        } else if (t.status === "arrived") {
          progress = 1;
        }

        return {
          id: t.id,
          origin: t.origin || "Buenos Aires",
          destination: t.destination || "Jujuy",
          status: t.status,
          vehiclePlate: plate || null,
          shipments: tripShipments,
          progress,
        };
      });

      // Viajes en tránsito
      const inTransitTrips = processedTrips.filter(t => t.status === "in_transit");
      
      // Viajes cargando en BS AS
      const loadingInBsas = processedTrips.filter(t => 
        t.status === "loading" && 
        t.origin?.toLowerCase().includes("buenos aires")
      );

      // Viajes arribados en Jujuy
      const arrivedInJujuy = processedTrips.filter(t => 
        t.status === "arrived" && 
        t.destination?.toLowerCase().includes("jujuy")
      );

      setWarehouseData([
        {
          id: "bsas",
          name: "Centro Logístico",
          city: "Buenos Aires",
          position: [-6, 0, 0],
          shipments: bsasShipments,
          trucks: loadingInBsas,
        },
        {
          id: "jujuy",
          name: "Centro Logístico",
          city: "San Salvador de Jujuy",
          position: [6, 0, 0],
          shipments: jujuyShipments,
          trucks: arrivedInJujuy,
        },
      ]);

      setTripsInTransit(inTransitTrips);
      setLastUpdate(new Date());
    } catch (error) {
      console.error("Error fetching logistics data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Auto-refresh cada 30 segundos
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleSelectShipments = (shipments: ShipmentData[], title: string) => {
    setSelectedShipments(shipments);
    setSelectedTitle(title);
  };

  const totalShipments = warehouseData.reduce((acc, w) => acc + w.shipments.length, 0) + 
    tripsInTransit.reduce((acc, t) => acc + t.shipments.length, 0);

  const totalTrucks = warehouseData.reduce((acc, w) => acc + w.trucks.length, 0) + tripsInTransit.length;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      
      <div className="px-4 py-3 border-b border-neutral-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-medium text-neutral-900">
              Centros Logísticos
            </h1>
            <div className="flex items-center gap-2 text-xs">
              <span className="bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Package className="w-3 h-3" />
                {totalShipments} envíos
              </span>
              <span className="bg-orange-50 text-orange-700 px-2 py-1 rounded-full font-medium flex items-center gap-1">
                <Truck className="w-3 h-3" />
                {totalTrucks} vehículos
              </span>
              <span className="text-neutral-400">
                Actualizado: {lastUpdate.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              className="h-8 px-3 text-sm"
              onClick={fetchData}
              disabled={isLoading}
            >
              <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Actualizar
            </Button>
            <Button 
              variant="outline" 
              className="h-8 px-3 text-sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              <Maximize2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className={`flex ${isFullscreen ? 'fixed inset-0 z-50 bg-white' : 'h-[calc(100vh-120px)]'}`}>
        {/* Vista 3D */}
        <div className={`${selectedShipments.length > 0 ? 'w-2/3' : 'w-full'} h-full p-4 transition-all`}>
          <div className="w-full h-full rounded-xl overflow-hidden shadow-lg border border-neutral-200">
            <LogisticsScene3D
              warehouseData={warehouseData}
              tripsInTransit={tripsInTransit}
              onSelectShipments={handleSelectShipments}
            />
          </div>
          
          {/* Leyenda */}
          <div className="absolute bottom-8 left-8 bg-white/90 backdrop-blur rounded-lg shadow-lg p-3 text-xs">
            <div className="font-medium text-neutral-700 mb-2">Leyenda</div>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-blue-500" />
                <span className="text-neutral-600">Depósito Buenos Aires</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-green-500" />
                <span className="text-neutral-600">Depósito Jujuy</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded bg-orange-500" />
                <span className="text-neutral-600">Camión en ruta</span>
              </div>
            </div>
            <div className="mt-2 pt-2 border-t border-neutral-200 text-neutral-400">
              Click en depósito o camión para ver envíos
            </div>
          </div>

          {/* Botón cerrar fullscreen */}
          {isFullscreen && (
            <Button
              variant="outline"
              className="absolute top-4 right-4 h-8 px-3"
              onClick={() => setIsFullscreen(false)}
            >
              <X className="w-4 h-4 mr-1" />
              Salir
            </Button>
          )}
        </div>

        {/* Panel de detalle */}
        {selectedShipments.length > 0 && (
          <div className="w-1/3 h-full border-l border-neutral-200 bg-neutral-50 overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-neutral-200 bg-white flex items-center justify-between">
              <div>
                <h2 className="text-sm font-medium text-neutral-900">{selectedTitle}</h2>
                <p className="text-xs text-neutral-500">{selectedShipments.length} envíos</p>
              </div>
              <button
                onClick={() => {
                  setSelectedShipments([]);
                  setSelectedTitle("");
                }}
                className="p-1 hover:bg-neutral-100 rounded"
              >
                <X className="w-4 h-4 text-neutral-400" />
              </button>
            </div>
            
            <div className="flex-1 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-neutral-100 sticky top-0">
                  <tr className="text-xs text-neutral-500 uppercase">
                    <th className="px-3 py-2 text-left font-medium">Envío</th>
                    <th className="px-3 py-2 text-left font-medium">Destino</th>
                    <th className="px-3 py-2 text-right font-medium">Bultos</th>
                    <th className="px-3 py-2 text-right font-medium">Kg</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedShipments.map((shipment) => (
                    <tr 
                      key={shipment.id} 
                      className="border-b border-neutral-100 hover:bg-white transition-colors"
                    >
                      <td className="px-3 py-2">
                        <div className="font-mono text-xs text-neutral-400">
                          #{shipment.id}
                        </div>
                        {shipment.deliveryNoteNumber && (
                          <div className="text-neutral-700 text-xs">
                            {shipment.deliveryNoteNumber}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <div className="text-neutral-700 truncate max-w-[120px]" title={shipment.recipientName}>
                          {shipment.recipientName}
                        </div>
                        <div className="text-xs text-neutral-400 flex items-center gap-1">
                          <User className="w-3 h-3" />
                          {shipment.senderName}
                        </div>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1 text-neutral-600">
                          <Box className="w-3 h-3" />
                          {shipment.packageCount}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right">
                        <span className="inline-flex items-center gap-1 text-neutral-600">
                          <Weight className="w-3 h-3" />
                          {shipment.weightKg}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {selectedShipments.length === 0 && (
                <div className="flex flex-col items-center justify-center h-40 text-neutral-400">
                  <Package className="w-8 h-8 mb-2" />
                  <span className="text-sm">Sin envíos</span>
                </div>
              )}
            </div>

            {/* Resumen */}
            <div className="px-4 py-3 border-t border-neutral-200 bg-white">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-500">Total bultos:</span>
                <span className="font-medium text-neutral-700">
                  {selectedShipments.reduce((acc, s) => acc + s.packageCount, 0)}
                </span>
              </div>
              <div className="flex justify-between text-xs mt-1">
                <span className="text-neutral-500">Total peso:</span>
                <span className="font-medium text-neutral-700">
                  {selectedShipments.reduce((acc, s) => acc + s.weightKg, 0).toFixed(1)} kg
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
