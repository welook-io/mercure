-- Migración para agregar soporte de Notas de Crédito
-- Fecha: 2024-12-17

-- Agregar campos para soportar Notas de Crédito en la tabla invoices
ALTER TABLE mercure.invoices 
ADD COLUMN IF NOT EXISTS voucher_type text,
ADD COLUMN IF NOT EXISTS associated_voucher_type integer,
ADD COLUMN IF NOT EXISTS associated_voucher_pos integer,
ADD COLUMN IF NOT EXISTS associated_voucher_number integer;

-- Comentarios descriptivos
COMMENT ON COLUMN mercure.invoices.voucher_type IS 'Tipo de comprobante: A, B, C para facturas, NC_A, NC_B, NC_C para notas de crédito, ND_A, ND_B, ND_C para notas de débito';
COMMENT ON COLUMN mercure.invoices.associated_voucher_type IS 'Código AFIP del tipo de comprobante asociado (1=FA, 6=FB, 11=FC)';
COMMENT ON COLUMN mercure.invoices.associated_voucher_pos IS 'Punto de venta del comprobante asociado';
COMMENT ON COLUMN mercure.invoices.associated_voucher_number IS 'Número del comprobante asociado';

-- Índice para búsquedas por tipo de comprobante
CREATE INDEX IF NOT EXISTS idx_invoices_voucher_type ON mercure.invoices(voucher_type);











