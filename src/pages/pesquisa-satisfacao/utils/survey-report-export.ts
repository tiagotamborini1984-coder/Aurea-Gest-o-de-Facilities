import {
  SurveyQuestion,
  DetailedSurveyResponse,
  SurveyResponseAnswer,
} from '@/types/satisfaction-surveys'
import { exportToXlsx } from '@/lib/export-xlsx'
import { exportToCSV } from '@/lib/export'

/**
 * Constrói a árvore hierárquica das perguntas de uma pesquisa (Pai -> Filhas -> Sub-subfilhas).
 * Retorna uma lista ordenada em profundidade com o nível hierárquico (level = 0, 1, 2...)
 * e o caminho de perguntas pais para exibição amigável.
 */
export interface QuestionHierarchyNode {
  question: SurveyQuestion
  level: number
  parentQuestion?: SurveyQuestion | null
  parentChain: string[] // ex: ["1. O quão satisfeito...", "1.1 Qual o motivo..."]
  columnHeader: string // cabeçalho detalhado para tabela e exportação
}

export function buildQuestionsHierarchy(questions: SurveyQuestion[]): QuestionHierarchyNode[] {
  const result: QuestionHierarchyNode[] = []
  const questionMap = new Map<string, SurveyQuestion>()

  for (const q of questions) {
    if (q.id) questionMap.set(q.id, q)
  }

  // Separar perguntas raiz (sem parent_question_id)
  const rootQuestions = questions
    .filter((q) => !q.parent_question_id)
    .sort((a, b) => a.order_index - b.order_index)

  function traverse(
    current: SurveyQuestion,
    level: number,
    parentQuestion: SurveyQuestion | null,
    parentChain: string[],
  ) {
    const prefix = level === 0 ? '' : '↳ '.repeat(level)
    const columnHeader =
      level === 0
        ? current.title
        : `${prefix}${current.title} [Subpergunta de: "${parentQuestion?.title || 'Pergunta Pai'}"]`

    result.push({
      question: current,
      level,
      parentQuestion,
      parentChain,
      columnHeader,
    })

    // Filhas diretas desta pergunta
    const children = questions
      .filter((q) => q.parent_question_id === current.id)
      .sort((a, b) => a.order_index - b.order_index)

    for (const child of children) {
      traverse(child, level + 1, current, [...parentChain, current.title])
    }
  }

  for (const root of rootQuestions) {
    traverse(root, 0, null, [])
  }

  // Caso alguma pergunta órfã exista (parent_question_id não encontrado na lista)
  for (const q of questions) {
    if (q.parent_question_id && !questionMap.has(q.parent_question_id)) {
      if (!result.some((r) => r.question.id === q.id)) {
        result.push({
          question: q,
          level: 0,
          parentQuestion: null,
          parentChain: [],
          columnHeader: q.title,
        })
      }
    }
  }

  return result
}

/**
 * Mapeia e formata o valor respondido de uma pergunta de acordo com o seu tipo.
 */
export function formatAnswerValue(
  answer: SurveyResponseAnswer | undefined,
  questionType: string,
): {
  display: string
  raw: string | number | null
  badgeColor?: string
} {
  if (!answer) {
    return { display: '—', raw: null }
  }

  if (questionType === 'smiley_5') {
    const val = answer.numeric_value
    if (val === 1) return { display: '😡 Muito Insatisfeito (1)', raw: 1, badgeColor: 'red' }
    if (val === 2) return { display: '🙁 Insatisfeito (2)', raw: 2, badgeColor: 'orange' }
    if (val === 3) return { display: '😐 Regular (3)', raw: 3, badgeColor: 'yellow' }
    if (val === 4) return { display: '🙂 Satisfeito (4)', raw: 4, badgeColor: 'lime' }
    if (val === 5) return { display: '😄 Muito Satisfeito (5)', raw: 5, badgeColor: 'emerald' }
    return { display: val !== null && val !== undefined ? String(val) : '—', raw: val }
  }

  if (questionType === 'rating_5') {
    const val = answer.numeric_value
    return {
      display: val !== null && val !== undefined ? `${val} / 5 ⭐` : '—',
      raw: val,
      badgeColor: 'amber',
    }
  }

  if (questionType === 'rating_10') {
    const val = answer.numeric_value
    return {
      display: val !== null && val !== undefined ? `${val} / 10` : '—',
      raw: val,
      badgeColor: 'blue',
    }
  }

  if (questionType === 'multiple_choice') {
    return {
      display: answer.text_value || '—',
      raw: answer.text_value || null,
      badgeColor: 'slate',
    }
  }

  // Texto livre
  return {
    display: answer.text_value || '—',
    raw: answer.text_value || null,
  }
}

