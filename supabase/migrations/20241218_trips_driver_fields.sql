-- Migración: Agregar campos de conductor/guía a viajes
-- Permite asignar un conductor a cada viaje para la Hoja de Ruta

ALTER TABLE mercure.trips 
  ADD COLUMN IF NOT EXISTS driver_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS driver_dni VARCHAR(20),
  ADD COLUMN IF NOT EXISTS driver_phone VARCHAR(50);

-- Comentarios
COMMENT ON COLUMN mercure.trips.driver_name IS 'Nombre del conductor/guía asignado al viaje';
COMMENT ON COLUMN mercure.trips.driver_dni IS 'DNI del conductor';
COMMENT ON COLUMN mercure.trips.driver_phone IS 'Teléfono del conductor';










