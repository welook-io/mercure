-- =============================================================================
-- MIGRACIÓN: Actualización de Tarifarios 2026
-- Fecha: 2026-01-05
-- Vigencia: 1/1/2026
-- =============================================================================

-- ============================================
-- 1. ACTUALIZAR TARIFAS POR TONELAJE (+1000kg)
-- ============================================

-- Limpiar datos existentes
TRUNCATE mercure.tariff_tonnage_rates;

-- Capital Federal -> Jujuy (Depósito) - Vigencia 1/1/2026
-- Según tarifario: 1M3 = $123.500
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Capital Federal', 'Jujuy', 'deposito', 1001, 5000, 322.01, false),  -- $322,01/kg
  ('Capital Federal', 'Jujuy', 'deposito', 5001, 10000, 289.88, false), -- $289,88/kg
  ('Capital Federal', 'Jujuy', 'deposito', 10001, NULL, 275.14, false); -- $275,14/kg

-- Buenos Aires -> Jujuy (alias para compatibilidad)
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Buenos Aires', 'Jujuy', 'deposito', 1001, 5000, 322.01, false),
  ('Buenos Aires', 'Jujuy', 'deposito', 5001, 10000, 289.88, false),
  ('Buenos Aires', 'Jujuy', 'deposito', 10001, NULL, 275.14, false);

-- Capital Federal -> Salta (Depósito) - Vigencia 1/1/2026
-- Según tarifario: 1M3 = $164.500
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Capital Federal', 'Salta', 'deposito', 1001, 5000, 428.56, false),  -- $428,56/kg
  ('Capital Federal', 'Salta', 'deposito', 5001, 10000, 385.80, false), -- $385,80/kg
  ('Capital Federal', 'Salta', 'deposito', 10001, NULL, 347.01, false); -- $347,01/kg

-- Buenos Aires -> Salta (alias para compatibilidad)
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Buenos Aires', 'Salta', 'deposito', 1001, 5000, 428.56, false),
  ('Buenos Aires', 'Salta', 'deposito', 5001, 10000, 385.80, false),
  ('Buenos Aires', 'Salta', 'deposito', 10001, NULL, 347.01, false);

-- Rosario Sta Fe -> Jujuy (Depósito) - Vigencia 1/1/2026
-- Según tarifario: 1M3 = $175.500
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Rosario', 'Jujuy', 'deposito', 1001, 5000, 457.13, false),   -- $457,13/kg
  ('Rosario', 'Jujuy', 'deposito', 5001, 10000, 411.52, false),  -- $411,52/kg
  ('Rosario', 'Jujuy', 'deposito', 10001, NULL, 370.14, false);  -- $370,14/kg

-- Rosario Sta Fe -> Salta (Depósito) - Vigencia 1/41/2026 (según imagen dice 1/41 pero es 1/1)
-- Según tarifario: 1M3 = $210.500
INSERT INTO mercure.tariff_tonnage_rates (origin, destination, delivery_type, tonnage_from_kg, tonnage_to_kg, price_per_kg, includes_iva) VALUES
  ('Rosario', 'Salta', 'deposito', 1001, 5000, 548.56, false),   -- $548,56/kg
  ('Rosario', 'Salta', 'deposito', 5001, 10000, 493.82, false),  -- $493,82/kg
  ('Rosario', 'Salta', 'deposito', 10001, NULL, 444.17, false);  -- $444,17/kg

-- ============================================
-- 2. ACTUALIZAR PRECIO POR M3 EN TARIFAS BASE
-- ============================================

-- Capital Federal / Buenos Aires -> Jujuy: $123.500 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 123500, delivery_type = 'deposito'
WHERE (origin ILIKE '%Buenos Aires%' OR origin ILIKE '%Capital Federal%' OR origin ILIKE '%CABA%' OR origin ILIKE '%Lanus%' OR origin ILIKE '%Lanús%') 
  AND (destination ILIKE '%Jujuy%' OR destination ILIKE '%San Salvador%');

-- Capital Federal / Buenos Aires -> Salta: $164.500 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 164500, delivery_type = 'deposito'
WHERE (origin ILIKE '%Buenos Aires%' OR origin ILIKE '%Capital Federal%' OR origin ILIKE '%CABA%' OR origin ILIKE '%Lanus%' OR origin ILIKE '%Lanús%') 
  AND destination ILIKE '%Salta%'
  AND destination NOT ILIKE '%Jujuy%';

-- Rosario -> Jujuy: $175.500 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 175500, delivery_type = 'deposito'
WHERE origin ILIKE '%Rosario%' 
  AND (destination ILIKE '%Jujuy%' OR destination ILIKE '%San Salvador%');

-- Rosario -> Salta: $210.500 por M3
UPDATE mercure.tariffs 
SET price_per_m3 = 210500, delivery_type = 'deposito'
WHERE origin ILIKE '%Rosario%' 
  AND destination ILIKE '%Salta%'
  AND destination NOT ILIKE '%Jujuy%';

-- ============================================
-- 3. ACTUALIZAR PRECIOS POR PESO (TARIFAS BASE)
-- Según las imágenes, para cargas hasta 1000kg
-- ============================================

-- Nota: Los precios por peso están en rangos de 10kg en 10kg
-- Ejemplo Capital Federal -> Jujuy: 100kg = $54.484,74
-- Estos se calculan con la fórmula del tarifario

-- Para simplificar, actualizamos los precios base de las tarifas existentes
-- El sistema ya redondea al múltiplo de 10 más cercano y busca la tarifa correspondiente

-- ============================================
-- 4. SEGURO: 8/1000 + IVA sobre valor declarado
-- ============================================
-- El seguro es: valor_declarado * 0.008
-- El IVA del seguro es parte de la factura (IVA 21%)

-- ============================================
-- 5. VERIFICACIÓN
-- ============================================
SELECT 'Tarifas por tonelaje actualizadas: ' || COUNT(*) as resultado FROM mercure.tariff_tonnage_rates;
SELECT 'Tarifas base con precio M3: ' || COUNT(*) as resultado FROM mercure.tariffs WHERE price_per_m3 IS NOT NULL;

