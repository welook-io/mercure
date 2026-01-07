-- =============================================================================
-- MIGRACIÓN: Mejoras al Sistema de Tarifas y Cotización
-- Fecha: 2024-12-23
-- Objetivo: Soportar tarifarios completos (Deposito/Domicilio), precios por M3,
--           tarifas escalonadas +1000kg, y mejor trazabilidad de origen/destino
-- =============================================================================

-- 1. MODIFICAR TABLA entities (clientes)
-- Agregar tipo de entrega default del cliente
ALTER TABLE mercure.entities 
  ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'deposito';

COMMENT ON COLUMN mercure.entities.delivery_type IS 
'Tipo de entrega default del cliente: deposito, domicilio';

-- 2. MODIFICAR TABLA tariffs
-- Agregar campos para soportar tarifarios completos
ALTER TABLE mercure.tariffs 
  ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20) DEFAULT 'deposito',
  ADD COLUMN IF NOT EXISTS includes_iva BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_per_m3 NUMERIC(12,2);

COMMENT ON COLUMN mercure.tariffs.delivery_type IS 
'Tipo de entrega: deposito, domicilio';
COMMENT ON COLUMN mercure.tariffs.includes_iva IS 
'Si el precio incluye IVA (FLETE+IVA en tarifarios)';
COMMENT ON COLUMN mercure.tariffs.price_per_m3 IS 
'Precio por M3 para esta ruta (ej: $94,270 para BA->Jujuy)';

