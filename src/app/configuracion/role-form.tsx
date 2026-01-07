"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ROLES } from "@/lib/permissions";
import { assignRole, removeRole } from "./actions";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  role: string | null;
  is_kalia: boolean;
}

interface RoleFormProps {
  users: User[];
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    const parts = name.split(" ");
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
    }
    return name[0]?.toUpperCase() || "?";
  }
  return email?.[0]?.toUpperCase() || "?";
}

export function RoleForm({ users }: RoleFormProps) {
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleAssign = () => {
    if (!selectedUser || !selectedRole) return;

    const formData = new FormData();
    formData.append("userId", selectedUser.id);
    formData.append("email", selectedUser.email);
    formData.append("role", selectedRole);

    startTransition(async () => {
      const result = await assignRole(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Rol asignado a ${selectedUser.email}` });
        setSelectedUser(null);
        setSelectedRole("");
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  const handleRemove = (user: User) => {
    const formData = new FormData();
    formData.append("userId", user.id);
    formData.append("email", user.email);

    startTransition(async () => {
      const result = await removeRole(formData);
      if (result.error) {
        setMessage({ type: "error", text: result.error });
      } else {
        setMessage({ type: "success", text: `Rol removido de ${user.email}` });
      }
      setTimeout(() => setMessage(null), 3000);
    });
  };

  // Filtrar usuarios que no son @kalia.app (no se pueden modificar)
  const editableUsers = users.filter(u => !u.is_kalia);

  return (
    <div className="space-y-4">
      {/* Mensaje de estado */}
      {message && (
        <div className={`p-3 rounded text-sm ${
          message.type === "success" 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Formulario de asignación */}
      <div className="bg-neutral-50 border border-neutral-200 rounded p-4">
        <h3 className="text-sm font-medium text-neutral-900 mb-3">Asignar rol a usuario</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Selector de usuario */}
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">Usuario</label>
            <select
              value={selectedUser?.id || ""}
              onChange={(e) => {
                const user = editableUsers.find(u => u.id === e.target.value);
                setSelectedUser(user || null);
              }}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
            >
              <option value="">Seleccionar usuario...</option>
              {editableUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.full_name || u.email?.split("@")[0]} ({u.email})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de rol */}
          <div>
            <label className="text-xs font-medium text-neutral-600 mb-1 block">Rol</label>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="w-full h-9 px-3 text-sm border border-neutral-200 rounded bg-white focus:border-neutral-400 focus:outline-none"
            >
              <option value="">Seleccionar rol...</option>
              {Object.entries(ROLES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          {/* Botón de asignar */}
          <div className="flex items-end">
            <Button
              onClick={handleAssign}
              disabled={!selectedUser || !selectedRole || isPending}
              className="h-9 px-4 text-sm bg-orange-500 hover:bg-orange-600 text-white disabled:opacity-50"
            >
              {isPending ? "Guardando..." : "Asignar rol"}
            </Button>
          </div>
        </div>
      </div>

      {/* Lista de usuarios con roles asignados */}
      <div>
        <h3 className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
          Usuarios con roles asignados
        </h3>
        <div className="border border-neutral-200 rounded overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Usuario</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Rol actual</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-neutral-500 uppercase">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {editableUsers.filter(u => u.role).length === 0 ? (
                <tr>
                  <td colSpan={3} className="px-3 py-6 text-center text-neutral-400">
                    No hay usuarios con roles asignados
                  </td>
                </tr>
              ) : (
                editableUsers.filter(u => u.role).map(u => (
                  <tr key={u.id} className="border-b border-neutral-100 last:border-0">
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-2">
                        {u.image_url ? (
                          <img 
                            src={u.image_url} 
                            alt={u.full_name || u.email}
                            className="w-6 h-6 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-6 h-6 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600">
                            {getInitials(u.full_name, u.email)}
                          </div>
                        )}
                        <div>
                          <span className="font-medium text-neutral-900 text-sm">
                            {u.full_name || u.email?.split("@")[0]}
                          </span>
                          <span className="text-neutral-400 text-xs ml-2">{u.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2">
                      <Badge variant="info">
                        {ROLES[u.role as keyof typeof ROLES] || u.role}
                      </Badge>
                    </td>
                    <td className="px-3 py-2">
                      <button
                        onClick={() => handleRemove(u)}
                        disabled={isPending}
                        className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50"
                      >
                        Quitar rol
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}












