import os
from dotenv import load_dotenv
from supabase import create_client

# 1. Cargar entorno
print("--- INICIANDO DIAGNÓSTICO ---")
load_dotenv()

# 2. Leer variables
url = os.getenv("SUPABASE_URL")
key = os.getenv("SUPABASE_KEY")

# 3. Analizar URL
print(f"\n1. VERIFICANDO URL:")
if not url:
    print("❌ ERROR: La variable SUPABASE_URL está vacía o no existe.")
else:
    print(f"✅ URL detectada: {url}")
    if " " in url:
        print("❌ ALERTA CRÍTICA: La URL contiene espacios en blanco. ¡Bórralos!")

# 4. Analizar KEY
print(f"\n2. VERIFICANDO KEY:")
if not key:
    print("❌ ERROR: La variable SUPABASE_KEY está vacía o no existe.")
else:
    print(f"✅ Key detectada (Longitud: {len(key)} caracteres)")
    print(f"   Inicio: {key[:10]}...")
    print(f"   Fin: ...{key[-10:]}")
    
    if " " in key:
        print("❌ ALERTA CRÍTICA: La Key contiene espacios en blanco. ¡Debes borrar los espacios!")
    if key.count("eyJ") > 1:
        print("❌ ALERTA CRÍTICA: Parece que pegaste la llave dos veces (veo 'eyJ' repetido).")

# 5. Prueba de Conexión Real
print(f"\n3. PRUEBA DE CONEXIÓN A SUPABASE:")
if url and key and " " not in url and " " not in key:
    try:
        supabase = create_client(url, key)
        # Intentar leer algo simple
        print("⏳ Conectando...")
        response = supabase.table('categorias_tributarias').select("count", count='exact').execute()
        print("🎉 ¡CONEXIÓN EXITOSA! Supabase respondió.")
        print(f"   Datos recibidos: {response}")
    except Exception as e:
        print(f"❌ FALLÓ LA CONEXIÓN: {e}")
else:
    print("⚠️ No se puede probar conexión hasta arreglar las variables del .env")

print("\n--- FIN DEL DIAGNÓSTICO ---")