-- Migración para soportar múltiples imágenes de remitos y carga en shipments
-- Los campos actuales (remito_image_url, cargo_image_url) se mantienen para compatibilidad

-- Agregar campos de array para múltiples imágenes
ALTER TABLE mercure.shipments 
ADD COLUMN IF NOT EXISTS remito_image_urls text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS cargo_image_urls text[] DEFAULT '{}';

-- Migrar datos existentes a los nuevos campos de array
UPDATE mercure.shipments 
SET remito_image_urls = ARRAY[remito_image_url]
WHERE remito_image_url IS NOT NULL 
  AND remito_image_url != ''
  AND (remito_image_urls IS NULL OR array_length(remito_image_urls, 1) IS NULL);

UPDATE mercure.shipments 
SET cargo_image_urls = ARRAY[cargo_image_url]
WHERE cargo_image_url IS NOT NULL 
  AND cargo_image_url != ''
  AND (cargo_image_urls IS NULL OR array_length(cargo_image_urls, 1) IS NULL);

-- Comentarios para documentación
COMMENT ON COLUMN mercure.shipments.remito_image_urls IS 'Array de URLs de imágenes de remitos (pueden ser múltiples)';
COMMENT ON COLUMN mercure.shipments.cargo_image_urls IS 'Array de URLs de imágenes de la carga (pueden ser múltiples)';

