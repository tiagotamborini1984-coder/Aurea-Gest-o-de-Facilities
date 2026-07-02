import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as XLSX from 'xlsx'

function getField(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null && String(row[key]).trim() !== '') {
      return String(row[key]).trim()
    }
    const lowerKey = key.toLowerCase()
    for (const rowKey of Object.keys(row)) {
      if (rowKey.toLowerCase() === lowerKey && String(row[rowKey]).trim() !== '') {
        return String(row[rowKey]).trim()
      }
    }
  }
  return ''
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? ''

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')

    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('client_id, role')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) throw new Error('Profile not found')
    if (!profile.client_id) throw new Error('User has no client associated')

    const clientId = profile.client_id

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) throw new Error('No file provided')

    const fileBuffer = await file.arrayBuffer()
    const workbook = XLSX.read(fileBuffer, { type: 'array' })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('No sheets found in file')

    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'File is empty or has no data rows', inserted: 0, skipped: 0, total: 0, errors: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const products: Record<string, any>[] = []
    const errors: string[] = []

    rows.forEach((row, index) => {
      const name = getField(row, ['name', 'nome', 'Name', 'Nome'])
      if (!name) {
        errors.push(`Linha ${index + 2}: Nome é obrigatório`)
        return
      }

      const category = getField(row, ['category', 'categoria', 'Category']) || null
      const description = getField(row, ['description', 'descricao', 'descrição', 'Description']) || null
      const fsCode = getField(row, ['fs_code', 'codigo_fs', 'código_fs', 'FS']) || null
      const supplyCode = getField(row, ['supply_code', 'codigo_supply', 'código_supply', 'Supply']) || null
      const unitOfMeasure = getField(row, ['unit_of_measure', 'unidade', 'unidade_medida', 'Un']) || null
      const itemValueStr = getField(row, ['item_value', 'valor', 'valor_unitario', 'valor_unitário', 'Value'])
      const itemValue = itemValueStr ? parseFloat(itemValueStr.replace(',', '.')) || 0 : 0

      products.push({ client_id: clientId, name, category, description, fs_code: fsCode, supply_code: supplyCode, unit_of_measure: unitOfMeasure, item_value: itemValue })
    })

    if (products.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No valid products found', inserted: 0, skipped: 0, total: rows.length, errors }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: existing } = await userClient
      .from('inventory_products')
      .select('name, supply_code')
      .eq('client_id', clientId)

    const existingNames = new Set((existing || []).map((p: any) => p.name.toLowerCase()))
    const existingCodes = new Set((existing || []).filter((p: any) => p.supply_code).map((p: any) => p.supply_code))

    const newProducts = products.filter((p) => {
      if (p.supply_code && existingCodes.has(p.supply_code)) return false
      if (existingNames.has(p.name.toLowerCase())) return false
      return true
    })

    const skipped = products.length - newProducts.length

    const { data: existingCats } = await userClient
      .from('inventory_categories')
      .select('name')
      .eq('client_id', clientId)

    const existingCatNames = new Set((existingCats || []).map((c: any) => c.name.toLowerCase()))
    const newCategories = new Set<string>()
    products.forEach((p) => {
      if (p.category && !existingCatNames.has(p.category.toLowerCase())) {
        newCategories.add(p.category)
      }
    })

    if (newCategories.size > 0) {
      const catInserts = Array.from(newCategories).map((name) => ({ client_id: clientId, name }))
      await userClient.from('inventory_categories').insert(catInserts)
    }

    let inserted = 0
    const batchSize = 500
    for (let i = 0; i < newProducts.length; i += batchSize) {
      const batch = newProducts.slice(i, i + batchSize)
      const { data: insertData, error: insertError } = await userClient
        .from('inventory_products')
        .insert(batch)
        .select('id')

      if (insertError) throw insertError
      inserted += insertData?.length || 0
    }

    return new Response(
      JSON.stringify({ success: true, inserted, skipped, total: products.length, errors }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({ success: false, error: error.message, inserted: 0, skipped: 0, total: 0, errors: [] }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
