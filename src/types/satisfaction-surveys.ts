export type QuestionType = 'rating_10' | 'rating_5' | 'smiley_5' | 'multiple_choice' | 'text'

export interface SurveySchedule {
  id?: string
  survey_id?: string
  start_time: string // 'HH:MM:SS' or 'HH:MM'
  end_time: string // 'HH:MM:SS' or 'HH:MM'
  days_of_week?: number[]
  description?: string | null
}

export interface SurveyQuestion {
  id?: string
  survey_id?: string
  title: string
  description?: string | null
  question_type: QuestionType
  options: string[]
  is_required: boolean
  order_index: number
  is_conditional?: boolean
  parent_question_id?: string | null
  trigger_values?: any[]
  // Helper for UI temporary IDs when building new questions before DB insertion
  temp_id?: string
}

export interface SatisfactionSurvey {
  id: string
  client_id: string
  title: string
  description?: string | null
  survey_type: string
  plant_id?: string | null
  location_name?: string | null
  start_date?: string | null
  end_date?: string | null
  is_active: boolean
  allow_multiple_responses: boolean
  created_at: string
  updated_at: string
  plants?: { id: string; name: string; code?: string } | null
  schedules?: SurveySchedule[]
  questions?: SurveyQuestion[]
  responses_count?: number
}

export interface SurveyResponseAnswer {
  id?: string
  response_id?: string
  question_id: string
  numeric_value?: number | null
  text_value?: string | null
  question?: SurveyQuestion
}

export interface DetailedSurveyResponse {
  id: string
  survey_id: string
  client_id: string
  plant_id?: string | null
  location_name?: string | null
  submitted_at: string
  device_info?: Record<string, any>
  plant?: { id: string; name: string; code?: string } | null
  survey?: {
    id: string
    title: string
    survey_type: string
    plant_id?: string | null
    location_name?: string | null
    plants?: { id: string; name: string; code?: string } | null
  } | null
  answers: SurveyResponseAnswer[]
}

export interface SurveyDetailedReportFilters {
  surveyId: string
  clientId?: string
  plantId?: string
  startDate?: string
  endDate?: string
  searchTerm?: string
}

export interface SurveyResponseSubmission {
  survey_id: string
  plant_id?: string | null
  location_name?: string | null
  answers: {
    question_id: string
    numeric_value?: number | null
    text_value?: string | null
  }[]
  device_info?: Record<string, any>
}

export interface SurveyDashboardFilters {
  clientId?: string
  plantId?: string
  surveyType?: string
  surveyId?: string
  startDate?: string
  endDate?: string
}

export interface SmileyMetrics {
  totalSmileyAnswers: number
  satisfiedCount: number // respostas 4 (Satisfeito) + 5 (Muito Satisfeito)
  satisfiedPercentage: number // % de 4 + 5
  verySatisfiedCount: number // respostas 5
  verySatisfiedPercentage: number
  satisfiedOnlyCount: number // respostas 4
  satisfiedOnlyPercentage: number
  neutralCount: number // respostas 3 (Regular)
  neutralPercentage: number
  dissatisfiedCount: number // respostas 2 (Insatisfeito)
  dissatisfiedPercentage: number
  veryDissatisfiedCount: number // respostas 1 (Muito Insatisfeito)
  veryDissatisfiedPercentage: number
}

export interface DissatisfactionOffender {
  id: string
  reason: string // texto da opção ou comentário
  questionTitle: string
  parentQuestionTitle?: string | null
  surveyTitle: string
  count: number
  percentage: number // % sobre o total de apontamentos de ofensores
  type: 'multiple_choice' | 'text'
}

export interface PlantSatisfactionComparison {
  plantId: string
  plantName: string
  plantCode?: string | null
  totalResponses: number
  satisfiedCount: number
  satisfactionRate: number | null // % de satisfeitos (4+5) sobre respostas smiley
  avgScore: number | null // Nota média normalizada 0 a 10
}

export interface SurveyDashboardMetrics {
  totalResponses: number
  overallAvgScore: number | null // Escala 0-10 normalizada
  smileyMetrics?: SmileyMetrics | null // Métricas consolidadas de rostinhos (smiley_5)
  scoreDistribution: { scoreRange: string; count: number; percentage: number }[]
  surveysBreakdown: {
    surveyId: string
    title: string
    type: string
    plantName: string
    responsesCount: number
    avgScore: number | null
  }[]
  questionMetrics: {
    questionId: string
    questionTitle: string
    questionType: QuestionType
    surveyTitle: string
    isConditional?: boolean
    parentQuestionId?: string | null
    parentQuestionTitle?: string | null
    triggerValues?: any[]
    totalAnswers: number
    avgRating?: number | null
    distribution?: { label: string; count: number; percentage: number }[]
    textAnswers?: { text: string; date: string; location?: string }[]
    smileyMetrics?: SmileyMetrics | null
  }[]
  offendersRanking?: DissatisfactionOffender[]
  plantComparisons?: PlantSatisfactionComparison[]
}
