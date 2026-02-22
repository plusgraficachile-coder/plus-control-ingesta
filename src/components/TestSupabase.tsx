// src/components/TestSupabase.tsx

import { supabase } from '@/lib/supabase'
import { useEffect, useState } from 'react'

export default function TestSupabase() {
  const [status, setStatus] = useState('⏳ Iniciando test...')
  const [data, setData] = useState<any>(null)

  useEffect(() => {
    testConnection()
  }, [])

  const testConnection = async () => {
    console.log('🧪 Probando conexión a Supabase...')
    setStatus('🔄 Conectando...')

    try {
      // Test 1: Leer cotizaciones
      const { data: quotes, error: quotesError } = await supabase
        .from('cotizaciones')
        .select('id, folio, estado, cliente_nombre')
        .limit(3)

      if (quotesError) {
        console.error('❌ Error en cotizaciones:', quotesError)
        setStatus(`❌ Error: ${quotesError.message}`)
        return
      }

      // Test 2: Listar buckets de Storage
      const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets()

      if (bucketsError) {
        console.error('⚠️ Advertencia Storage:', bucketsError)
      }

      console.log('✅ Resultados:', { quotes, buckets })
      setData({ quotes, buckets })
      setStatus('✅ Conexión exitosa!')

    } catch (err: any) {
      console.error('💥 Error inesperado:', err)
      setStatus(`💥 Error: ${err.message}`)
    }
  }

  return (
    <div className="min-h-screen bg-gray-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">
          🔌 Test de Conexión Supabase
        </h1>

        {/* STATUS */}
        <div className={`p-4 rounded-lg mb-6 ${
          status.includes('✅') ? 'bg-green-900/20 border border-green-500' :
          status.includes('❌') ? 'bg-red-900/20 border border-red-500' :
          'bg-yellow-900/20 border border-yellow-500'
        }`}>
          <p className="font-mono text-lg">{status}</p>
        </div>

        {/* BOTÓN */}
        <button
          onClick={testConnection}
          className="px-6 py-3 bg-cyan-600 hover:bg-cyan-500 rounded-lg font-bold mb-6"
        >
          🔄 Probar de nuevo
        </button>

        {/* RESULTADOS */}
        {data && (
          <div className="space-y-4">
            <details className="bg-gray-900 p-4 rounded-lg border border-gray-700" open>
              <summary className="cursor-pointer font-bold text-lg mb-2">
                📊 Cotizaciones ({data.quotes?.length || 0})
              </summary>
              <pre className="bg-gray-950 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(data.quotes, null, 2)}
              </pre>
            </details>

            <details className="bg-gray-900 p-4 rounded-lg border border-gray-700">
              <summary className="cursor-pointer font-bold text-lg mb-2">
                🗄️ Storage Buckets ({data.buckets?.length || 0})
              </summary>
              <pre className="bg-gray-950 p-3 rounded text-xs overflow-auto">
                {JSON.stringify(data.buckets, null, 2)}
              </pre>
            </details>
          </div>
        )}

        {/* INFO */}
        <div className="mt-8 p-4 bg-blue-900/20 border border-blue-500 rounded-lg">
          <h3 className="font-bold mb-2">✅ Qué deberías ver:</h3>
          <ul className="text-sm space-y-1 list-disc list-inside text-gray-300">
            <li>Cotizaciones: Lista de órdenes de tu DB</li>
            <li>Storage: Bucket "order-delivery-evidence"</li>
          </ul>
        </div>
      </div>
    </div>
  )
}