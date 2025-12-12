"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, FileText, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    year: 'numeric',
  });
}

export function ClientList({ initialClients }: ClientListProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedClient, setExpandedClient] = useState<number | null>(null);

  const filteredClients = initialClients.filter(client => {
    if (!searchTerm) return true;
    const search = searchTerm.toLowerCase();
    return (
      client.legal_name.toLowerCase().includes(search) ||
      (client.tax_id && client.tax_id.toLowerCase().includes(search))
    );
  });

  const toggleClient = (clientId: number) => {
    setExpandedClient(expandedClient === clientId ? null : clientId);
  };

  return (
    <div className="space-y-3">
      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
        <Input
          type="text"
          placeholder="Buscar por nombre o CUIT..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9 h-9"
        />
      </div>

      {/* Lista */}
      <div className="border border-neutral-200 rounded-lg overflow-hidden">
        {/* Header */}
        <div className="bg-neutral-50 border-b border-neutral-200 grid grid-cols-12 gap-2 px-3 py-2 text-xs font-medium text-neutral-500 uppercase tracking-wide">
          <div className="col-span-1"></div>
          <div className="col-span-4">Cliente</div>
          <div className="col-span-2">CUIT</div>
          <div className="col-span-1 text-center">Remitos</div>
          <div className="col-span-2 text-right">Saldo</div>
          <div className="col-span-2 text-right">Última Liq.</div>
        </div>

        {/* Filas */}
        {filteredClients.length === 0 ? (
          <div className="px-3 py-8 text-center text-neutral-400">
            {searchTerm ? 'No se encontraron clientes' : 'No hay clientes con cuenta corriente'}
          </div>
        ) : (
          filteredClients.map((client) => (
            <div key={client.id}>
              {/* Fila principal */}
              <div
                onClick={() => toggleClient(client.id)}
                className={`grid grid-cols-12 gap-2 px-3 py-2.5 items-center cursor-pointer transition-colors ${
                  expandedClient === client.id 
                    ? 'bg-orange-50 border-l-2 border-l-orange-500' 
                    : 'hover:bg-neutral-50 border-l-2 border-l-transparent'
                }`}
              >
                <div className="col-span-1">
                  {expandedClient === client.id ? (
                    <ChevronDown className="w-4 h-4 text-neutral-400" />
                  ) : (
                    <ChevronRight className="w-4 h-4 text-neutral-400" />
                  )}
                </div>

                <div className="col-span-4">
                  <p className="font-medium text-sm text-neutral-900 truncate">
                    {client.legal_name}
                  </p>
                </div>

                <div className="col-span-2">
                  <span className="text-xs font-mono text-neutral-600">
                    {client.tax_id || '-'}
                  </span>
                </div>

                <div className="col-span-1 text-center">
                  {client.pending_shipments > 0 ? (
                    <Badge variant="warning">{client.pending_shipments}</Badge>
                  ) : (
                    <span className="text-neutral-400 text-sm">0</span>
                  )}
                </div>

                <div className="col-span-2 text-right">
                  <span className={`text-sm font-mono font-medium ${
                    client.balance > 0 ? 'text-orange-600' : 'text-neutral-400'
                  }`}>
                    {client.balance > 0 ? formatCurrency(client.balance) : '$0,00'}
                  </span>
                </div>

                <div className="col-span-2 text-right">
                  {client.last_settlement_number ? (
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="text-xs text-neutral-500">
                        #{client.last_settlement_number}
                      </span>
                      <span className="text-xs text-neutral-400">
                        {formatDate(client.last_settlement_date)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs text-neutral-400">-</span>
                  )}
                </div>
              </div>

              {/* Panel expandido */}
              {expandedClient === client.id && (
                <div className="border-t border-neutral-200 bg-neutral-50/50">
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

      {/* Leyenda */}
      <div className="flex items-center gap-4 text-xs text-neutral-500">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-orange-500"></div>
          <span>Con saldo pendiente</span>
        </div>
        <div className="flex items-center gap-1.5">
          <FileText className="w-3 h-3" />
          <span>Click para ver detalle y liquidar</span>
        </div>
      </div>
    </div>
  );
}

