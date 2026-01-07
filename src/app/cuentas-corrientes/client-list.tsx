"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Search, ArrowUpDown, Filter } from "lucide-react";
import { ClientDetail } from "./client-detail";

interface ClientWithBalance {
  id: number;
  legal_name: string;
  tax_id: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  pending_shipments: number;
  balance: number;
  last_settlement_date: string | null;
  last_settlement_number: number | null;
}

interface ClientListProps {
  initialClients: ClientWithBalance[];
}

type SortField = 'name' | 'balance' | 'shipments';
type SortDir = 'asc' | 'desc';
type FilterMode = 'all' | 'with_balance' | 'no_balance';

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    minimumFractionDigits: 2,
  }).format(value);
}

function formatDate(date: string | null): string {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
}

// Componente SortButton movido fuera del componente para evitar recreación en cada render
function SortButton({ 
  field, 
  children, 
  sortField, 
  sortDir, 
  onSort 
}: { 
  field: SortField; 
  children: React.ReactNode;
  sortField: SortField;
  sortDir: SortDir;
  onSort: (field: SortField) => void;
}) {
  return (
    <button
      onClick={() => onSort(field)}
      className={`flex items-center gap-1 text-xs uppercase tracking-wide transition-colors ${
        sortField === field ? 'text-neutral-900 font-medium' : 'text-neutral-500 hover:text-neutral-700'
      }`}
    >
      {children}
      {sortField === field && (
        <ArrowUpDown className={`w-3 h-3 ${sortDir === 'asc' ? 'rotate-180' : ''}`} />
      )}
    </button>
  );
}

export function ClientList({ initialClients }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClient, setExpandedClient] = useState<number | null>(null);
  const [sortField, setSortField] = useState<SortField>('balance');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [filterMode, setFilterMode] = useState<FilterMode>('all');

  // Filtrar
  const filteredClients = initialClients.filter(client => {
    // Filtro de búsqueda
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      const matchesSearch = client.legal_name.toLowerCase().includes(search) ||
        (client.tax_id && client.tax_id.toLowerCase().includes(search));
      if (!matchesSearch) return false;
    }
    
    // Filtro de saldo
    if (filterMode === 'with_balance' && client.balance <= 0) return false;
    if (filterMode === 'no_balance' && client.balance > 0) return false;
    
    return true;
  });

  // Ordenar
  const sortedClients = [...filteredClients].sort((a, b) => {
    let comparison = 0;
    
    switch (sortField) {
      case 'name':
        comparison = a.legal_name.localeCompare(b.legal_name);
        break;
      case 'balance':
        comparison = a.balance - b.balance;
        break;
      case 'shipments':
        comparison = a.pending_shipments - b.pending_shipments;
        break;
    }
    
    return sortDir === 'asc' ? comparison : -comparison;
  });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const toggleClient = (clientId: number) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  return (
    <div className="space-y-3">
      {/* Controles */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o CUIT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-neutral-200 rounded text-sm focus:border-neutral-400 focus:ring-0"
          />
        </div>
        
        {/* Filtros */}
        <div className="flex gap-1 p-1 bg-neutral-100 rounded">
          <button
            onClick={() => setFilterMode('all')}
            className={`h-7 px-3 text-xs rounded transition-colors ${
              filterMode === 'all' 
                ? 'bg-white text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Todos ({initialClients.length})
          </button>
          <button
            onClick={() => setFilterMode('with_balance')}
            className={`h-7 px-3 text-xs rounded transition-colors ${
              filterMode === 'with_balance' 
                ? 'bg-white text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Con saldo ({initialClients.filter(c => c.balance > 0).length})
          </button>
          <button
            onClick={() => setFilterMode('no_balance')}
            className={`h-7 px-3 text-xs rounded transition-colors ${
              filterMode === 'no_balance' 
                ? 'bg-white text-neutral-900 shadow-sm' 
                : 'text-neutral-600 hover:text-neutral-900'
            }`}
          >
            Sin saldo
          </button>
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-neutral-200 rounded overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-50 border-b border-neutral-200 grid grid-cols-12 gap-2 px-3 py-2">
          <div className="col-span-1"></div>
          <div className="col-span-4">
            <SortButton field="name" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Cliente</SortButton>
          </div>
          <div className="col-span-2 text-xs text-neutral-500 uppercase tracking-wide">CUIT</div>
          <div className="col-span-1 text-center">
            <SortButton field="shipments" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Remitos</SortButton>
          </div>
          <div className="col-span-2 text-right">
            <SortButton field="balance" sortField={sortField} sortDir={sortDir} onSort={handleSort}>Saldo</SortButton>
          </div>
          <div className="col-span-2 text-right text-xs text-neutral-500 uppercase tracking-wide">Últ. Liq.</div>
        </div>

        {/* Filas */}
        {sortedClients.length === 0 ? (
          <div className="px-3 py-8 text-center text-neutral-400 text-sm">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes con cuenta corriente'}
          </div>
        ) : (
          sortedClients.map((client) => (
            <div key={client.id} className="border-b border-neutral-100 last:border-0">
              {/* Fila principal */}
              <div
                onClick={() => toggleClient(client.id)}
                className={`grid grid-cols-12 gap-2 px-3 py-2 items-center cursor-pointer transition-colors ${
                  expandedClient === client.id 
                    ? 'bg-neutral-100' 
                    : 'hover:bg-neutral-50'
                }`}
              >
                <div className="col-span-1">
                  {expandedClient === client.id ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-300" />
                  )}
                </div>

                <div className="col-span-4">
                  <p className="text-sm text-neutral-900 truncate">{client.legal_name}</p>
                </div>

                <div className="col-span-2">
                  <span className="text-xs font-mono text-neutral-500">{client.tax_id || '-'}</span>
                </div>

                <div className="col-span-1 text-center">
                  <span className={`text-sm ${client.pending_shipments > 0 ? 'text-neutral-900' : 'text-neutral-400'}`}>
                    {client.pending_shipments}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  <span className={`text-sm font-mono ${client.balance > 0 ? 'text-neutral-900 font-medium' : 'text-neutral-400'}`}>
                    {client.balance > 0 ? formatCurrency(client.balance) : '$0,00'}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  {client.last_settlement_number ? (
                    <span className="text-xs text-neutral-500">
                      #{client.last_settlement_number} · {formatDate(client.last_settlement_date)}
                    </span>
                  ) : (
                    <span className="text-xs text-neutral-400">-</span>
                  )}
                </div>
              </div>

              {/* Panel expandido */}
              {expandedClient === client.id && (
                <div className="border-t border-neutral-200 bg-neutral-50">
                  <ClientDetail 
                    clientId={client.id} 
                    clientName={client.legal_name}
                    clientTaxId={client.tax_id}
                  />
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Info */}
      <p className="text-xs text-neutral-400">
        Mostrando {sortedClients.length} de {initialClients.length} clientes
      </p>
    </div>
  );
}
