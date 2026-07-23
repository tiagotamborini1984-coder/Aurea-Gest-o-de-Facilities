import { supabase } from '@/lib/supabase/client'

export interface ParsedExcelData {
  headers: string[]
  rows: Record<string, any>[]
}

export type FieldKey =
  | 'ticket_number'
  | 'title'
  | 'description'
  | 'reported_at'
  | 'requester_name'
  | 'requester_email'
  | 'priority'
  | 'type'
  | 'status'
  | 'area'
  | 'asset'
  | 'assignee_name'
  | 'location'
  | 'sublocation'
  | 'plant'

export type ImportFieldMapping = Partial<Record<FieldKey, string>>

export interface ReferenceData {
  plants: any[]
  priorities: any[]
  types: any[]
  statuses: any[]
  areas: any[]
  assets: any[]
  assignees: any[]
  locations: any[]
  sublocations: any[]
}

export interface ValidationSummary {
  total: number
  valid: number
  invalid: number
  errors: { rowIndex: number; ticketNumber: string; messages: string[] }[]
  validRows: any[]
}

const norm = (s: any) =>
  String(s ?? '')
    .trim()
    .toLowerCase()

export const SYSTEM_FIELDS: { key: FieldKey; label: string; required: boolean }[] = [
  { key: 'ticket_number', label: 'Número do Chamado', required: true },
  { key: 'title', label: 'Título', required: false },
  { key: 'description', label: 'Descrição', required: true },
  { key: 'reported_at', label: 'Data Reportada', required: false },
  { key: 'requester_name', label: 'Solicitante', required: false },
  { key: 'requester_email', label: 'E-mail', required: false },
  { key: 'priority', label: 'Prioridade', required: false },
  { key: 'type', label: 'Tipo', required: false },
  { key: 'status', label: 'Status', required: false },
  { key: 'area', label: 'Área', required: false },
  { key: 'asset', label: 'Ativo/Equipamento', required: false },
  { key: 'assignee_name', label: 'Responsável', required: false },
  { key: 'location', label: 'Localização', required: false },
  { key: 'sublocation', label: 'Sublocal', required: false },
  { key: 'plant', label: 'Planta', required: true },
]

export async function parseExcelFile(file: File): Promise<ParsedExcelData> {
  const formData = new FormData()
  formData.append('file', file)
  const { data, error } = await supabase.functions.invoke('import-tickets', { body: formData })
  if (error || data?.error)
    throw new Error(data?.error || error?.message || 'Erro ao processar arquivo')
  return data as ParsedExcelData
}

export function autoDetectMapping(headers: string[]): ImportFieldMapping {
  const mapping: ImportFieldMapping = {}
  const nh = headers.map((h) => norm(h))
  const find = (kws: string[]): string => {
    for (const kw of kws) {
      const idx = nh.findIndex((h) => h === kw || h.includes(kw))
      if (idx !== -1) return headers[idx]
    }
    return ''
  }
  mapping.ticket_number = find(['ticket_number', 'numero', 'chamado', 'protocolo', 'nº', 'os'])
  mapping.title = find(['title', 'titulo', 'assunto'])
  mapping.description = find(['description', 'descricao', 'problema', 'detalhe'])
  mapping.reported_at = find(['reported_at', 'data', 'abertura', 'reportado'])
  mapping.requester_name = find(['requester_name', 'solicitante', 'requerente'])
  mapping.requester_email = find(['requester_email', 'email'])
  mapping.priority = find(['priority', 'prioridade', 'criticidade'])
  mapping.type = find(['type', 'tipo', 'categoria'])
  mapping.status = find(['status', 'situacao', 'estado'])
  mapping.area = find(['area', 'setor'])
  mapping.asset = find(['asset', 'ativo', 'equipamento', 'maquina'])
  mapping.assignee_name = find(['assignee', 'responsavel', 'manutentor', 'atribuido'])
  mapping.location = find(['location', 'localizacao'])
  mapping.sublocation = find(['sublocation', 'sublocal', 'subarea'])
  mapping.plant = find(['plant', 'planta', 'filial', 'unidade'])
  return mapping
}

function findByName(items: any[], value: any, fields: string[]): any | null {
  const nv = norm(value)
  if (!nv) return null
  return items.find((item) => fields.some((f) => norm(item[f]) === nv)) || null
}