-- 3. CREAR TABLA tariff_tonnage_rates
-- Para cargas mayores a 1000kg con tarifas escalonadas por tonelaje
CREATE TABLE IF NOT EXISTS mercure.tariff_tonnage_rates (
  id SERIAL PRIMARY KEY,
  origin VARCHAR(50) NOT NULL,
  destination VARCHAR(50) NOT NULL,
  delivery_type VARCHAR(20) DEFAULT 'deposito',
  
  -- Rango de tonelaje
  tonnage_from_kg INTEGER NOT NULL,
  tonnage_to_kg INTEGER, -- NULL para "más de X"
  
  -- Precio por kg según el rango
  price_per_kg NUMERIC(10,4) NOT NULL,
  
  -- Si incluye IVA
  includes_iva BOOLEAN DEFAULT false,
  
  -- Vigencia
  valid_from DATE DEFAULT CURRENT_DATE,
  valid_until DATE,
  is_active BOOLEAN DEFAULT true,
  
  -- Trazabilidad
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_ttr_route ON mercure.tariff_tonnage_rates(origin, destination);
CREATE INDEX IF NOT EXISTS idx_ttr_active ON mercure.tariff_tonnage_rates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ttr_delivery ON mercure.tariff_tonnage_rates(delivery_type);

COMMENT ON TABLE mercure.tariff_tonnage_rates IS 
'Tarifas por tonelaje para cargas mayores a 1000kg.
Rangos típicos: 1001-5000kg, 5001-10000kg, más de 10000kg.
El precio se multiplica por el peso total.';

-- 4. MODIFICAR TABLA shipments
-- Agregar campos para mejor trazabilidad de ruta
ALTER TABLE mercure.shipments 
  ADD COLUMN IF NOT EXISTS origin VARCHAR(100),
  ADD COLUMN IF NOT EXISTS destination VARCHAR(100),
  ADD COLUMN IF NOT EXISTS delivery_type VARCHAR(20);

COMMENT ON COLUMN mercure.shipments.origin IS 
'Ciudad/localidad de origen del envío (ej: Buenos Aires, Rosario)';
COMMENT ON COLUMN mercure.shipments.destination IS 
'Ciudad/localidad de destino del envío (ej: Jujuy, Salta)';
COMMENT ON COLUMN mercure.shipments.delivery_type IS 
'Tipo de entrega para este envío: deposito, domicilio';

-- 5. MODIFICAR TABLA client_special_tariffs
-- Agregar campo para tasa de seguro personalizada
ALTER TABLE mercure.client_special_tariffs 
  ADD COLUMN IF NOT EXISTS insurance_rate NUMERIC(8,5);

COMMENT ON COLUMN mercure.client_special_tariffs.insurance_rate IS 
'Tasa de seguro personalizada para este cliente (ej: 0.007 = 7/1000). 
NULL = usar tasa general. 0 = sin seguro.';

-- Actualizar comentario de la tabla para incluir nuevos tipos de pricing
COMMENT ON TABLE mercure.client_special_tariffs IS 
'Tarifas especiales por cliente para envíos puntuales.

pricing_type valores soportados:
- fijo: precio fijo sin importar peso/volumen
- por_kg: precio por kg (con mínimo opcional)
- por_m3: precio por metro cúbico
- por_pallet: precio por pallet
- por_bulto: precio por bulto (para tipos específicos de producto)
- descuento_porcentaje: descuento % sobre tarifa base
- descuento_monto: descuento fijo en $
- formula_custom: fórmula personalizada (ej: kg*96.8 - m3*48400)

pricing_values ejemplos:
- fijo: {"precio": 50000}
- por_kg: {"precio_kg": 400, "minimo": 20000}
- por_m3: {"precio_m3": 43000}
- por_pallet: {"precio_pallet": 180000}
- por_bulto: {"precio_bulto": 8500, "tipo_producto": "rollo_tela"}
- descuento_porcentaje: {"porcentaje": -20, "precio_m3": 65000}
- formula_custom: {"formula": "kg * 96.8 - m3 * 48400"}';

-- 6. TRIGGER para updated_at en tariff_tonnage_rates
CREATE OR REPLACE FUNCTION mercure.update_tariff_tonnage_rates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_tariff_tonnage_rates_updated_at ON mercure.tariff_tonnage_rates;
CREATE TRIGGER trg_tariff_tonnage_rates_updated_at
  BEFORE UPDATE ON mercure.tariff_tonnage_rates
  FOR EACH ROW
  EXECUTE FUNCTION mercure.update_tariff_tonnage_rates_updated_at();

-- 7. PERMISOS
GRANT SELECT, INSERT, UPDATE, DELETE ON mercure.tariff_tonnage_rates TO authenticated;
GRANT ALL ON mercure.tariff_tonnage_rates TO service_role;
GRANT USAGE, SELECT ON SEQUENCE mercure.tariff_tonnage_rates_id_seq TO authenticated;

-- 8. CARGAR TARIFAS POR TONELAJE (basado en tarifarios compartidos)
-- Buenos Aires/Rosario -> Jujuy
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva)
VALUES 
  ('Buenos Aires', 'Jujuy', 'deposito', 1001, 5000, 245.81, false),
  ('Buenos Aires', 'Jujuy', 'deposito', 5001, 10000, 221.28, false),
  ('Buenos Aires', 'Jujuy', 'deposito', 10001, NULL, 210.03, false),
  ('Rosario', 'Jujuy', 'deposito', 1001, 5000, 245.81, false),
  ('Rosario', 'Jujuy', 'deposito', 5001, 10000, 221.28, false),
  ('Rosario', 'Jujuy', 'deposito', 10001, NULL, 210.03, false)
ON CONFLICT DO NOTHING;

-- Buenos Aires/Rosario -> Salta
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva)
VALUES 
  ('Buenos Aires', 'Salta', 'deposito', 1001, 5000, 327.15, false),
  ('Buenos Aires', 'Salta', 'deposito', 5001, 10000, 294.50, false),
  ('Buenos Aires', 'Salta', 'deposito', 10001, NULL, 264.89, false),
  ('Rosario', 'Salta', 'deposito', 1001, 5000, 327.15, false),
  ('Rosario', 'Salta', 'deposito', 5001, 10000, 294.50, false),
  ('Rosario', 'Salta', 'deposito', 10001, NULL, 264.89, false)
ON CONFLICT DO NOTHING;

-- 9. ACTUALIZAR TARIFAS EXISTENTES CON PRECIO POR M3
-- BA/Rosario -> Jujuy: $94,270 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 94270 
WHERE (origin ILIKE '%Buenos Aires%' OR origin ILIKE '%Rosario%') 
  AND destination ILIKE '%Jujuy%'
  AND price_per_m3 IS NULL;

-- BA/Rosario -> Salta: $125,465 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 125465 
WHERE (origin ILIKE '%Buenos Aires%' OR origin ILIKE '%Rosario%') 
  AND destination ILIKE '%Salta%'
  AND price_per_m3 IS NULL;








