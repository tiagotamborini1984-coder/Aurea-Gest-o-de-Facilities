export type QuestionType = 'rating_10' | 'rating_5' | 'multiple_choice' | 'text'

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

export interface SurveyDashboardMetrics {
  totalResponses: number
  overallAvgScore: number | null // Escala 0-10 normalizada
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
    totalAnswers: number
    avgRating?: number | null
    distribution?: { label: string; count: number; percentage: number }[]
    textAnswers?: { text: string; date: string; location?: string }[]
  }[]
}
