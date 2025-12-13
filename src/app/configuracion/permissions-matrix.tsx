"use client";

import { useState, useTransition, useOptimistic } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { ChevronDown, ChevronUp, X } from "lucide-react";
import { 
  PERMISSION_CATEGORIES, 
  PERMISSION_LABELS, 
  ALL_PERMISSIONS,
  Permission 
} from "@/lib/permissions";
import { updateUserPermission, removeUserFromOrg } from "./actions";

interface User {
  id: string;
  email: string;
  full_name: string | null;
  image_url: string | null;
  permissions: Record<string, boolean>;
  is_kalia: boolean;
}

interface PermissionsMatrixProps {
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

// Componente para checkbox individual con estado optimista
function PermissionCheckbox({
  userId,
  permission,
  initialValue,
  disabled,
}: {
  userId: string;
  permission: Permission;
  initialValue: boolean;
  disabled?: boolean;
}) {
  const [isPending, startTransition] = useTransition();
  const [optimisticValue, setOptimisticValue] = useOptimistic(initialValue);

  const handleChange = (checked: boolean) => {
    startTransition(async () => {
      setOptimisticValue(checked);
      const result = await updateUserPermission(userId, permission, checked);
      if (result.error) {
        setOptimisticValue(!checked);
        console.error(result.error);
      }
    });
  };

  return (
    <Checkbox
      checked={optimisticValue}
      onCheckedChange={handleChange}
      disabled={disabled || isPending}
      size="sm"
    />
  );
}

// Fila de usuario en la matriz
function UserRow({ 
  user, 
  onRemove 
}: { 
  user: User; 
  onRemove: (userId: string, email: string) => void;
}) {
  const [isPending, startTransition] = useTransition();
  const hasAnyPermission = ALL_PERMISSIONS.some(p => user.permissions[p]);

  const handleRemove = () => {
    if (confirm(`¿Quitar todos los permisos de ${user.email}?`)) {
      startTransition(() => {
        onRemove(user.id, user.email);
      });
    }
  };

  return (
    <tr className="border-b border-neutral-100 last:border-0 hover:bg-neutral-50/50">
      {/* Usuario */}
      <td className="px-3 py-3 sticky left-0 bg-white z-10 border-r border-neutral-200">
        <div className="flex items-center gap-2 min-w-[160px]">
          {user.image_url ? (
            <img 
              src={user.image_url} 
              alt={user.full_name || user.email}
              className="w-7 h-7 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600 shrink-0">
              {getInitials(user.full_name, user.email)}
            </div>
          )}
          <div className="min-w-0">
            <div className="font-medium text-neutral-900 text-sm truncate">
              {user.full_name || user.email?.split("@")[0]}
            </div>
            <div className="text-[11px] text-neutral-400 truncate">
              {user.email}
            </div>
          </div>
          {user.is_kalia && (
            <span className="text-orange-500 text-xs shrink-0">★</span>
          )}
        </div>
      </td>

      {/* Permisos por categoría */}
      {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => (
        <td 
          key={catKey} 
          className="px-2 py-3 border-l border-neutral-200"
        >
          <div className="flex gap-3 justify-center">
            {category.permissions.map((permission) => (
              <PermissionCheckbox
                key={permission}
                userId={user.id}
                permission={permission as Permission}
                initialValue={user.permissions[permission] || false}
                disabled={user.is_kalia}
              />
            ))}
          </div>
        </td>
      ))}

      {/* Acciones */}
      <td className="px-3 py-3 border-l border-neutral-200 text-center">
        {!user.is_kalia && hasAnyPermission && (
          <button
            onClick={handleRemove}
            disabled={isPending}
            className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 whitespace-nowrap"
          >
            Quitar
          </button>
        )}
      </td>
    </tr>
  );
}

