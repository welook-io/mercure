-- =============================================================================
-- MIGRACIÓN: Consolidar todo Mercure en schema mercure
-- Fecha: 2024-12-16
-- Objetivo: Eliminar dependencia de public, todo Mercure en schema mercure
-- =============================================================================

-- 1. ELIMINAR VIEWS redundantes en public (ya no necesarias con schema expuesto)
DROP VIEW IF EXISTS public.mercure_commercial_agreement_requests CASCADE;
DROP VIEW IF EXISTS public.mercure_vehicle_events CASCADE;

-- 2. MOVER TABLAS de public a mercure

-- 2.1 mercure_user_roles → mercure.user_roles
ALTER TABLE public.mercure_user_roles SET SCHEMA mercure;
ALTER TABLE mercure.mercure_user_roles RENAME TO user_roles;

-- 2.2 mercure_user_permissions → mercure.user_permissions
ALTER TABLE public.mercure_user_permissions SET SCHEMA mercure;
ALTER TABLE mercure.mercure_user_permissions RENAME TO user_permissions;

-- 2.3 mercure_audit_logs → mercure.audit_logs
ALTER TABLE public.mercure_audit_logs SET SCHEMA mercure;
ALTER TABLE mercure.mercure_audit_logs RENAME TO audit_logs;

-- 3. RENOMBRAR TABLAS en mercure para quitar prefijo redundante mercure_
-- (mercure.mercure_entities → mercure.entities, etc.)

-- Solo renombrar si existen con prefijo mercure_ y no hay conflicto
DO $$
BEGIN
    -- Verificar y renombrar cada tabla
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_entities') THEN
        -- Si existe entities sin prefijo, eliminarla (está vacía según datos)
        DROP TABLE IF EXISTS mercure.entities CASCADE;
        ALTER TABLE mercure.mercure_entities RENAME TO entities;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_vehicles') THEN
        DROP TABLE IF EXISTS mercure.vehicles CASCADE;
        ALTER TABLE mercure.mercure_vehicles RENAME TO vehicles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_profiles') THEN
        DROP TABLE IF EXISTS mercure.profiles CASCADE;
        ALTER TABLE mercure.mercure_profiles RENAME TO profiles;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_trips') THEN
        DROP TABLE IF EXISTS mercure.trips CASCADE;
        ALTER TABLE mercure.mercure_trips RENAME TO trips;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_shipments') THEN
        DROP TABLE IF EXISTS mercure.shipments CASCADE;
        ALTER TABLE mercure.mercure_shipments RENAME TO shipments;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_events') THEN
        DROP TABLE IF EXISTS mercure.events CASCADE;
        ALTER TABLE mercure.mercure_events RENAME TO events;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_tariffs') THEN
        DROP TABLE IF EXISTS mercure.tariffs CASCADE;
        ALTER TABLE mercure.mercure_tariffs RENAME TO tariffs;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_insurance_rates') THEN
        DROP TABLE IF EXISTS mercure.insurance_rates CASCADE;
        ALTER TABLE mercure.mercure_insurance_rates RENAME TO insurance_rates;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_quotations') THEN
        ALTER TABLE mercure.mercure_quotations RENAME TO quotations;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'mercure' AND table_name = 'mercure_client_commercial_terms') THEN
        ALTER TABLE mercure.mercure_client_commercial_terms RENAME TO client_commercial_terms;
    END IF;
END $$;

-- 4. ACTUALIZAR SEQUENCES (renombrar para consistencia)
DO $$
DECLARE
    seq_record RECORD;
BEGIN
    FOR seq_record IN 
        SELECT sequence_name 
        FROM information_schema.sequences 
        WHERE sequence_schema = 'mercure' 
        AND sequence_name LIKE 'mercure_%'
    LOOP
        EXECUTE format('ALTER SEQUENCE mercure.%I RENAME TO %I', 
            seq_record.sequence_name, 
            replace(seq_record.sequence_name, 'mercure_', ''));
    END LOOP;
END $$;

-- 5. COMENTARIOS para documentación
COMMENT ON SCHEMA mercure IS 'Schema exclusivo para el cliente Mercure SRL - Sistema de gestión de transporte y logística';

COMMENT ON TABLE mercure.entities IS 'Entidades (clientes, proveedores) de Mercure';
COMMENT ON TABLE mercure.shipments IS 'Envíos/remitos de mercadería';
COMMENT ON TABLE mercure.trips IS 'Viajes de camiones';
COMMENT ON TABLE mercure.vehicles IS 'Flota de vehículos';
COMMENT ON TABLE mercure.tariffs IS 'Tarifas por ruta y peso';
COMMENT ON TABLE mercure.quotations IS 'Cotizaciones de envíos';
COMMENT ON TABLE mercure.invoices IS 'Facturas emitidas';
COMMENT ON TABLE mercure.user_roles IS 'Roles de usuarios en Mercure';
COMMENT ON TABLE mercure.user_permissions IS 'Permisos individuales por usuario';
COMMENT ON TABLE mercure.audit_logs IS 'Log de auditoría de acciones';

-- 6. GRANT permisos al schema mercure
GRANT USAGE ON SCHEMA mercure TO authenticated;
GRANT USAGE ON SCHEMA mercure TO service_role;
GRANT USAGE ON SCHEMA mercure TO anon;

-- Permisos en todas las tablas del schema
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA mercure TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA mercure TO service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA mercure TO anon;

-- Permisos en sequences
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA mercure TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA mercure TO service_role;


