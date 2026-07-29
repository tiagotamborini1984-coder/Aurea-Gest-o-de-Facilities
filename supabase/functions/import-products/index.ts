import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as XLSX from 'npm:xlsx@0.18.5'

const BATCH_SIZE = 75

function getField(row: Record<string, any>, keys: string[]): string {
  for (const key of keys) {
    if (row[key] != null && String(row[key]).trim()) return String(row[key]).trim()
    const lk = key.toLowerCase()
    for (const rk of Object.keys(row)) {
      if (rk.toLowerCase() === lk && String(row[rk]).trim()) return String(row[rk]).trim()
    }
  }
  return ''
}

function parseValue(s: string): { value: number; valid: boolean } {
  const c = s.trim().replace(/[^\d.,-]/g, '')
  if (!c) return { value: 0, valid: true }
  const hasC = c.includes(','),
    hasD = c.includes('.')
  let n: string
  if (hasC && hasD)
    n =
      c.lastIndexOf(',') > c.lastIndexOf('.')
        ? c.replace(/\./g, '').replace(',', '.')
        : c.replace(/,/g, '')
  else if (hasC) n = c.replace(',', '.')
  else n = c
  const v = parseFloat(n)
  return { value: isNaN(v) ? 0 : v, valid: !isNaN(v) }
}

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function normalizeCategoryName(s: string): string {
  if (!s) return ''
  return s
    .replace(/[\u200B\u200C\u200D\u200E\u200F\uFEFF\u00AD]/g, '')
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, '')
    .replace(/[\u2018\u2019\u201A\u201B]/g, "'")
    .replace(/[\u201C\u201D\u201E\u201F]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/[\u00A0\u2000-\u200A\u2028\u2029\u202F\u205F\u3000]/g, ' ')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

