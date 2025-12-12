-- =============================================================================
-- MIGRACIÓN: Roles de usuarios para Mercure
-- Ejecutar en Supabase SQL Editor
-- =============================================================================

-- 1. Crear tabla de roles directamente en public (más simple para Supabase API)
CREATE TABLE IF NOT EXISTS public.mercure_user_roles (
  id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('admin', 'administrativo', 'auxiliar_deposito', 'chofer', 'atencion_cliente', 'contabilidad', 'viewer')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- 2. Índices
CREATE INDEX IF NOT EXISTS idx_mercure_user_roles_user_id ON public.mercure_user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_mercure_user_roles_role ON public.mercure_user_roles(role);
CREATE INDEX IF NOT EXISTS idx_mercure_user_roles_active ON public.mercure_user_roles(is_active) WHERE is_active = true;

-- 3. Trigger para updated_at
CREATE OR REPLACE FUNCTION public.set_mercure_user_roles_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_mercure_user_roles_updated_at ON public.mercure_user_roles;
CREATE TRIGGER set_mercure_user_roles_updated_at
  BEFORE UPDATE ON public.mercure_user_roles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_mercure_user_roles_updated_at();

-- 4. Habilitar RLS
ALTER TABLE public.mercure_user_roles ENABLE ROW LEVEL SECURITY;

-- 5. Policies
-- Service role tiene acceso total
DROP POLICY IF EXISTS "Service role full access" ON public.mercure_user_roles;
CREATE POLICY "Service role full access"
  ON public.mercure_user_roles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuarios autenticados pueden ver su propio rol
DROP POLICY IF EXISTS "Users can view own role" ON public.mercure_user_roles;
CREATE POLICY "Users can view own role"
  ON public.mercure_user_roles
  FOR SELECT
  TO authenticated
  USING (
    user_id IN (
      SELECT id FROM public.users 
      WHERE clerk_id = auth.jwt() ->> 'sub'
    )
  );

-- Admins pueden ver todos los roles (usuarios con rol admin en la misma tabla)
DROP POLICY IF EXISTS "Admins can view all roles" ON public.mercure_user_roles;
CREATE POLICY "Admins can view all roles"
  ON public.mercure_user_roles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mercure_user_roles ur
      JOIN public.users u ON ur.user_id = u.id
      WHERE u.clerk_id = auth.jwt() ->> 'sub'
      AND ur.role = 'admin'
      AND ur.is_active = true
    )
  );

-- 6. Permisos
GRANT SELECT ON public.mercure_user_roles TO authenticated;
GRANT ALL ON public.mercure_user_roles TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.mercure_user_roles_id_seq TO service_role;

-- 7. Comentarios
COMMENT ON TABLE public.mercure_user_roles IS 'Roles específicos de Mercure para cada usuario';
COMMENT ON COLUMN public.mercure_user_roles.role IS 'Rol del usuario: admin, administrativo, auxiliar_deposito, chofer, atencion_cliente, contabilidad, viewer';
COMMENT ON COLUMN public.mercure_user_roles.is_active IS 'Si el rol está activo. Desactivar en lugar de borrar para historial';


