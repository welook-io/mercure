"use client";

import { Package, Truck, MapPin, CheckCircle2, FileText, Clock, DollarSign, Box, Pencil } from "lucide-react";
import Link from "next/link";
import { timeAgo } from "@/lib/utils";

interface Shipment {
  id: number;
  delivery_note_number: string | null;
  status: string;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  recipient_address: string | null;
  created_at: string;
  updated_at: string;
  trip_id: number | null;
  quotation_id: string | null;
  sender: { legal_name: string } | null;
  recipient: { legal_name: string } | null;
  trip: { 
    id: number;
    origin: string;
    destination: string;
    status: string;
    departure_time: string | null;
  } | null;
  quotation: {
    total_price: number;
    base_price: number;
    insurance_cost: number | null;
  } | null;
}

interface KanbanColumns {
  recepcion: Shipment[];
  enDestino: Shipment[];
  entregado: Shipment[];
}

interface KanbanBoardProps {
  columns: KanbanColumns;
}

// Documentos: nombre, descripción, y si está firmado/sellado (para negrita)
interface DocInfo {
  name: string;
  description: string;
  signed: boolean;
}

const DOCS: Record<string, DocInfo> = {
  'Remito sellado': { 
    name: 'Remito sellado', 
    description: 'Remito del remitente sellado al ingresar a depósito', 
    signed: true 
  },
  'Guía': { 
    name: 'Guía', 
    description: 'Documento de Mercure que acompaña el flete', 
    signed: false 
  },
  'Remito': { 
    name: 'Remito', 
    description: 'Documento del remitente que describe la mercadería', 
    signed: false 
  },
  'Hoja de Ruta': { 
    name: 'Hoja de Ruta', 
    description: 'Lista de envíos del viaje, firma el conductor al partir', 
    signed: false 
  },
  'Hoja de Ruta firmada': { 
    name: 'Hoja de Ruta firmada', 
    description: 'Hoja de ruta firmada por el chofer al arribar a destino', 
    signed: true 
  },
  'Guía firmada': { 
    name: 'Guía firmada', 
    description: 'Guía de Mercure firmada por el destinatario como prueba de entrega', 
    signed: true 
  },
};

const COLUMN_CONFIG = [
  {
    key: 'recepcion' as const,
    title: 'Recepción',
    subtitle: 'En depósito origen',
    icon: Package,
    color: 'bg-blue-500',
    lightBg: 'bg-blue-50',
    borderColor: 'border-blue-200',
    docs: ['Remito sellado', 'Guía'],
    action: { href: '/viajes/nuevo?tipo=viaje', label: 'Crear Viaje' },
  },
  {
    key: 'enDestino' as const,
    title: 'En Destino',
    subtitle: 'Llegó, listo para última milla',
    icon: MapPin,
    color: 'bg-purple-500',
    lightBg: 'bg-purple-50',
    borderColor: 'border-purple-200',
    docs: ['Remito', 'Guía', 'Hoja de Ruta firmada'],
    action: { href: '/viajes/nuevo?tipo=ultima_milla', label: 'Crear Última Milla' },
  },
  {
    key: 'entregado' as const,
    title: 'Entregado',
    subtitle: 'Entregado al cliente final',
    icon: CheckCircle2,
    color: 'bg-green-500',
    lightBg: 'bg-green-50',
    borderColor: 'border-green-200',
    docs: ['Remito', 'Guía firmada'],
    action: null,
  },
];

