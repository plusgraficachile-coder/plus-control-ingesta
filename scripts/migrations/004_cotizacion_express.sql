-- ============================================================
-- MIGRACIÓN 004: Columnas financieras para Cotización Express
-- ============================================================

ALTER TABLE public.leads_estrategicos
  ADD COLUMN IF NOT EXISTS costo_directo        NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valor_propuesta_final NUMERIC DEFAULT 0,
  ADD COLUMN IF NOT EXISTS margen_minimo_obj     NUMERIC DEFAULT 35,
  ADD COLUMN IF NOT EXISTS forzar_comentario     TEXT,
  ADD COLUMN IF NOT EXISTS utilidad_bruta        NUMERIC GENERATED ALWAYS AS (
    valor_propuesta_final - costo_directo
  ) STORED,
  ADD COLUMN IF NOT EXISTS margen_real           NUMERIC GENERATED ALWAYS AS (
    CASE
      WHEN valor_propuesta_final > 0
      THEN ROUND(((valor_propuesta_final - costo_directo) / valor_propuesta_final) * 100, 1)
      ELSE 0
    END
  ) STORED;
