-- =============================================================================
-- MIGRACIÓN: Permisos individuales por usuario para Mercure
-- Sistema de matriz de accesos directos sin roles
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- 1. Crear tabla de permisos por usuario
CREATE TABLE IF NOT EXISTS public.mercure_user_permissions (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  permission TEXT NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, permission)
);

-- 2. Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_mercure_user_permissions_user_id ON public.mercure_user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_mercure_user_permissions_permission ON public.mercure_user_permissions(permission);
CREATE INDEX IF NOT EXISTS idx_mercure_user_permissions_has_access ON public.mercure_user_permissions(has_access) WHERE has_access = true;

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_mercure_user_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mercure_user_permissions_updated_at ON public.mercure_user_permissions;
CREATE TRIGGER set_mercure_user_permissions_updated_at
  BEFORE UPDATE ON public.mercure_user_permissions
  FOR EACH ROW
  EXECUTE FUNCTION public.set_mercure_user_permissions_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.mercure_user_permissions ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Service role tiene acceso total
DROP POLICY IF EXISTS "Service role full access permissions" ON public.mercure_user_permissions;
CREATE POLICY "Service role full access permissions"
  ON public.mercure_user_permissions
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuarios autenticados pueden ver sus propios permisos
DROP POLICY IF EXISTS "Users can view own permissions" ON public.mercure_user_permissions;
CREATE POLICY "Users can view own permissions"
  ON public.mercure_user_permissions
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users 
      WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

-- Admins pueden ver todos los permisos
DROP POLICY IF EXISTS "Admins can view all permissions" ON public.mercure_user_permissions;
CREATE POLICY "Admins can view all permissions"
  ON public.mercure_user_permissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mercure_user_permissions up
      JOIN public.users u ON up.user_id = u.id
      WHERE u.clerk_id = auth.jwt() ->> 'sub'
      AND up.permission = 'configuracion'
      AND up.has_access = true
    )
  );

-- 6. Permisos de tabla
GRANT SELECT ON public.mercure_user_permissions TO authenticated;
GRANT ALL ON public.mercure_user_permissions TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.mercure_user_permissions_id_seq TO service_role;

-- 7. Comentarios
COMMENT ON TABLE public.mercure_user_permissions IS 'Permisos específicos de Mercure para cada usuario - sistema de matriz de accesos';
COMMENT ON COLUMN public.mercure_user_permissions.permission IS 'Nombre del módulo/permiso: dashboard, recepcion, envios, viajes, etc.';
COMMENT ON COLUMN public.mercure_user_permissions.has_access IS 'Si el usuario tiene acceso a este módulo';

-- 8. Lista de permisos válidos (para referencia)
-- dashboard, centros, recepcion, consolidacion, envios, arribo, reparto, viajes, vehiculos, entidades
-- tarifas, cuentas_corrientes, facturas, cobranzas, liquidaciones, pagos, contabilidad
-- personal, asistencia, vacaciones, legajos
-- whatsapp, campanas, redes, agenda, reportes_mkt
-- configuracion, procesos


