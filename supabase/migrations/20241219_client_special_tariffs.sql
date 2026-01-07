-- =============================================================================
-- MIGRACIÓN: Tarifas Especiales por Cliente
-- Fecha: 2024-12-19
-- Objetivo: Permitir definir tarifas especiales que aplican a envíos puntuales
--           de clientes específicos según condiciones (ej: pallets completos)
-- =============================================================================

-- 1. CREAR TABLA de Tarifas Especiales por Cliente
CREATE TABLE IF NOT EXISTS mercure.client_special_tariffs (
  id SERIAL PRIMARY KEY,
  
  -- Cliente al que aplica
  entity_id INTEGER NOT NULL REFERENCES mercure.entities(id) ON DELETE CASCADE,
  
  -- Nombre descriptivo del arreglo (ej: "Pallets Completos", "Envío Semanal Fijo")
  name VARCHAR(100) NOT NULL,
  description TEXT,
  
  -- Condiciones para que aplique esta tarifa
  -- Tipo de condición: peso_minimo, volumen_minimo, bultos_minimo, tipo_carga, frecuencia
  condition_type VARCHAR(30) NOT NULL DEFAULT 'peso_minimo',
  -- Valores de condición en JSON para flexibilidad
  -- Ejemplos:
  --   {"peso_minimo_kg": 500}
  --   {"volumen_minimo_m3": 2}
  --   {"bultos_minimo": 10}
  --   {"tipo_carga": "pallets"}
  --   {"frecuencia": "semanal", "cantidad": 1}
  condition_values JSONB NOT NULL DEFAULT '{}',
  
  -- Tipo de precio especial
  -- fijo: precio fijo sin importar peso/volumen
  -- por_kg: precio por kg (reemplaza tarifa base)
  -- descuento_porcentaje: descuento % sobre tarifa base
  -- descuento_monto: descuento fijo en $
  pricing_type VARCHAR(30) NOT NULL DEFAULT 'fijo',
  
  -- Valores de pricing
  -- Según pricing_type:
  --   fijo: {"precio": 50000}
  --   por_kg: {"precio_kg": 400, "minimo": 20000}
  --   descuento_porcentaje: {"porcentaje": -25}
  --   descuento_monto: {"monto": -10000}
  pricing_values JSONB NOT NULL DEFAULT '{}',
  
  -- Rutas donde aplica (null = todas)
  origin VARCHAR(50),
  destination VARCHAR(50),
  
  -- Vigencia
  valid_from DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Prioridad (mayor = se evalúa primero)
  priority INTEGER DEFAULT 0,
  
  -- Trazabilidad
  created_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. ÍNDICES para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_cst_entity_id ON mercure.client_special_tariffs(entity_id);
CREATE INDEX IF NOT EXISTS idx_cst_active ON mercure.client_special_tariffs(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cst_valid ON mercure.client_special_tariffs(valid_from, valid_until) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_cst_route ON mercure.client_special_tariffs(origin, destination) WHERE is_active = true;

-- 3. COMENTARIOS
COMMENT ON TABLE mercure.client_special_tariffs IS 
'Tarifas especiales por cliente para envíos puntuales.
Permite definir precios especiales cuando se cumplen ciertas condiciones
(ej: pallets completos, volumen mínimo, frecuencia semanal).
Se evalúan en orden de prioridad y la primera que matchee se aplica.';

COMMENT ON COLUMN mercure.client_special_tariffs.condition_type IS 
'Tipo de condición: peso_minimo, volumen_minimo, bultos_minimo, tipo_carga, frecuencia, cualquiera';

COMMENT ON COLUMN mercure.client_special_tariffs.pricing_type IS 
'Tipo de precio: fijo (precio absoluto), por_kg, descuento_porcentaje, descuento_monto';

-- 4. TRIGGER para updated_at
CREATE OR REPLACE FUNCTION mercure.update_client_special_tariffs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_client_special_tariffs_updated_at ON mercure.client_special_tariffs;
CREATE TRIGGER trg_client_special_tariffs_updated_at
  BEFORE UPDATE ON mercure.client_special_tariffs
  FOR EACH ROW
  EXECUTE FUNCTION mercure.update_client_special_tariffs_updated_at();

-- 5. PERMISOS
GRANT SELECT, INSERT, UPDATE, DELETE ON mercure.client_special_tariffs TO authenticated;
GRANT ALL ON mercure.client_special_tariffs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE mercure.client_special_tariffs_id_seq TO authenticated;

-- 6. DATOS de ejemplo (comentado - solo para referencia)
/*
-- Ejemplo: Cliente "Distribuidora X" con tarifa especial para pallets
INSERT INTO mercure.client_special_tariffs (
  entity_id,
  name,
  description,
  condition_type,
  condition_values,
  pricing_type,
  pricing_values,
  origin,
  destination,
  priority,
  notes
) VALUES (
  1, -- entity_id del cliente
  'Pallets Completos',
  'Envío de pallets completos con frecuencia semanal',
  'tipo_carga',
  '{"tipo": "pallets", "cantidad_minima": 1}',
  'fijo',
  '{"precio": 45000}',
  'Buenos Aires',
  'San Salvador de Jujuy',
  10,
  'Acordado con Fernando - Dic 2024'
);

-- Ejemplo: Descuento por volumen mínimo
INSERT INTO mercure.client_special_tariffs (
  entity_id,
  name,
  description,
  condition_type,
  condition_values,
  pricing_type,
  pricing_values,
  priority
) VALUES (
  1,
  'Envío Grande +500kg',
  'Descuento 15% para envíos de más de 500kg',
  'peso_minimo',
  '{"peso_minimo_kg": 500}',
  'descuento_porcentaje',
  '{"porcentaje": -15}',
  5
);
*/











