#!/usr/bin/env python3
"""
PLUS CONTROL - VALIDADOR DE CSV DEL SII
========================================
Valida que el archivo CSV descargado del SII tenga el formato correcto
ANTES de intentar importarlo a Supabase.

Uso:
    python validar_csv_sii.py RCV_202601.txt

Este script NO importa datos, solo verifica:
- Encoding correcto
- Separador correcto
- Columnas esperadas presentes
- Formato de RUTs
- Formato de fechas
- Formato de montos
"""

import pandas as pd
import sys
import os
import re
from datetime import datetime

def validar_rut(rut_str):
    """Valida que el RUT tenga formato válido"""
    if pd.isna(rut_str):
        return False
    
    rut = str(rut_str).strip()
    
    # Debe tener al menos un guión
    if '-' not in rut:
        # Puede venir sin guión en algunos casos
        if len(rut) < 2:
            return False
        return True
    
    # Formato típico: 12345678-9
    partes = rut.split('-')
    if len(partes) != 2:
        return False
    
    cuerpo, dv = partes
    
    # El cuerpo debe ser numérico
    if not cuerpo.replace('.', '').isdigit():
        return False
    
    # El DV puede ser número o K
    if not (dv.isdigit() or dv.upper() == 'K'):
        return False
    
    return True


def validar_fecha(fecha_str):
    """Valida formato dd-mm-yyyy"""
    if pd.isna(fecha_str):
        return False
    
    try:
        datetime.strptime(str(fecha_str).strip(), '%d-%m-%Y')
        return True
    except ValueError:
        return False


def validar_monto(monto_str):
    """Valida que el monto sea numérico"""
    if pd.isna(monto_str) or str(monto_str).strip() == '':
        return True  # Montos vacíos son válidos (se convierten a 0)
    
    try:
        float(str(monto_str).strip().replace(',', ''))
        return True
    except ValueError:
        return False


