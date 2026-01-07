-- =============================================================================
-- MIGRACIÓN: Logs de auditoría de usuarios para Mercure
-- Sistema de tracking de acciones de usuarios
-- =============================================================================

-- 1. Crear tabla de logs de auditoría
CREATE TABLE IF NOT EXISTS public.mercure_audit_logs (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  user_email TEXT,
  user_name TEXT,
  action TEXT NOT NULL,
  module TEXT NOT NULL,
  description TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  old_value JSONB,
  new_value JSONB,
  metadata JSONB DEFAULT '{}',
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_mercure_audit_logs_user_id ON public.mercure_audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_mercure_audit_logs_action ON public.mercure_audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_mercure_audit_logs_module ON public.mercure_audit_logs(module);
CREATE INDEX IF NOT EXISTS idx_mercure_audit_logs_created_at ON public.mercure_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mercure_audit_logs_target ON public.mercure_audit_logs(target_type, target_id);

-- 3. Habilitar RLS
ALTER TABLE public.mercure_audit_logs ENABLE ROW LEVEL SECURITY;

-- 4. Policies
-- Service role tiene acceso total
DROP POLICY IF EXISTS "Service role full access audit_logs" ON public.mercure_audit_logs;
CREATE POLICY "Service role full access audit_logs"
  ON public.mercure_audit_logs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Usuarios con permiso configuracion pueden ver todos los logs
DROP POLICY IF EXISTS "Config users can view all logs" ON public.mercure_audit_logs;
CREATE POLICY "Config users can view all logs"
  ON public.mercure_audit_logs
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

-- 5. Permisos de tabla
GRANT SELECT ON public.mercure_audit_logs TO authenticated;
GRANT ALL ON public.mercure_audit_logs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.mercure_audit_logs_id_seq TO service_role;

-- 6. Comentarios
COMMENT ON TABLE public.mercure_audit_logs IS 'Logs de auditoría de acciones de usuarios en Mercure';
COMMENT ON COLUMN public.mercure_audit_logs.action IS 'Tipo de acción: create, update, delete, login, logout, view, export, etc.';
COMMENT ON COLUMN public.mercure_audit_logs.module IS 'Módulo donde ocurrió: configuracion, recepcion, envios, facturas, etc.';
COMMENT ON COLUMN public.mercure_audit_logs.description IS 'Descripción legible de la acción realizada';
COMMENT ON COLUMN public.mercure_audit_logs.target_type IS 'Tipo de entidad afectada: shipment, entity, invoice, permission, etc.';
COMMENT ON COLUMN public.mercure_audit_logs.target_id IS 'ID de la entidad afectada';
COMMENT ON COLUMN public.mercure_audit_logs.old_value IS 'Valor anterior (para updates)';
COMMENT ON COLUMN public.mercure_audit_logs.new_value IS 'Nuevo valor (para creates/updates)';












