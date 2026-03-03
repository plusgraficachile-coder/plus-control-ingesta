-- ============================================================================
-- PLUS CONTROL — MIGRACIÓN 001: Motor de Ingesta Mercado Público
-- Ejecutar en Supabase → SQL Editor
-- ============================================================================

-- 1. ORGANIZACIONES (Compradores públicos)
-- Cada organismo del Estado tiene un RUT único. Upsert por rut.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS organizations (
  id           UUID          DEFAULT gen_random_uuid() PRIMARY KEY,
  rut          TEXT          NOT NULL UNIQUE,
  razon_social TEXT,
  region       TEXT,
  created_at   TIMESTAMPTZ   DEFAULT now(),
  updated_at   TIMESTAMPTZ   DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_organizations_rut    ON organizations(rut);
CREATE INDEX IF NOT EXISTS idx_organizations_region ON organizations(region);

-- 2. TIPOS DE SEÑAL (catálogo extensible)
-- Permite agregar más fuentes en el futuro (BCCH, SII, etc.)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signal_types (
  id     UUID  DEFAULT gen_random_uuid() PRIMARY KEY,
  name   TEXT  NOT NULL UNIQUE,   -- 'licitacion_publica', 'orden_compra', etc.
  source TEXT  NOT NULL            -- 'MercadoPublico', 'BCCH', etc.
);

-- Seed inicial
INSERT INTO signal_types (name, source)
VALUES ('licitacion_publica', 'MercadoPublico')
ON CONFLICT (name) DO NOTHING;

-- 3. SEÑALES / OPORTUNIDADES
-- Cada licitación capturada es una señal. Idempotente por external_code.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS signals (
  id               UUID        DEFAULT gen_random_uuid() PRIMARY KEY,
  org_id           UUID        REFERENCES organizations(id) ON DELETE CASCADE,
  signal_type_id   UUID        REFERENCES signal_types(id),
  external_code    TEXT        NOT NULL UNIQUE,   -- CodigoExternal de MP
  nombre           TEXT,
  monto            BIGINT,
  score            INT         DEFAULT 0 CHECK (score BETWEEN 0 AND 100),
  fecha_cierre     TIMESTAMPTZ,
  raw_data         JSONB,       -- JSON completo de MP para análisis futuro
  capturado_at     TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_signals_org_id        ON signals(org_id);
CREATE INDEX IF NOT EXISTS idx_signals_external_code ON signals(external_code);
CREATE INDEX IF NOT EXISTS idx_signals_score         ON signals(score DESC);
CREATE INDEX IF NOT EXISTS idx_signals_monto         ON signals(monto DESC);
CREATE INDEX IF NOT EXISTS idx_signals_capturado     ON signals(capturado_at DESC);

-- 4. ROW LEVEL SECURITY
-- Bloqueamos acceso anon. Solo la service_role (backend) puede escribir.
-- ----------------------------------------------------------------------------
ALTER TABLE organizations  ENABLE ROW LEVEL SECURITY;
ALTER TABLE signal_types   ENABLE ROW LEVEL SECURITY;
ALTER TABLE signals         ENABLE ROW LEVEL SECURITY;

-- Política de lectura autenticada (para el frontend cuando lo conectes)
CREATE POLICY "Lectura autenticada" ON organizations
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada" ON signal_types
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Lectura autenticada" ON signals
  FOR SELECT TO authenticated USING (true);

-- ============================================================================
-- VERIFICACIÓN: Corre esto después para confirmar que las tablas existen
-- ============================================================================
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- AND table_name IN ('organizations', 'signal_types', 'signals');