def validar_csv_sii(archivo_csv):
    """
    Valida el archivo CSV del SII
    """
    
    print("="*60)
    print("PLUS CONTROL - VALIDADOR DE CSV DEL SII")
    print("="*60)
    print(f"📂 Archivo: {archivo_csv}\n")
    
    errores = []
    advertencias = []
    
    # ========================================
    # VALIDACIÓN 1: Lectura del archivo
    # ========================================
    print("🔍 Validación 1: Lectura del archivo...")
    
    try:
        # Intentar con TAB (formato esperado)
        df = pd.read_csv(archivo_csv, sep='\t', encoding='latin1', nrows=10)
        print(f"   ✅ Archivo leído correctamente con separador TAB")
        print(f"   ✅ Encoding: latin1")
        print(f"   📊 Registros de muestra: {len(df)}")
    except Exception as e:
        errores.append(f"No se pudo leer el archivo: {e}")
        print(f"   ❌ Error al leer archivo: {e}")
        return
    
    # ========================================
    # VALIDACIÓN 2: Columnas esperadas
    # ========================================
    print("\n🔍 Validación 2: Columnas esperadas...")
    
    columnas_esperadas = {
        'Tipo Doc': 'Obligatoria',
        'Folio': 'Obligatoria',
        'Fecha Docto': 'Obligatoria',
        'RUT Proveedor': 'Obligatoria',
        'Razon Social': 'Obligatoria',
        'Monto Neto': 'Obligatoria',
        'Monto IVA Recuperable': 'Obligatoria',
        'Monto Exento': 'Opcional',
        'Monto Total': 'Obligatoria'
    }
    
    columnas_archivo = df.columns.tolist()
    
    print(f"   📋 Columnas en el archivo: {len(columnas_archivo)}")
    
    for col_esperada, tipo in columnas_esperadas.items():
        if col_esperada in columnas_archivo:
            print(f"   ✅ {col_esperada} - Encontrada")
        else:
            if tipo == 'Obligatoria':
                errores.append(f"Falta columna obligatoria: {col_esperada}")
                print(f"   ❌ {col_esperada} - FALTA (Obligatoria)")
            else:
                advertencias.append(f"Falta columna opcional: {col_esperada}")
                print(f"   ⚠️ {col_esperada} - Falta (Opcional)")
    
    # ========================================
    # VALIDACIÓN 3: Formato de datos
    # ========================================
    print("\n🔍 Validación 3: Formato de datos (muestra de 10 registros)...")
    
    # Leer el archivo completo para validación
    df_completo = pd.read_csv(archivo_csv, sep='\t', encoding='latin1')
    
    # Validar RUTs
    if 'RUT Proveedor' in df_completo.columns:
        ruts_validos = df_completo['RUT Proveedor'].apply(validar_rut)
        porcentaje_validos = (ruts_validos.sum() / len(df_completo)) * 100
        
        if porcentaje_validos < 90:
            errores.append(f"Solo {porcentaje_validos:.1f}% de RUTs tienen formato válido")
            print(f"   ❌ RUTs: Solo {porcentaje_validos:.1f}% válidos")
        else:
            print(f"   ✅ RUTs: {porcentaje_validos:.1f}% válidos")
    
    # Validar Fechas
    if 'Fecha Docto' in df_completo.columns:
        fechas_validas = df_completo['Fecha Docto'].apply(validar_fecha)
        porcentaje_validos = (fechas_validas.sum() / len(df_completo)) * 100
        
        if porcentaje_validos < 90:
            errores.append(f"Solo {porcentaje_validos:.1f}% de fechas tienen formato válido (esperado: dd-mm-yyyy)")
            print(f"   ❌ Fechas: Solo {porcentaje_validos:.1f}% válidas")
        else:
            print(f"   ✅ Fechas: {porcentaje_validos:.1f}% válidas (formato dd-mm-yyyy)")
    
    # Validar Montos
    if 'Monto Total' in df_completo.columns:
        montos_validos = df_completo['Monto Total'].apply(validar_monto)
        porcentaje_validos = (montos_validos.sum() / len(df_completo)) * 100
        
        if porcentaje_validos < 90:
            errores.append(f"Solo {porcentaje_validos:.1f}% de montos tienen formato válido")
            print(f"   ❌ Montos: Solo {porcentaje_validos:.1f}% válidos")
        else:
            print(f"   ✅ Montos: {porcentaje_validos:.1f}% válidos")
    
    # ========================================
    # VALIDACIÓN 4: Tipos de documento
    # ========================================
    print("\n🔍 Validación 4: Tipos de documento (DTE)...")
    
    if 'Tipo Doc' in df_completo.columns:
        tipos_dte = df_completo['Tipo Doc'].value_counts()
        print(f"   📊 Distribución de tipos de DTE:")
        for tipo, cantidad in tipos_dte.items():
            nombre_dte = {
                33: 'Factura Afecta',
                34: 'Factura Exenta',
                61: 'Nota de Crédito',
                56: 'Nota de Débito',
                46: 'Factura de Compra',
                52: 'Guía de Despacho'
            }.get(tipo, f'Tipo {tipo}')
            
            print(f"      - {nombre_dte} (Tipo {tipo}): {cantidad}")
    
    # ========================================
    # VALIDACIÓN 5: Ejemplo de registros
    # ========================================
    print("\n🔍 Validación 5: Muestra de primeros 3 registros...")
    
    columnas_mostrar = ['Tipo Doc', 'Folio', 'RUT Proveedor', 'Razon Social', 'Monto Total']
    columnas_disponibles = [c for c in columnas_mostrar if c in df_completo.columns]
    
    print("\n" + df_completo[columnas_disponibles].head(3).to_string(index=False))
    
    # ========================================
    # RESUMEN FINAL
    # ========================================
    print("\n" + "="*60)
    print("📊 RESUMEN DE VALIDACIÓN")
    print("="*60)
    
    print(f"\n📁 Archivo: {archivo_csv}")
    print(f"📊 Total de registros: {len(df_completo)}")
    print(f"📋 Total de columnas: {len(df_completo.columns)}")
    
    if len(errores) == 0:
        print("\n✅ VALIDACIÓN EXITOSA")
        print("   El archivo está listo para importar a Supabase.")
        print("\n💡 Próximo paso:")
        print(f"   python importar_compras_sii.py {archivo_csv}")
    else:
        print("\n❌ ERRORES ENCONTRADOS:")
        for i, error in enumerate(errores, 1):
            print(f"   {i}. {error}")
        
        print("\n⚠️ El archivo NO puede ser importado hasta resolver estos errores.")
    
    if len(advertencias) > 0:
        print("\n⚠️ ADVERTENCIAS:")
        for i, adv in enumerate(advertencias, 1):
            print(f"   {i}. {adv}")
    
    print("\n" + "="*60)


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("❌ Error: Debes proporcionar el archivo CSV del SII")
        print("\nUso:")
        print("  python validar_csv_sii.py RCV_202601.txt")
        print("  python validar_csv_sii.py archivo_descargado_del_sii.csv")
        sys.exit(1)
    
    archivo = sys.argv[1]
    
    if not os.path.exists(archivo):
        print(f"❌ Error: El archivo '{archivo}' no existe")
        sys.exit(1)
    
    validar_csv_sii(archivo)