// Card de usuario para vista mobile
function UserCard({ 
  user, 
  onRemove,
  isExpanded,
  onToggle,
}: { 
  user: User; 
  onRemove: (userId: string, email: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const [isPending, startTransition] = useTransition();
  const hasAnyPermission = ALL_PERMISSIONS.some(p => user.permissions[p]);
  const activePermissionsCount = ALL_PERMISSIONS.filter(p => user.permissions[p]).length;

  const handleRemove = () => {
    if (confirm(`¿Quitar todos los permisos de ${user.email}?`)) {
      startTransition(() => {
        onRemove(user.id, user.email);
      });
    }
  };

  return (
    <div className="border border-neutral-200 rounded bg-white">
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-3 flex items-center justify-between hover:bg-neutral-50"
      >
        <div className="flex items-center gap-2 min-w-0">
          {user.image_url ? (
            <img 
              src={user.image_url} 
              alt={user.full_name || user.email}
              className="w-8 h-8 rounded-full object-cover shrink-0"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-neutral-200 flex items-center justify-center text-xs font-medium text-neutral-600 shrink-0">
              {getInitials(user.full_name, user.email)}
            </div>
          )}
          <div className="min-w-0 text-left">
            <div className="font-medium text-neutral-900 text-sm truncate flex items-center gap-1">
              {user.full_name || user.email?.split("@")[0]}
              {user.is_kalia && <span className="text-orange-500 text-xs">★</span>}
            </div>
            <div className="text-xs text-neutral-400 truncate">
              {user.email}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded">
            {activePermissionsCount} permisos
          </span>
          {isExpanded ? (
            <ChevronUp className="w-4 h-4 text-neutral-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-neutral-400" />
          )}
        </div>
      </button>

      {/* Permisos expandidos */}
      {isExpanded && (
        <div className="border-t border-neutral-200 px-3 py-3 space-y-4">
          {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => (
            <div key={catKey}>
              <div className="text-xs font-medium text-neutral-500 uppercase tracking-wide mb-2">
                {category.label}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {category.permissions.map((permission) => (
                  <label 
                    key={permission}
                    className="flex items-center gap-2 text-xs cursor-pointer"
                  >
                    <PermissionCheckbox
                      userId={user.id}
                      permission={permission as Permission}
                      initialValue={user.permissions[permission] || false}
                      disabled={user.is_kalia}
                    />
                    <span className={user.permissions[permission] ? "text-neutral-900" : "text-neutral-400"}>
                      {PERMISSION_LABELS[permission]}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          ))}

          {/* Botón eliminar */}
          {!user.is_kalia && hasAnyPermission && (
            <div className="pt-2 border-t border-neutral-100">
              <button
                onClick={handleRemove}
                disabled={isPending}
                className="text-xs text-red-500 hover:text-red-700 transition-colors disabled:opacity-50 flex items-center gap-1"
              >
                <X className="w-3 h-3" />
                Quitar todos los permisos
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function PermissionsMatrix({ users }: PermissionsMatrixProps) {
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [expandedUserId, setExpandedUserId] = useState<string | null>(null);

  const handleRemove = async (userId: string, email: string) => {
    const result = await removeUserFromOrg(userId, email);
    if (result.error) {
      setMessage({ type: "error", text: result.error });
    } else {
      setMessage({ type: "success", text: `Permisos removidos de ${email}` });
    }
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="space-y-4">
      {/* Mensaje de estado */}
      {message && (
        <div className={`p-2 rounded text-xs ${
          message.type === "success" 
            ? "bg-green-50 text-green-700 border border-green-200" 
            : "bg-red-50 text-red-700 border border-red-200"
        }`}>
          {message.text}
        </div>
      )}

      {/* Vista Mobile - Cards */}
      <div className="md:hidden space-y-2">
        {users.length === 0 ? (
          <div className="text-center text-neutral-400 py-8 text-sm">
            No hay usuarios con permisos asignados
          </div>
        ) : (
          users.map((user) => (
            <UserCard 
              key={user.id} 
              user={user} 
              onRemove={handleRemove}
              isExpanded={expandedUserId === user.id}
              onToggle={() => setExpandedUserId(expandedUserId === user.id ? null : user.id)}
            />
          ))
        )}
      </div>

      {/* Vista Desktop - Matriz */}
      <div className="hidden md:block border border-neutral-200 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              {/* Fila de categorías */}
              <tr className="bg-neutral-100 border-b border-neutral-200">
                <th className="px-3 py-2 text-left font-semibold text-neutral-700 uppercase tracking-wide sticky left-0 bg-neutral-100 z-10 border-r border-neutral-200 min-w-[180px]">
                  Usuario
                </th>
                {Object.entries(PERMISSION_CATEGORIES).map(([key, cat]) => (
                  <th 
                    key={key}
                    className="px-2 py-2 text-center font-semibold text-neutral-700 uppercase tracking-wide border-l border-neutral-200"
                  >
                    <div className="flex flex-col items-center">
                      <span>{cat.label}</span>
                      <span className="text-[10px] text-neutral-400 font-normal mt-0.5">
                        {cat.permissions.length} permisos
                      </span>
                    </div>
                  </th>
                ))}
                <th className="px-3 py-2 text-center font-semibold text-neutral-700 uppercase tracking-wide border-l border-neutral-200 w-16">
                  
                </th>
              </tr>
              
              {/* Fila de títulos verticales */}
              <tr className="bg-neutral-50 border-b border-neutral-200">
                <th className="sticky left-0 bg-neutral-50 z-10 border-r border-neutral-200"></th>
                {Object.entries(PERMISSION_CATEGORIES).map(([catKey, category]) => (
                  <th 
                    key={catKey}
                    className="px-2 py-2 border-l border-neutral-200"
                  >
                    <div className="flex gap-3 justify-center">
                      {category.permissions.map((permission) => (
                        <div 
                          key={permission}
                          className="flex flex-col items-center w-4"
                          title={PERMISSION_LABELS[permission]}
                        >
                          <span 
                            className="text-[8px] text-neutral-500 font-medium tracking-tight whitespace-nowrap"
                            style={{ 
                              writingMode: 'vertical-rl', 
                              transform: 'rotate(180deg)',
                              height: '50px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end'
                            }}
                          >
                            {PERMISSION_LABELS[permission]}
                          </span>
                        </div>
                      ))}
                    </div>
                  </th>
                ))}
                <th className="border-l border-neutral-200"></th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={Object.keys(PERMISSION_CATEGORIES).length + 2} className="px-3 py-8 text-center text-neutral-400">
                    No hay usuarios con permisos asignados
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <UserRow 
                    key={user.id} 
                    user={user} 
                    onRemove={handleRemove}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Leyenda compacta - solo desktop */}
      <div className="hidden md:block text-[10px] text-neutral-500 space-y-1">
        {Object.entries(PERMISSION_CATEGORIES).map(([key, cat]) => (
          <div key={key}>
            <span className="font-semibold text-neutral-600">{cat.label}:</span>{" "}
            {cat.permissions.map(p => PERMISSION_LABELS[p]).join(", ")}
          </div>
        ))}
      </div>
    </div>
  );
}
