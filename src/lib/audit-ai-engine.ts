import {
  AuditAiReportData,
  AuditPatternInsight,
  ActionPlanTask,
  NonConformityEvidence,
  NonConformityRankItem,
  PriorityLevel,
  RawAuditExecutionRecord,
  TrendDirection,
} from '@/types/audit-ai'

/**
 * Normaliza e categoriza itens de auditoria a partir do texto
 */
export function categorizeAuditItem(title: string): string {
  const t = title.toLowerCase()
  if (
    t.includes('limpez') ||
    t.includes('higien') ||
    t.includes('pop - higien') ||
    t.includes('lixo') ||
    t.includes('ralo')
  ) {
    return 'Higienização e Limpeza'
  }
  if (
    t.includes('pcmso') ||
    t.includes('aso') ||
    t.includes('pop') ||
    t.includes('treinamento') ||
    t.includes('document') ||
    t.includes('planilha') ||
    t.includes('formulario') ||
    t.includes('registro') ||
    t.includes('fds')
  ) {
    return 'Documental e Treinamento'
  }
  if (
    t.includes('revestimento') ||
    t.includes('piso') ||
    t.includes('parede') ||
    t.includes('teto') ||
    t.includes('infiltra') ||
    t.includes('porta') ||
    t.includes('janela') ||
    t.includes('mofo') ||
    t.includes('coifa') ||
    t.includes('ventila') ||
    t.includes('ar condicionado') ||
    t.includes('ilumina') ||
    t.includes('lampada')
  ) {
    return 'Estrutura Física e Manutenção'
  }
  if (
    t.includes('armazen') ||
    t.includes('descongel') ||
    t.includes('validade') ||
    t.includes('fifo') ||
    t.includes('temperatura') ||
    t.includes('alimento') ||
    t.includes('prepara')
  ) {
    return 'Processo e Conservação de Alimentos'
  }
  if (
    t.includes('epi') ||
    t.includes('segurança') ||
    t.includes('proteção') ||
    t.includes('extintor') ||
    t.includes('nr-') ||
    t.includes('acidente')
  ) {
    return 'Segurança do Trabalho (SST)'
  }
  if (
    t.includes('quarto') ||
    t.includes('cama') ||
    t.includes('colch') ||
    t.includes('armario') ||
    t.includes('roupeiro') ||
    t.includes('sala') ||
    t.includes('conforto') ||
    t.includes('tv') ||
    t.includes('banheiro')
  ) {
    return 'Acomodações e Conforto'
  }
  return 'Conformidade Geral'
}

/**
 * Sugestão automática de ação corretiva contextual para a não conformidade
 */
export function deriveSuggestedAction(
  itemTitle: string,
  category: string,
  sampleObs?: string,
): { action: string; role: string; days: number } {
  const t = (itemTitle + ' ' + (sampleObs || '')).toLowerCase()

  if (
    category === 'Documental e Treinamento' ||
    t.includes('pop') ||
    t.includes('aso') ||
    t.includes('pcmso') ||
    t.includes('treinamento') ||
    t.includes('planilha')
  ) {
    if (t.includes('aso') || t.includes('pcmso')) {
      return {
        action:
          'Notificar área de Saúde Ocupacional para atualização imediata dos ASOs/PCMSO vencidos e emissão de comprovantes.',
        role: 'Coordenação de SST / RH',
        days: 5,
      }
    }
    if (t.includes('fifo') || t.includes('validade') || t.includes('rotul')) {
      return {
        action:
          'Reciclar equipe operacional sobre etiquetagem e regra PVPS/FIFO, estabelecendo checklist diário de validade.',
        role: 'Encarregado de Cozinha / Estoque',
        days: 3,
      }
    }
    return {
      action:
        'Atualizar documentação regulatória (POP/FDS/Registros) e realizar alinhamento formal com a equipe de campo com lista de presença.',
      role: 'Gestor Operacional de Facilities',
      days: 7,
    }
  }

  if (
    category === 'Estrutura Física e Manutenção' ||
    t.includes('revestimento') ||
    t.includes('piso') ||
    t.includes('ralo') ||
    t.includes('janela') ||
    t.includes('porta') ||
    t.includes('lampada') ||
    t.includes('ar')
  ) {
    if (t.includes('ralo') || t.includes('tela') || t.includes('lampada') || t.includes('porta')) {
      return {
        action:
          'Abrir ordem de manutenção corretiva imediata para vedação, reparo e substituição dos itens danificados.',
        role: 'Equipe de Manutenção Predial',
        days: 3,
      }
    }
    return {
      action:
        'Elaborar cronograma de revitalização estrutural (alvenaria, pintura impermeável ou climatização) com equipe de manutenção.',
      role: 'Supervisor de Manutenção / Facilities',
      days: 10,
    }
  }

  if (category === 'Higienização e Limpeza' || t.includes('limpez') || t.includes('higien')) {
    return {
      action:
        'Intensificar rotina de higienização de áreas críticas, fiscalizar diluição de sanitizantes e auditar registro em quadro de controle.',
      role: 'Líder de Limpeza e Conservação',
      days: 2,
    }
  }

  if (
    category === 'Processo e Conservação de Alimentos' ||
    t.includes('descongel') ||
    t.includes('temperatura')
  ) {
    return {
      action:
        'Instaurar monitoramento rigoroso de temperaturas (planilha horária) e treinar manipuladores na técnica de descongelamento seguro.',
      role: 'Nutricionista Responsável / Encarregado',
      days: 2,
    }
  }

  if (category === 'Acomodações e Conforto') {
    return {
      action:
        'Inspecionar acomodações afetadas, substituir móveis/equipamentos avariados e reforçar checagem prévia de check-in.',
      role: 'Gestão de Imóveis e Hospedagem',
      days: 5,
    }
  }

  return {
    action: `Implantar ação de contenção imediata e plano de melhoria contínua para mitigar recorrência de "${itemTitle.slice(0, 45)}...".`,
    role: 'Gestor da Operação',
    days: 7,
  }
}

