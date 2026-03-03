-- ============================================================
-- MIGRACIÓN 003: Columnas operacionales en tabla signals
-- Añade campos que el ETL ingest-mp.cjs escribe directamente
-- (en lugar de almacenarlos sólo en raw_data JSONB)
-- ============================================================

ALTER TABLE public.signals
  ADD COLUMN IF NOT EXISTS nombre       TEXT,
  ADD COLUMN IF NOT EXISTS monto        BIGINT,
  ADD COLUMN IF NOT EXISTS score        INTEGER,
  ADD COLUMN IF NOT EXISTS fecha_cierre TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS capturado_at TIMESTAMPTZ DEFAULT NOW();

-- Índice para ordenar por score (útil para RadarDesk)
CREATE INDEX IF NOT EXISTS idx_signals_score ON public.signals (score DESC NULLS LAST);

-- Índice para ordenar por fecha de captura
CREATE INDEX IF NOT EXISTS idx_signals_capturado ON public.signals (capturado_at DESC);
