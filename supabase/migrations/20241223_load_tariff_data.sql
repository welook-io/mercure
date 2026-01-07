-- =============================================================================
-- CARGA DE DATOS: Tarifarios y Tarifas Especiales
-- Fecha: 2024-12-23
-- =============================================================================

-- ============================================
-- 1. TARIFAS POR TONELAJE (cargas +1000kg)
-- ============================================

-- Limpiar datos existentes si hay
DELETE FROM mercure.tariff_tonnage_rates WHERE 1=1;

-- Buenos Aires -> Jujuy (Depósito)
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Buenos Aires', 'Jujuy', 'deposito', 1001, 5000, 245.81, false),
  ('Buenos Aires', 'Jujuy', 'deposito', 5001, 10000, 221.28, false),
  ('Buenos Aires', 'Jujuy', 'deposito', 10001, NULL, 210.03, false);

-- Rosario -> Jujuy (Depósito)
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Rosario', 'Jujuy', 'deposito', 1001, 5000, 245.81, false),
  ('Rosario', 'Jujuy', 'deposito', 5001, 10000, 221.28, false),
  ('Rosario', 'Jujuy', 'deposito', 10001, NULL, 210.03, false);

-- Buenos Aires -> Salta (Depósito)
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Buenos Aires', 'Salta', 'deposito', 1001, 5000, 327.15, false),
  ('Buenos Aires', 'Salta', 'deposito', 5001, 10000, 294.50, false),
  ('Buenos Aires', 'Salta', 'deposito', 10001, NULL, 264.89, false);

-- Rosario -> Salta (Depósito)
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Rosario', 'Salta', 'deposito', 1001, 5000, 327.15, false),
  ('Rosario', 'Salta', 'deposito', 5001, 10000, 294.50, false),
  ('Rosario', 'Salta', 'deposito', 10001, NULL, 264.89, false);

-- ============================================
-- 2. ACTUALIZAR TARIFAS CON PRECIO POR M3
-- ============================================

-- BA/Rosario -> Jujuy: $94,270 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 94270, delivery_type = 'deposito'
WHERE (origin ILIKE '%Buenos Aires%' OR origin ILIKE '%Rosario%') 
  AND (destination ILIKE '%Jujuy%' OR destination ILIKE '%San Salvador%');

-- BA/Rosario -> Salta: $125,465 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 125465, delivery_type = 'deposito'
WHERE (origin ILIKE '%Buenos Aires%' OR origin ILIKE '%Rosario%') 
  AND destination ILIKE '%Salta%'
  AND destination NOT ILIKE '%Jujuy%';

-- ============================================
-- 3. TARIFAS ESPECIALES DE LOS 9 CLIENTES
-- ============================================

-- Primero necesitamos obtener los IDs de los clientes
-- Estos se cargarán después de verificar que existen

-- MUNDO DEL PLOMERO: $96.8*KG - 48400*M3, Sin seguro
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'Fórmula Especial', 
  'KG*96.8 - M3*48400', 
  'cualquiera', 
  '{}'::jsonb, 
  'formula_custom', 
  '{"formula": "kg * 96.8 - m3 * 48400"}'::jsonb,
  0, -- Sin seguro
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%MUNDO%PLOMERO%'
ON CONFLICT DO NOTHING;

-- ELEUTERIO GIMENEZ: $180,000/pallet, Seguro 8/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'Precio por Pallet', 
  '$180,000 por pallet', 
  'cualquiera', 
  '{}'::jsonb, 
  'por_pallet', 
  '{"precio_pallet": 180000}'::jsonb,
  0.008, -- 8/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%ELEUTERIO%GIMENEZ%' OR e.legal_name ILIKE '%GIMENEZ%ELEUTERIO%'
ON CONFLICT DO NOTHING;

-- STENFAR SAIC: Tarifa especial, Sin seguro
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'Tarifa Especial STENFAR', 
  'Condiciones especiales acordadas', 
  'cualquiera', 
  '{}'::jsonb, 
  'descuento_porcentaje', 
  '{"porcentaje": -15}'::jsonb,
  0, -- Sin seguro
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%STENFAR%'
ON CONFLICT DO NOTHING;

-- MEALLA JUAN CARLOS: $43,000/M3, Seguro 7/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'Precio por M3', 
  '$43,000 por metro cúbico', 
  'cualquiera', 
  '{}'::jsonb, 
  'por_m3', 
  '{"precio_m3": 43000}'::jsonb,
  0.007, -- 7/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%MEALLA%JUAN%' OR e.legal_name ILIKE '%JUAN%MEALLA%'
