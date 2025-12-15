-- Expandir tabla vehicles con más campos
ALTER TABLE mercure.vehicles 
  ADD COLUMN IF NOT EXISTS brand VARCHAR(100),
  ADD COLUMN IF NOT EXISTS model VARCHAR(100),
  ADD COLUMN IF NOT EXISTS vehicle_type VARCHAR(50),
  ADD COLUMN IF NOT EXISTS year INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_date DATE,
  ADD COLUMN IF NOT EXISTS purchase_km INTEGER,
  ADD COLUMN IF NOT EXISTS purchase_condition VARCHAR(20) DEFAULT 'used',
  ADD COLUMN IF NOT EXISTS current_km INTEGER;

-- Crear tabla de eventos de vehículos
CREATE TABLE IF NOT EXISTS mercure.vehicle_events (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES mercure.vehicles(id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL,
  event_date DATE NOT NULL,
  km_at_event INTEGER,
  cost DECIMAL(12,2),
  provider VARCHAR(200),
  description TEXT,
  next_date DATE,
  next_km INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle_id ON mercure.vehicle_events(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_event_date ON mercure.vehicle_events(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_vehicle_events_next_date ON mercure.vehicle_events(next_date) WHERE next_date IS NOT NULL;

-- RLS para vehicle_events
ALTER TABLE mercure.vehicle_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'vehicle_events' AND policyname = 'vehicle_events_all_access'
  ) THEN
    CREATE POLICY vehicle_events_all_access ON mercure.vehicle_events FOR ALL USING (true);
  END IF;
END $$;

-- Crear VIEW en public para la API
DROP VIEW IF EXISTS public.mercure_vehicle_events;
CREATE VIEW public.mercure_vehicle_events AS
  SELECT * FROM mercure.vehicle_events;

-- Permisos para la VIEW
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mercure_vehicle_events TO anon, authenticated;
GRANT USAGE, SELECT ON SEQUENCE mercure.vehicle_events_id_seq TO anon, authenticated;

-- Comentarios
COMMENT ON TABLE mercure.vehicle_events IS 'Historial de eventos por vehículo (compras, services, VTV, etc)';
COMMENT ON COLUMN mercure.vehicle_events.event_type IS 'Tipo: compra, chequeo_km, service, vtv, reparacion, control, seguro, patente, combustible, otro';
COMMENT ON COLUMN mercure.vehicle_events.next_date IS 'Fecha del próximo vencimiento (para recordatorios)';
COMMENT ON COLUMN mercure.vehicle_events.next_km IS 'Km del próximo vencimiento (para recordatorios)';
