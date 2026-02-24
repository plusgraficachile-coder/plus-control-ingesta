# Plan corto y operativo — listo para ejecutar

Voy a darte **todo lo que necesitas** para poner ese `ingest-mp.js` en producción: checklist previo, comandos para correr ahora, mejoras rápidas al código (robustez en región y backoff), SQL mínimo para las tablas que usa y una sugerencia de workflow para programarlo.

---

# 1) Checklist previo (obligatorio antes de `git push` / run)

1. Variables de entorno (export / GitHub Secrets):

   * `SUPABASE_URL`
   * `SUPABASE_SERVICE_KEY`
   * `MP_TICKET`
2. Verificar versión Node (≥16).
3. Hacer **backup** de la DB (por si el upsert rompe algo).
4. Comprueba que las tablas existen y tienen índices (SQL abajo).
5. Ejecuta localmente con `DIAS_ATRAS=1` para prueba.

---

# 2) Comandos inmediatos (local)

```bash
# instalar deps
npm ci

# correr prueba para Hoy (1 día)
export SUPABASE_URL="..."
export SUPABASE_SERVICE_KEY="..."
export MP_TICKET="..."
node ingest-mp.js
# observar logs en consola
```

Si usas npm script:

```json
"scripts": { "ingest": "node ingest-mp.js" }
npm run ingest
```

---

# 3) SQL mínimo (crear tablas y índices rápidos)

```sql
-- organizations
CREATE TABLE IF NOT EXISTS organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  rut text,
  razon_social text,
  region text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS organizations_rut_idx ON organizations(rut);

-- signal_types
CREATE TABLE IF NOT EXISTS signal_types (
  id serial PRIMARY KEY,
  name text UNIQUE,
  source text
);

-- signals
CREATE TABLE IF NOT EXISTS signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid REFERENCES organizations(id),
  signal_type_id int REFERENCES signal_types(id),
  external_code text,
  raw_data jsonb,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS signals_org_idx ON signals(org_id);
CREATE UNIQUE INDEX IF NOT EXISTS signals_external_unique ON signals(external_code);
```

Asegura `pgcrypto` para `gen_random_uuid()` o usa `uuid_generate_v4()` según tu setup.

---

# 4) Mejoras recomendadas al script (2 patches cortos)

A) **Normalizar y detectar Región** (manejar tildes / variaciones):

```js
function normalizeText(s='') {
  return s.toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase();
}
// uso:
const region = normalizeText(detail.Comprador?.Region || 'DESCONOCIDA');
if (!region.includes(normalizeText(CONFIG.REGION_TARGET))) return false;
```

B) **Backoff + jitter en reintentos (getDailyList y getLicitacionDetail)**:

```js
async function retry(fn, attempts = 5) {
  for (let i=0;i<attempts;i++){
    try { return await fn(); } 
    catch(e){
      const base = 2000 * Math.pow(2,i); // 2s,4s,8s...
      const jitter = Math.floor(Math.random()*1000);
      await wait(base + jitter);
      if (i === attempts-1) throw e;
    }
  }
}
```

Integra `retry(() => axios.get(...))`.

---

# 5) Observabilidad / métricas (imprescindible)

* Logs: `console.info` para total procesados; `console.warn` para reintentos; `console.error` para fallos irreversibles.
* Métricas mínimas: `total_listas_consultadas`, `total_detalles_ok`, `total_upserts_ok`, `total_retries`.
* Alarma: GitHub Action / cron + webhook a Slack o correo si `total_upserts_ok === 0` por 3 ejecuciones consecutivas.

---

# 6) Git / CI: sugerencia de workflow (GitHub Actions)

```yaml
name: MP Ingest Daily
on:
  schedule:
    - cron: '0 9 * * *'  # 09:00 CLT
jobs:
  ingest:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Setup Node
        uses: actions/setup-node@v4
        with: node-version: '18'
      - name: Install
        run: npm ci
      - name: Run ingest
        env:
          SUPABASE_URL: ${{ secrets.SUPABASE_URL }}
          SUPABASE_SERVICE_KEY: ${{ secrets.SUPABASE_SERVICE_KEY }}
          MP_TICKET: ${{ secrets.MP_TICKET }}
        run: npm run ingest
```

---

# 7) Riesgos detectados y mitigaciones rápidas

* **Error 500 masivo**: mitigado por retry+backoff.
* **Rate limits del MP API**: baja concurrencia (CONCURRENCIA=5) y pausas entre batches. Si ves 429, reduce concurrencia y añade backoff.
* **Upsert duplicados / conflictos**: usa `onConflict` (ya en script) y un índice único en `external_code`.
* **Tamaño `raw_data`**: si es enorme, considerar almacenar solo campos clave y guardar raw en bucket S3 si es >1MB.
* **Falsa región**: usar normalización, fallback a detalle de comprador y geocoding si sigue desconocida.

---

# 8) Paso operativo propuesto ahora (acción concreta)

1. Añade los patches (normalización + retry).
2. Asegura tablas con el SQL.
3. Push y correr local `DIAS_ATRAS=1`.
4. Revisa logs; confirma que salen líneas `🎯 ¡BINGO!` o al menos recuentos.
5. Si OK, activa GitHub Action.

Si quieres, te doy **el diff** exacto para pegar en `ingest-mp.js` con las mejoras (retry + normalize) y el `workflow.yml`. ¿Lo pongo aquí listo para copiar?
