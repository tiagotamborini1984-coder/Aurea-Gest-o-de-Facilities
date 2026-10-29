import { useMemo } from 'react'
import {
  parseISO,
  eachMonthOfInterval,
  format,
  differenceInDays,
  startOfMonth,
  endOfMonth,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'

export interface CargoMonthPoint {
  monthKey: string // 'YYYY-MM'
  monthLabel: string // 'out/2026'
  referenceDate: Date
  efetivo: number // colaboradores com status Ativo vigentes no mês
  quadroIdeal: number // quantity configurado em contracted_headcount para este cargo/planta
  deficit: number // max(0, quadroIdeal - efetivo)
  saldo: number // efetivo - quadroIdeal (negativo = deficit, zero = equilibrado, positivo = excedente)
  admissoes: number // colaboradores que passaram a estar ativos neste mês
  desligamentos: number // colaboradores que deixaram de estar ativos neste mês
  tempoMedioReposicaoDias: number | null // média dos dias até a próxima admissão no mesmo cargo/planta
  eventosReposicaoCount: number // quantidade de eventos medidos
  isAbaixoDoQuadro: boolean // efetivo < quadroIdeal
}

export interface CargoSummary {
  functionId: string
  functionName: string
  plantId?: string
  plantName?: string
  currentEfetivo: number
  currentQuadroIdeal: number
  currentDeficit: number
  isCurrentlyAbaixo: boolean
  mediaTempoReposicaoDias: number | null
  totalDesligamentosPeriodo: number
  totalAdmissoesPeriodo: number
  mesesAbaixoCount: number
  totalMesesAnalisados: number
  taxaDeficitMeses: number // % de meses em que ficou abaixo
  series: CargoMonthPoint[]
}

export interface CargoReportTotals {
  totalCargosAnalisados: number
  cargosAbaixoAtualmente: number
  cargosAbaixoList: CargoSummary[]
  maiorTempoMedioReposicao: {
    cargo: string
    dias: number
    planta?: string
  } | null
  tempoMedioReposicaoGeral: number | null
  totalDesligamentosPeriodo: number
  totalAdmissoesPeriodo: number
  totalDeficitAtual: number
}

interface ComputeParams {
  employees: any[]
  contracted: any[]
  functions: any[]
  plants: any[]
  companies?: any[]
  selectedPlants: string[]
  selectedFunctionId: string // 'all' ou ID específico
  selectedCompanyId?: string // 'all' ou ID/nome ou array/set
  selectedCompanies?: string[] // suporte explícito a múltiplos nomes/IDs de empresas
  dateFrom: string // 'YYYY-MM-DD'
  dateTo: string // 'YYYY-MM-DD'
  groupByPlant?: boolean // se verdadeiro, calcula métricas por cargo + planta individualmente
}

/**
 * Normaliza o identificador único de pessoa física (matrícula sanitizada ou nome normalizado)
 */
function getPersonIdentifier(emp: any): string {
  const reg = (emp.registration_number || '').trim().toUpperCase()
  if (reg) return reg
  const name = (emp.name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
  return name || emp.id || ''
}

export function useCargoCalculations({
  employees,
  contracted,
  functions,
  plants,
  companies = [],
  selectedPlants,
  selectedFunctionId,
  selectedCompanyId,
  selectedCompanies,
  dateFrom,
  dateTo,
  groupByPlant = false,
}: ComputeParams) {
  return useMemo(() => {
    if (!employees || !contracted || !functions) {
      return {
        cargos: [] as CargoSummary[],
        totals: {
          totalCargosAnalisados: 0,
          cargosAbaixoAtualmente: 0,
          cargosAbaixoList: [],
          maiorTempoMedioReposicao: null,
          tempoMedioReposicaoGeral: null,
          totalDesligamentosPeriodo: 0,
          totalAdmissoesPeriodo: 0,
          totalDeficitAtual: 0,
        } as CargoReportTotals,
        monthsList: [] as string[],
      }
    }

    // 1. Gera lista de meses do intervalo selecionado
    const startDate = startOfMonth(parseISO(dateFrom))
    const endDate = endOfMonth(parseISO(dateTo))

    const validMonths = eachMonthOfInterval({ start: startDate, end: endDate })
    const monthKeys = validMonths.map((d) => format(d, 'yyyy-MM'))
    const monthLabels = validMonths.map((d) => format(d, 'MMM/yyyy', { locale: ptBR }))

    // Plantas válidas
    // Assegura que validPlantIds contenha apenas plantas autorizadas (interseção com plants disponíveis)
    const allowedPlantIds = new Set(plants.map((p) => p.id))
    const validPlantIds =
      selectedPlants.length > 0
        ? selectedPlants.filter((id) => allowedPlantIds.has(id))
        : plants.map((p) => p.id)
    const plantMap = new Map<string, string>(plants.map((p) => [p.id, p.name]))
    const functionMap = new Map<string, any>(functions.map((f) => [f.id, f]))

    // Normalização e consolidação das empresas selecionadas (suporta selectedCompanyId singular e/ou selectedCompanies lista)
    const activeSelectedCompanies: string[] = []
    if (selectedCompanies && selectedCompanies.length > 0) {
      activeSelectedCompanies.push(...selectedCompanies)
    } else if (selectedCompanyId && selectedCompanyId !== 'all') {
      activeSelectedCompanies.push(selectedCompanyId)
    }

    // Conjunto de identificadores de empresas aceitas: aceita tanto company_id (UUID) quanto company_name
    const acceptedCompanyIdentifiers = new Set<string>()
    const acceptedCompanyIds = new Set<string>()

    if (activeSelectedCompanies.length > 0) {
      activeSelectedCompanies.forEach((val) => {
        acceptedCompanyIdentifiers.add(val)
        // Se for id de company, adiciona seu nome e seu id
        const matchedComp = companies.find((c) => c.id === val || c.name === val)
        if (matchedComp) {
          if (matchedComp.id) {
            acceptedCompanyIdentifiers.add(matchedComp.id)
            acceptedCompanyIds.add(matchedComp.id)
          }
          if (matchedComp.name) {
            acceptedCompanyIdentifiers.add(matchedComp.name)
          }
        }
      })

      // Mapeia também pelos employees conhecidos
      employees.forEach((e) => {
        if (
          (e.company_id && acceptedCompanyIdentifiers.has(e.company_id)) ||
          (e.company_name && acceptedCompanyIdentifiers.has(e.company_name))
        ) {
          if (e.company_id) {
            acceptedCompanyIdentifiers.add(e.company_id)
            acceptedCompanyIds.add(e.company_id)
          }
          if (e.company_name) {
            acceptedCompanyIdentifiers.add(e.company_name)
          }
        }
      })
    }

    const matchesCompany = (companyId?: string | null, companyName?: string | null): boolean => {
      if (activeSelectedCompanies.length === 0) return true
      if (companyId && acceptedCompanyIdentifiers.has(companyId)) return true
      if (companyName && acceptedCompanyIdentifiers.has(companyName)) return true
      return false
    }

    // Filtra colaboradores de acordo com as plantas e empresa
    const scopedEmployees = employees.filter((emp) => {
      if (!emp.plant_id || !validPlantIds.includes(emp.plant_id)) return false
      if (!matchesCompany(emp.company_id, emp.company_name)) {
        return false
      }
      return true
    })

    // Filtra contracted_headcount respeitando empresa (quando selecionada)
    // Se empresa estiver filtrada: se c.company_id existir, checa matchesCompany(c.company_id, ...).
    // Se o registro contracted_headcount não tiver company_id, só incluímos se nenhuma empresa estiver filtrada.
    const scopedContracted = contracted.filter((c) => {
      if (c.type !== 'colaborador' || !c.function_id) return false
      if (c.plant_id && !validPlantIds.includes(c.plant_id)) return false
      if (activeSelectedCompanies.length > 0) {
        if (!c.company_id) return false
        if (!matchesCompany(c.company_id, null)) return false
      }
      return true
    })

    // Lista de cargos de interesse
    let targetFunctions = functions.filter((f) => {
      if (selectedFunctionId && selectedFunctionId !== 'all') {
        return f.id === selectedFunctionId
      }
      return true
    })

    // Se nenhum cargo estiver selecionado especificamente, limitamos aos cargos que aparecem
    // em scopedEmployees ou em scopedContracted para não poluir a tela com cargos vazios.
    // Quando uma empresa está filtrada, somente cargos vinculados àquela empresa
    // (colaboradores daquela empresa ou quadro contratado daquela empresa) são incluídos!
    if (!selectedFunctionId || selectedFunctionId === 'all') {
      const usedFunctionIds = new Set<string>()
      scopedEmployees.forEach((e) => {
        if (e.function_id) usedFunctionIds.add(e.function_id)
      })
      scopedContracted.forEach((c) => {
        if (c.type === 'colaborador' && c.function_id && validPlantIds.includes(c.plant_id)) {
          usedFunctionIds.add(c.function_id)
        }
      })
      targetFunctions = targetFunctions.filter((f) => usedFunctionIds.has(f.id))
    }

    // Agrupamento de registros por pessoa física + planta
    // Chave: `personId::plantId`
    // Cada grupo conterá os snapshots mensais da pessoa
    const personHistoryMap = new Map<
      string,
      {
        personId: string
        plantId: string
        snapshots: Map<string, any> // monthKey -> emp row
        firstCreated: Date
        lastCreated: Date
        functionId: string | null
      }
    >()

    scopedEmployees.forEach((emp) => {
      const pid = getPersonIdentifier(emp)
      if (!pid) return
      const groupKey = `${pid}::${emp.plant_id}`
      let group = personHistoryMap.get(groupKey)
      if (!group) {
        group = {
          personId: pid,
          plantId: emp.plant_id,
          snapshots: new Map(),
          firstCreated: new Date(emp.created_at || '2000-01-01'),
          lastCreated: new Date(emp.created_at || '2000-01-01'),
          functionId: emp.function_id || null,
        }
        personHistoryMap.set(groupKey, group)
      }

      const mKey = (emp.reference_month || '').substring(0, 7)
      if (mKey) {
        const existingSnap = group.snapshots.get(mKey)
        // Se houver mais de um registro no mesmo mês, pega o mais recente (created_at)
        if (!existingSnap) {
          group.snapshots.set(mKey, emp)
        } else {
          const t1 = new Date(existingSnap.created_at || 0).getTime()
          const t2 = new Date(emp.created_at || 0).getTime()
          if (t2 > t1) {
            group.snapshots.set(mKey, emp)
          }
        }
      }

      if (emp.function_id) group.functionId = emp.function_id
      const cDate = new Date(emp.created_at || '2000-01-01')
      if (cDate < group.firstCreated) group.firstCreated = cDate
      if (cDate > group.lastCreated) group.lastCreated = cDate
    })

    // Indexa contracted_headcount filtrado para consulta rápida:
    // Chave: `${functionId}_${plantId}_${monthKey}` ou cascata para mês anterior
    const contractedByCargoPlantMonth = new Map<string, number>()
    scopedContracted.forEach((c) => {
      const mKey = (c.reference_month || '').substring(0, 7)
      const key = `${c.function_id}_${c.plant_id}_${mKey}`
      contractedByCargoPlantMonth.set(
        key,
        (contractedByCargoPlantMonth.get(key) || 0) + (Number(c.quantity) || 0),
      )
    })

    // Helper para obter quadro ideal em um mês para um cargo e planta (com fallback ao mês anterior se aplicável)
    const getQuadroIdeal = (fId: string, pId?: string, mKey?: string): number => {
      if (pId) {
        // Tenta exatamente este mês
        const key = `${fId}_${pId}_${mKey}`
        if (contractedByCargoPlantMonth.has(key)) {
          return contractedByCargoPlantMonth.get(key) || 0
        }
        // Fallback: busca mês mais próximo anterior para essa planta/cargo dentro de scopedContracted
        const matches = scopedContracted
          .filter(
            (c) =>
              c.function_id === fId &&
              c.plant_id === pId &&
              (c.reference_month || '').substring(0, 7) <= (mKey || ''),
          )
          .sort((a, b) => (b.reference_month || '').localeCompare(a.reference_month || ''))
        if (matches.length > 0) {
          const bestMonth = (matches[0].reference_month || '').substring(0, 7)
          return scopedContracted
            .filter(
              (c) =>
                c.function_id === fId &&
                c.plant_id === pId &&
                (c.reference_month || '').substring(0, 7) === bestMonth,
            )
            .reduce((s, c) => s + (Number(c.quantity) || 0), 0)
        }
        return 0
      }

      // Se agregando todas as plantas válidas
      let sum = 0
      validPlantIds.forEach((pid) => {
        sum += getQuadroIdeal(fId, pid, mKey)
      })
      return sum
    }

    // Estrutura de eventos para cálculo do time-to-fill (reposição)
    // Para cada cargo (ou cargo + planta), rastreamos desligamentos e admissões com data aproximada
    // Data de admissão aproximada: primeiro dia do mês da referência ou created_at se no mesmo mês
    // Data de desligamento: último dia do último mês ativo ou created_at do registro Inativo
    interface CargoTransitionEvent {
      type: 'desligamento' | 'admissao'
      personId: string
      plantId: string
      functionId: string
      date: Date
      monthKey: string
    }

    // Calcula séries para cada cargo
    const cargoSummaries: CargoSummary[] = []

    targetFunctions.forEach((func) => {
      const fId = func.id
      const fName = func.name || 'Sem nome'

      // Filtra grupos de pessoas vinculadas a este cargo
      const cargoPersonGroups = Array.from(personHistoryMap.values()).filter(
        (g) => g.functionId === fId,
      )

      // Identifica eventos de admissão e desligamento mês a mês
      const transitionEvents: CargoTransitionEvent[] = []
      const monthPoints: CargoMonthPoint[] = []

      // Rastreia estado do mês anterior de cada pessoa no cargo
      // Para o primeiro mês da série histórica absoluta conhecida do colaborador
      const sortedMonths = [...monthKeys]

      sortedMonths.forEach((mKey, idx) => {
        const prevMKey = idx > 0 ? sortedMonths[idx - 1] : null
        const monthRefDate = new Date(`${mKey}-01T12:00:00`)
        const monthLabel = monthLabels[idx]

        let ativosNoFimDoMes = 0
        let admissoesMes = 0
        let desligamentosMes = 0

        cargoPersonGroups.forEach((group) => {
          const curSnap = group.snapshots.get(mKey)
          const prevSnap = prevMKey ? group.snapshots.get(prevMKey) : undefined

          const isAtivoAtual = curSnap && (curSnap.status || '').trim().toUpperCase() === 'ATIVO'
          const isAtivoAnterior =
            prevSnap && (prevSnap.status || '').trim().toUpperCase() === 'ATIVO'

          if (isAtivoAtual) {
            ativosNoFimDoMes++
          }

          // Admissão:
          // 1. Não existia ou não era ativo no mês anterior e agora é ativo; OU
          // 2. É o primeiro mês histórico do sistema e a data de criação dele foi dentro deste mês
          if (isAtivoAtual && !isAtivoAnterior) {
            admissoesMes++
            const admDate =
              curSnap.created_at && curSnap.created_at.substring(0, 7) === mKey
                ? new Date(curSnap.created_at)
                : monthRefDate
            transitionEvents.push({
              type: 'admissao',
              personId: group.personId,
              plantId: group.plantId,
              functionId: fId,
              date: admDate,
              monthKey: mKey,
            })
          }

          // Desligamento:
          // 1. Era ativo no mês anterior e agora está com registro Inativo ou ausente no mês atual; OU
          // 2. Registro atual explicitamente Inativo tendo sido criado no período
          if (isAtivoAnterior && !isAtivoAtual) {
            desligamentosMes++
            const desligDate =
              curSnap && curSnap.created_at
                ? new Date(curSnap.created_at)
                : new Date(`${prevMKey || mKey}-28T12:00:00`)
            transitionEvents.push({
              type: 'desligamento',
              personId: group.personId,
              plantId: group.plantId,
              functionId: fId,
              date: desligDate,
              monthKey: mKey,
            })
          } else if (
            curSnap &&
            (curSnap.status || '').trim().toUpperCase() === 'INATIVO' &&
            !prevSnap &&
            curSnap.created_at &&
            curSnap.created_at.substring(0, 7) === mKey
          ) {
            // Caso registrado inativo diretamente no mês sem snapshot prévio
            desligamentosMes++
            transitionEvents.push({
              type: 'desligamento',
              personId: group.personId,
              plantId: group.plantId,
              functionId: fId,
              date: new Date(curSnap.created_at),
              monthKey: mKey,
            })
          }
        })

        const quadroIdeal = getQuadroIdeal(fId, undefined, mKey)
        const deficit = Math.max(0, quadroIdeal - ativosNoFimDoMes)
        const saldo = ativosNoFimDoMes - quadroIdeal

        monthPoints.push({
          monthKey: mKey,
          monthLabel,
          referenceDate: monthRefDate,
          efetivo: ativosNoFimDoMes,
          quadroIdeal,
          deficit,
          saldo,
          admissoes: admissoesMes,
          desligamentos: desligamentosMes,
          tempoMedioReposicaoDias: null, // será calculado a seguir com base nos eventos
          eventosReposicaoCount: 0,
          isAbaixoDoQuadro: quadroIdeal > 0 && ativosNoFimDoMes < quadroIdeal,
        })
      })

      // Cálculo do tempo de reposição (time-to-fill)
      // Para cada desligamento ocorrido no cargo, busca a próxima admissão no mesmo cargo
      // que ocorreu após a data do desligamento (FIFO / temporal matching)
      transitionEvents.sort((a, b) => a.date.getTime() - b.date.getTime())

      const usedAdmissoesIndices = new Set<number>()
      const reposicaoDeltasPorMes = new Map<string, number[]>()
      const todosReposicaoDeltas: number[] = []

      transitionEvents.forEach((ev, i) => {
        if (ev.type !== 'desligamento') return

        // Procura a próxima admissão
        let nextAdmIdx = -1
        for (let j = i + 1; j < transitionEvents.length; j++) {
          const candidate = transitionEvents[j]
          if (candidate.type === 'admissao' && !usedAdmissoesIndices.has(j)) {
            // Prioriza mesma planta se houver
            nextAdmIdx = j
            break
          }
        }

        if (nextAdmIdx !== -1) {
          usedAdmissoesIndices.add(nextAdmIdx)
          const admEvent = transitionEvents[nextAdmIdx]
          const diffDays = Math.max(1, differenceInDays(admEvent.date, ev.date))
          todosReposicaoDeltas.push(diffDays)

          // Associa ao mês do desligamento (ou mês da admissão da reposição)
          const mK = admEvent.monthKey
          if (!reposicaoDeltasPorMes.has(mK)) {
            reposicaoDeltasPorMes.set(mK, [])
          }
          reposicaoDeltasPorMes.get(mK)!.push(diffDays)
        }
      })

      // Atribui o tempo médio de reposição a cada mês
      monthPoints.forEach((mp) => {
        const deltas = reposicaoDeltasPorMes.get(mp.monthKey)
        if (deltas && deltas.length > 0) {
          const media = deltas.reduce((a, b) => a + b, 0) / deltas.length
          mp.tempoMedioReposicaoDias = Math.round(media)
          mp.eventosReposicaoCount = deltas.length
        } else {
          mp.tempoMedioReposicaoDias = null
          mp.eventosReposicaoCount = 0
        }
      })

      // Métricas consolidadas do cargo
      const lastMonthPoint = monthPoints[monthPoints.length - 1] || {
        efetivo: 0,
        quadroIdeal: 0,
        deficit: 0,
        isAbaixoDoQuadro: false,
      }

      const totalDesligamentos = monthPoints.reduce((s, p) => s + p.desligamentos, 0)
      const totalAdmissoes = monthPoints.reduce((s, p) => s + p.admissoes, 0)
      const mesesAbaixo = monthPoints.filter((p) => p.isAbaixoDoQuadro).length
      const mediaReposicaoGeralCargo =
        todosReposicaoDeltas.length > 0
          ? Math.round(
              todosReposicaoDeltas.reduce((a, b) => a + b, 0) / todosReposicaoDeltas.length,
            )
          : null

      cargoSummaries.push({
        functionId: fId,
        functionName: fName,
        currentEfetivo: lastMonthPoint.efetivo,
        currentQuadroIdeal: lastMonthPoint.quadroIdeal,
        currentDeficit: lastMonthPoint.deficit,
        isCurrentlyAbaixo: lastMonthPoint.isAbaixoDoQuadro,
        mediaTempoReposicaoDias: mediaReposicaoGeralCargo,
        totalDesligamentosPeriodo: totalDesligamentos,
        totalAdmissoesPeriodo: totalAdmissoes,
        mesesAbaixoCount: mesesAbaixo,
        totalMesesAnalisados: monthPoints.length,
        taxaDeficitMeses:
          monthPoints.length > 0 ? Math.round((mesesAbaixo / monthPoints.length) * 100) : 0,
        series: monthPoints,
      })
    })

    // Ordenação inicial dos cargos: primeiro os que estão atualmente abaixo do quadro, depois maior deficit
    cargoSummaries.sort((a, b) => {
      if (a.isCurrentlyAbaixo && !b.isCurrentlyAbaixo) return -1
      if (!a.isCurrentlyAbaixo && b.isCurrentlyAbaixo) return 1
      if (b.currentDeficit !== a.currentDeficit) return b.currentDeficit - a.currentDeficit
      return a.functionName.localeCompare(b.functionName, 'pt-BR')
    })

    // Totais globais para os cards de resumo no topo
    const cargosAbaixoList = cargoSummaries.filter((c) => c.isCurrentlyAbaixo)
    const cargosComReposicao = cargoSummaries.filter(
      (c) => c.mediaTempoReposicaoDias !== null && c.mediaTempoReposicaoDias > 0,
    )

    let maiorTempoMedioReposicao: { cargo: string; dias: number } | null = null
    if (cargosComReposicao.length > 0) {
      cargosComReposicao.sort(
        (a, b) => (b.mediaTempoReposicaoDias || 0) - (a.mediaTempoReposicaoDias || 0),
      )
      maiorTempoMedioReposicao = {
        cargo: cargosComReposicao[0].functionName,
        dias: cargosComReposicao[0].mediaTempoReposicaoDias!,
      }
    }

    const allReposicaoDias = cargoSummaries
      .map((c) => c.mediaTempoReposicaoDias)
      .filter((d): d is number => d !== null && d > 0)

    const tempoMedioReposicaoGeral =
      allReposicaoDias.length > 0
        ? Math.round(allReposicaoDias.reduce((a, b) => a + b, 0) / allReposicaoDias.length)
        : null

    const totalDesligamentosGeral = cargoSummaries.reduce(
      (s, c) => s + c.totalDesligamentosPeriodo,
      0,
    )
    const totalAdmissoesGeral = cargoSummaries.reduce((s, c) => s + c.totalAdmissoesPeriodo, 0)
    const totalDeficitAtualGeral = cargoSummaries.reduce((s, c) => s + c.currentDeficit, 0)

    const totals: CargoReportTotals = {
      totalCargosAnalisados: cargoSummaries.length,
      cargosAbaixoAtualmente: cargosAbaixoList.length,
      cargosAbaixoList,
      maiorTempoMedioReposicao,
      tempoMedioReposicaoGeral,
      totalDesligamentosPeriodo: totalDesligamentosGeral,
      totalAdmissoesPeriodo: totalAdmissoesGeral,
      totalDeficitAtual: totalDeficitAtualGeral,
    }

    return {
      cargos: cargoSummaries,
      totals,
      monthsList: monthKeys,
    }
  }, [
    employees,
    contracted,
    functions,
    plants,
    companies,
    selectedPlants,
    selectedFunctionId,
    selectedCompanyId,
    selectedCompanies,
    dateFrom,
    dateTo,
    groupByPlant,
  ])
}
