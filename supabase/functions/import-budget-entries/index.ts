import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'
import * as XLSX from 'npm:xlsx@0.18.5'

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
    const referenceMonth = formData.get('reference_month') as string
    const costCenterId = formData.get('cost_center_id') as string

    if (!file || !(file instanceof File)) throw new Error('Nenhum arquivo fornecido')
    if (!referenceMonth) throw new Error('Mês de referência é obrigatório')
    if (!costCenterId) throw new Error('Centro de custo é obrigatório')

    const referenceDate = `${referenceMonth}-01`
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
      if (!sheet) throw new Error('Nenhuma planilha encontrada')
      rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    } else {
      const wb = XLSX.read(buf, { type: 'array', codepage: 65001 })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) throw new Error('Nenhuma planilha encontrada')
      rows = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: '' })
    }

    rows = rows.filter((r) => Object.values(r).some((v) => v != null && String(v).trim() !== ''))

    if (rows.length === 0) {
      return jsonRes({
        success: false,
        error: 'Arquivo vazio ou sem dados',
        inserted: 0,
        updated: 0,
        skipped: 0,
        notFound: 0,
        total: 0,
        errors: [],
        notFoundAccounts: [],
      })
    }

    const allKeys = Object.keys(rows[0])
    const norm = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ')
    const codeKey = allKeys.find((k) => {
      const n = norm(k)
      return (
        n === 'código da conta' ||
        n === 'codigo da conta' ||
        n === 'code' ||
        n === 'código' ||
        n === 'codigo' ||
        n === 'codigo_conta'
      )
    })
    const nameKey = allKeys.find((k) => {
      const n = norm(k)
      return n === 'nome da conta' || n === 'name' || n === 'nome' || n === 'conta'
    })
    const valueKey = allKeys.find((k) => {
      const n = norm(k)
      return (
        n === 'valor realizado' ||
        n === 'realized' ||
        n === 'valor' ||
        n === 'realizado' ||
        n === 'valor_realizado'
      )
    })

    if (!codeKey && !nameKey) {
      return jsonRes({
        success: false,
        error: `Coluna "Código da Conta" ou "Nome da Conta" não encontrada. Colunas detectadas: ${allKeys.join(', ')}`,
        inserted: 0,
        updated: 0,
        skipped: 0,
        notFound: 0,
        total: 0,
        errors: [],
        notFoundAccounts: [],
      })
    }
    if (!valueKey) {
      return jsonRes({
        success: false,
        error: `Coluna "Valor Realizado" não encontrada. Colunas detectadas: ${allKeys.join(', ')}`,
        inserted: 0,
        updated: 0,
        skipped: 0,
        notFound: 0,
        total: 0,
        errors: [],
        notFoundAccounts: [],
      })
    }

    const { data: accounts } = await userClient
      .from('budget_accounts')
      .select('id, code, name')
      .eq('client_id', clientId)

    const accountByCode = new Map<string, string>()
    const accountByName = new Map<string, string>()
    for (const acc of accounts || []) {
      if (acc.code) accountByCode.set(acc.code.toLowerCase(), acc.id)
      if (acc.name) accountByName.set(acc.name.toLowerCase(), acc.id)
    }

    const { data: existingEntries } = await userClient
      .from('budget_entries')
      .select('id, account_id, budgeted_amount')
      .eq('client_id', clientId)
      .eq('cost_center_id', costCenterId)
      .eq('reference_month', referenceDate)

    const entryByAccount = new Map<string, string>()
    for (const e of existingEntries || []) entryByAccount.set(e.account_id, e.id)

    const errors: string[] = []
    const notFoundAccounts: string[] = []
    let updated = 0,
      inserted = 0,
      skipped = 0,
      notFound = 0
    const toInsert: any[] = []

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i]
      const rn = i + 2
      const codeValue = codeKey ? String(row[codeKey] ?? '').trim() : ''
      const nameValue = nameKey ? String(row[nameKey] ?? '').trim() : ''
      const valueStr = String(row[valueKey] ?? '').trim()

      if (!codeValue && !nameValue) {
        errors.push(`Linha ${rn}: Sem código ou nome de conta`)
        skipped++
        continue
      }

      let accountId: string | null = null
      if (codeValue) accountId = accountByCode.get(codeValue.toLowerCase()) || null
      if (!accountId && nameValue) accountId = accountByName.get(nameValue.toLowerCase()) || null

      if (!accountId) {
        notFoundAccounts.push(codeValue || nameValue)
        notFound++
        continue
      }

      const pv = parseValue(valueStr)
      if (!pv.valid) {
        errors.push(`Linha ${rn}: Valor inválido para "${codeValue || nameValue}": "${valueStr}"`)
        skipped++
        continue
      }

      const existingId = entryByAccount.get(accountId)
      if (existingId) {
        const { error: updErr } = await userClient
          .from('budget_entries')
          .update({ realized_amount: pv.value })
          .eq('id', existingId)
        if (updErr) errors.push(`Linha ${rn}: Erro ao atualizar: ${updErr.message}`)
        else updated++
      } else {
        toInsert.push({
          client_id: clientId,
          cost_center_id: costCenterId,
          account_id: accountId,
          reference_month: referenceDate,
          budgeted_amount: 0,
          realized_amount: pv.value,
        })
      }
    }

    for (let i = 0; i < toInsert.length; i += 50) {
      const batch = toInsert.slice(i, i + 50)
      const { error: insErr } = await userClient.from('budget_entries').insert(batch)
      if (insErr) errors.push(`Erro ao inserir lote: ${insErr.message}`)
      else inserted += batch.length
    }

    return jsonRes(
      {
        success: true,
        inserted,
        updated,
        skipped,
        notFound,
        total: rows.length,
        errors,
        notFoundAccounts: notFoundAccounts.slice(0, 50),
      },
      200,
    )
  } catch (error: any) {
    console.error('Import budget entries error:', error)
    return jsonRes(
      {
        success: false,
        error: error.message,
        inserted: 0,
        updated: 0,
        skipped: 0,
        notFound: 0,
        total: 0,
        errors: [],
        notFoundAccounts: [],
      },
      200,
    )
  }
})
