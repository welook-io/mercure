"use client";

import React, { useState, useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import {
  UserCircle,
  FileText,
  Shield,
  Truck,
  Receipt,
  Package,
  Settings,
  Search,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  X,
  Calendar,
} from "lucide-react";

interface AuditLog {
  id: number;
  user_id: string | null;
  user_email: string | null;
  user_name: string | null;
  action: string;
  module: string;
  description: string;
  target_type: string | null;
  target_id: string | null;
  old_value: Record<string, unknown> | null;
  new_value: Record<string, unknown> | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

interface AuditLogTableProps {
  logs: AuditLog[];
}

type SortField = "created_at" | "user_name" | "action" | "module" | "description";
type SortDirection = "asc" | "desc";

const MODULE_ICONS: Record<string, React.ReactNode> = {
  configuracion: <Settings className="w-3.5 h-3.5" />,
  recepcion: <Package className="w-3.5 h-3.5" />,
  envios: <Truck className="w-3.5 h-3.5" />,
  facturas: <Receipt className="w-3.5 h-3.5" />,
  entidades: <UserCircle className="w-3.5 h-3.5" />,
  auth: <Shield className="w-3.5 h-3.5" />,
  default: <FileText className="w-3.5 h-3.5" />,
};

const ACTION_COLORS: Record<string, string> = {
  create: "bg-green-50 text-green-700 border-green-200",
  update: "bg-blue-50 text-blue-700 border-blue-200",
  delete: "bg-red-50 text-red-700 border-red-200",
  assign: "bg-purple-50 text-purple-700 border-purple-200",
  revoke: "bg-amber-50 text-amber-700 border-amber-200",
  approve: "bg-emerald-50 text-emerald-700 border-emerald-200",
  reject: "bg-rose-50 text-rose-700 border-rose-200",
  view: "bg-neutral-50 text-neutral-600 border-neutral-200",
  export: "bg-cyan-50 text-cyan-700 border-cyan-200",
  login: "bg-indigo-50 text-indigo-700 border-indigo-200",
  logout: "bg-slate-50 text-slate-600 border-slate-200",
};

const ACTION_LABELS: Record<string, string> = {
  create: "Creó",
  update: "Actualizó",
  delete: "Eliminó",
  assign: "Asignó",
  revoke: "Revocó",
  approve: "Aprobó",
  reject: "Rechazó",
  view: "Vió",
  export: "Exportó",
  login: "Ingresó",
  logout: "Salió",
};

const PAGE_SIZE_OPTIONS = [25, 50, 100, 200];

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Ahora";
  if (diffMins < 60) return `Hace ${diffMins}m`;
  if (diffHours < 24) return `Hace ${diffHours}h`;
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return `Hace ${diffDays}d`;

  return date.toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFullDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleString("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function formatDateForInput(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function SortIcon({ field, currentField, direction }: { field: SortField; currentField: SortField; direction: SortDirection }) {
  if (field !== currentField) {
    return <ChevronsUpDown className="w-3 h-3 text-neutral-300" />;
  }
  return direction === "asc" ? (
    <ChevronUp className="w-3 h-3 text-orange-500" />
  ) : (
    <ChevronDown className="w-3 h-3 text-orange-500" />
  );
}

export function AuditLogTable({ logs }: AuditLogTableProps) {
  // Filtros
  const [searchTerm, setSearchTerm] = useState("");
  const [moduleFilter, setModuleFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Ordenamiento
  const [sortField, setSortField] = useState<SortField>("created_at");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

  // Paginación
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  // Expandir detalles
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Obtener valores únicos para filtros
  const modules = useMemo(() => {
    const unique = [...new Set(logs.map((l) => l.module))];
    return unique.sort();
  }, [logs]);

  const actions = useMemo(() => {
    const unique = [...new Set(logs.map((l) => l.action))];
    return unique.sort();
  }, [logs]);

  const users = useMemo(() => {
    const unique = [...new Set(logs.map((l) => l.user_email).filter(Boolean))] as string[];
    return unique.sort();
  }, [logs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      // Filtro de búsqueda
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matchesSearch =
          log.description.toLowerCase().includes(search) ||
          log.user_email?.toLowerCase().includes(search) ||
          log.user_name?.toLowerCase().includes(search) ||
          log.module.toLowerCase().includes(search) ||
          log.target_id?.toLowerCase().includes(search);
        if (!matchesSearch) return false;
      }

      // Filtro de módulo
      if (moduleFilter !== "all" && log.module !== moduleFilter) return false;

      // Filtro de acción
      if (actionFilter !== "all" && log.action !== actionFilter) return false;

      // Filtro de usuario
      if (userFilter !== "all" && log.user_email !== userFilter) return false;

      // Filtro de fecha desde
      if (dateFrom) {
        const logDate = new Date(log.created_at);
        const fromDate = new Date(dateFrom);
        fromDate.setHours(0, 0, 0, 0);
        if (logDate < fromDate) return false;
      }

      // Filtro de fecha hasta
      if (dateTo) {
        const logDate = new Date(log.created_at);
        const toDate = new Date(dateTo);
        toDate.setHours(23, 59, 59, 999);
        if (logDate > toDate) return false;
      }

      return true;
    });
  }, [logs, searchTerm, moduleFilter, actionFilter, userFilter, dateFrom, dateTo]);

  // Ordenar logs
  const sortedLogs = useMemo(() => {
    const sorted = [...filteredLogs].sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case "created_at":
          comparison = new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
          break;
        case "user_name":
          comparison = (a.user_name || a.user_email || "").localeCompare(b.user_name || b.user_email || "");
          break;
        case "action":
          comparison = a.action.localeCompare(b.action);
          break;
        case "module":
          comparison = a.module.localeCompare(b.module);
          break;
        case "description":
          comparison = a.description.localeCompare(b.description);
          break;
      }

      return sortDirection === "asc" ? comparison : -comparison;
    });

    return sorted;
  }, [filteredLogs, sortField, sortDirection]);

  // Paginar logs
  const paginatedLogs = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedLogs.slice(startIndex, startIndex + pageSize);
  }, [sortedLogs, currentPage, pageSize]);

  // Calcular info de paginación
  const totalPages = Math.ceil(sortedLogs.length / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, sortedLogs.length);

  // Handlers
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setSearchTerm("");
    setModuleFilter("all");
    setActionFilter("all");
    setUserFilter("all");
    setDateFrom("");
    setDateTo("");
    setCurrentPage(1);
  };

  const hasActiveFilters = searchTerm || moduleFilter !== "all" || actionFilter !== "all" || userFilter !== "all" || dateFrom || dateTo;

  return (
    <div>
      {/* Filtros - Primera fila */}
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        {/* Búsqueda */}
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
          <input
            type="text"
            placeholder="Buscar por descripción, usuario, módulo, ID..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full h-8 pl-8 pr-3 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none"
          />
        </div>

        {/* Filtro usuario */}
        <select
          value={userFilter}
          onChange={(e) => {
            setUserFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none bg-white min-w-[140px]"
        >
          <option value="all">Todos los usuarios</option>
          {users.map((user) => (
            <option key={user} value={user}>
              {user.split("@")[0]}
            </option>
          ))}
        </select>

        {/* Filtro módulo */}
        <select
          value={moduleFilter}
          onChange={(e) => {
            setModuleFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none bg-white min-w-[130px]"
        >
          <option value="all">Todos los módulos</option>
          {modules.map((mod) => (
            <option key={mod} value={mod}>
              {mod}
            </option>
          ))}
        </select>

        {/* Filtro acción */}
        <select
          value={actionFilter}
          onChange={(e) => {
            setActionFilter(e.target.value);
            setCurrentPage(1);
          }}
          className="h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none bg-white min-w-[130px]"
        >
          <option value="all">Todas las acciones</option>
          {actions.map((act) => (
            <option key={act} value={act}>
              {ACTION_LABELS[act] || act}
            </option>
          ))}
        </select>
      </div>

      {/* Filtros - Segunda fila (fechas) */}
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-neutral-400" />
          <span className="text-xs text-neutral-500">Desde:</span>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => {
              setDateFrom(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none bg-white"
          />
          <span className="text-xs text-neutral-500">Hasta:</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => {
              setDateTo(e.target.value);
              setCurrentPage(1);
            }}
            className="h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none bg-white"
          />
        </div>

        {/* Botón limpiar filtros */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="h-8 px-3 text-sm text-neutral-600 border border-neutral-200 rounded hover:bg-neutral-50 flex items-center gap-1"
          >
            <X className="w-3 h-3" />
            Limpiar filtros
          </button>
        )}

        <div className="flex-1" />

        {/* Selector de tamaño de página */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-neutral-500">Mostrar:</span>
          <select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
            className="h-8 px-2 text-sm border border-neutral-200 rounded focus:border-neutral-400 focus:ring-0 focus:outline-none bg-white"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Tabla */}
      <div className="border border-neutral-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-neutral-50 text-xs font-medium text-neutral-500 uppercase tracking-wide">
              <tr>
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => handleSort("created_at")}
                >
                  <div className="flex items-center gap-1">
                    Hora
                    <SortIcon field="created_at" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => handleSort("user_name")}
                >
                  <div className="flex items-center gap-1">
                    Usuario
                    <SortIcon field="user_name" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => handleSort("action")}
                >
                  <div className="flex items-center gap-1">
                    Acción
                    <SortIcon field="action" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => handleSort("module")}
                >
                  <div className="flex items-center gap-1">
                    Módulo
                    <SortIcon field="module" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th
                  className="px-3 py-2 text-left cursor-pointer hover:bg-neutral-100 select-none"
                  onClick={() => handleSort("description")}
                >
                  <div className="flex items-center gap-1">
                    Descripción
                    <SortIcon field="description" currentField={sortField} direction={sortDirection} />
                  </div>
                </th>
                <th className="px-3 py-2 text-center w-10"></th>
              </tr>
            </thead>
            <tbody>
              {paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-neutral-500">
                    No se encontraron registros
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="border-b border-neutral-100 hover:bg-neutral-50 cursor-pointer"
                      onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                    >
                      <td className="px-3 py-2 text-neutral-500 whitespace-nowrap" title={formatFullDate(log.created_at)}>
                        {formatRelativeTime(log.created_at)}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-medium text-neutral-600">
                            {(log.user_name || log.user_email || "?").charAt(0).toUpperCase()}
                          </div>
                          <span className="truncate max-w-[120px] sm:max-w-[180px]" title={log.user_email || undefined}>
                            {log.user_name || log.user_email?.split("@")[0] || "Sistema"}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-2">
                        <Badge className={`text-xs border ${ACTION_COLORS[log.action] || ACTION_COLORS.view}`}>
                          {ACTION_LABELS[log.action] || log.action}
                        </Badge>
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1.5 text-neutral-600">
                          {MODULE_ICONS[log.module] || MODULE_ICONS.default}
                          <span className="capitalize">{log.module}</span>
                        </div>
                      </td>
                      <td className="px-3 py-2 text-neutral-900">
                        <span className="truncate block max-w-[200px] sm:max-w-[300px] lg:max-w-[400px]" title={log.description}>
                          {log.description}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        {expandedId === log.id ? (
                          <ChevronUp className="w-4 h-4 text-neutral-400" />
                        ) : (
                          <ChevronDown className="w-4 h-4 text-neutral-400" />
                        )}
                      </td>
                    </tr>
                    {/* Fila expandida con detalles */}
                    {expandedId === log.id && (
                      <tr className="bg-neutral-50">
                        <td colSpan={6} className="px-3 py-3">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                            <div>
                              <span className="font-medium text-neutral-500">Fecha completa:</span>
                              <p className="text-neutral-700">{formatFullDate(log.created_at)}</p>
                            </div>
                            {log.user_email && (
                              <div>
                                <span className="font-medium text-neutral-500">Email:</span>
                                <p className="text-neutral-700">{log.user_email}</p>
                              </div>
                            )}
                            {log.target_type && (
                              <div>
                                <span className="font-medium text-neutral-500">Objeto:</span>
                                <p className="text-neutral-700">
                                  {log.target_type}
                                  {log.target_id && ` #${log.target_id}`}
                                </p>
                              </div>
                            )}
                            {log.new_value && Object.keys(log.new_value).length > 0 && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-neutral-500">Datos:</span>
                                <pre className="text-neutral-700 bg-white border border-neutral-200 rounded p-2 mt-1 overflow-auto max-h-32 text-xs">
                                  {JSON.stringify(log.new_value, null, 2)}
                                </pre>
                              </div>
                            )}
                            {log.old_value && Object.keys(log.old_value).length > 0 && (
                              <div className="sm:col-span-2">
                                <span className="font-medium text-neutral-500">Valor anterior:</span>
                                <pre className="text-neutral-700 bg-white border border-neutral-200 rounded p-2 mt-1 overflow-auto max-h-32 text-xs">
                                  {JSON.stringify(log.old_value, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Paginación */}
      <div className="mt-3 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="text-xs text-neutral-500">
          Mostrando {sortedLogs.length > 0 ? startItem : 0} - {endItem} de {sortedLogs.length} registros
          {sortedLogs.length !== logs.length && (
            <span className="text-neutral-400"> (filtrado de {logs.length} total)</span>
          )}
        </div>

        {totalPages > 1 && (
          <div className="flex items-center gap-1">
            {/* Primera página */}
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="h-8 w-8 flex items-center justify-center border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Primera página"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>

            {/* Página anterior */}
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="h-8 w-8 flex items-center justify-center border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Página anterior"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            {/* Números de página */}
            <div className="flex items-center gap-1 mx-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`h-8 min-w-8 px-2 flex items-center justify-center border rounded text-sm ${
                      currentPage === pageNum
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            {/* Página siguiente */}
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 flex items-center justify-center border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Página siguiente"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {/* Última página */}
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="h-8 w-8 flex items-center justify-center border border-neutral-200 rounded hover:bg-neutral-50 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Última página"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
