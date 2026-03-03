-- ============================================================
-- MIGRACIÓN 002: Campos de auditoría humana en tabla signals
-- Permite que RadarDesk valide y enriquezca leads del ETL
-- ============================================================

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS estado          TEXT    DEFAULT 'raw',
  ADD COLUMN IF NOT EXISTS iv              INTEGER,         -- Impacto Visual (1-10)
  ADD COLUMN IF NOT EXISTS nc              INTEGER,         -- Nivel Corporativo (1-10)
  ADD COLUMN IF NOT EXISTS gap_coherencia  TEXT,            -- Argumento de venta
  ADD COLUMN IF NOT EXISTS ticket_ajustado BIGINT,          -- Ticket ajustado por auditor
  ADD COLUMN IF NOT EXISTS auditado_at     TIMESTAMPTZ;     -- Fecha de auditoría

-- Índice para filtrar por estado (la query más frecuente)
CREATE INDEX IF NOT EXISTS idx_signals_estado ON public.signals (estado);

-- Índice para ordenar por score descendente
CREATE INDEX IF NOT EXISTS idx_signals_score ON public.signals (score DESC);
