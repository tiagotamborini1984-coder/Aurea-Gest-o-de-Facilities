/**
 * Utilitários para limpeza e consolidação de atividades de Limpeza e Jardinagem.
 *
 * Regras de consolidação quando houver duplicidades (mesma planta, mesma data, mesmo horário/área):
 * 1. Prioridade de status: 'Realizado' > 'Pendente' > 'Não Realizado'.
 *    Se qualquer registro estiver 'Realizado', a atividade deve ser considerada 'Realizada',
 *    preservando as evidências (fotos/arquivos).
 * 2. Em telas de listagem/gráficos/relatórios/mapa, duplicatas não devem inflar o total nem
 *    contar como pendência/não realização quando a atividade foi realizada.
 */

export interface CleaningSchedule {
  id: string
  plant_id: string
  area_id: string
  activity_date: string
  start_time: string
  end_time?: string | null
  description?: string | null
  status: string
  evidence_url?: string | null
  evidence_urls?: any
  justification?: string | null
  is_urgent?: boolean | null
  created_at?: string | null
  [key: string]: any
}

/**
 * Normaliza um horário para o formato HH:MM (ex: "07:00:00" -> "07:00")
 */
export function normalizeTime(t: string | null | undefined): string {
  if (!t) return '00:00'
  return t.substring(0, 5)
}

/**
 * Normaliza descrição para comparação (remove espaços extras e coloca em minúsculas)
 */
export function normalizeDescription(desc: string | null | undefined): string {
  if (!desc) return ''
  return desc.trim().toLowerCase().replace(/\s+/g, ' ')
}

/**
 * Retorna uma chave única para identificar a mesma atividade física agendada.
 * Duplicatas geradas por duplicação acidental ou cópia de planejamento têm:
 * - mesma planta (plant_id)
 * - mesma data (activity_date)
 * - mesmo horário inicial (start_time normalizado)
 * - mesma área (area_id)
 */
export function getScheduleDedupeKey(s: CleaningSchedule): string {
  const plant = s.plant_id || ''
  const date = s.activity_date || ''
  const time = normalizeTime(s.start_time)
  const area = s.area_id || ''
  return `${plant}|${date}|${time}|${area}`
}

/**
 * Retorna o peso do status para desempate:
 * 'Realizado' tem a maior prioridade (3).
 * Se não houver Realizado, 'Pendente' (2).
 * Por último, 'Não Realizado' (1).
 */
function getStatusPriority(status: string): number {
  if (status === 'Realizado') return 3
  if (status === 'Pendente') return 2
  if (status === 'Não Realizado') return 1
  return 0
}

/**
 * Consolida múltiplos registros duplicados de uma mesma atividade em um único registro representativo.
 * - Status prioritário: Realizado > Pendente > Não Realizado.
 * - Se houver 'Realizado', consolida evidências (evidence_urls/evidence_url) desse registro.
 * - Preserva campos mais ricos/completos.
 */
export function mergeDuplicateSchedules<T extends CleaningSchedule>(schedules: T[]): T {
  if (schedules.length === 1) return schedules[0]

  const getEvCount = (s: CleaningSchedule) => {
    const fromArray = Array.isArray(s.evidence_urls) ? s.evidence_urls.length : 0
    const fromSingle = s.evidence_url ? 1 : 0
    return fromArray + fromSingle
  }

  // Ordena por prioridade de status decrescente; para mesmo status, prioriza o que tem evidências ou criado antes
  const sorted = [...schedules].sort((a, b) => {
    const pA = getStatusPriority(a.status)
    const pB = getStatusPriority(b.status)
    if (pA !== pB) return pB - pA

    // Se ambos são Realizado, prefere o que tem mais evidências
    const evA = getEvCount(a)
    const evB = getEvCount(b)
    if (evA !== evB) return evB - evA

    // Se um tem justificativa e o outro não
    const justA = a.justification && a.justification !== 'Sem preenchimento' ? 1 : 0
    const justB = b.justification && b.justification !== 'Sem preenchimento' ? 1 : 0
    if (justA !== justB) return justB - justA

    // Registro mais antigo primeiro
    return (a.created_at || '').localeCompare(b.created_at || '')
  })

  const primary = sorted[0]

  // Reúne todas as evidências encontradas entre as duplicatas
  const allEvidences = new Set<string>()
  schedules.forEach((s) => {
    if (s.evidence_url) allEvidences.add(s.evidence_url)
    if (Array.isArray(s.evidence_urls)) {
      s.evidence_urls.forEach((u: any) => typeof u === 'string' && allEvidences.add(u))
    }
  })
  const combinedEvidences = Array.from(allEvidences)

  // Se qualquer registro for urgente, marca como urgente
  const isUrgent = schedules.some((s) => !!s.is_urgent)

  return {
    ...primary,
    is_urgent: isUrgent,
    evidence_urls: (combinedEvidences.length > 0
      ? combinedEvidences
      : primary.evidence_urls) as any,
    evidence_url: combinedEvidences.length > 0 ? combinedEvidences[0] : primary.evidence_url,
  }
}

/**
 * Deduplica uma lista de cronogramas, agrupando registros idênticos
 * (mesma planta, data, horário e área) e consolidando status e evidências.
 */
export function deduplicateSchedules<T extends CleaningSchedule>(schedules: T[]): T[] {
  if (!schedules || schedules.length <= 1) return schedules || []

  const groups = new Map<string, T[]>()

  for (const item of schedules) {
    const key = getScheduleDedupeKey(item)
    const existing = groups.get(key)
    if (existing) {
      existing.push(item)
    } else {
      groups.set(key, [item])
    }
  }

  const result: T[] = []
  for (const group of groups.values()) {
    result.push(mergeDuplicateSchedules(group))
  }

  return result
}
