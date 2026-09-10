export type PriorityLevel = 'P1' | 'P2' | 'P3'
export type TrendDirection = 'up' | 'down' | 'stable'

export interface NonConformityEvidence {
  executionId: string
  date: string
  plantName: string
  score: number
  observations?: string
  evidenceUrls?: string[]
}

export interface NonConformityRankItem {
  id: string // action_id or action title key
  title: string
  category: string
  occurrences: number
  totalEvaluated: number
  occurrenceRate: number // 0 - 100%
  averageScore: number
  severity: PriorityLevel
  trend: TrendDirection
  trendLabel: string // ex: "+14% no período recente" ou "Estável"
  recentOccurrences: number
  previousOccurrences: number
  affectedPlants: { plantName: string; count: number }[]
  evidences: NonConformityEvidence[]
  suggestedAction: string
}

export interface AuditPatternInsight {
  id: string
  type: 'critical_plant' | 'recurrent_category' | 'regression' | 'improvement' | 'sla_risk'
  title: string
  description: string
  severity: 'high' | 'medium' | 'low'
  badgeText: string
  affectedEntity?: string
}

export interface ActionPlanTask {
  id: string
  actionTitle: string
  itemTitle: string
  category: string
  priority: PriorityLevel
  targetPlant: string
  suggestedDeadlineDays: number
  suggestedAction: string
  recommendedRole: string
  completed: boolean
  completedAt?: string
  notes?: string
}

export interface AuditAiReportData {
  id?: string
  clientId: string
  plantId?: string
  plantName?: string
  auditType: string
  auditTitle?: string
  periodLabel: string
  generatedAt: string
  totalExecutions: number
  totalEvaluations: number
  totalNonConformities: number
  overallConformityScore: number // 0 - 100
  previousPeriodConformityScore?: number // 0 - 100
  scoreDelta?: number // difference
  ranking: NonConformityRankItem[]
  insights: AuditPatternInsight[]
  actionPlan: ActionPlanTask[]
  plantBreakdown: {
    plantName: string
    executionsCount: number
    nonConformitiesCount: number
    conformityRate: number
  }[]
}

export interface RawAuditExecutionRecord {
  id: string
  realization_date: string | null
  created_at: string
  status: string
  final_score: number | null
  max_score: number | null
  plant_id: string
  plant?: { id: string; name: string } | null
  audit?: {
    id: string
    title: string
    type: string
    scoring_settings: any
  } | null
  answers: {
    id: string
    action_id: string
    score: number | null
    observations: string | null
    evidence_url?: string | null
    evidence_urls?: string[] | null
    action?: {
      id: string
      title: string
      weight?: number
    } | null
  }[]
}
