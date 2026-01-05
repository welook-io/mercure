-- =============================================================================
-- MIGRACIÓN: Constraint único para CUIT/tax_id en entidades
-- Fecha: 2026-01-05
-- Previene duplicados de clientes con el mismo CUIT
-- =============================================================================

-- Crear índice único parcial para tax_id (solo cuando no es null)
-- Esto permite múltiples NULLs pero no CUITs duplicados
CREATE UNIQUE INDEX IF NOT EXISTS idx_entities_tax_id_unique 
ON mercure.entities (tax_id) 
WHERE tax_id IS NOT NULL AND tax_id != '';

-- Comentario explicativo
COMMENT ON INDEX mercure.idx_entities_tax_id_unique IS 
'Previene duplicados de CUIT. Permite múltiples registros sin CUIT (NULL o vacío).';

