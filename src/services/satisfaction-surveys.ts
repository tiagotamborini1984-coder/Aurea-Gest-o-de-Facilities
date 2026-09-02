import { supabase } from '@/lib/supabase/client'
import {
  SatisfactionSurvey,
  SurveyQuestion,
  SurveySchedule,
  SurveyResponseSubmission,
  SurveyDashboardFilters,
  SurveyDashboardMetrics,
} from '@/types/satisfaction-surveys'

export const satisfactionSurveyService = {
  // 1. Listar pesquisas (com contagem de respostas)
  async getSurveys(clientId?: string, plantId?: string): Promise<SatisfactionSurvey[]> {
    let query = supabase
      .from('satisfaction_surveys')
      .select(`
        *,
        plants:plant_id(id, name, code),
        schedules:satisfaction_survey_schedules(*),
        questions:satisfaction_survey_questions(*),
        responses:satisfaction_survey_responses(count)
      `)
      .order('created_at', { ascending: false })

    if (clientId) {
      query = query.eq('client_id', clientId)
    }
    if (plantId && plantId !== 'all') {
      query = query.eq('plant_id', plantId)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching surveys:', error)
      throw error
    }

    return (data || []).map((item: any) => ({
      ...item,
      questions: (item.questions || []).sort(
        (a: SurveyQuestion, b: SurveyQuestion) => a.order_index - b.order_index,
      ),
      responses_count: item.responses?.[0]?.count || 0,
    }))
  },

  // 2. Buscar detalhes de uma pesquisa por ID (para edição admin)
  async getSurveyById(id: string): Promise<SatisfactionSurvey | null> {
    const { data, error } = await supabase
      .from('satisfaction_surveys')
      .select(`
        *,
        plants:plant_id(id, name, code),
        schedules:satisfaction_survey_schedules(*),
        questions:satisfaction_survey_questions(*)
      `)
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') return null
      console.error('Error fetching survey by id:', error)
      throw error
    }

    if (!data) return null

    return {
      ...data,
      questions: (data.questions || []).sort(
        (a: SurveyQuestion, b: SurveyQuestion) => a.order_index - b.order_index,
      ),
    }
  },

  // 3. Buscar pesquisa pública por ID (para exibição no tablet/QRCode, sem auth necessária)
  async getPublicSurvey(id: string): Promise<{
    survey: SatisfactionSurvey | null
    isAvailable: boolean
    statusReason?: string
  }> {
    const { data, error } = await supabase
      .from('satisfaction_surveys')
      .select(`
        id,
        client_id,
        title,
        description,
        survey_type,
        plant_id,
        location_name,
        start_date,
        end_date,
        is_active,
        allow_multiple_responses,
        created_at,
        updated_at,
        plants:plant_id(id, name, code),
        schedules:satisfaction_survey_schedules(id, survey_id, start_time, end_time, days_of_week, description),
        questions:satisfaction_survey_questions(id, survey_id, title, description, question_type, options, is_required, order_index)
      `)
      .eq('id', id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching public survey:', error)
      return { survey: null, isAvailable: false, statusReason: 'Erro ao carregar a pesquisa.' }
    }

    if (!data) {
      return { survey: null, isAvailable: false, statusReason: 'Pesquisa não encontrada.' }
    }

    const survey: SatisfactionSurvey = {
      ...data,
      questions: (data.questions || []).sort(
        (a: SurveyQuestion, b: SurveyQuestion) => a.order_index - b.order_index,
      ),
    }

    // Verificar se está ativa
    if (!survey.is_active) {
      return { survey, isAvailable: false, statusReason: 'Esta pesquisa está inativa no momento.' }
    }

    // Verificar validade de datas (horário de Brasília)
    const now = new Date()
    // Obter data no formato YYYY-MM-DD
    const todayStr = now.toISOString().split('T')[0]

    if (survey.start_date && todayStr < survey.start_date) {
      return {
        survey,
        isAvailable: false,
        statusReason: `Esta pesquisa estará disponível a partir de ${new Date(
          survey.start_date + 'T00:00:00',
        ).toLocaleDateString('pt-BR')}.`,
      }
    }

    if (survey.end_date && todayStr > survey.end_date) {
      return {
        survey,
        isAvailable: false,
        statusReason: `Esta pesquisa foi encerrada em ${new Date(
          survey.end_date + 'T00:00:00',
        ).toLocaleDateString('pt-BR')}.`,
      }
    }

    // Verificar faixas de horário
    const schedules = survey.schedules || []
    if (schedules.length > 0) {
      const currentHours = String(now.getHours()).padStart(2, '0')
      const currentMins = String(now.getMinutes()).padStart(2, '0')
      const currentSecs = String(now.getSeconds()).padStart(2, '0')
      const currentTimeStr = `${currentHours}:${currentMins}:${currentSecs}`
      const currentDayOfWeek = now.getDay() // 0=Domingo, 1=Segunda, etc.

      const matchesSchedule = schedules.some((sch) => {
        if (
          sch.days_of_week &&
          sch.days_of_week.length > 0 &&
          !sch.days_of_week.includes(currentDayOfWeek)
        ) {
          return false
        }
        const start = sch.start_time
        const end = sch.end_time
        if (start <= end) {
          return currentTimeStr >= start && currentTimeStr <= end
        } else {
          // Cruza a meia-noite
          return currentTimeStr >= start || currentTimeStr <= end
        }
      })

      if (!matchesSchedule) {
        const scheduleDescriptions = schedules
          .map(
            (s) =>
              `${s.description ? s.description + ': ' : ''}${s.start_time.slice(0, 5)} às ${s.end_time.slice(0, 5)}`,
          )
          .join(', ')

        return {
          survey,
          isAvailable: false,
          statusReason: `Fora do horário de funcionamento da pesquisa. Horários disponíveis: ${scheduleDescriptions}.`,
        }
      }
    }

    return { survey, isAvailable: true }
  },

  // 4. Salvar (Criar ou Atualizar) Pesquisa completa com perguntas e faixas de horário
  async saveSurvey(
    survey: Partial<SatisfactionSurvey>,
    questions: Partial<SurveyQuestion>[],
    schedules: Partial<SurveySchedule>[],
  ): Promise<SatisfactionSurvey> {
    const isUpdating = Boolean(survey.id)
    let surveyId = survey.id

    const surveyData = {
      client_id: survey.client_id,
      title: survey.title,
      description: survey.description || null,
      survey_type: survey.survey_type || 'Geral',
      plant_id: survey.plant_id || null,
      location_name: survey.location_name || null,
      start_date: survey.start_date || null,
      end_date: survey.end_date || null,
      is_active: survey.is_active ?? true,
      allow_multiple_responses: survey.allow_multiple_responses ?? true,
      updated_at: new Date().toISOString(),
    }

    if (isUpdating && surveyId) {
      const { error: updateError } = await supabase
        .from('satisfaction_surveys')
        .update(surveyData)
        .eq('id', surveyId)

      if (updateError) throw updateError
    } else {
      const { data: newSurvey, error: insertError } = await supabase
        .from('satisfaction_surveys')
        .insert([surveyData])
        .select('id')
        .single()

      if (insertError) throw insertError
      surveyId = newSurvey.id
    }

    if (!surveyId) throw new Error('Não foi possível identificar o ID da pesquisa.')

    // Salvar Perguntas (Substituição ou Atualização)
    // Deletar perguntas antigas não inclusas e inserir/atualizar as atuais
    if (isUpdating) {
      await supabase.from('satisfaction_survey_questions').delete().eq('survey_id', surveyId)
    }

    if (questions.length > 0) {
      const questionsToInsert = questions.map((q, idx) => ({
        survey_id: surveyId,
        title: q.title || 'Pergunta',
        description: q.description || null,
        question_type: q.question_type || 'rating_10',
        options: q.options || [],
        is_required: q.is_required ?? true,
        order_index: idx + 1,
      }))

      const { error: questionsError } = await supabase
        .from('satisfaction_survey_questions')
        .insert(questionsToInsert)

      if (questionsError) throw questionsError
    }

    // Salvar Faixas de Horário
    if (isUpdating) {
      await supabase.from('satisfaction_survey_schedules').delete().eq('survey_id', surveyId)
    }

    if (schedules.length > 0) {
      const schedulesToInsert = schedules.map((s) => ({
        survey_id: surveyId,
        start_time: s.start_time?.length === 5 ? `${s.start_time}:00` : s.start_time,
        end_time: s.end_time?.length === 5 ? `${s.end_time}:00` : s.end_time,
        days_of_week: s.days_of_week || [0, 1, 2, 3, 4, 5, 6],
        description: s.description || null,
      }))

      const { error: schedulesError } = await supabase
        .from('satisfaction_survey_schedules')
        .insert(schedulesToInsert)

      if (schedulesError) throw schedulesError
    }

    const saved = await this.getSurveyById(surveyId)
    if (!saved) throw new Error('Erro ao recuperar pesquisa salva.')
    return saved
  },

  // 5. Ativar / Desativar pesquisa rapidamente
  async toggleSurveyStatus(id: string, is_active: boolean): Promise<void> {
    const { error } = await supabase
      .from('satisfaction_surveys')
      .update({ is_active, updated_at: new Date().toISOString() })
      .eq('id', id)

    if (error) throw error
  },

  // 6. Excluir pesquisa
  async deleteSurvey(id: string): Promise<void> {
    const { error } = await supabase.from('satisfaction_surveys').delete().eq('id', id)
    if (error) throw error
  },

  // 7. Submissão pública da resposta (usa a RPC segura criada na migration)
  async submitResponse(
    payload: SurveyResponseSubmission,
  ): Promise<{ success: boolean; error?: string }> {
    const { data, error } = await supabase.rpc('submit_survey_response', {
      p_survey_id: payload.survey_id,
      p_plant_id: payload.plant_id || null,
      p_location_name: payload.location_name || null,
      p_answers: payload.answers,
      p_device_info: payload.device_info || {},
    })

    if (error) {
      console.error('Error submitting survey response RPC:', error)
      return { success: false, error: error.message || 'Erro ao registrar resposta.' }
    }

    if (data && !data.success) {
      return { success: false, error: data.error }
    }

    return { success: true }
  },

  // 8. Obter métricas consolidadas para o Dashboard
  async getDashboardMetrics(filters: SurveyDashboardFilters): Promise<SurveyDashboardMetrics> {
    let responsesQuery = supabase
      .from('satisfaction_survey_responses')
      .select(`
        id,
        survey_id,
        client_id,
        plant_id,
        location_name,
        submitted_at,
        survey:satisfaction_surveys(id, title, survey_type, plant_id, plants:plant_id(name)),
        answers:satisfaction_survey_response_answers(
          id,
          question_id,
          numeric_value,
          text_value,
          question:satisfaction_survey_questions(id, title, question_type, options, order_index)
        )
      `)
      .order('submitted_at', { ascending: false })

    if (filters.clientId) {
      responsesQuery = responsesQuery.eq('client_id', filters.clientId)
    }
    if (filters.plantId && filters.plantId !== 'all') {
      responsesQuery = responsesQuery.eq('plant_id', filters.plantId)
    }
    if (filters.surveyId && filters.surveyId !== 'all') {
      responsesQuery = responsesQuery.eq('survey_id', filters.surveyId)
    }
    if (filters.startDate) {
      responsesQuery = responsesQuery.gte('submitted_at', `${filters.startDate}T00:00:00`)
    }
    if (filters.endDate) {
      responsesQuery = responsesQuery.lte('submitted_at', `${filters.endDate}T23:59:59`)
    }

    const { data: responses, error } = await responsesQuery

    if (error) {
      console.error('Error fetching dashboard responses:', error)
      throw error
    }

    const allResponses = responses || []

    // Filtrar por survey_type se solicitado
    const filteredResponses =
      filters.surveyType && filters.surveyType !== 'all'
        ? allResponses.filter((r: any) => r.survey?.survey_type === filters.surveyType)
        : allResponses

    const totalResponses = filteredResponses.length

    // Calcular notas e distribuições
    let numericSum = 0
    let numericCount = 0
    const scoreBuckets: Record<string, number> = {
      '0-2 (Muito Crítico)': 0,
      '3-4 (Crítico)': 0,
      '5-6 (Neutro)': 0,
      '7-8 (Bom)': 0,
      '9-10 (Excelente)': 0,
    }

    const surveyBreakdownMap: Record<
      string,
      {
        surveyId: string
        title: string
        type: string
        plantName: string
        responsesCount: number
        scoreSum: number
        scoreCount: number
      }
    > = {}

    const questionMap: Record<
      string,
      {
        questionId: string
        questionTitle: string
        questionType: any
        surveyTitle: string
        orderIndex: number
        totalAnswers: number
        sumScores: number
        countScores: number
        optionCounts: Record<string, number>
        textAnswers: { text: string; date: string; location?: string }[]
      }
    > = {}

    for (const resp of filteredResponses) {
      const sId = resp.survey_id
      const sTitle = resp.survey?.title || 'Pesquisa'
      const sType = resp.survey?.survey_type || 'Geral'
      const pName = resp.survey?.plants?.name || 'Todas as Plantas'

      if (!surveyBreakdownMap[sId]) {
        surveyBreakdownMap[sId] = {
          surveyId: sId,
          title: sTitle,
          type: sType,
          plantName: pName,
          responsesCount: 0,
          scoreSum: 0,
          scoreCount: 0,
        }
      }
      surveyBreakdownMap[sId].responsesCount += 1

      for (const ans of resp.answers || []) {
        const q = ans.question
        if (!q) continue
        const qId = q.id

        if (!questionMap[qId]) {
          questionMap[qId] = {
            questionId: qId,
            questionTitle: q.title,
            questionType: q.question_type,
            surveyTitle: sTitle,
            orderIndex: q.order_index || 0,
            totalAnswers: 0,
            sumScores: 0,
            countScores: 0,
            optionCounts: {},
            textAnswers: [],
          }
        }

        const qStat = questionMap[qId]
        qStat.totalAnswers += 1

        // Tratar notas
        if (ans.numeric_value !== null && ans.numeric_value !== undefined) {
          const rawVal = Number(ans.numeric_value)
          // Normalizar para 0-10 se for 1-5 estrelas
          const normalizedVal = q.question_type === 'rating_5' ? (rawVal / 5) * 10 : rawVal

          numericSum += normalizedVal
          numericCount += 1

          qStat.sumScores += rawVal
          qStat.countScores += 1

          surveyBreakdownMap[sId].scoreSum += normalizedVal
          surveyBreakdownMap[sId].scoreCount += 1

          if (normalizedVal <= 2) scoreBuckets['0-2 (Muito Crítico)'] += 1
          else if (normalizedVal <= 4) scoreBuckets['3-4 (Crítico)'] += 1
          else if (normalizedVal <= 6) scoreBuckets['5-6 (Neutro)'] += 1
          else if (normalizedVal <= 8) scoreBuckets['7-8 (Bom)'] += 1
          else scoreBuckets['9-10 (Excelente)'] += 1
        }

        // Tratar múltipla escolha
        if (q.question_type === 'multiple_choice' && ans.text_value) {
          const opt = ans.text_value.trim()
          qStat.optionCounts[opt] = (qStat.optionCounts[opt] || 0) + 1
        }

        // Tratar texto livre
        if (q.question_type === 'text' && ans.text_value) {
          qStat.textAnswers.push({
            text: ans.text_value,
            date: resp.submitted_at,
            location: resp.location_name || undefined,
          })
        }
      }
    }

    const overallAvgScore = numericCount > 0 ? Number((numericSum / numericCount).toFixed(1)) : null

    const scoreDistribution = Object.entries(scoreBuckets).map(([scoreRange, count]) => ({
      scoreRange,
      count,
      percentage: numericCount > 0 ? Math.round((count / numericCount) * 100) : 0,
    }))

    const surveysBreakdown = Object.values(surveyBreakdownMap).map((item) => ({
      surveyId: item.surveyId,
      title: item.title,
      type: item.type,
      plantName: item.plantName,
      responsesCount: item.responsesCount,
      avgScore: item.scoreCount > 0 ? Number((item.scoreSum / item.scoreCount).toFixed(1)) : null,
    }))

    const questionMetrics = Object.values(questionMap)
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((q) => {
        let distribution: { label: string; count: number; percentage: number }[] | undefined =
          undefined

        if (q.questionType === 'multiple_choice') {
          distribution = Object.entries(q.optionCounts).map(([label, count]) => ({
            label,
            count,
            percentage: q.totalAnswers > 0 ? Math.round((count / q.totalAnswers) * 100) : 0,
          }))
        }

        return {
          questionId: q.questionId,
          questionTitle: q.questionTitle,
          questionType: q.questionType,
          surveyTitle: q.surveyTitle,
          totalAnswers: q.totalAnswers,
          avgRating: q.countScores > 0 ? Number((q.sumScores / q.countScores).toFixed(1)) : null,
          distribution,
          textAnswers: q.textAnswers,
        }
      })

    return {
      totalResponses,
      overallAvgScore,
      scoreDistribution,
      surveysBreakdown,
      questionMetrics,
    }
  },
}
