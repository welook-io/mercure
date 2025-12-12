// Sistema de permisos basado en roles

// Super admins (acceso total a todo)
export const SUPER_ADMINS = [
  "angelo@kalia.app",
  "uguareschi@gmail.com",
];

// Dominio de super admins (todos los @kalia.app son super admins)
export const SUPER_ADMIN_DOMAIN = "kalia.app";

// ID de la organización Mercure en Clerk (actualizar con el ID real)
export const MERCURE_ORG_ID = process.env.NEXT_PUBLIC_CLERK_MERCURE_ORG_ID || "";

// Verificar si un email es del dominio super admin
export function isSuperAdminDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(`@${SUPER_ADMIN_DOMAIN}`);
}

// Roles disponibles en la organización
export const ROLES = {
  super_admin: "Super Admin",
  admin: "Administrador",
  administrativo: "Administrativo",
  auxiliar_deposito: "Auxiliar Depósito",
  chofer: "Chofer",
  atencion_cliente: "Atención al Cliente",
  contabilidad: "Contabilidad",
  viewer: "Solo lectura",
} as const;

export type Role = keyof typeof ROLES;

// Permisos por módulo
export const PERMISSIONS = {
  // Dashboard
  dashboard: ["super_admin", "admin", "administrativo", "auxiliar_deposito", "chofer", "atencion_cliente", "contabilidad", "viewer"],
  
  // Operaciones
  centros: ["super_admin", "admin", "administrativo", "auxiliar_deposito", "chofer"],
  recepcion: ["super_admin", "admin", "administrativo", "auxiliar_deposito"],
  consolidacion: ["super_admin", "admin", "administrativo", "auxiliar_deposito"],
  envios: ["super_admin", "admin", "administrativo", "auxiliar_deposito", "chofer"],
  arribo: ["super_admin", "admin", "administrativo", "auxiliar_deposito"],
  reparto: ["super_admin", "admin", "administrativo", "chofer"],
  viajes: ["super_admin", "admin", "administrativo", "chofer"],
  vehiculos: ["super_admin", "admin", "administrativo"],
  entidades: ["super_admin", "admin", "administrativo", "atencion_cliente"],
  
  // Tarifas y cotizaciones
  tarifas: ["super_admin", "admin", "administrativo"],
  
  // Administración
  cuentas_corrientes: ["super_admin", "admin", "contabilidad"],
  facturas: ["super_admin", "admin", "contabilidad"],
  cobranzas: ["super_admin", "admin", "contabilidad"],
  liquidaciones: ["super_admin", "admin", "contabilidad"],
  pagos: ["super_admin", "admin", "contabilidad"],
  contabilidad: ["super_admin", "admin", "contabilidad"],
  
  // RRHH
  personal: ["super_admin", "admin"],
  asistencia: ["super_admin", "admin"],
  vacaciones: ["super_admin", "admin"],
  legajos: ["super_admin", "admin"],
  
  // Marketing
  whatsapp: ["super_admin", "admin", "atencion_cliente"],
  campanas: ["super_admin", "admin", "atencion_cliente"],
  redes: ["super_admin", "admin", "atencion_cliente"],
  agenda: ["super_admin", "admin", "atencion_cliente"],
  reportes_mkt: ["super_admin", "admin", "atencion_cliente"],
  
  // Configuración (solo admins)
  configuracion: ["super_admin", "admin"],
  usuarios: ["super_admin", "admin"],
  
  // Procesos (documentación)
  procesos: ["super_admin", "admin", "administrativo", "auxiliar_deposito", "chofer", "atencion_cliente", "contabilidad", "viewer"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// Mapeo de rutas a permisos
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/": "dashboard",
  "/operaciones/centros": "centros",
  "/recepcion": "recepcion",
  "/consolidacion": "consolidacion",
  "/envios": "envios",
  "/arribo": "arribo",
  "/reparto": "reparto",
  "/viajes": "viajes",
  "/vehiculos": "vehiculos",
  "/entidades": "entidades",
  "/tarifas": "tarifas",
  "/facturas": "facturas",
  "/cobranzas": "cobranzas",
  "/cuentas-corrientes": "cuentas_corrientes",
  "/pagos": "pagos",
  "/contabilidad": "contabilidad",
  "/personal": "personal",
  "/asistencia": "asistencia",
  "/vacaciones": "vacaciones",
  "/liquidaciones": "liquidaciones",
  "/legajos": "legajos",
  "/whatsapp": "whatsapp",
  "/campanas": "campanas",
  "/redes": "redes",
  "/agenda": "agenda",
  "/reportes-mkt": "reportes_mkt",
  "/configuracion": "configuracion",
  "/procesos": "procesos",
};

// Verificar si un email es super admin
export function isSuperAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const emailLower = email.toLowerCase();
  // Es super admin si está en la lista O si es del dominio @kalia.app
  return SUPER_ADMINS.includes(emailLower) || isSuperAdminDomain(emailLower);
}

// Verificar si un rol tiene permiso para un módulo
export function hasPermission(
  role: string | null | undefined,
  email: string | null | undefined,
  permission: Permission
): boolean {
  // Super admins tienen acceso a todo
  if (isSuperAdmin(email)) return true;
  
  // Si no hay rol, no tiene acceso
  if (!role) return false;
  
  // Verificar si el rol está en la lista de permisos
  const allowedRoles = PERMISSIONS[permission] as readonly string[];
  return allowedRoles.includes(role);
}

// Verificar si puede acceder a una ruta específica
export function canAccessRoute(
  role: string | null | undefined,
  email: string | null | undefined,
  pathname: string
): boolean {
  // Super admins tienen acceso a todo
  if (isSuperAdmin(email)) return true;
  
  // Buscar el permiso para la ruta
  // Primero intentar match exacto, luego match por prefijo
  let permission = ROUTE_PERMISSIONS[pathname];
  
  if (!permission) {
    // Buscar por prefijo (ej: /recepcion/nueva -> recepcion)
    const matchingRoute = Object.keys(ROUTE_PERMISSIONS).find(
      route => route !== "/" && pathname.startsWith(route)
    );
    if (matchingRoute) {
      permission = ROUTE_PERMISSIONS[matchingRoute];
    }
  }
  
  // Si no hay permiso definido para la ruta, denegar por defecto
  if (!permission) return false;
  
  return hasPermission(role, email, permission);
}

// Verificar si puede acceder a configuración
export function canAccessConfig(
  role: string | null | undefined,
  email: string | null | undefined
): boolean {
  return hasPermission(role, email, "configuracion");
}

// Obtener módulos accesibles para un rol
export function getAccessibleModules(
  role: string | null | undefined,
  email: string | null | undefined
): Permission[] {
  if (isSuperAdmin(email)) {
    return Object.keys(PERMISSIONS) as Permission[];
  }
  
  if (!role) return [];
  
  return (Object.entries(PERMISSIONS) as [Permission, readonly string[]][])
    .filter(([, roles]) => roles.includes(role))
    .map(([permission]) => permission);
}

// Obtener rutas accesibles para un rol
export function getAccessibleRoutes(
  role: string | null | undefined,
  email: string | null | undefined
): string[] {
  const accessibleModules = getAccessibleModules(role, email);
  
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, permission]) => accessibleModules.includes(permission))
    .map(([route]) => route);
}