/**
 * Determina se a resposta é considerada Não Conformidade (NC)
 */
export function isNonConformity(score: number | null, observations: string | null): boolean {
  if (score !== null && score <= 2) return true
  if (score === 3) {
    // Regular: se acompanhado de observação de falha, conta como NC atenuada/apontamento
    const obs = (observations || '').toLowerCase()
    if (
      obs.includes('vencid') ||
      obs.includes('danificad') ||
      obs.includes('rachadur') ||
      obs.includes('falta') ||
      obs.includes('repar') ||
      obs.includes('pendente') ||
      obs.includes('não') ||
      obs.includes('nao') ||
      obs.includes('empenad')
    ) {
      return true
    }
  }
  return false
}

/**
 * Motor determinístico de análise e agregação das auditorias
 */
export function analyzeAuditExecutions(
  executions: RawAuditExecutionRecord[],
  options: {
    clientId: string
    auditType: string
    plantId?: string
    plantName?: string
    periodLabel?: string
  },
): AuditAiReportData {
  const { clientId, auditType, plantId, plantName, periodLabel = 'Todo o Histórico' } = options

  // Ordenar cronologicamente por realization_date ou created_at
  const sortedExecs = [...executions].sort((a, b) => {
    const da = new Date(a.realization_date || a.created_at).getTime()
    const db = new Date(b.realization_date || b.created_at).getTime()
    return da - db
  })

  const totalExecutions = sortedExecs.length

  if (totalExecutions === 0) {
    const scopeDesc = plantName
      ? `para o tipo de auditoria selecionado na planta "${plantName}" neste período.`
      : 'para o tipo de auditoria selecionado neste período.'

    return {
      clientId,
      plantId,
      plantName,
      auditType,
      periodLabel,
      generatedAt: new Date().toISOString(),
      totalExecutions: 0,
      totalEvaluations: 0,
      totalNonConformities: 0,
      overallConformityScore: 100,
      ranking: [],
      insights: [
        {
          id: 'insight-empty',
          type: 'improvement',
          title: 'Nenhuma auditoria realizada no recorte',
          description: `Não foram encontradas execuções concluídas ${scopeDesc}`,
          severity: 'low',
          badgeText: 'Sem dados',
        },
      ],
      actionPlan: [],
      plantBreakdown: [],
    }
  }

  // Divisão temporal para cálculo de tendências (metade mais recente vs metade anterior)
  const midpoint = Math.floor(totalExecutions / 2)
  const prevPeriodExecs = sortedExecs.slice(0, midpoint > 0 ? midpoint : 1)
  const recentPeriodExecs = midpoint > 0 ? sortedExecs.slice(midpoint) : sortedExecs

  // Mapas de agregação
  interface ActionAgg {
    actionId: string
    title: string
    category: string
    occurrences: number
    totalEvaluated: number
    scores: number[]
    recentOccurrences: number
    previousOccurrences: number
    plantsMap: Map<string, number>
    evidences: NonConformityEvidence[]
  }

  const actionsMap = new Map<string, ActionAgg>()
  let totalEvaluations = 0
  let totalNonConformitiesCount = 0

  // Contadores para Conformity Score
  let sumScore = 0
  let sumMaxScore = 0

  let prevSumScore = 0
  let prevSumMaxScore = 0

  // Planta breakdown
  interface PlantAgg {
    plantName: string
    executionsCount: number
    nonConformitiesCount: number
    sumScore: number
    sumMaxScore: number
  }
  const plantsMap = new Map<string, PlantAgg>()

  // Processar período anterior
  const prevExecIds = new Set(prevPeriodExecs.map((e) => e.id))
  for (const exec of prevPeriodExecs) {
    if (exec.final_score !== null && exec.max_score && exec.max_score > 0) {
      prevSumScore += exec.final_score
      prevSumMaxScore += exec.max_score
    }
  }

  // Iterar por todas as execuções
  for (const exec of sortedExecs) {
    const isRecent = !prevExecIds.has(exec.id) || prevPeriodExecs.length === totalExecutions
    const pName = exec.plant?.name || 'Não informada'

    // Plant breakdown
    let plantEntry = plantsMap.get(pName)
    if (!plantEntry) {
      plantEntry = {
        plantName: pName,
        executionsCount: 0,
        nonConformitiesCount: 0,
        sumScore: 0,
        sumMaxScore: 0,
      }
      plantsMap.set(pName, plantEntry)
    }
    plantEntry.executionsCount++
    if (exec.final_score !== null && exec.max_score && exec.max_score > 0) {
      plantEntry.sumScore += exec.final_score
      plantEntry.sumMaxScore += exec.max_score
      sumScore += exec.final_score
      sumMaxScore += exec.max_score
    }

    const execDate = exec.realization_date || exec.created_at

    for (const ans of exec.answers || []) {
      totalEvaluations++
      const rawTitle = ans.action?.title || 'Item de Auditoria'
      const actionKey = ans.action_id || rawTitle.trim().toLowerCase()

      let item = actionsMap.get(actionKey)
      if (!item) {
        item = {
          actionId: ans.action_id || actionKey,
          title: rawTitle,
          category: categorizeAuditItem(rawTitle),
          occurrences: 0,
          totalEvaluated: 0,
          scores: [],
          recentOccurrences: 0,
          previousOccurrences: 0,
          plantsMap: new Map<string, number>(),
          evidences: [],
        }
        actionsMap.set(actionKey, item)
      }

      item.totalEvaluated++
      if (ans.score !== null) {
        item.scores.push(ans.score)
      }

      const isNC = isNonConformity(ans.score, ans.observations)

      if (isNC) {
        item.occurrences++
        totalNonConformitiesCount++
        plantEntry.nonConformitiesCount++

        if (isRecent) {
          item.recentOccurrences++
        } else {
          item.previousOccurrences++
        }

        const currentPlantCount = item.plantsMap.get(pName) || 0
        item.plantsMap.set(pName, currentPlantCount + 1)

        // Coletar evidência (amostra de até 5 por item para não inflar o JSON)
        if (item.evidences.length < 6) {
          const urls = [
            ...(ans.evidence_urls || []),
            ...(ans.evidence_url ? [ans.evidence_url] : []),
          ].filter(Boolean) as string[]

          item.evidences.push({
            executionId: exec.id,
            date: execDate,
            plantName: pName,
            score: ans.score ?? 0,
            observations: ans.observations || undefined,
            evidenceUrls: Array.from(new Set(urls)),
          })
        }
      }
    }
  }

  // Conformity Score global (0-100)
  const overallConformityScore =
    sumMaxScore > 0 ? Number(((sumScore / sumMaxScore) * 100).toFixed(1)) : 85.0

  const previousPeriodConformityScore =
    prevSumMaxScore > 0
      ? Number(((prevSumScore / prevSumMaxScore) * 100).toFixed(1))
      : overallConformityScore

  const scoreDelta = Number((overallConformityScore - previousPeriodConformityScore).toFixed(1))

  // Gerar Ranking de Não Conformidades
  const ranking: NonConformityRankItem[] = []

  for (const item of actionsMap.values()) {
    if (item.occurrences === 0) continue

    const occurrenceRate = Number(((item.occurrences / totalExecutions) * 100).toFixed(1))
    const averageScore =
      item.scores.length > 0
        ? Number((item.scores.reduce((a, b) => a + b, 0) / item.scores.length).toFixed(2))
        : 3.0

    // Tendência temporal
    let trend: TrendDirection = 'stable'
    let trendLabel = 'Estável ao longo das execuções'
    if (midpoint > 0) {
      if (item.recentOccurrences > item.previousOccurrences) {
        trend = 'up'
        trendLabel = `Tendência de alta (+${item.recentOccurrences - item.previousOccurrences} ocorrências no período recente)`
      } else if (item.recentOccurrences < item.previousOccurrences) {
        trend = 'down'
        trendLabel = `Em melhora (-${item.previousOccurrences - item.recentOccurrences} no período recente)`
      }
    }

    // Severidade: P1 (Crítico), P2 (Atenção), P3 (Monitoramento)
    let severity: PriorityLevel = 'P3'
    if (occurrenceRate >= 25 || averageScore <= 2.2 || item.recentOccurrences >= 3) {
      severity = 'P1'
    } else if (occurrenceRate >= 12 || averageScore <= 3.0 || trend === 'up') {
      severity = 'P2'
    }

    const affectedPlants = Array.from(item.plantsMap.entries())
      .map(([plantName, count]) => ({ plantName, count }))
      .sort((a, b) => b.count - a.count)

    const sampleObs = item.evidences.find((e) => e.observations)?.observations
    const { action } = deriveSuggestedAction(item.title, item.category, sampleObs)

    ranking.push({
      id: item.actionId,
      title: item.title,
      category: item.category,
      occurrences: item.occurrences,
      totalEvaluated: item.totalEvaluated,
      occurrenceRate,
      averageScore,
      severity,
      trend,
      trendLabel,
      recentOccurrences: item.recentOccurrences,
      previousOccurrences: item.previousOccurrences,
      affectedPlants,
      evidences: item.evidences,
      suggestedAction: action,
    })
  }

  // Ordenar ranking: primeiro por Severidade (P1 > P2 > P3), depois por Ocorrências decrescente
  const severityWeight = { P1: 3, P2: 2, P3: 1 }
  ranking.sort((a, b) => {
    const diffSev = severityWeight[b.severity] - severityWeight[a.severity]
    if (diffSev !== 0) return diffSev
    return b.occurrences - a.occurrences
  })

  // Gerar Insights e Padrões Automáticos baseados em regras
  const insights: AuditPatternInsight[] = []

  // Insight 1: Planta mais ofensora
  const plantBreakdown = Array.from(plantsMap.values()).map((p) => ({
    plantName: p.plantName,
    executionsCount: p.executionsCount,
    nonConformitiesCount: p.nonConformitiesCount,
    conformityRate:
      p.sumMaxScore > 0 ? Number(((p.sumScore / p.sumMaxScore) * 100).toFixed(1)) : 100,
  }))

  plantBreakdown.sort((a, b) => b.nonConformitiesCount - a.nonConformitiesCount)

  if (plantBreakdown.length > 0 && plantBreakdown[0].nonConformitiesCount > 0) {
    const topPlant = plantBreakdown[0]
    const pctOfAllNCs = Math.round(
      (topPlant.nonConformitiesCount / (totalNonConformitiesCount || 1)) * 100,
    )
    insights.push({
      id: 'insight-plant-offender',
      type: 'critical_plant',
      title: `Concentração Crítica na Planta ${topPlant.plantName}`,
      description: `${topPlant.plantName} concentra ${topPlant.nonConformitiesCount} apontamentos (${pctOfAllNCs}% de todas as não conformidades do tipo "${auditType}"). Taxa de conformidade da unidade: ${topPlant.conformityRate}%.`,
      severity: topPlant.conformityRate < 80 ? 'high' : 'medium',
      badgeText: `${pctOfAllNCs}% do total de NCs`,
      affectedEntity: topPlant.plantName,
    })
  }

  // Insight 2: Categoria temática mais reincidente
  const categoryCountMap = new Map<string, number>()
  for (const r of ranking) {
    categoryCountMap.set(r.category, (categoryCountMap.get(r.category) || 0) + r.occurrences)
  }
  const topCategoryEntry = Array.from(categoryCountMap.entries()).sort((a, b) => b[1] - a[1])[0]
  if (topCategoryEntry && topCategoryEntry[1] > 0) {
    insights.push({
      id: 'insight-category-recurrent',
      type: 'recurrent_category',
      title: `Foco Ofensor: ${topCategoryEntry[0]}`,
      description: `A categoria "${topCategoryEntry[0]}" é a maior geradora de desvios, com ${topCategoryEntry[1]} ocorrências acumuladas. Recomenda-se blitz operacional e revisão de rotinas de checagem.`,
      severity: 'high',
      badgeText: `${topCategoryEntry[1]} ocorrências`,
      affectedEntity: topCategoryEntry[0],
    })
  }

  // Insight 3: Item em regressão recente
  const regressedItem = ranking.find((r) => r.trend === 'up' && r.severity === 'P1')
  if (regressedItem) {
    insights.push({
      id: 'insight-regression',
      type: 'regression',
      title: `Regressão Detectada: ${regressedItem.title.slice(0, 48)}...`,
      description: `Ocorrências deste item saltaram de ${regressedItem.previousOccurrences} para ${regressedItem.recentOccurrences} no recorte mais recente (${regressedItem.trendLabel}). Exige cobrança rápida ao time operacional.`,
      severity: 'high',
      badgeText: 'Alerta de Regressão',
      affectedEntity: regressedItem.title,
    })
  }

  // Insight 4: Item com evolução positiva
  const improvedItem = ranking.find((r) => r.trend === 'down' && r.previousOccurrences >= 2)
  if (improvedItem) {
    insights.push({
      id: 'insight-improvement',
      type: 'improvement',
      title: `Evolução Positiva: ${improvedItem.title.slice(0, 48)}...`,
      description: `Houve queda consistente nos apontamentos deste item (${improvedItem.previousOccurrences} no histórico anterior → ${improvedItem.recentOccurrences} no recente). Boas práticas implementadas estão surtindo efeito.`,
      severity: 'low',
      badgeText: 'Evolução Positiva',
      affectedEntity: improvedItem.title,
    })
  }

  // Insight 5: Evolução global da conformidade
  if (scoreDelta !== 0) {
    const isPositive = scoreDelta > 0
    insights.push({
      id: 'insight-score-evolution',
      type: isPositive ? 'improvement' : 'sla_risk',
      title: isPositive
        ? 'Índice de Conformidade em Alta'
        : 'Alerta de Queda no Índice de Conformidade',
      description: isPositive
        ? `O índice global de conformidade subiu de ${previousPeriodConformityScore}% para ${overallConformityScore}% (+${scoreDelta} p.p.), indicando resolução de gargalos anteriores.`
        : `O índice global de conformidade recuou ${Math.abs(scoreDelta)} p.p. (de ${previousPeriodConformityScore}% para ${overallConformityScore}%). Recomenda-se acionar o plano de ação P1 com máxima urgência.`,
      severity: isPositive ? 'low' : 'high',
      badgeText: `${isPositive ? '+' : ''}${scoreDelta} p.p.`,
    })
  }

  // Gerar Plano de Ação Priorizado (P1/P2/P3)
  const actionPlan: ActionPlanTask[] = ranking.map((r, index) => {
    const primaryPlant = r.affectedPlants[0]?.plantName || plantName || 'Todas as Plantas'
    const sampleObs = r.evidences.find((e) => e.observations)?.observations
    const derived = deriveSuggestedAction(r.title, r.category, sampleObs)

    let deadlineDays = derived.days
    if (r.severity === 'P1') deadlineDays = Math.min(deadlineDays, 3)
    if (r.severity === 'P2') deadlineDays = Math.min(deadlineDays, 7)
    if (r.severity === 'P3') deadlineDays = Math.max(deadlineDays, 10)

    return {
      id: `act-${index + 1}-${r.id.slice(0, 8)}`,
      actionTitle: `Ação Corretiva: ${r.title.slice(0, 50)}`,
      itemTitle: r.title,
      category: r.category,
      priority: r.severity,
      targetPlant: primaryPlant,
      suggestedDeadlineDays: deadlineDays,
      suggestedAction: derived.action,
      recommendedRole: derived.role,
      completed: false,
      notes: sampleObs ? `Evidência observada: "${sampleObs}"` : undefined,
    }
  })

  return {
    clientId,
    plantId,
    plantName,
    auditType,
    periodLabel,
    generatedAt: new Date().toISOString(),
    totalExecutions,
    totalEvaluations,
    totalNonConformities: totalNonConformitiesCount,
    overallConformityScore,
    previousPeriodConformityScore,
    scoreDelta,
    ranking,
    insights,
    actionPlan,
    plantBreakdown,
  }
}
