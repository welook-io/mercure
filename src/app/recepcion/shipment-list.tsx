"use client";

import { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { SHIPMENT_STATUS_LABELS } from "@/lib/types";
import { timeAgo } from "@/lib/utils";
import { ChevronDown, ChevronUp, Package, FileText, Pencil, Image as ImageIcon, X, Search, ArrowUpDown } from "lucide-react";
import Link from "next/link";
import { Input } from "@/components/ui/input";

type Shipment = {
  id: number;
  delivery_note_number: string | null;
  package_quantity: number | null;
  weight_kg: number | null;
  volume_m3: number | null;
  declared_value: number | null;
  status: string;
  created_at: string;
  sender: { legal_name: string } | null;
  recipient: { legal_name: string } | null;
  quotation: { total_price: number } | null;
  remito_image_url: string | null;
  cargo_image_url: string | null;
};

type SortField = 'created_at' | 'recipient' | 'sender' | 'package_quantity' | 'declared_value';
type SortDirection = 'asc' | 'desc';

function getStatusVariant(status: string): "default" | "success" | "warning" | "error" | "info" {
  switch (status) {
    case 'received': return 'info';
    case 'in_warehouse': return 'warning';
    case 'ingresada': return 'info';
    default: return 'default';
  }
}

export function ShipmentList({ shipments }: { shipments: Shipment[] }) {
  const [expanded, setExpanded] = useState<number | null>(null);
  const [imageModal, setImageModal] = useState<{ url: string; title: string } | null>(null);
  
  // Filtros y ordenamiento
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  // Aplicar filtros y ordenamiento
  const filteredAndSortedShipments = useMemo(() => {
    let result = [...shipments];
    
    // Filtro por texto (remito, remitente, destinatario)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      result = result.filter(s => 
        (s.delivery_note_number?.toLowerCase().includes(term)) ||
        (s.sender?.legal_name?.toLowerCase().includes(term)) ||
        (s.recipient?.legal_name?.toLowerCase().includes(term))
      );
    }
    
    // Filtro por estado
    if (statusFilter !== 'all') {
      result = result.filter(s => s.status === statusFilter);
    }
    
    // Ordenamiento
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'created_at':
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case 'recipient':
          comparison = (a.recipient?.legal_name || '').localeCompare(b.recipient?.legal_name || '');
          break;
        case 'sender':
          comparison = (a.sender?.legal_name || '').localeCompare(b.sender?.legal_name || '');
          break;
        case 'package_quantity':
          comparison = (a.package_quantity || 0) - (b.package_quantity || 0);
          break;
        case 'declared_value':
          comparison = (a.declared_value || 0) - (b.declared_value || 0);
          break;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
    
    return result;
  }, [shipments, searchTerm, statusFilter, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ArrowUpDown className="w-3 h-3 text-neutral-300" />;
    return sortDirection === 'asc' 
      ? <ChevronUp className="w-3 h-3 text-orange-500" />
      : <ChevronDown className="w-3 h-3 text-orange-500" />;
  };

  // Calcular total del flete (de los filtrados)
  const totalFlete = filteredAndSortedShipments.reduce((sum, s) => {
    const price = s.quotation?.total_price || 0;
    return sum + Number(price);
  }, 0);

  // Obtener estados únicos para el filtro
  const uniqueStatuses = [...new Set(shipments.map(s => s.status))];

  if (shipments.length === 0) {
    return (
      <div className="px-3 py-8 text-center text-neutral-400 border border-neutral-200 rounded">
        Sin mercadería pendiente
      </div>
    );
  }

  return (
    <>
      {/* Barra de filtros */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
          <Input
            placeholder="Buscar remito, remitente o destinatario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        
        {/* Filtro de estado */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 px-2 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
        >
          <option value="all">Todos los estados</option>
          {uniqueStatuses.map(status => (
            <option key={status} value={status}>
              {SHIPMENT_STATUS_LABELS[status as keyof typeof SHIPMENT_STATUS_LABELS] || status}
            </option>
          ))}
        </select>
        
        {/* Ordenar (solo mobile) */}
        <select
          value={`${sortField}-${sortDirection}`}
          onChange={(e) => {
            const [field, dir] = e.target.value.split('-') as [SortField, SortDirection];
            setSortField(field);
            setSortDirection(dir);
          }}
          className="h-8 px-2 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none md:hidden"
        >
          <option value="created_at-desc">Más recientes</option>
          <option value="created_at-asc">Más antiguos</option>
          <option value="recipient-asc">Destinatario A-Z</option>
          <option value="recipient-desc">Destinatario Z-A</option>
          <option value="package_quantity-desc">Más bultos</option>
          <option value="declared_value-desc">Mayor valor</option>
        </select>
      </div>
      
      {/* Contador de resultados */}
      {(searchTerm || statusFilter !== 'all') && (
        <p className="text-xs text-neutral-500 mb-2">
          Mostrando {filteredAndSortedShipments.length} de {shipments.length} envíos
        </p>
      )}
      
      {filteredAndSortedShipments.length === 0 ? (
        <div className="px-3 py-8 text-center text-neutral-400 border border-neutral-200 rounded">
          No se encontraron envíos con esos filtros
        </div>
      ) : (
        <>
      {/* Mobile View - Cards compactas */}
      <div className="md:hidden space-y-2">
        {filteredAndSortedShipments.map((s) => (
          <div 
            key={s.id} 
            className="border border-neutral-200 rounded bg-white"
          >
            {/* Vista compacta - siempre visible */}
            <button
              onClick={() => setExpanded(expanded === s.id ? null : s.id)}
              className="w-full px-3 py-2.5 flex items-center gap-3 text-left"
            >
              {/* Bultos - destacado */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Package className="h-4 w-4 text-neutral-400" />
                <span className="font-semibold text-neutral-900">
                  {s.package_quantity || '?'}
                </span>
              </div>

              {/* Destinatario - principal */}
              <div className="flex-1 min-w-0">
                <p className="font-medium text-neutral-900 truncate">
                  {s.recipient?.legal_name || 'Sin destinatario'}
                </p>
                <p className="text-xs text-neutral-500 truncate">
                  de {s.sender?.legal_name || 'Desconocido'}
                </p>
              </div>

              {/* Tiempo relativo */}
              <span className="text-xs text-neutral-400 shrink-0">
                {timeAgo(s.created_at)}
              </span>

              {/* Chevron */}
              <ChevronDown 
                className={`h-4 w-4 text-neutral-400 transition-transform ${expanded === s.id ? 'rotate-180' : ''}`} 
              />
            </button>

            {/* Vista expandida - detalles */}
            {expanded === s.id && (
              <div className="px-3 pb-3 pt-1 border-t border-neutral-100 bg-neutral-50/50">
                {/* Fotos */}
                {(s.remito_image_url || s.cargo_image_url) && (
                  <div className="flex gap-2 mb-3">
                    {s.remito_image_url && (
                      <button
                        onClick={() => setImageModal({ url: s.remito_image_url!, title: `Remito ${s.delivery_note_number || s.id}` })}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs"
                      >
                        <FileText className="w-4 h-4" />
                        Ver Remito
                      </button>
                    )}
                    {s.cargo_image_url && (
                      <button
                        onClick={() => setImageModal({ url: s.cargo_image_url!, title: `Carga ${s.delivery_note_number || s.id}` })}
                        className="flex items-center gap-2 px-3 py-2 rounded-lg border border-green-200 bg-green-50 text-green-700 text-xs"
                      >
                        <ImageIcon className="w-4 h-4" />
                        Ver Carga
                      </button>
                    )}
                  </div>
                )}
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <span className="text-xs text-neutral-500">Remito</span>
                    <p className="font-medium">{s.delivery_note_number || `#${s.id}`}</p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Estado</span>
                    <div className="mt-0.5">
                      <Badge variant={getStatusVariant(s.status)}>
                        {SHIPMENT_STATUS_LABELS[s.status as keyof typeof SHIPMENT_STATUS_LABELS] || s.status}
                      </Badge>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Peso</span>
                    <p>{s.weight_kg ? `${s.weight_kg} kg` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Volumen</span>
                    <p>{s.volume_m3 ? `${s.volume_m3} m³` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Valor declarado</span>
                    <p>{s.declared_value ? `$${s.declared_value.toLocaleString('es-AR')}` : '-'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-neutral-500">Ingreso</span>
                    <p>{new Date(s.created_at).toLocaleString('es-AR', { 
                      day: '2-digit', 
                      month: 'short', 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}</p>
                  </div>
                </div>
                
                {/* Acciones */}
                <div className="flex gap-2 mt-3 pt-3 border-t border-neutral-200">
                  <Link 
                    href={`/envios/${s.id}/remito`}
                    className="flex-1 h-8 px-3 text-xs bg-neutral-900 hover:bg-neutral-800 text-white rounded flex items-center justify-center gap-1.5"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    Ver Remito
                  </Link>
                  <Link 
                    href={`/envios/${s.id}/editar`}
                    className="flex-1 h-8 px-3 text-xs border border-neutral-200 hover:bg-neutral-50 rounded flex items-center justify-center gap-1.5"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Modificar
                  </Link>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Desktop View - Tabla completa */}
      <div className="hidden md:block border border-neutral-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-2 py-2 text-center text-xs font-medium text-neutral-500 uppercase w-16">Fotos</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Remito</th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('sender')}
                >
                  <span className="flex items-center gap-1">
                    Remitente <SortIcon field="sender" />
                  </span>
                </th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('recipient')}
                >
                  <span className="flex items-center gap-1">
                    Destinatario <SortIcon field="recipient" />
                  </span>
                </th>
                <th 
                  className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('package_quantity')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Bultos <SortIcon field="package_quantity" />
                  </span>
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Kg</th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">m³</th>
                <th 
                  className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('declared_value')}
                >
                  <span className="flex items-center justify-end gap-1">
                    Valor <SortIcon field="declared_value" />
                  </span>
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium text-neutral-500 uppercase">Flete</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Estado</th>
                <th 
                  className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase cursor-pointer hover:bg-neutral-100"
                  onClick={() => handleSort('created_at')}
                >
                  <span className="flex items-center gap-1">
                    Ingreso <SortIcon field="created_at" />
                  </span>
                </th>
                <th className="px-3 py-2 text-center text-xs font-medium text-neutral-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredAndSortedShipments.map((s) => (
                <tr key={s.id} className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50">
                  <td className="px-2 py-1">
                    <div className="flex items-center justify-center gap-1">
                      {s.remito_image_url ? (
                        <button
                          onClick={() => setImageModal({ url: s.remito_image_url!, title: `Remito ${s.delivery_note_number || s.id}` })}
                          className="w-6 h-6 rounded flex items-center justify-center text-blue-600 hover:bg-blue-50 transition-colors"
                          title="Ver remito"
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <FileText className="w-4 h-4 text-neutral-200" />
                        </div>
                      )}
                      {s.cargo_image_url ? (
                        <button
                          onClick={() => setImageModal({ url: s.cargo_image_url!, title: `Carga ${s.delivery_note_number || s.id}` })}
                          className="w-6 h-6 rounded flex items-center justify-center text-green-600 hover:bg-green-50 transition-colors"
                          title="Ver carga"
                        >
                          <ImageIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <div className="w-6 h-6 flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-neutral-200" />
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 font-medium">{s.delivery_note_number || `#${s.id}`}</td>
                  <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">{s.sender?.legal_name || '-'}</td>
                  <td className="px-3 py-2 text-neutral-600 truncate max-w-[120px]">{s.recipient?.legal_name || '-'}</td>
                  <td className="px-3 py-2 text-right text-neutral-600">{s.package_quantity || '-'}</td>
                  <td className="px-3 py-2 text-right text-neutral-600">{s.weight_kg || '-'}</td>
                  <td className="px-3 py-2 text-right text-neutral-600">{s.volume_m3 || '-'}</td>
                  <td className="px-3 py-2 text-right text-neutral-600">{s.declared_value ? `$${s.declared_value.toLocaleString('es-AR')}` : '-'}</td>
                  <td className="px-3 py-2 text-right text-neutral-900 font-medium">
                    {s.quotation?.total_price 
                      ? `$${Number(s.quotation.total_price).toLocaleString('es-AR', { minimumFractionDigits: 2 })}` 
                      : <span className="text-neutral-400 font-normal">-</span>}
                  </td>
                  <td className="px-3 py-2">
                    <Badge variant={getStatusVariant(s.status)}>
                      {SHIPMENT_STATUS_LABELS[s.status as keyof typeof SHIPMENT_STATUS_LABELS] || s.status}
                    </Badge>
                  </td>
                  <td className="px-3 py-2 text-neutral-400 text-xs">{timeAgo(s.created_at)}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-center gap-1">
                      <Link 
                        href={`/envios/${s.id}/remito`}
                        className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 hover:text-neutral-900"
                        title="Ver Remito"
                      >
                        <FileText className="w-4 h-4" />
                      </Link>
                      <Link 
                        href={`/envios/${s.id}/editar`}
                        className="p-1.5 hover:bg-neutral-100 rounded text-neutral-600 hover:text-neutral-900"
                        title="Modificar"
                      >
                        <Pencil className="w-4 h-4" />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-neutral-100 border-t border-neutral-300">
                <td colSpan={8} className="px-3 py-2 text-right text-sm font-bold text-neutral-700">
                  TOTAL FLETE
                </td>
                <td className="px-3 py-2 text-right text-sm font-bold text-neutral-900">
                  ${totalFlete.toLocaleString('es-AR', { minimumFractionDigits: 2 })}
                </td>
                <td colSpan={3}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
        </>
      )}

      {/* Modal de imagen */}
      {imageModal && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] w-full">
            <button
              onClick={() => setImageModal(null)}
              className="absolute -top-10 right-0 text-white hover:text-neutral-300 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
            <p className="absolute -top-10 left-0 text-white text-sm font-medium">
              {imageModal.title}
            </p>
            <img 
              src={imageModal.url} 
              alt={imageModal.title}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </>
  );
}


