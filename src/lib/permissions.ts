// Sistema de permisos directo por usuario (sin roles)

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

// Lista plana de todos los permisos (definida estáticamente para compatibilidad con Turbopack)
export const ALL_PERMISSIONS = [
  // Operaciones
  "dashboard",
  "centros",
  "recepcion",
  "consolidacion",
  "envios",
  "arribo",
  "reparto",
  "viajes",
  "vehiculos",
  // Administración
  "entidades",
  "tarifas",
  "cuentas_corrientes",
  "facturas",
  "cobranzas",
  "liquidaciones",
  "pagos",
  "contabilidad",
  // RRHH
  "personal",
  "asistencia",
  "vacaciones",
  "legajos",
  // Marketing
  "whatsapp",
  "campanas",
  "redes",
  "agenda",
  "reportes_mkt",
  // Sistema
  "configuracion",
  "procesos",
] as const;

export type Permission = (typeof ALL_PERMISSIONS)[number];

// Lista completa de permisos disponibles, organizados por categoría
export const PERMISSION_CATEGORIES = {
  operaciones: {
    label: "Operaciones",
    permissions: ["dashboard", "centros", "recepcion", "consolidacion", "envios", "arribo", "reparto", "viajes", "vehiculos"] as const,
  },
  administracion: {
    label: "Administración",
    permissions: ["entidades", "tarifas", "cuentas_corrientes", "facturas", "cobranzas", "liquidaciones", "pagos", "contabilidad"] as const,
  },
  rrhh: {
    label: "RRHH",
    permissions: ["personal", "asistencia", "vacaciones", "legajos"] as const,
  },
  marketing: {
    label: "Marketing",
    permissions: ["whatsapp", "campanas", "redes", "agenda", "reportes_mkt"] as const,
  },
  sistema: {
    label: "Sistema",
    permissions: ["configuracion", "procesos"] as const,
  },
} as const;

// Labels para cada permiso (cortos para UI compacta)
export const PERMISSION_LABELS: Record<string, string> = {
  // Operaciones
  dashboard: "Dash",
  centros: "Centros",
  recepcion: "Recep",
  consolidacion: "Consol",
  envios: "Envíos",
  arribo: "Arribo",
  reparto: "Reparto",
  viajes: "Viajes",
  vehiculos: "Vehíc",
  // Administración
  entidades: "Entid",
  tarifas: "Tarifas",
  cuentas_corrientes: "Cta Cte",
  facturas: "Fact",
  cobranzas: "Cobr",
  liquidaciones: "Liq",
  pagos: "Pagos",
  contabilidad: "Contab",
  // RRHH
  personal: "Pers",
  asistencia: "Asist",
  vacaciones: "Vac",
  legajos: "Leg",
  // Marketing
  whatsapp: "WA",
  campanas: "Camp",
  redes: "Redes",
  agenda: "Agenda",
  reportes_mkt: "Rep Mkt",
  // Sistema
  configuracion: "Config",
  procesos: "Proc",
};

// Mapeo de rutas a permisos
export const ROUTE_PERMISSIONS: Record<string, Permission> = {
  "/": "dashboard",
  "/operaciones/centros": "centros",
  "/operaciones/kanban": "procesos",
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

// Tipo para permisos del usuario (mapa de permiso -> tiene acceso)
export type UserPermissions = Record<string, boolean>;

// Verificar si un usuario tiene permiso (basado en sus permisos directos)
export function hasPermission(
  userPermissions: UserPermissions | null | undefined,
  email: string | null | undefined,
  permission: Permission
): boolean {
  // Super admins tienen acceso a todo
  if (isSuperAdmin(email)) return true;
  
  // Si no hay permisos, no tiene acceso
  if (!userPermissions) return false;
  
  // Verificar permiso directo
  return userPermissions[permission] === true;
}

// Verificar si puede acceder a una ruta específica
export function canAccessRoute(
  userPermissions: UserPermissions | null | undefined,
  email: string | null | undefined,
  pathname: string
): boolean {
  // Super admins tienen acceso a todo
  if (isSuperAdmin(email)) return true;
  
  // Buscar el permiso para la ruta
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
  
  return hasPermission(userPermissions, email, permission);
}

// Verificar si puede acceder a configuración
export function canAccessConfig(
  userPermissions: UserPermissions | null | undefined,
  email: string | null | undefined
): boolean {
  return hasPermission(userPermissions, email, "configuracion");
}

// Obtener módulos accesibles basado en permisos directos
export function getAccessibleModules(
  userPermissions: UserPermissions | null | undefined,
  email: string | null | undefined
): Permission[] {
  if (isSuperAdmin(email)) {
    return [...ALL_PERMISSIONS];
  }
  
  if (!userPermissions) return [];
  
  return ALL_PERMISSIONS.filter(
    (permission) => userPermissions[permission] === true
  );
}

// Obtener rutas accesibles basado en permisos
export function getAccessibleRoutes(
  userPermissions: UserPermissions | null | undefined,
  email: string | null | undefined
): string[] {
  const accessibleModules = getAccessibleModules(userPermissions, email);
  
  return Object.entries(ROUTE_PERMISSIONS)
    .filter(([, permission]) => accessibleModules.includes(permission))
    .map(([route]) => route);
}

// ============================================================================
// LEGACY: Mantener compatibilidad con sistema de roles (deprecated)
// TODO: Eliminar cuando la migración esté completa
// ============================================================================

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

// Permisos por rol (para migración de datos)
export const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  super_admin: ALL_PERMISSIONS,
  admin: ALL_PERMISSIONS,
  administrativo: [
    "dashboard", "centros", "recepcion", "consolidacion", "envios", "arribo", "reparto", "viajes", "vehiculos",
    "entidades", "tarifas", "cuentas_corrientes", "facturas", "cobranzas", "liquidaciones", "pagos", "contabilidad",
    "procesos"
  ],
  auxiliar_deposito: ["dashboard", "centros", "recepcion", "consolidacion", "envios", "arribo", "procesos"],
  chofer: ["dashboard", "centros", "envios", "reparto", "viajes", "procesos"],
  atencion_cliente: ["dashboard", "entidades", "whatsapp", "campanas", "redes", "agenda", "reportes_mkt", "procesos"],
  contabilidad: ["dashboard", "cuentas_corrientes", "facturas", "cobranzas", "liquidaciones", "pagos", "contabilidad", "procesos"],
  viewer: ["dashboard", "procesos"],
};