/**
 * Exporta todas as respostas para arquivo Excel (.xlsx) nativo
 * com formatação profissional, hierarquia clara nas colunas e dados completos.
 */
export function exportSurveyResponsesToXlsx(
  surveyTitle: string,
  surveyType: string,
  hierarchy: QuestionHierarchyNode[],
  responses: DetailedSurveyResponse[],
) {
  const sanitize = (name: string) => name.replace(/[\\/?*[\]]/g, '_').slice(0, 31)
  const sheetName = sanitize(surveyTitle || 'Respostas')
  const filename = `relatorio_respostas_${surveyTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`

  // Metadados iniciais
  const baseHeaders = [
    'Data/Hora',
    'Data',
    'Horário',
    'Planta',
    'Código Planta',
    'Local / Ponto de Coleta',
    'Tipo de Pesquisa',
  ]

  // Perguntas hierárquicas
  const questionHeaders = hierarchy.map((node) => {
    if (node.level === 0) {
      return node.question.title
    }
    const prefix = '  '.repeat(node.level) + '↳ '
    return `${prefix}${node.question.title} (Subpergunta de: ${node.parentQuestion?.title || ''})`
  })

  const headers = [...baseHeaders, ...questionHeaders]

  const rows = responses.map((resp) => {
    const dateObj = new Date(resp.submitted_at)
    const dateFormatted = dateObj.toLocaleDateString('pt-BR')
    const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    const fullDateTime = `${dateFormatted} ${timeFormatted}`

    const plantName = resp.plant?.name || resp.survey?.plants?.name || 'Todas as Plantas'
    const plantCode = resp.plant?.code || resp.survey?.plants?.code || '—'
    const location = resp.location_name || resp.survey?.location_name || 'Geral'
    const sType = resp.survey?.survey_type || surveyType || 'Geral'

    // Mapa de respostas da submissão
    const answerMap = new Map<string, SurveyResponseAnswer>()
    for (const a of resp.answers || []) {
      answerMap.set(a.question_id, a)
    }

    const questionValues = hierarchy.map((node) => {
      const ans = answerMap.get(node.question.id || '')
      const formatted = formatAnswerValue(ans, node.question.question_type)
      return formatted.display === '—' ? '' : formatted.display
    })

    return [
      fullDateTime,
      dateFormatted,
      timeFormatted,
      plantName,
      plantCode,
      location,
      sType,
      ...questionValues,
    ]
  })

  exportToXlsx(filename, sheetName, headers, rows)
}

/**
 * Exporta todas as respostas para CSV com UTF-8 BOM e separador ';' (compatível com Excel pt-BR)
 */
export function exportSurveyResponsesToCSV(
  surveyTitle: string,
  surveyType: string,
  hierarchy: QuestionHierarchyNode[],
  responses: DetailedSurveyResponse[],
) {
  const filename = `relatorio_respostas_${surveyTitle.toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`

  const rows = responses.map((resp) => {
    const dateObj = new Date(resp.submitted_at)
    const dateFormatted = dateObj.toLocaleDateString('pt-BR')
    const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })

    const rowObj: Record<string, any> = {
      Data: dateFormatted,
      Horário: timeFormatted,
      'Data Completa': `${dateFormatted} ${timeFormatted}`,
      Planta: resp.plant?.name || resp.survey?.plants?.name || 'Todas as Plantas',
      'Código Planta': resp.plant?.code || resp.survey?.plants?.code || '',
      Local: resp.location_name || resp.survey?.location_name || 'Geral',
      'Tipo de Pesquisa': resp.survey?.survey_type || surveyType || 'Geral',
    }

    const answerMap = new Map<string, SurveyResponseAnswer>()
    for (const a of resp.answers || []) {
      answerMap.set(a.question_id, a)
    }

    hierarchy.forEach((node) => {
      const header =
        node.level === 0
          ? node.question.title
          : `${'↳ '.repeat(node.level)}${node.question.title} (Subpergunta de: ${node.parentQuestion?.title || ''})`

      const ans = answerMap.get(node.question.id || '')
      const formatted = formatAnswerValue(ans, node.question.question_type)
      rowObj[header] = formatted.display === '—' ? '' : formatted.display
    })

    return rowObj
  })

  exportToCSV(filename, rows)
}
