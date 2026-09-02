import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { SatisfactionSurvey, SurveyQuestion } from '@/types/satisfaction-surveys'
import { satisfactionSurveyService } from '@/services/satisfaction-surveys'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  Tablet,
  Sparkles,
  Send,
  Loader2,
  Building2,
  RotateCcw,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export function PublicSurveyForm() {
  const { id } = useParams<{ id: string }>()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [survey, setSurvey] = useState<SatisfactionSurvey | null>(null)
  const [isAvailable, setIsAvailable] = useState(true)
  const [statusReason, setStatusReason] = useState<string | undefined>()

  // Estado das respostas do formulário: { [question_id]: { numeric_value?: number, text_value?: string } }
  const [answers, setAnswers] = useState<
    Record<string, { numeric_value?: number | null; text_value?: string | null }>
  >({})

  // Estado de sucesso pós-envio
  const [submittedSuccess, setSubmittedSuccess] = useState(false)

  // Carregar pesquisa e checar disponibilidade
  const loadSurvey = async () => {
    if (!id) return
    setLoading(true)
    try {
      const result = await satisfactionSurveyService.getPublicSurvey(id)
      setSurvey(result.survey)
      setIsAvailable(result.isAvailable)
      setStatusReason(result.statusReason)

      if (result.survey) {
        // Inicializar estado de respostas vazio
        const initialAnswers: Record<string, any> = {}
        result.survey.questions?.forEach((q) => {
          initialAnswers[q.id || ''] = {
            numeric_value: null,
            text_value: null,
          }
        })
        setAnswers(initialAnswers)
      }
    } catch (err) {
      console.error('Erro ao carregar pesquisa:', err)
      setIsAvailable(false)
      setStatusReason('Erro inesperado ao carregar o formulário.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSurvey()
  }, [id])

  // Atualizar resposta numérica (0-10 ou 1-5)
  const handleRatingSelect = (questionId: string, value: number) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        numeric_value: value,
      },
    }))
  }

  // Atualizar resposta de múltipla escolha
  const handleOptionSelect = (questionId: string, option: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_value: option,
      },
    }))
  }

  // Atualizar resposta textual
  const handleTextChange = (questionId: string, text: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        text_value: text,
      },
    }))
  }

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey || !id) return

    // Validar perguntas obrigatórias
    const questions = survey.questions || []
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qId = q.id || ''
      const ans = answers[qId]

      if (q.is_required) {
        if (
          (q.question_type === 'rating_10' || q.question_type === 'rating_5') &&
          (ans?.numeric_value === null || ans?.numeric_value === undefined)
        ) {
          toast.error(`Por favor, responda à pergunta #${i + 1}.`)
          return
        }
        if (q.question_type === 'multiple_choice' && !ans?.text_value) {
          toast.error(`Por favor, selecione uma opção na pergunta #${i + 1}.`)
          return
        }
        if (q.question_type === 'text' && (!ans?.text_value || !ans.text_value.trim())) {
          toast.error(`Por favor, preencha o campo na pergunta #${i + 1}.`)
          return
        }
      }
    }

    setSubmitting(true)

    try {
      const formattedAnswers = Object.entries(answers)
        .filter(
          ([_, val]) =>
            val.numeric_value !== null || (val.text_value && val.text_value.trim() !== ''),
        )
        .map(([qId, val]) => ({
          question_id: qId,
          numeric_value: val.numeric_value ?? null,
          text_value: val.text_value ?? null,
        }))

      const result = await satisfactionSurveyService.submitResponse({
        survey_id: id,
        plant_id: survey.plant_id,
        location_name: survey.location_name,
        answers: formattedAnswers,
        device_info: {
          userAgent: navigator.userAgent,
          screen: `${window.screen.width}x${window.screen.height}`,
          language: navigator.language,
        },
      })

      if (!result.success) {
        toast.error(result.error || 'Não foi possível registrar a resposta.')
        return
      }

      setSubmittedSuccess(true)
    } catch (err: any) {
      console.error('Erro na submissão:', err)
      toast.error('Erro ao enviar resposta. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  // Reiniciar formulário para nova resposta no tablet
  const handleResetForNext = () => {
    setSubmittedSuccess(false)
    if (survey) {
      const initialAnswers: Record<string, any> = {}
      survey.questions?.forEach((q) => {
        initialAnswers[q.id || ''] = {
          numeric_value: null,
          text_value: null,
        }
      })
      setAnswers(initialAnswers)
    }
    // Revalidar disponibilidade
    loadSurvey()
  }

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Loader2 className="h-10 w-10 animate-spin text-brand-vividBlue mb-3" />
        <p className="text-sm text-slate-600 dark:text-slate-400 font-medium animate-pulse">
          Carregando pesquisa de satisfação...
        </p>
      </div>
    )
  }

  // Tela de Bloqueio por Horário / Inatividade / Não Encontrada
  if (!isAvailable || !survey) {
    return (
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-lg w-full border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden rounded-2xl bg-white dark:bg-slate-900">
          <div className="bg-amber-500/10 border-b border-amber-500/20 p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-3">
              <Clock className="h-8 w-8" />
            </div>
            <h2 className="text-xl font-bold text-foreground">Pesquisa Indisponível</h2>
          </div>

          <CardContent className="p-6 text-center space-y-4">
            <p className="text-sm text-muted-foreground leading-relaxed">
              {statusReason || 'Esta pesquisa não está aceitando respostas no momento.'}
            </p>

            {survey && survey.schedules && survey.schedules.length > 0 && (
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border text-left space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Horários Programados:
                </p>
                <div className="space-y-1">
                  {survey.schedules.map((sch, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between text-xs py-1 border-b border-slate-200/50 dark:border-slate-700/50 last:border-none"
                    >
                      <span className="font-medium text-foreground">
                        {sch.description || `Turno ${i + 1}`}
                      </span>
                      <span className="font-mono text-primary font-semibold">
                        {sch.start_time.slice(0, 5)} - {sch.end_time.slice(0, 5)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <Button variant="outline" onClick={loadSurvey} className="w-full gap-2 text-xs">
              <RotateCcw className="h-3.5 w-3.5" />
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Tela de Agradecimento Pós-Envio
  if (submittedSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 flex items-center justify-center p-4 sm:p-6">
        <Card className="max-w-md w-full border-emerald-500/20 shadow-2xl overflow-hidden rounded-3xl bg-white dark:bg-slate-900 text-center animate-in fade-in zoom-in duration-300">
          <div className="bg-emerald-500/10 border-b border-emerald-500/20 p-8 flex flex-col items-center">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-4 shadow-lg shadow-emerald-500/10 animate-bounce">
              <CheckCircle className="h-10 w-10" />
            </div>
            <h2 className="text-2xl font-bold text-foreground tracking-tight">Muito Obrigado!</h2>
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-widest mt-1">
              Resposta Registrada com Sucesso
            </p>
          </div>

          <CardContent className="p-6 sm:p-8 space-y-6">
            <p className="text-sm text-muted-foreground leading-relaxed">
              Sua avaliação foi gravada anonimamente e é fundamental para aprimorarmos continuamente
              a qualidade de nossas instalações e serviços.
            </p>

            {survey.allow_multiple_responses && (
              <Button
                onClick={handleResetForNext}
                size="lg"
                className="w-full bg-brand-deepBlue hover:bg-brand-vividBlue text-white font-semibold shadow-lg shadow-blue-500/20 h-12 rounded-xl text-sm gap-2"
              >
                <Tablet className="h-4 w-4" />
                Nova Avaliação (Próximo Usuário)
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Formulário Público de Preenchimento (Otimizado para Tablets & Celulares)
  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 py-6 px-3 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Cabeçalho da Pesquisa */}
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300">
              <Sparkles className="h-3 w-3" />
              {survey.survey_type}
            </span>
            {survey.location_name && (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground font-medium">
                <Building2 className="h-3 w-3 text-slate-400" />
                {survey.location_name}
              </span>
            )}
          </div>

          <h1 className="text-xl sm:text-2xl font-bold text-foreground leading-snug">
            {survey.title}
          </h1>

          {survey.description && (
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {survey.description}
            </p>
          )}
        </div>

        {/* Formulário com as Perguntas */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {(survey.questions || []).map((q, idx) => {
            const qId = q.id || ''
            const ans = answers[qId] || {}

            return (
              <Card
                key={qId}
                className={cn(
                  'border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 transition-all duration-200 overflow-hidden',
                  ans.numeric_value !== null || ans.text_value
                    ? 'border-l-4 border-l-brand-vividBlue'
                    : '',
                )}
              >
                <CardContent className="p-5 sm:p-6 space-y-4">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h2 className="text-base sm:text-lg font-semibold text-foreground flex items-baseline gap-2">
                        <span className="text-brand-vividBlue font-bold">{idx + 1}.</span>
                        {q.title}
                        {q.is_required && (
                          <span className="text-red-500 font-bold ml-0.5" title="Obrigatória">
                            *
                          </span>
                        )}
                      </h2>
                    </div>

                    {q.description && (
                      <p className="text-xs text-muted-foreground mt-1">{q.description}</p>
                    )}
                  </div>

                  {/* CASO 1: NOTA DE 0 A 10 */}
                  {q.question_type === 'rating_10' && (
                    <div className="space-y-2 pt-1">
                      <div className="grid grid-cols-11 gap-1 sm:gap-2">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => {
                          const isSelected = ans.numeric_value === num
                          return (
                            <button
                              key={num}
                              type="button"
                              onClick={() => handleRatingSelect(qId, num)}
                              className={cn(
                                'h-11 sm:h-13 rounded-xl font-bold text-sm sm:text-base transition-all duration-150 flex items-center justify-center border',
                                isSelected
                                  ? 'bg-brand-deepBlue dark:bg-blue-600 text-white border-brand-deepBlue dark:border-blue-500 shadow-md scale-105 ring-2 ring-blue-400/30'
                                  : 'bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700',
                              )}
                            >
                              {num}
                            </button>
                          )
                        })}
                      </div>

                      <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground px-1 pt-1">
                        <span>0 - Péssimo</span>
                        <span>5 - Regular</span>
                        <span>10 - Excelente</span>
                      </div>
                    </div>
                  )}

                  {/* CASO 2: ESTRELAS (1 A 5) */}
                  {q.question_type === 'rating_5' && (
                    <div className="space-y-2 pt-1">
                      <div className="flex items-center justify-center gap-2 sm:gap-4 py-2">
                        {[1, 2, 3, 4, 5].map((star) => {
                          const isSelected =
                            ans.numeric_value !== null &&
                            ans.numeric_value !== undefined &&
                            ans.numeric_value >= star

                          return (
                            <button
                              key={star}
                              type="button"
                              onClick={() => handleRatingSelect(qId, star)}
                              className="p-2 sm:p-3 rounded-2xl hover:bg-amber-50 dark:hover:bg-amber-950/40 transition-transform active:scale-90 group"
                            >
                              <Star
                                className={cn(
                                  'h-8 w-8 sm:h-10 sm:w-10 transition-colors',
                                  isSelected
                                    ? 'fill-amber-400 text-amber-400 filter drop-shadow-sm'
                                    : 'text-slate-300 dark:text-slate-600 group-hover:text-amber-300',
                                )}
                              />
                            </button>
                          )
                        })}
                      </div>

                      {ans.numeric_value !== null && ans.numeric_value !== undefined && (
                        <p className="text-center text-xs font-semibold text-amber-600 dark:text-amber-400">
                          {ans.numeric_value === 1 && '★☆☆☆☆ Muito Ruim'}
                          {ans.numeric_value === 2 && '★★☆☆☆ Ruim'}
                          {ans.numeric_value === 3 && '★★★☆☆ Regular'}
                          {ans.numeric_value === 4 && '★★★★☆ Bom'}
                          {ans.numeric_value === 5 && '★★★★★ Excelente!'}
                        </p>
                      )}
                    </div>
                  )}

                  {/* CASO 3: MÚLTIPLA ESCOLHA */}
                  {q.question_type === 'multiple_choice' && (
                    <div className="space-y-2 pt-1">
                      {(q.options || []).map((opt, optIdx) => {
                        const isSelected = ans.text_value === opt

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            onClick={() => handleOptionSelect(qId, opt)}
                            className={cn(
                              'w-full text-left p-3.5 sm:p-4 rounded-xl border font-medium text-sm transition-all duration-150 flex items-center justify-between',
                              isSelected
                                ? 'bg-blue-50 dark:bg-blue-950/60 border-blue-500 text-blue-900 dark:text-blue-100 shadow-sm'
                                : 'bg-slate-50/70 dark:bg-slate-800/50 hover:bg-slate-100 border-slate-200 dark:border-slate-700 text-foreground',
                            )}
                          >
                            <span>{opt}</span>
                            <div
                              className={cn(
                                'w-5 h-5 rounded-full border flex items-center justify-center transition-colors',
                                isSelected
                                  ? 'border-blue-600 bg-blue-600 text-white'
                                  : 'border-slate-300 dark:border-slate-600',
                              )}
                            >
                              {isSelected && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  )}

                  {/* CASO 4: TEXTO LIVRE */}
                  {q.question_type === 'text' && (
                    <div className="space-y-1 pt-1">
                      <Textarea
                        rows={3}
                        value={ans.text_value || ''}
                        onChange={(e) => handleTextChange(qId, e.target.value)}
                        placeholder="Digite sua resposta, crítica ou sugestão aqui..."
                        className="bg-slate-50 dark:bg-slate-800/50 text-sm rounded-xl"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}

          {/* Botão de Envio */}
          <div className="pt-2">
            <Button
              type="submit"
              disabled={submitting}
              className="w-full h-14 rounded-2xl bg-brand-deepBlue hover:bg-brand-vividBlue text-white font-bold text-base shadow-lg shadow-blue-500/20 gap-2 active:scale-[0.99] transition-transform"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Gravando Avaliação...
                </>
              ) : (
                <>
                  <Send className="h-5 w-5" />
                  Enviar Avaliação
                </>
              )}
            </Button>
          </div>
        </form>
      </div>

      {/* Rodapé institucional discreto */}
      <footer className="mt-8 text-center text-xs text-muted-foreground py-2 flex items-center justify-center gap-1.5">
        <span>Sistema Aurea Facilities</span>
        <span>•</span>
        <span>Pesquisa de Satisfação & Qualidade</span>
      </footer>
    </div>
  )
}

export default PublicSurveyForm
