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

function parseItemValue(valueStr: string): { value: number; error?: string } {
  if (!valueStr) return { value: 0 }
  const cleaned = valueStr.trim().replace(/[^\d.,-]/g, '')
  if (!cleaned) return { value: 0 }

  const hasComma = cleaned.includes(',')
  const hasDot = cleaned.includes('.')

  let normalized: string
  if (hasComma && hasDot) {
    if (cleaned.lastIndexOf(',') > cleaned.lastIndexOf('.')) {
      normalized = cleaned.replace(/\./g, '').replace(',', '.')
    } else {
      normalized = cleaned.replace(/,/g, '')
    }
  } else if (hasComma) {
    normalized = cleaned.replace(',', '.')
  } else {
    normalized = cleaned
  }

  const parsed = parseFloat(normalized)
  if (isNaN(parsed)) {
    return { value: 0, error: `Valor inválido: "${valueStr}"` }
  }
  return { value: parsed }
}

interface ParsedProduct {
  client_id: string
  name: string
  category: string | null
  description: string | null
  fs_code: string | null
  supply_code: string | null
  unit_of_measure: string | null
  item_value: number
  row_number: number
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

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
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
    const workbook = XLSX.read(fileBuffer, { type: 'array', codepage: 65001 })
    const sheetName = workbook.SheetNames[0]
    if (!sheetName) throw new Error('No sheets found in file')

    const worksheet = workbook.Sheets[sheetName]
    const rows = XLSX.utils.sheet_to_json<Record<string, any>>(worksheet, { defval: '' })

    if (rows.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'File is empty or has no data rows',
          inserted: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          errors: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const products: ParsedProduct[] = []
    const errors: string[] = []

    rows.forEach((row, index) => {
      const rowNumber = index + 2
      const name = getField(row, ['name', 'nome', 'Name', 'Nome'])
      if (!name) {
        errors.push(`Linha ${rowNumber}: Coluna 'name' ausente ou vazia`)
        return
      }

      const category = getField(row, ['category', 'categoria', 'Category']) || null
      const description =
        getField(row, ['description', 'descricao', 'descrição', 'Description']) || null
      const fsCode = getField(row, ['fs_code', 'codigo_fs', 'código_fs', 'FS']) || null
      const supplyCode =
        getField(row, ['supply_code', 'codigo_supply', 'código_supply', 'Supply']) || null
      const unitOfMeasure =
        getField(row, ['unit_of_measure', 'unidade', 'unidade_medida', 'Un']) || null
      const itemValueStr = getField(row, [
        'item_value',
        'valor',
        'valor_unitario',
        'valor_unitário',
        'Value',
      ])

      let itemValue = 0
      if (itemValueStr) {
        const parsed = parseItemValue(itemValueStr)
        if (parsed.error) {
          errors.push(`Linha ${rowNumber}: ${parsed.error}`)
        }
        itemValue = parsed.value
      }

      products.push({
        client_id: clientId,
        name,
        category,
        description,
        fs_code: fsCode,
        supply_code: supplyCode,
        unit_of_measure: unitOfMeasure,
        item_value: itemValue,
        row_number: rowNumber,
      })
    })

    if (products.length === 0) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'No valid products found',
          inserted: 0,
          updated: 0,
          skipped: 0,
          total: rows.length,
          errors,
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
      )
    }

    const { data: existing } = await userClient
      .from('inventory_products')
      .select('id, name, supply_code')
      .eq('client_id', clientId)

    const existingBySupplyCode = new Map<string, string>()
    const existingNames = new Set<string>()

    for (const p of existing || []) {
      if (p.supply_code) {
        existingBySupplyCode.set(p.supply_code, p.id)
      }
      existingNames.add(p.name.toLowerCase())
    }

    const toUpsert: ParsedProduct[] = []
    const toInsert: ParsedProduct[] = []
    let skipped = 0

    for (const product of products) {
      if (product.supply_code) {
        toUpsert.push(product)
      } else if (existingNames.has(product.name.toLowerCase())) {
        skipped++
      } else {
        toInsert.push(product)
      }
    }

    const { data: existingCats } = await userClient
      .from('inventory_categories')
      .select('name')
      .eq('client_id', clientId)

    const existingCatNames = new Set((existingCats || []).map((c: any) => c.name.toLowerCase()))
    const newCategories = new Set<string>()
    for (const p of products) {
      if (p.category && !existingCatNames.has(p.category.toLowerCase())) {
        newCategories.add(p.category)
      }
    }

    if (newCategories.size > 0) {
      const catInserts = Array.from(newCategories).map((name) => ({ client_id: clientId, name }))
      const { error: catError } = await userClient
        .from('inventory_categories')
        .upsert(catInserts, { onConflict: 'client_id,name' })
      if (catError) {
        errors.push(`Aviso: Algumas categorias podem não ter sido criadas (${catError.message})`)
      }
    }

    let inserted = 0
    let updated = 0
    const batchSize = 100

    const stripMeta = (p: ParsedProduct) => {
      const { row_number, ...rest } = p
      return rest
    }

    for (let i = 0; i < toUpsert.length; i += batchSize) {
      const batchSlice = toUpsert.slice(i, i + batchSize)
      const batch = batchSlice.map(stripMeta)
      const firstRow = batchSlice[0]?.row_number ?? 0
      const lastRow = batchSlice[batchSlice.length - 1]?.row_number ?? 0
      const batchExistingCount = batchSlice.filter(
        (p) => p.supply_code && existingBySupplyCode.has(p.supply_code),
      ).length

      const { data: upsertData, error: upsertError } = await userClient
        .from('inventory_products')
        .upsert(batch, { onConflict: 'client_id,supply_code' })
        .select('id, supply_code')

      if (upsertError) {
        errors.push(`Linha ${firstRow}-${lastRow}: ${upsertError.message}`)
      } else if (upsertData) {
        updated += batchExistingCount
        inserted += upsertData.length - batchExistingCount
        for (const item of upsertData) {
          if (item.supply_code) {
            existingBySupplyCode.set(item.supply_code, item.id)
          }
        }
      }
    }

    for (let i = 0; i < toInsert.length; i += batchSize) {
      const batchSlice = toInsert.slice(i, i + batchSize)
      const batch = batchSlice.map(stripMeta)
      const firstRow = batchSlice[0]?.row_number ?? 0
      const lastRow = batchSlice[batchSlice.length - 1]?.row_number ?? 0

      const { data: insertData, error: insertError } = await userClient
        .from('inventory_products')
        .insert(batch)
        .select('id')

      if (insertError) {
        errors.push(`Linha ${firstRow}-${lastRow}: ${insertError.message}`)
      } else {
        inserted += insertData?.length || 0
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        inserted,
        updated,
        skipped,
        total: products.length,
        errors,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  } catch (error: any) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
      }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    )
  }
})