function snapshotProduct(p: any): any {
  if (!p) return null
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    category: p.category,
    unit_of_measure: p.unit_of_measure,
    image_url: p.image_url,
    sds_url: p.sds_url,
    fs_code: p.fs_code,
    supply_code: p.supply_code,
    item_value: p.item_value,
    is_active: p.is_active,
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) throw new Error('Missing Authorization header')
    const userClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: { headers: { Authorization: authHeader } },
      },
    )
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser()
    if (authError || !user) throw new Error('Unauthorized')
    const { data: profile, error: profileError } = await userClient
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    if (profileError || !profile?.client_id) throw new Error('Profile or client not found')
    const clientId = profile.client_id

    const formData = await req.formData()
    const file = formData.get('file')
    const plantId = (formData.get('plant_id') as string) || null
    if (!file || !(file instanceof File)) throw new Error('No file provided')

    const buf = await file.arrayBuffer()
    const isCsv = file.name.toLowerCase().endsWith('.csv')
    let rows: Record<string, any>[] = []

    if (isCsv) {
      const text = new TextDecoder('utf-8').decode(buf)
      const firstLine = text.split('\n')[0] || ''
      const useSemi = (firstLine.match(/;/g) || []).length > (firstLine.match(/,/g) || []).length
      const wb = XLSX.read(useSemi ? text.replace(/;/g, ',') : text, {
        type: 'string',
        codepage: 65001,
      })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('No sheets found')
      rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    } else {
      const wb = XLSX.read(buf, { type: 'array', codepage: 65001 })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('No sheets found')
      rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    }

    if (rows.length === 0)
      return jsonRes({
        success: false,
        error: 'File is empty',
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
      })

    const errors: string[] = []
    const products: any[] = []
    rows.forEach((row, i) => {
      const rn = i + 2
      const name = getField(row, ['name', 'nome', 'Name', 'Nome'])
      if (!name) {
        errors.push(`Linha ${rn}: Coluna 'name' ausente ou vazia`)
        return
      }
      const valStr = getField(row, [
        'item_value',
        'valor',
        'valor_unitario',
        'valor_unitário',
        'Value',
      ])
      let itemValue = 0
      if (valStr) {
        const pv = parseValue(valStr)
        if (!pv.valid) errors.push(`Linha ${rn}: Valor inválido para item_value: "${valStr}"`)
        itemValue = pv.value
      }
      products.push({
        client_id: clientId,
        name,
        category: getField(row, ['category', 'categoria', 'Category']) || null,
        description:
          getField(row, ['description', 'descricao', 'descrição', 'Description']) || null,
        fs_code: getField(row, ['fs_code', 'codigo_fs', 'código_fs', 'FS']) || null,
        supply_code:
          getField(row, ['supply_code', 'codigo_supply', 'código_supply', 'Supply']) || null,
        unit_of_measure:
          getField(row, ['unit_of_measure', 'unidade', 'unidade_medida', 'Un']) || null,
        item_value: itemValue,
        sds_url: getField(row, ['sds_url', 'fds_url', 'fds', 'sds']) || null,
        image_url: getField(row, ['image_url', 'imagem_url', 'imagem']) || null,
        is_active: true,
        row_number: rn,
      })
    })

    if (products.length === 0)
      return jsonRes({
        success: false,
        error: 'No valid products',
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: rows.length,
        errors,
      })

    const { data: existingCats } = await userClient
      .from('inventory_categories')
      .select('name')
      .eq('client_id', clientId)
    const catSet = new Set((existingCats || []).map((c: any) => normalizeCategoryName(c.name)))
    const newCats = new Set<string>()
    for (const p of products) {
      if (p.category && !catSet.has(normalizeCategoryName(p.category))) newCats.add(p.category)
    }
    if (newCats.size > 0) {
      await userClient.from('inventory_categories').upsert(
        Array.from(newCats).map((name) => ({ client_id: clientId, name })),
        { onConflict: 'client_id,name' },
      )
    }

    const { data: existing } = await userClient
      .from('inventory_products')
      .select('*')
      .eq('client_id', clientId)

    const exSupplyFull = new Map<string, any>()
    const exFsFull = new Map<string, any>()
    const exNamesFull = new Map<string, any>()
    const exSupply = new Map<string, string>()
    const exFs = new Map<string, string>()
    const exNames = new Set<string>()

    for (const p of existing || []) {
      if (p.supply_code) {
        exSupplyFull.set(p.supply_code, p)
        exSupply.set(p.supply_code, p.id)
      }
      if (p.fs_code) {
        exFsFull.set(p.fs_code, p)
        exFs.set(p.fs_code, p.id)
      }
      exNamesFull.set(p.name.toLowerCase(), p)
      exNames.add(p.name.toLowerCase())
    }

    const strip = (p: any) => {
      const { row_number, ...rest } = p
      return rest
    }
    let inserted = 0,
      updated = 0,
      skipped = 0
    const insertedProductIds: string[] = []
    const updatedProductsLog: { product_id: string; previous_state: any }[] = []

    const bySupply = products.filter((p) => p.supply_code)
    for (let i = 0; i < bySupply.length; i += BATCH_SIZE) {
      const batch = bySupply.slice(i, i + BATCH_SIZE)
      const existed = batch.filter((p) => exSupply.has(p.supply_code)).length
      const { data, error } = await userClient
        .from('inventory_products')
        .upsert(batch.map(strip), { onConflict: 'client_id,supply_code' })
        .select('id, supply_code')
      if (error) {
        for (const p of batch) {
          const { data: idata, error: ie } = await userClient
            .from('inventory_products')
            .upsert(strip(p), { onConflict: 'client_id,supply_code' })
            .select('id')
          if (ie) {
            errors.push(`Linha ${p.row_number}: ${ie.message}`)
          } else {
            if (exSupply.has(p.supply_code!)) {
              updated++
              const prev = exSupplyFull.get(p.supply_code!)
              if (prev && idata?.[0]?.id)
                updatedProductsLog.push({
                  product_id: idata[0].id,
                  previous_state: snapshotProduct(prev),
                })
            } else {
              inserted++
              if (idata?.[0]?.id) insertedProductIds.push(idata[0].id)
            }
          }
        }
      } else if (data) {
        updated += existed
        inserted += data.length - existed
        for (const item of data) {
          if (item.supply_code) {
            const prev = exSupplyFull.get(item.supply_code)
            if (prev) {
              updatedProductsLog.push({
                product_id: item.id,
                previous_state: snapshotProduct(prev),
              })
            } else {
              insertedProductIds.push(item.id)
            }
            exSupply.set(item.supply_code, item.id)
          }
        }
      }
    }

    const byFs = products.filter((p) => !p.supply_code && p.fs_code)
    for (let i = 0; i < byFs.length; i += BATCH_SIZE) {
      const batch = byFs.slice(i, i + BATCH_SIZE)
      const existed = batch.filter((p) => exFs.has(p.fs_code)).length
      const { data, error } = await userClient
        .from('inventory_products')
        .upsert(batch.map(strip), { onConflict: 'client_id,fs_code' })
        .select('id, fs_code')
      if (error) {
        for (const p of batch) {
          const { data: idata, error: ie } = await userClient
            .from('inventory_products')
            .upsert(strip(p), { onConflict: 'client_id,fs_code' })
            .select('id')
          if (ie) {
            errors.push(`Linha ${p.row_number}: ${ie.message}`)
          } else {
            if (exFs.has(p.fs_code!)) {
              updated++
              const prev = exFsFull.get(p.fs_code!)
              if (prev && idata?.[0]?.id)
                updatedProductsLog.push({
                  product_id: idata[0].id,
                  previous_state: snapshotProduct(prev),
                })
            } else {
              inserted++
              if (idata?.[0]?.id) insertedProductIds.push(idata[0].id)
            }
          }
        }
      } else if (data) {
        updated += existed
        inserted += data.length - existed
        for (const item of data) {
          if (item.fs_code) {
            const prev = exFsFull.get(item.fs_code)
            if (prev) {
              updatedProductsLog.push({
                product_id: item.id,
                previous_state: snapshotProduct(prev),
              })
            } else {
              insertedProductIds.push(item.id)
            }
            exFs.set(item.fs_code, item.id)
          }
        }
      }
    }

    const toInsert = products.filter((p) => !p.supply_code && !p.fs_code)
    const toInsFiltered = toInsert.filter((p) => {
      if (exNames.has(p.name.toLowerCase())) {
        skipped++
        return false
      }
      return true
    })
    for (let i = 0; i < toInsFiltered.length; i += BATCH_SIZE) {
      const batch = toInsFiltered.slice(i, i + BATCH_SIZE)
      const { data, error } = await userClient
        .from('inventory_products')
        .insert(batch.map(strip))
        .select('id')
      if (error) {
        for (const p of batch) {
          const { data: idata, error: ie } = await userClient
            .from('inventory_products')
            .insert(strip(p))
            .select('id')
          if (ie) {
            errors.push(`Linha ${p.row_number}: ${ie.message}`)
          } else {
            inserted++
            if (idata?.[0]?.id) insertedProductIds.push(idata[0].id)
          }
        }
      } else {
        inserted += data?.length || 0
        for (const item of data || []) {
          if (item.id) insertedProductIds.push(item.id)
        }
      }
    }

    if (insertedProductIds.length > 0 || updatedProductsLog.length > 0) {
      const { error: logError } = await userClient.from('import_logs').insert({
        client_id: clientId,
        plant_id: plantId,
        module: 'inventory',
        created_by: user.id,
        total_products: inserted + updated,
        inserted_products: insertedProductIds,
        updated_products: updatedProductsLog,
        action_type: 'upsert',
      })
      if (logError) console.error('Failed to log import:', logError)
    }

    return jsonRes(
      { success: true, inserted, updated, skipped, total: products.length, errors },
      200,
    )
  } catch (error: any) {
    console.error('Import products error:', error)
    return jsonRes(
      {
        success: false,
        error: error.message,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
      },
      200,
    )
  }
})
