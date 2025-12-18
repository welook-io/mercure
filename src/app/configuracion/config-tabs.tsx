"use client";

import { useState } from "react";
import { Users, Activity } from "lucide-react";
import { PermissionsMatrix } from "./permissions-matrix";
import { AddUserForm } from "./add-user-form";
import { AuditLogTable } from "./audit-log-table";

interface UserWithPermissions {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  permissions: Record<string, boolean>;
  is_kalia: boolean;
}

interface UserBasic {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  is_kalia: boolean;
}

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

interface ConfigTabsProps {
  usersWithPermissions: UserWithPermissions[];
  availableUsers: UserBasic[];
  auditLogs: AuditLog[];
  isSuper: boolean;
}

type Tab = "permisos" | "actividad";

export function ConfigTabs({ usersWithPermissions, availableUsers, auditLogs, isSuper }: ConfigTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("permisos");

  return (
    <div>
      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-4">
        <button
          onClick={() => setActiveTab("permisos")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "permisos"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Users className="w-4 h-4" />
          Permisos
        </button>
        <button
          onClick={() => setActiveTab("actividad")}
          className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
            activeTab === "actividad"
              ? "border-neutral-900 text-neutral-900"
              : "border-transparent text-neutral-500 hover:text-neutral-700"
          }`}
        >
          <Activity className="w-4 h-4" />
          Registro de Actividad
        </button>
      </div>

      {/* Tab content */}
      {activeTab === "permisos" && (
        <div>
          {/* Panel Super Admin - Agregar usuarios */}
          {isSuper && (
            <div className="mb-6">
              <AddUserForm availableUsers={availableUsers} />
            </div>
          )}

          {/* Matriz de permisos */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-medium text-neutral-500 uppercase tracking-wide">
                Matriz de Permisos ({usersWithPermissions.length} usuarios)
              </h2>
            </div>

            <PermissionsMatrix users={usersWithPermissions} />
          </div>

          {/* Info */}
          <div className="mt-6 bg-neutral-50 border border-neutral-200 rounded p-3">
            <p className="text-xs text-neutral-500">
              Los permisos se aplican individualmente por usuario. Cada toggle controla el acceso a un módulo específico.
            </p>
          </div>
        </div>
      )}

      {activeTab === "actividad" && (
        <div>
          <AuditLogTable logs={auditLogs} />
          
          {/* Info */}
          <div className="mt-4 text-xs text-neutral-400 text-center">
            Mostrando hasta los últimos 1.000 registros • Los logs se generan automáticamente
          </div>
        </div>
      )}
    </div>
  );
}