function ShipmentCard({ shipment, showTrip = false }: { shipment: Shipment; showTrip?: boolean }) {
  const remitoNumber = shipment.delivery_note_number || `#${shipment.id}`;
  
  return (
    <div className="bg-white border border-neutral-200 rounded-lg p-3 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-mono font-medium text-neutral-900 truncate">{remitoNumber}</p>
          <p className="text-[11px] text-neutral-500 truncate">{shipment.recipient?.legal_name || '-'}</p>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 ml-2">
          <Link
            href={`/envios/${shipment.id}/editar`}
            className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-blue-600"
            title="Editar envío"
          >
            <Pencil className="w-3.5 h-3.5" />
          </Link>
          <Link
            href={`/envios/${shipment.id}/remito`}
            className="p-1 hover:bg-neutral-100 rounded text-neutral-400 hover:text-neutral-700"
            title="Ver Remito"
          >
            <FileText className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Métricas compactas */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-neutral-500 mb-2">
        <span className="flex items-center gap-1">
          <Package className="w-3 h-3" />
          {shipment.package_quantity || 0}
        </span>
        <span>{shipment.weight_kg ? `${shipment.weight_kg} kg` : '-'}</span>
        {shipment.volume_m3 && (
          <span className="flex items-center gap-1">
            <Box className="w-3 h-3" />
            {shipment.volume_m3} m³
          </span>
        )}
      </div>

      {/* Valores: declarado y flete */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] mb-2">
        {shipment.declared_value && (
          <span className="text-neutral-600">
            Val: <span className="font-medium">${shipment.declared_value.toLocaleString('es-AR', { maximumFractionDigits: 0 })}</span>
          </span>
        )}
        {shipment.quotation?.total_price && (
          <span className="flex items-center gap-0.5 text-green-700 font-medium bg-green-50 px-1.5 py-0.5 rounded">
            <DollarSign className="w-3 h-3" />
            {shipment.quotation.total_price.toLocaleString('es-AR', { maximumFractionDigits: 0 })}
          </span>
        )}
      </div>

      {/* Trip info si aplica */}
      {showTrip && shipment.trip && (
        <div className="bg-orange-50 border border-orange-100 rounded px-2 py-1 mb-2">
          <p className="text-[10px] text-orange-700 font-medium truncate">
            {shipment.trip.origin} → {shipment.trip.destination}
          </p>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between text-[10px] text-neutral-400">
        <span className="truncate max-w-[60%]">{shipment.sender?.legal_name || '-'}</span>
        <span className="flex items-center gap-1 shrink-0">
          <Clock className="w-3 h-3" />
          {timeAgo(shipment.updated_at || shipment.created_at)}
        </span>
      </div>
    </div>
  );
}

export function KanbanBoard({ columns }: KanbanBoardProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {COLUMN_CONFIG.map((config) => {
        const Icon = config.icon;
        const items = columns[config.key];
        
        return (
          <div key={config.key} className="flex flex-col">
            {/* Column Header */}
            <div className={`${config.lightBg} ${config.borderColor} border rounded-t-lg px-3 py-2`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`${config.color} p-1.5 rounded`}>
                    <Icon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-neutral-900">{config.title}</h3>
                    <p className="text-[10px] text-neutral-500">{config.subtitle}</p>
                  </div>
                </div>
                <span className={`${config.color} text-white text-xs font-bold px-2 py-0.5 rounded-full`}>
                  {items.length}
                </span>
              </div>
              
              {/* Documentos asociados con tooltips */}
              <div className="flex flex-wrap gap-1 mt-2">
                {config.docs.map((docKey) => {
                  const doc = DOCS[docKey];
                  return (
                    <span 
                      key={docKey} 
                      className={`text-[9px] bg-white/70 text-neutral-600 px-1.5 py-0.5 rounded cursor-help hover:bg-white transition-colors ${doc?.signed ? 'font-bold' : ''}`}
                      title={doc?.description || docKey}
                    >
                      📄 {doc?.name || docKey}
                    </span>
                  );
                })}
              </div>

              {/* Action button */}
              {config.action && items.length > 0 && (
                <Link 
                  href={config.action.href}
                  className={`mt-2 block w-full text-center text-xs py-1.5 rounded ${config.color} text-white hover:opacity-90 transition-opacity`}
                >
                  {config.action.label}
                </Link>
              )}
            </div>

            {/* Column Content */}
            <div className={`flex-1 ${config.borderColor} border-x border-b rounded-b-lg bg-neutral-50/50 p-2 min-h-[300px] max-h-[calc(100vh-280px)] overflow-y-auto`}>
              {items.length === 0 ? (
                <div className="h-full flex items-center justify-center">
                  <p className="text-xs text-neutral-400">Sin envíos</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {items.slice(0, 20).map((shipment) => (
                    <ShipmentCard 
                      key={shipment.id} 
                      shipment={shipment} 
                      showTrip={config.key === 'enDestino'}
                    />
                  ))}
                  {items.length > 20 && (
                    <p className="text-xs text-center text-neutral-400 py-2">
                      +{items.length - 20} más
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

