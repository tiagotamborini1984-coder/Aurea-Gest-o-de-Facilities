import { normalizeString } from '@/lib/string-utils'

export interface EmployeeVersionLike {
  id: string
  name?: string | null
  registration_number?: string | null
  plant_id?: string | null
  reference_month?: string | null
  created_at?: string | null
  status?: string | null
  company_name?: string | null
  company_id?: string | null
  function_id?: string | null
  location_id?: string | null
  client_id?: string | null
  [key: string]: any
}

/**
 * Retorna a chave unificada e determinística da pessoa física em uma planta.
 * Prioriza matrícula sanitizada (sem espaços, maiúscula).
 * Na ausência de matrícula, utiliza o nome normalizado (sem acentos, minúsculo, espaços colapsados).
 * Desempata com o ID único para evitar agrupamento indevido caso ambos estejam vazios.
 */
export function getPersonKey(emp: {
  registration_number?: string | null
  name?: string | null
  id?: string
  plant_id?: string | null
}): string {
  const reg = (emp.registration_number || '').trim().toUpperCase()
  const normName = normalizeString(emp.name)
  const identifier = reg || normName || emp.id || ''
  const plantId = emp.plant_id || ''
  return `${identifier}::${plantId}`
}

/**
 * Compara duas versões de um colaborador segundo a regra de vigência:
 * 1. Mês de referência mais recente vence (reference_month DESC);
 * 2. Desempate por timestamp de criação mais recente (created_at DESC);
 * 3. Em caso de empate absoluto, 'Ativo' tem precedência sobre 'Inativo'.
 */
export function compareEmployeeVersions(a: EmployeeVersionLike, b: EmployeeVersionLike): number {
  const timeDiff =
    new Date(b.reference_month || 0).getTime() - new Date(a.reference_month || 0).getTime()
  if (timeDiff !== 0) return timeDiff

  const createdDiff = new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  if (createdDiff !== 0) return createdDiff

  const aActive = a.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
  const bActive = b.status?.trim().toUpperCase() === 'ATIVO' ? 0 : 1
  return aActive - bActive
}

/**
 * Agrupa todas as linhas de colaboradores por pessoa+planta, seleciona
 * a versão vigente mais recente (reference_month DESC, created_at DESC)
 * e descarta qualquer colaborador cuja versão vigente esteja 'Inativo'.
 *
 * Preserva o histórico intacto no banco: nada é deletado fisicamente.
 */
export function resolveActiveEmployees<T extends EmployeeVersionLike>(employees: T[]): T[] {
  if (!employees || employees.length === 0) return []

  const groups = new Map<string, T[]>()

  for (const emp of employees) {
    if (!emp) continue
    const key = getPersonKey(emp)
    const existing = groups.get(key)
    if (existing) {
      existing.push(emp)
    } else {
      groups.set(key, [emp])
    }
  }

  const activeEmployees: T[] = []

  for (const group of groups.values()) {
    group.sort(compareEmployeeVersions)
    const currentBest = group[0]
    const isCurrentActive = currentBest.status?.trim().toUpperCase() === 'ATIVO'

    if (isCurrentActive) {
      activeEmployees.push(currentBest)
    }
  }

  return activeEmployees.sort((a, b) =>
    (a.name || '').localeCompare(b.name || '', 'pt-BR', { sensitivity: 'base' }),
  )
}
