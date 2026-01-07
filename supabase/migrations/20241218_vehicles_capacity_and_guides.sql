-- ============================================================================
-- Migración: Campos adicionales de vehículos y tabla de guías por viaje
-- ============================================================================

-- 1. Agregar campos de capacidad y equipamiento a vehicles
ALTER TABLE mercure.vehicles 
  ADD COLUMN IF NOT EXISTS capacity_m3 DECIMAL(8,2),
  ADD COLUMN IF NOT EXISTS pallet_capacity INTEGER,
  ADD COLUMN IF NOT EXISTS max_weight_kg INTEGER,
  ADD COLUMN IF NOT EXISTS has_forklift BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_hydraulic_ramp BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS has_thermal_control BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS image_url TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT;

COMMENT ON COLUMN mercure.vehicles.capacity_m3 IS 'Capacidad en metros cúbicos';
COMMENT ON COLUMN mercure.vehicles.pallet_capacity IS 'Cantidad de pallets que puede transportar';
COMMENT ON COLUMN mercure.vehicles.max_weight_kg IS 'Peso máximo de carga en kilogramos';
COMMENT ON COLUMN mercure.vehicles.has_forklift IS 'Tiene autoelevador';
COMMENT ON COLUMN mercure.vehicles.has_hydraulic_ramp IS 'Tiene pala hidráulica';
COMMENT ON COLUMN mercure.vehicles.has_thermal_control IS 'Tiene control térmico (furgón térmico)';
COMMENT ON COLUMN mercure.vehicles.image_url IS 'URL de imagen del vehículo';

-- 2. Crear tabla de guías por viaje (permite múltiples guías/acompañantes)
CREATE TABLE IF NOT EXISTS mercure.trip_guides (
  id SERIAL PRIMARY KEY,
  trip_id INTEGER NOT NULL REFERENCES mercure.trips(id) ON DELETE CASCADE,
  guide_name VARCHAR(255) NOT NULL,
  guide_dni VARCHAR(20),
  guide_phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'acompanante', -- 'conductor', 'acompanante', 'auxiliar'
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trip_guides_trip_id ON mercure.trip_guides(trip_id);

-- RLS para trip_guides
ALTER TABLE mercure.trip_guides ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'trip_guides' AND policyname = 'trip_guides_all_access'
  ) THEN
    CREATE POLICY trip_guides_all_access ON mercure.trip_guides FOR ALL USING (true);
  END IF;
END $$;

COMMENT ON TABLE mercure.trip_guides IS 'Guías y acompañantes asignados a cada viaje';
COMMENT ON COLUMN mercure.trip_guides.role IS 'Rol: conductor, acompanante, auxiliar';

-- 3. Insertar los vehículos de la flota
INSERT INTO mercure.vehicles (identifier, tractor_license_plate, brand, model, vehicle_type, year, pallet_capacity, max_weight_kg, has_thermal_control)
VALUES 
  ('Kangoo NSX952', 'NSX952', 'RENAULT', 'KANGOO', 'UTILITARIO', 2014, 1, 500, FALSE),
  ('MB 710 IDX765', 'IDX765', 'MERCEDES BENZ', '710', 'FURGON TERMICO', 2009, 7, 4500, TRUE),
  ('MB 710 GLI865', 'GLI865', 'MERCEDES BENZ', '710', 'CHASIS C/CABINA', 2007, 7, 4500, FALSE),
  ('MB 515 PAT137', 'PAT137', 'MERCEDES BENZ', '515', 'FURGON', 2015, 3, 2400, FALSE),
  ('MB 1620 CHI669', 'CHI669', 'MERCEDES BENZ', '1620', 'CHASIS C/CABINA', 1998, 8, 9000, FALSE)
ON CONFLICT (identifier) DO UPDATE SET
  tractor_license_plate = EXCLUDED.tractor_license_plate,
  brand = EXCLUDED.brand,
  model = EXCLUDED.model,
  vehicle_type = EXCLUDED.vehicle_type,
  year = EXCLUDED.year,
  pallet_capacity = EXCLUDED.pallet_capacity,
  max_weight_kg = EXCLUDED.max_weight_kg,
  has_thermal_control = EXCLUDED.has_thermal_control;