export function validateRows(
  rows: Record<string, any>[],
  mapping: ImportFieldMapping,
  ref: ReferenceData,
  existingNumbers: Set<string>,
): ValidationSummary {
  const errors: ValidationSummary['errors'] = []
  const validRows: any[] = []
  const seenInFile = new Set<string>()

  rows.forEach((row, i) => {
    const msgs: string[] = []
    const get = (key: FieldKey) => (mapping[key] ? row[mapping[key]!] : '')
    const ticketNumber = String(get('ticket_number') ?? '').trim()
    const description = String(get('description') ?? '').trim()
    const plantValue = String(get('plant') ?? '').trim()

    if (!ticketNumber) msgs.push('Número obrigatório')
    if (!description) msgs.push('Descrição obrigatória')
    if (!plantValue) msgs.push('Planta obrigatória')

    if (ticketNumber) {
      if (existingNumbers.has(norm(ticketNumber)))
        msgs.push(`Número "${ticketNumber}" já existe no banco`)
      if (seenInFile.has(norm(ticketNumber)))
        msgs.push(`Número "${ticketNumber}" duplicado no arquivo`)
      else seenInFile.add(norm(ticketNumber))
    }

    const plant = plantValue ? findByName(ref.plants, plantValue, ['name', 'code']) : null
    if (plantValue && !plant) msgs.push(`Planta "${plantValue}" não encontrada`)

    const checkRef = (key: FieldKey, items: any[], fields: string[], label: string) => {
      const val = get(key)
      if (!val) return null
      const found = findByName(items, val, fields)
      if (!found) msgs.push(`${label} "${val}" não encontrado(a)`)
      return found
    }

    const priority = checkRef('priority', ref.priorities, ['name'], 'Prioridade')
    const type = checkRef('type', ref.types, ['name'], 'Tipo')
    const status = checkRef('status', ref.statuses, ['name'], 'Status')
    const area = checkRef('area', ref.areas, ['name'], 'Área')
    const asset = checkRef('asset', ref.assets, ['name'], 'Ativo')
    const assignee = checkRef('assignee_name', ref.assignees, ['name'], 'Responsável')
    const location = checkRef('location', ref.locations, ['name'], 'Localização')
    const sublocation = checkRef('sublocation', ref.sublocations, ['name'], 'Sublocal')

    const reportedAt = String(get('reported_at') ?? '').trim()
    let parsedDate: string | null = null
    if (reportedAt) {
      const d = new Date(reportedAt)
      if (isNaN(d.getTime())) msgs.push(`Data inválida: "${reportedAt}"`)
      else parsedDate = d.toISOString()
    }

    if (msgs.length > 0) {
      errors.push({ rowIndex: i + 2, ticketNumber, messages: msgs })
    } else {
      validRows.push({
        ticket_number: ticketNumber,
        title: String(get('title') ?? '').trim(),
        description,
        reported_at: parsedDate || new Date().toISOString(),
        requester_name: String(get('requester_name') ?? '').trim() || null,
        requester_email: String(get('requester_email') ?? '').trim() || null,
        plant_id: plant?.id,
        priority_id: priority?.id || null,
        type_id: type?.id || null,
        status_id: status?.id || null,
        area_id: area?.id || null,
        asset_id: asset?.id || null,
        assignee_id: assignee?.id || null,
        location_id: location?.id || null,
        sublocation_id: sublocation?.id || null,
        origin: 'Manual',
      })
    }
  })

  return { total: rows.length, valid: validRows.length, invalid: errors.length, errors, validRows }
}

export async function bulkInsertTickets(
  tickets: any[],
  clientId: string,
  defaultStatusId: string | null,
): Promise<number> {
  const payload = tickets.map((t) => ({
    ...t,
    client_id: clientId,
    status_id: t.status_id || defaultStatusId,
  }))
  const BATCH = 100
  let inserted = 0
  for (let i = 0; i < payload.length; i += BATCH) {
    const batch = payload.slice(i, i + BATCH)
    const { error } = await supabase.from('maintenance_tickets').insert(batch)
    if (error) throw error
    inserted += batch.length
  }
  return inserted
}
