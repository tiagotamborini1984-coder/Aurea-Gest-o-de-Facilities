import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import * as XLSX from 'xlsx'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File

    if (!file) {
      return new Response(JSON.stringify({ error: 'Nenhum arquivo fornecido' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const arrayBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(arrayBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    const worksheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' })

    if (!jsonData || jsonData.length < 2) {
      return new Response(JSON.stringify({ error: 'Arquivo vazio ou sem dados' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      })
    }

    const headers = (jsonData[0] as any[]).map((h: any) => String(h ?? '').trim())
    const rows = (jsonData.slice(1) as any[][]).map((row) => {
      const obj: Record<string, any> = {}
      headers.forEach((header, i) => {
        obj[header] = row[i] !== undefined ? row[i] : ''
      })
      return obj
    })

    return new Response(JSON.stringify({ headers, rows }), {
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    })
  }
})