ON CONFLICT DO NOTHING;

-- AGUILERA OSCAR: M3 $65,000 + 20% dto, Seguro 8/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'M3 con Descuento', 
  'M3 $65,000 con 20% descuento', 
  'cualquiera', 
  '{}'::jsonb, 
  'descuento_porcentaje', 
  '{"porcentaje": -20, "precio_m3": 65000}'::jsonb,
  0.008, -- 8/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%AGUILERA%OSCAR%' OR e.legal_name ILIKE '%OSCAR%AGUILERA%'
ON CONFLICT DO NOTHING;

-- ALBORNOZ RENZO: Rollo tela $8,500/bulto, Seguro 8/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'Precio por Rollo', 
  'Rollo de tela $8,500 c/u', 
  'tipo_carga', 
  '{"tipo": "rollo_tela"}'::jsonb, 
  'por_bulto', 
  '{"precio_bulto": 8500, "tipo_producto": "rollo_tela"}'::jsonb,
  0.008, -- 8/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%ALBORNOZ%RENZO%' OR e.legal_name ILIKE '%RENZO%ALBORNOZ%'
ON CONFLICT DO NOTHING;

-- FERNANDEZ ROBERTO: M3 $65,000 + 20% dto, Seguro 8/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'M3 con Descuento', 
  'M3 $65,000 con 20% descuento', 
  'cualquiera', 
  '{}'::jsonb, 
  'descuento_porcentaje', 
  '{"porcentaje": -20, "precio_m3": 65000}'::jsonb,
  0.008, -- 8/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%FERNANDEZ%ROBERTO%' OR e.legal_name ILIKE '%ROBERTO%FERNANDEZ%'
ON CONFLICT DO NOTHING;

-- Alberto Abelina: M3 $65,000 + 20% dto, Seguro 8/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'M3 con Descuento', 
  'M3 $65,000 con 20% descuento', 
  'cualquiera', 
  '{}'::jsonb, 
  'descuento_porcentaje', 
  '{"porcentaje": -20, "precio_m3": 65000}'::jsonb,
  0.008, -- 8/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%ALBERTO%ABELINA%' OR e.legal_name ILIKE '%ABELINA%ALBERTO%'
ON CONFLICT DO NOTHING;

-- TRONCOSO CARRASCO: M3 $65,000 + 20% dto, Seguro 8/1000
INSERT INTO mercure.client_special_tariffs 
  (entity_id, name, description, condition_type, condition_values, pricing_type, pricing_values, insurance_rate, priority, is_active)
SELECT 
  e.id, 
  'M3 con Descuento', 
  'M3 $65,000 con 20% descuento', 
  'cualquiera', 
  '{}'::jsonb, 
  'descuento_porcentaje', 
  '{"porcentaje": -20, "precio_m3": 65000}'::jsonb,
  0.008, -- 8/1000
  10, 
  true
FROM mercure.entities e 
WHERE e.legal_name ILIKE '%TRONCOSO%CARRASCO%' OR e.legal_name ILIKE '%CARRASCO%TRONCOSO%'
ON CONFLICT DO NOTHING;

-- ============================================
-- 4. ÍNDICES PARA PERFORMANCE
-- ============================================
CREATE INDEX IF NOT EXISTS idx_ttr_route ON mercure.tariff_tonnage_rates(origin, destination);
CREATE INDEX IF NOT EXISTS idx_ttr_active ON mercure.tariff_tonnage_rates(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ttr_delivery ON mercure.tariff_tonnage_rates(delivery_type);

-- Índices en shipments para los nuevos campos
CREATE INDEX IF NOT EXISTS idx_shipments_origin ON mercure.shipments(origin);
CREATE INDEX IF NOT EXISTS idx_shipments_destination ON mercure.shipments(destination);
CREATE INDEX IF NOT EXISTS idx_shipments_delivery ON mercure.shipments(delivery_type);

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================
SELECT 'Tarifas por tonelaje cargadas: ' || COUNT(*) as resultado FROM mercure.tariff_tonnage_rates;
SELECT 'Tarifas especiales cargadas: ' || COUNT(*) as resultado FROM mercure.client_special_tariffs WHERE insurance_rate IS NOT NULL;









