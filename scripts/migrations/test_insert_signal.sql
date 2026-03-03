-- ============================================================
-- TEST: Insertar señal de prueba para verificar Escritorio IA
-- Ejecutar en Supabase SQL Editor DESPUÉS de correr migración 003
-- ============================================================

-- Paso 1: Organización de prueba (sin updated_at, que no existe)
INSERT INTO public.organizations (rut, razon_social, region)
VALUES ('99999999-9', 'Municipalidad de Temuco (TEST)', 'La Araucanía')
ON CONFLICT (rut) DO NOTHING;

-- Paso 2: Tipo de señal
INSERT INTO public.signal_types (name, source, base_weight, display_name, category)
VALUES ('licitacion_publica', 'MercadoPublico', 70, 'Licitación Pública', 'financial_trigger')
ON CONFLICT (name) DO NOTHING;

-- Paso 3: Señal completa de prueba
WITH org AS (
  SELECT id FROM public.organizations WHERE rut = '99999999-9'
),
stype AS (
  SELECT id FROM public.signal_types WHERE name = 'licitacion_publica'
)
INSERT INTO public.signals (
  org_id,
  signal_type_id,
  external_code,
  nombre,
  monto,
  score,
  fecha_cierre,
  capturado_at,
  estado,
  raw_data
)
SELECT
  org.id,
  stype.id,
  'TEST-2026-001',
  'Adquisición de equipos de impresión digital para establecimientos educacionales',
  8500000,
  75,
  NOW() + INTERVAL '7 days',
  NOW(),
  'raw',
  '{"CodigoExternal":"TEST-2026-001","Nombre":"Adquisición de equipos de impresión digital","MontoEstimado":"8500000","Tipo":"LE","Comprador":{"RutUnidad":"99999999-9","NombreOrganismo":"Municipalidad de Temuco (TEST)","RegionUnidad":"La Araucanía"}}'::jsonb
FROM org, stype
ON CONFLICT (external_code) DO UPDATE SET
  nombre = EXCLUDED.nombre,
  monto  = EXCLUDED.monto,
  score  = EXCLUDED.score;

-- Verificar resultado
SELECT
  s.id,
  s.external_code,
  s.nombre,
  s.monto,
  s.score,
  s.estado,
  s.fecha_cierre,
  o.razon_social,
  o.region
FROM public.signals s
JOIN public.organizations o ON o.id = s.org_id
ORDER BY s.capturado_at DESC
LIMIT 5;
