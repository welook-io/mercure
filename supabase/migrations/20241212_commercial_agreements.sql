-- Migración: Workflow de Acuerdos Comerciales
-- Implementa el circuito de control: Comercial → Fernando → Administrativo

-- 1. Agregar campos de estado y trazabilidad a entities
ALTER TABLE mercure.entities 
ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS requested_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS approved_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Actualizar entities existentes como 'active' (ya están operando)
UPDATE mercure.entities SET status = 'active' WHERE status IS NULL;

-- 2. Crear tabla de solicitudes de acuerdos comerciales
CREATE TABLE IF NOT EXISTS mercure.commercial_agreement_requests (
  id SERIAL PRIMARY KEY,
  
  -- Datos del cliente (puede ser existente o nuevo)
  entity_id INTEGER REFERENCES mercure.entities(id) ON DELETE SET NULL,
  
  -- Si es cliente nuevo, los datos van aquí
  new_entity_name VARCHAR(255),
  new_entity_cuit VARCHAR(20),
  new_entity_address TEXT,
  new_entity_phone VARCHAR(50),
  new_entity_email VARCHAR(255),
  new_entity_contact_name VARCHAR(255),
  
  -- Condiciones comerciales solicitadas
  requested_tariff_type VARCHAR(20) DEFAULT 'base', -- base, base-10, base-15, base-20, m3, especial
  requested_tariff_modifier DECIMAL(5,2) DEFAULT 0, -- -20, -15, -10, 0, +10
  requested_insurance_rate DECIMAL(6,4) DEFAULT 0.008, -- 8/1000 por defecto
  requested_credit_terms VARCHAR(20) DEFAULT 'contado', -- contado, cuenta_corriente
  requested_credit_days INTEGER DEFAULT 0, -- 0, 5, 15, 30
  requested_payment_method VARCHAR(20) DEFAULT 'transferencia', -- transferencia, cheque, efectivo
  
  -- Justificación del comercial
  justification TEXT NOT NULL,
  expected_monthly_volume TEXT, -- "50 envíos", "100kg/mes", etc.
  
  -- Workflow
  status VARCHAR(20) DEFAULT 'pending_review', -- pending_review, approved, rejected, configured
  
  -- Trazabilidad
  requested_by VARCHAR(255) NOT NULL, -- Clerk user ID del comercial
  requested_at TIMESTAMPTZ DEFAULT NOW(),
  
  reviewed_by VARCHAR(255), -- Fernando
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,
  
  configured_by VARCHAR(255), -- Administrativo
  configured_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_car_status ON mercure.commercial_agreement_requests(status);
CREATE INDEX IF NOT EXISTS idx_car_requested_by ON mercure.commercial_agreement_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_car_entity_id ON mercure.commercial_agreement_requests(entity_id);

-- 4. Agregar campo de trazabilidad a commercial_terms
ALTER TABLE mercure.client_commercial_terms
ADD COLUMN IF NOT EXISTS agreement_request_id INTEGER REFERENCES mercure.commercial_agreement_requests(id),
ADD COLUMN IF NOT EXISTS configured_by VARCHAR(255),
ADD COLUMN IF NOT EXISTS configured_at TIMESTAMPTZ DEFAULT NOW();

-- 5. Crear view para acceso desde Supabase API
CREATE OR REPLACE VIEW public.mercure_commercial_agreement_requests AS
SELECT * FROM mercure.commercial_agreement_requests;

-- Permisos
GRANT SELECT, INSERT, UPDATE ON public.mercure_commercial_agreement_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE ON mercure.commercial_agreement_requests TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE mercure.commercial_agreement_requests_id_seq TO authenticated;

-- Comentario
COMMENT ON TABLE mercure.commercial_agreement_requests IS 
'Solicitudes de acuerdos comerciales con workflow de aprobación. 
Flujo: Comercial (pending_review) → Fernando (approved/rejected) → Administrativo (configured)';


