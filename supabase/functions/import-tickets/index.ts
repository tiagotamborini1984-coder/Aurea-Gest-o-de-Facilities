import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as XLSX from 'npm:xlsx@0.18.5'

const BATCH_SIZE = 50

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

function jsonRes(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

const norm = (s: string) => s.trim().toLowerCase()

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
      .select('client_id, email, name')
      .eq('id', user.id)
      .single()
    if (profileError || !profile?.client_id) throw new Error('Profile or client not found')
    const clientId = profile.client_id
    const requesterName = profile.name || profile.email

    const formData = await req.formData()
    const file = formData.get('file')
    if (!file || !(file instanceof File)) throw new Error('Nenhum arquivo fornecido')

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
      if (!sheet) throw new Error('Nenhuma planilha encontrada no arquivo')
      rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    } else {
      const wb = XLSX.read(buf, { type: 'array', codepage: 65001 })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('Nenhuma planilha encontrada no arquivo')
      rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    }

    // skip empty rows
    rows = rows.filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== ''))

    if (rows.length === 0) {
      return jsonRes(
        {
          success: false,
          error: 'Arquivo vazio ou sem dados',
          inserted: 0,
          updated: 0,
          skipped: 0,
          total: 0,
          errors: [],
        },
        200,
      )
    }

    // Fetch reference data
    const [
      { data: plants },
      { data: priorities },
      { data: types },
      { data: statuses },
      { data: areas },
      { data: assets },
    ] = await Promise.all([
      userClient.from('plants').select('id, name').eq('client_id', clientId),
      userClient.from('maintenance_priorities').select('id, name').eq('client_id', clientId),
      userClient.from('maintenance_types').select('id, name').eq('client_id', clientId),
      userClient
        .from('maintenance_statuses')
        .select('id, name, step')
        .eq('client_id', clientId)
        .order('order_index'),
      userClient.from('maintenance_areas').select('id, name, plant_id').eq('client_id', clientId),
      userClient
        .from('maintenance_assets')
        .select('id, name, plant_id, area_id')
        .eq('client_id', clientId),
    ])

    const errors: string[] = []
    const ticketsToInsert: any[] = []

    const defaultStatus = statuses?.find((s: any) => s.step === 'Aberto') || statuses?.[0]

    // Get highest ticket number
    const year = new Date().getFullYear()
    const { data: latest } = await userClient
      .from('maintenance_tickets')
      .select('ticket_number')
      .eq('client_id', clientId)
      .like('ticket_number', `MAN-${year}-%`)
      .order('created_at', { ascending: false })
      .limit(1)

    let seq = latest?.length ? parseInt(latest[0].ticket_number.split('-')[2], 10) : 0

    rows.forEach((row, i) => {
      const rn = i + 2

      const title = getField(row, ['título', 'titulo', 'title'])
      const description = getField(row, ['descrição', 'descricao', 'description'])
      const priorityName = getField(row, ['prioridade', 'priority'])
      const dateStr = getField(row, ['data de abertura', 'data', 'reported_at', 'date'])
      const statusName = getField(row, ['status', 'situação'])
      const areaName = getField(row, ['área', 'area', 'setor'])
      const typeName = getField(row, ['tipo', 'type'])
      const assetName = getField(row, ['ativo', 'equipamento', 'asset'])

      if (!description && !title) {
        errors.push(`Linha ${rn}: Coluna 'Descrição' ou 'Título' ausente ou vazia`)
        return
      }

      // References
      let priorityId = null
      if (priorityName && priorities) {
        const found = priorities.find((p: any) => norm(p.name) === norm(priorityName))
        if (found) priorityId = found.id
        else errors.push(`Linha ${rn}: Prioridade '${priorityName}' não encontrada`)
      }

      let typeId = null
      if (typeName && types) {
        const found = types.find((t: any) => norm(t.name) === norm(typeName))
        if (found) typeId = found.id
        else errors.push(`Linha ${rn}: Tipo '${typeName}' não encontrado`)
      }

      let statusId = defaultStatus?.id
      if (statusName && statuses) {
        const found = statuses.find((s: any) => norm(s.name) === norm(statusName))
        if (found) statusId = found.id
        else errors.push(`Linha ${rn}: Status '${statusName}' não encontrado`)
      }

      let areaId = null
      let plantId = plants?.[0]?.id // Fallback to first plant
      if (areaName && areas) {
        const found = areas.find((a: any) => norm(a.name) === norm(areaName))
        if (found) {
          areaId = found.id
          plantId = found.plant_id
        } else {
          errors.push(`Linha ${rn}: Área '${areaName}' não encontrada`)
        }
      }

      let assetId = null
      if (assetName && assets) {
        const found = assets.find((a: any) => norm(a.name) === norm(assetName))
        if (found) {
          assetId = found.id
          if (!areaId && found.area_id) areaId = found.area_id
          if (!plantId && found.plant_id) plantId = found.plant_id
        } else errors.push(`Linha ${rn}: Ativo '${assetName}' não encontrado`)
      }

      if (!plantId) {
        errors.push(
          `Linha ${rn}: Nenhuma planta definida ou encontrada. Especifique uma Área válida.`,
        )
        return
      }

      let reportedAt = new Date().toISOString()
      if (dateStr) {
        let d = new Date(dateStr)
        if (isNaN(d.getTime())) {
          const parts = dateStr.split('/')
          if (parts.length === 3) {
            d = new Date(`${parts[2]}-${parts[1]}-${parts[0]}T12:00:00Z`)
          }
        }
        if (!isNaN(d.getTime())) reportedAt = d.toISOString()
        else errors.push(`Linha ${rn}: Data inválida '${dateStr}'`)
      }

      seq++
      const ticketNumber = `MAN-${year}-${seq.toString().padStart(4, '0')}`

      ticketsToInsert.push({
        client_id: clientId,
        plant_id: plantId,
        area_id: areaId,
        asset_id: assetId,
        type_id: typeId,
        priority_id: priorityId,
        status_id: statusId,
        ticket_number: ticketNumber,
        title: title || '',
        description: description || title || '',
        reported_at: reportedAt,
        origin: 'Manual',
        requester_name: requesterName,
      })
    })

    if (ticketsToInsert.length === 0) {
      return jsonRes(
        {
          success: false,
          error: 'Nenhum chamado válido para importar. Verifique os erros.',
          inserted: 0,
          updated: 0,
          skipped: 0,
          total: rows.length,
          errors,
        },
        200,
      )
    }

    let inserted = 0
    let updated = 0
    let skipped = 0

    // Insert batches
    for (let i = 0; i < ticketsToInsert.length; i += BATCH_SIZE) {
      const batch = ticketsToInsert.slice(i, i + BATCH_SIZE)
      const { data, error } = await userClient.from('maintenance_tickets').insert(batch)

      if (error) {
        errors.push(`Erro ao inserir lote: ${error.message}`)
      } else {
        inserted += batch.length
      }
    }

    if (inserted === 0 && errors.length > 0) {
      return jsonRes(
        {
          success: false,
          error: 'Falha na importação. Verifique os erros.',
          inserted,
          updated,
          skipped,
          total: rows.length,
          errors,
        },
        200,
      )
    }

    return jsonRes({ success: true, inserted, updated, skipped, total: rows.length, errors }, 200)
  } catch (error: any) {
    console.error('Import error:', error)
    return jsonRes(
      {
        success: false,
        error: error.message || 'Erro interno no processamento',
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
