-- ============================================================================
-- Kalia Improvements Schema
-- Sistema de feedback y tickets con chat AI
-- Multi-tenant por organización y usuario
-- ============================================================================

-- Crear el schema
CREATE SCHEMA IF NOT EXISTS kalia_improvements;

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE kalia_improvements.message_role AS ENUM ('user', 'assistant');

CREATE TYPE kalia_improvements.ticket_type AS ENUM (
  'bug',
  'error', 
  'improvement',
  'feature_request',
  'missing_functionality',
  'question',
  'other'
);

CREATE TYPE kalia_improvements.ticket_severity AS ENUM (
  'low',
  'medium', 
  'high',
  'critical'
);

CREATE TYPE kalia_improvements.ticket_status AS ENUM (
  'open',
  'in_review',
  'in_progress',
  'resolved',
  'closed',
  'wont_fix'
);

CREATE TYPE kalia_improvements.conversation_status AS ENUM (
  'active',
  'ticket_created',
  'abandoned'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- Conversations: Una conversación por sesión de feedback del usuario
CREATE TABLE kalia_improvements.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Usuario de Clerk (agnóstico del sistema de usuarios del proyecto)
  clerk_user_id TEXT NOT NULL,
  
  -- Opcional: referencia a user_id local si el proyecto tiene tabla users
  user_id UUID,
  organization_id UUID,
  
  -- Contexto de la página donde se inició
  page_url TEXT,
  page_title TEXT,
  page_module TEXT,
  page_context JSONB DEFAULT '{}'::jsonb,
  
  -- Estado
  status kalia_improvements.conversation_status DEFAULT 'active',
  
  -- Metadata
  user_name TEXT,
  user_email TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  last_message_at TIMESTAMPTZ DEFAULT now()
);

-- Messages: Cada mensaje en la conversación
CREATE TABLE kalia_improvements.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES kalia_improvements.conversations(id) ON DELETE CASCADE,
  
  -- Contenido
  role kalia_improvements.message_role NOT NULL,
  content TEXT NOT NULL,
  
  -- Metadata del LLM (para mensajes del asistente)
  model TEXT,
  tool_calls JSONB,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets: El resultado final cuando el agente recopiló toda la info
CREATE TABLE kalia_improvements.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number SERIAL,
  
  -- Referencia a la conversación origen
  conversation_id UUID REFERENCES kalia_improvements.conversations(id),
  
  -- Usuario de Clerk (agnóstico del sistema de usuarios del proyecto)
  clerk_user_id TEXT NOT NULL,
  
  -- Opcional: referencia a user_id local si el proyecto tiene tabla users  
  user_id UUID,
  organization_id UUID,
  
  -- Clasificación
  ticket_type kalia_improvements.ticket_type NOT NULL,
  severity kalia_improvements.ticket_severity DEFAULT 'medium',
  status kalia_improvements.ticket_status DEFAULT 'open',
  
  -- Contenido estructurado
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  steps_to_reproduce TEXT,
  expected_behavior TEXT,
  actual_behavior TEXT,
  
  -- Contexto
  affected_module TEXT,
  page_url TEXT,
  
  -- Metadata del usuario
  user_name TEXT,
  user_email TEXT,
  
  -- AI summary
  ai_summary TEXT,
  ai_classification_confidence NUMERIC(3,2),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Conversations
CREATE INDEX idx_ki_conversations_clerk_user_id ON kalia_improvements.conversations(clerk_user_id);
CREATE INDEX idx_ki_conversations_user_id ON kalia_improvements.conversations(user_id);
CREATE INDEX idx_ki_conversations_organization_id ON kalia_improvements.conversations(organization_id);
CREATE INDEX idx_ki_conversations_status ON kalia_improvements.conversations(status);
CREATE INDEX idx_ki_conversations_created_at ON kalia_improvements.conversations(created_at DESC);

-- Messages
CREATE INDEX idx_ki_messages_conversation_id ON kalia_improvements.messages(conversation_id);
CREATE INDEX idx_ki_messages_created_at ON kalia_improvements.messages(created_at);

-- Tickets
CREATE INDEX idx_ki_tickets_clerk_user_id ON kalia_improvements.tickets(clerk_user_id);
CREATE INDEX idx_ki_tickets_user_id ON kalia_improvements.tickets(user_id);
CREATE INDEX idx_ki_tickets_organization_id ON kalia_improvements.tickets(organization_id);
CREATE INDEX idx_ki_tickets_status ON kalia_improvements.tickets(status);
CREATE INDEX idx_ki_tickets_ticket_type ON kalia_improvements.tickets(ticket_type);
CREATE INDEX idx_ki_tickets_severity ON kalia_improvements.tickets(severity);
CREATE INDEX idx_ki_tickets_created_at ON kalia_improvements.tickets(created_at DESC);

-- ============================================================================
-- TRIGGERS para updated_at
-- ============================================================================

CREATE OR REPLACE FUNCTION kalia_improvements.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_conversations_updated_at
  BEFORE UPDATE ON kalia_improvements.conversations
  FOR EACH ROW
  EXECUTE FUNCTION kalia_improvements.update_updated_at();

CREATE TRIGGER trigger_tickets_updated_at
  BEFORE UPDATE ON kalia_improvements.tickets
  FOR EACH ROW
  EXECUTE FUNCTION kalia_improvements.update_updated_at();

-- ============================================================================
-- PERMISSIONS
-- ============================================================================

-- Dar permisos al service_role para el schema
GRANT USAGE ON SCHEMA kalia_improvements TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA kalia_improvements TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA kalia_improvements TO service_role;

-- También para authenticated
GRANT USAGE ON SCHEMA kalia_improvements TO authenticated;
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA kalia_improvements TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA kalia_improvements TO authenticated;

-- Default privileges para tablas futuras
ALTER DEFAULT PRIVILEGES IN SCHEMA kalia_improvements 
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA kalia_improvements 
  GRANT ALL ON SEQUENCES TO service_role;

-- ============================================================================
-- RLS Policies
-- ============================================================================

ALTER TABLE kalia_improvements.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalia_improvements.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE kalia_improvements.tickets ENABLE ROW LEVEL SECURITY;

-- Policies para service_role (bypass RLS)
-- El acceso se controla via supabaseAdmin en el backend

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON SCHEMA kalia_improvements IS 'Sistema de feedback y tickets con chat AI para recopilar bugs, mejoras y sugerencias de usuarios';

COMMENT ON TABLE kalia_improvements.conversations IS 'Conversaciones de feedback entre usuarios y el agente AI';
COMMENT ON TABLE kalia_improvements.messages IS 'Mensajes individuales dentro de cada conversación';
COMMENT ON TABLE kalia_improvements.tickets IS 'Tickets estructurados generados por el agente cuando tiene toda la información necesaria';

COMMENT ON COLUMN kalia_improvements.conversations.page_context IS 'Contexto adicional de la página en formato JSON, proporcionado por cada página';
COMMENT ON COLUMN kalia_improvements.tickets.ai_summary IS 'Resumen generado por el AI del problema/sugerencia';
COMMENT ON COLUMN kalia_improvements.tickets.ai_classification_confidence IS 'Confianza del AI en la clasificación (0.00 a 1.00)';

