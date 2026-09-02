import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { SatisfactionSurvey, SurveyQuestion } from '@/types/satisfaction-surveys'
import { satisfactionSurveyService } from '@/services/satisfaction-surveys'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Star,
  CheckCircle,
  Clock,
  Tablet,
  Sparkles,
  Send,
  Loader2,
  Building2,
  RotateCcw,
  Timer,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const INACTIVITY_TIMEOUT_SECONDS = 10
const SUCCESS_REDIRECT_SECONDS = 3

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

  // Estado de sucesso pós-envio e contadores visuais
  const [submittedSuccess, setSubmittedSuccess] = useState(false)
  const [successCountdown, setSuccessCountdown] = useState(SUCCESS_REDIRECT_SECONDS)
  const [inactivityCountdown, setInactivityCountdown] = useState(INACTIVITY_TIMEOUT_SECONDS)

  // Refs para controle de timers de inatividade e pós-envio
  const inactivityTimerRef = useRef<NodeJS.Timeout | null>(null)
  const inactivityIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const successTimerRef = useRef<NodeJS.Timeout | null>(null)
  const successIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Helper para verificar se há alguma resposta preenchida no formulário
  const hasInteractedAnswers = useCallback(
    (
      currentAnswers: Record<string, { numeric_value?: number | null; text_value?: string | null }>,
    ) => {
      return Object.values(currentAnswers).some(
        (ans) =>
          (ans.numeric_value !== null && ans.numeric_value !== undefined) ||
          (ans.text_value !== null && ans.text_value !== undefined && ans.text_value.trim() !== ''),
      )
    },
    [],
  )

  const hasInteractedRef = useRef(false)
  hasInteractedRef.current = hasInteractedAnswers(answers)

  // Limpar formulário e resetar estado inicial
  const resetFormState = useCallback(() => {
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
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [survey])

  // Reiniciar formulário completo para o próximo usuário
  const handleResetForNext = useCallback(() => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current)
    if (successIntervalRef.current) clearInterval(successIntervalRef.current)
    if (inactivityTimerRef.current) clearTimeout(inactivityTimerRef.current)
    if (inactivityIntervalRef.current) clearInterval(inactivityIntervalRef.current)

    setSubmittedSuccess(false)
    setInactivityCountdown(INACTIVITY_TIMEOUT_SECONDS)
    resetFormState()
    // Revalidar disponibilidade
    loadSurvey()
  }, [resetFormState])

  // Limpar timers de inatividade
  const clearInactivityTimers = useCallback(() => {
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current)
      inactivityTimerRef.current = null
    }
    if (inactivityIntervalRef.current) {
      clearInterval(inactivityIntervalRef.current)
      inactivityIntervalRef.current = null
    }
  }, [])

  // Iniciar / resetar timer de inatividade de 10 segundos
  const resetInactivityTimer = useCallback(() => {
    clearInactivityTimers()

    // Se já estiver na tela de sucesso ou enviando ou não disponível, não rodar timer de inatividade do form
    if (submittedSuccess || submitting || !isAvailable) {
      return
    }

    setInactivityCountdown(INACTIVITY_TIMEOUT_SECONDS)

    // Se houver dados preenchidos, aciona contagem regressiva para expirar
    inactivityIntervalRef.current = setInterval(() => {
      setInactivityCountdown((prev) => {
        if (prev <= 1) {
          return 0
        }
        return prev - 1
      })
    }, 1000)

    inactivityTimerRef.current = setTimeout(() => {
      // Se o usuário interagiu ou começou a preencher e ficou inativo 10s: descartar e resetar
      if (hasInteractedRef.current) {
        toast.info('Tempo limite de inatividade atingido (10s). O formulário foi resetado.')
        resetFormState()
      }
      setInactivityCountdown(INACTIVITY_TIMEOUT_SECONDS)
      clearInactivityTimers()
    }, INACTIVITY_TIMEOUT_SECONDS * 1000)
  }, [submittedSuccess, submitting, isAvailable, clearInactivityTimers, resetFormState])

  // Ouvintes globais de atividade no totem (toque, clique, teclado, scroll)
  useEffect(() => {
    if (submittedSuccess || submitting || !isAvailable) {
      clearInactivityTimers()
      return
    }

    const handleUserActivity = () => {
      // Só inicia/reseta o timer de inatividade se o formulário estiver com alguma resposta iniciada
      if (hasInteractedRef.current) {
        resetInactivityTimer()
      } else {
        clearInactivityTimers()
        setInactivityCountdown(INACTIVITY_TIMEOUT_SECONDS)
      }
    }

    const events = ['mousedown', 'mousemove', 'touchstart', 'touchmove', 'keydown', 'scroll']
    events.forEach((evt) => window.addEventListener(evt, handleUserActivity, { passive: true }))

    return () => {
      events.forEach((evt) => window.removeEventListener(evt, handleUserActivity))
      clearInactivityTimers()
    }
  }, [submittedSuccess, submitting, isAvailable, resetInactivityTimer, clearInactivityTimers])

  // Efeito ao trocar o estado de submittedSuccess: contagem de 3s e retorno automático para novo preenchimento
  useEffect(() => {
    if (submittedSuccess) {
      clearInactivityTimers()
      setSuccessCountdown(SUCCESS_REDIRECT_SECONDS)

      successIntervalRef.current = setInterval(() => {
        setSuccessCountdown((prev) => (prev > 1 ? prev - 1 : 1))
      }, 1000)

      successTimerRef.current = setTimeout(() => {
        handleResetForNext()
      }, SUCCESS_REDIRECT_SECONDS * 1000)
    }

    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current)
      if (successIntervalRef.current) clearInterval(successIntervalRef.current)
    }
  }, [submittedSuccess, handleResetForNext, clearInactivityTimers])

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
  // Helper para verificar se a pergunta está visível baseado em condições
  const isQuestionVisible = (q: SurveyQuestion): boolean => {
    if (!q.is_conditional || !q.parent_question_id) {
      return true
    }
    // Buscar a pergunta pai
    const parentAnswer = answers[q.parent_question_id]
    if (!parentAnswer) return false

    const triggers = q.trigger_values || []
    if (triggers.length === 0) return true

    // Verificar se o valor numérico ou de texto corresponde a algum gatilho
    const hasNumericMatch =
      parentAnswer.numeric_value !== null &&
      parentAnswer.numeric_value !== undefined &&
      triggers.includes(Number(parentAnswer.numeric_value))

    const hasTextMatch =
      Boolean(parentAnswer.text_value) && triggers.includes(parentAnswer.text_value)

    return Boolean(hasNumericMatch || hasTextMatch)
  }

  // Submeter formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey || !id) return

    // Validar perguntas obrigatórias (apenas as que estão visíveis)
    const questions = survey.questions || []
    for (let i = 0; i < questions.length; i++) {
      const q = questions[i]
      const qId = q.id || ''
      const ans = answers[qId]

      const isVisible = isQuestionVisible(q)
      if (!isVisible) continue // Se não estiver visível pela condição, não valida nem exige

      if (q.is_required) {
        if (
          (q.question_type === 'rating_10' ||
            q.question_type === 'rating_5' ||
            q.question_type === 'smiley_5') &&
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
      // Filtrar apenas respostas de perguntas visíveis
      const visibleQuestionIds = new Set(
        (survey.questions || []).filter((q) => isQuestionVisible(q)).map((q) => q.id),
      )

      const formattedAnswers = Object.entries(answers)
        .filter(([qId, val]) => {
          if (!visibleQuestionIds.has(qId)) return false
          return val.numeric_value !== null || (val.text_value && val.text_value.trim() !== '')
        })
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

            {/* Aviso visual de retorno automático para o totem */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl p-4 flex items-center justify-center gap-2.5 text-emerald-700 dark:text-emerald-300">
              <Timer className="h-4 w-4 animate-spin text-emerald-600 dark:text-emerald-400" />
              <span className="text-xs sm:text-sm font-semibold">
                Reiniciando para o próximo usuário em{' '}
                <span className="font-bold font-mono text-base">{successCountdown}s</span>...
              </span>
            </div>

            <Button
              onClick={handleResetForNext}
              size="lg"
              className="w-full bg-brand-deepBlue hover:bg-brand-vividBlue text-white font-semibold shadow-lg shadow-blue-500/20 h-12 rounded-xl text-sm gap-2"
            >
              <Tablet className="h-4 w-4" />
              Próxima Avaliação Agora
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const isFormInteracted = hasInteractedRef.current

  // Formulário Público de Preenchimento (Otimizado para Tablets & Celulares)
  return (
    <div className="min-h-screen bg-slate-100/80 dark:bg-slate-950 py-6 px-3 sm:px-6 flex flex-col justify-between">
      <div className="max-w-2xl w-full mx-auto space-y-6">
        {/* Cabeçalho da Pesquisa */}
        <div className="bg-white dark:bg-slate-900 border rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
          {/* Indicador sutil de atividade e auto-reset quando em preenchimento */}
          {isFormInteracted && (
            <div className="absolute top-0 left-0 right-0 h-1 bg-amber-100 dark:bg-amber-950/50">
              <div
                className="h-full bg-amber-500 transition-all duration-1000 ease-linear"
                style={{
                  width: `${(inactivityCountdown / INACTIVITY_TIMEOUT_SECONDS) * 100}%`,
                }}
              />
            </div>
          )}

          <div className="flex items-center justify-between gap-2 mb-2 flex-wrap">
            <div className="flex items-center gap-2">
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

            {isFormInteracted && inactivityCountdown <= 5 && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2.5 py-0.5 rounded-full border border-amber-200 dark:border-amber-800 animate-pulse">
                <Timer className="h-3 w-3" />
                Reset em {inactivityCountdown}s por inatividade
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
            const isVisible = isQuestionVisible(q)

            if (!isVisible) return null

            return (
              <Card
                key={qId}
                className={cn(
                  'border-slate-200 dark:border-slate-800 shadow-sm rounded-2xl bg-white dark:bg-slate-900 transition-all duration-300 overflow-hidden animate-in fade-in slide-in-from-top-2',
                  ans.numeric_value !== null || ans.text_value
                    ? 'border-l-4 border-l-brand-vividBlue'
                    : '',
                  q.is_conditional
                    ? 'border-dashed border-blue-300 dark:border-blue-800 bg-blue-50/20 dark:bg-blue-950/10'
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

                  {/* CASO 0: ESCALA DE ROSTINHOS (SMILEY_5) */}
                  {q.question_type === 'smiley_5' && (
                    <div className="space-y-4 pt-1">
                      <div className="grid grid-cols-5 gap-2 sm:gap-4 py-2">
                        {/* 1 - Muito Insatisfeito */}
                        <button
                          type="button"
                          onClick={() => handleRatingSelect(qId, 1)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 group active:scale-95',
                            ans.numeric_value === 1
                              ? 'bg-red-50 dark:bg-red-950/40 border-[#ef4444] shadow-lg shadow-red-500/10 scale-105 ring-2 ring-red-400/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-red-300 hover:bg-red-50/50 dark:hover:bg-red-950/20',
                          )}
                        >
                          <svg
                            viewBox="0 0 64 64"
                            className="w-12 h-12 sm:w-16 sm:h-16 transition-transform group-hover:scale-110 drop-shadow-sm"
                          >
                            <circle
                              cx="32"
                              cy="32"
                              r="30"
                              fill="#ef4444"
                              stroke="#b91c1c"
                              strokeWidth="1.5"
                            />
                            {/* Olhos pretos com brilho */}
                            <ellipse cx="22" cy="24" rx="3.5" ry="5" fill="#111827" />
                            <ellipse cx="42" cy="24" rx="3.5" ry="5" fill="#111827" />
                            {/* Boca muito triste/curvada para baixo */}
                            <path
                              d="M 18 46 Q 32 30 46 46"
                              fill="none"
                              stroke="#111827"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-bold text-center mt-2.5 leading-tight transition-colors',
                              ans.numeric_value === 1
                                ? 'text-[#ef4444]'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-[#ef4444]',
                            )}
                          >
                            Muito
                            <br className="sm:hidden" /> Insatisfeito
                          </span>
                        </button>

                        {/* 2 - Insatisfeito */}
                        <button
                          type="button"
                          onClick={() => handleRatingSelect(qId, 2)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 group active:scale-95',
                            ans.numeric_value === 2
                              ? 'bg-orange-50 dark:bg-orange-950/40 border-[#f97316] shadow-lg shadow-orange-500/10 scale-105 ring-2 ring-orange-400/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-orange-300 hover:bg-orange-50/50 dark:hover:bg-orange-950/20',
                          )}
                        >
                          <svg
                            viewBox="0 0 64 64"
                            className="w-12 h-12 sm:w-16 sm:h-16 transition-transform group-hover:scale-110 drop-shadow-sm"
                          >
                            <circle
                              cx="32"
                              cy="32"
                              r="30"
                              fill="#f97316"
                              stroke="#c2410c"
                              strokeWidth="1.5"
                            />
                            {/* Olhos pretos */}
                            <ellipse cx="22" cy="24" rx="3.5" ry="5" fill="#111827" />
                            <ellipse cx="42" cy="24" rx="3.5" ry="5" fill="#111827" />
                            {/* Boca levemente triste */}
                            <path
                              d="M 21 44 Q 32 34 43 44"
                              fill="none"
                              stroke="#111827"
                              strokeWidth="3.8"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-bold text-center mt-2.5 leading-tight transition-colors',
                              ans.numeric_value === 2
                                ? 'text-[#f97316]'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-[#f97316]',
                            )}
                          >
                            Insatisfeito
                          </span>
                        </button>

                        {/* 3 - Regular */}
                        <button
                          type="button"
                          onClick={() => handleRatingSelect(qId, 3)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 group active:scale-95',
                            ans.numeric_value === 3
                              ? 'bg-yellow-50 dark:bg-yellow-950/40 border-[#eab308] shadow-lg shadow-yellow-500/10 scale-105 ring-2 ring-yellow-400/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-yellow-300 hover:bg-yellow-50/50 dark:hover:bg-yellow-950/20',
                          )}
                        >
                          <svg
                            viewBox="0 0 64 64"
                            className="w-12 h-12 sm:w-16 sm:h-16 transition-transform group-hover:scale-110 drop-shadow-sm"
                          >
                            <circle
                              cx="32"
                              cy="32"
                              r="30"
                              fill="#eab308"
                              stroke="#a16207"
                              strokeWidth="1.5"
                            />
                            {/* Olhos pretos */}
                            <ellipse cx="22" cy="24" rx="3.5" ry="5" fill="#111827" />
                            <ellipse cx="42" cy="24" rx="3.5" ry="5" fill="#111827" />
                            {/* Boca neutra reta */}
                            <line
                              x1="20"
                              y1="42"
                              x2="44"
                              y2="42"
                              stroke="#111827"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-bold text-center mt-2.5 leading-tight transition-colors',
                              ans.numeric_value === 3
                                ? 'text-[#ca8a04] dark:text-[#facc15]'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-[#ca8a04]',
                            )}
                          >
                            Regular
                          </span>
                        </button>

                        {/* 4 - Satisfeito */}
                        <button
                          type="button"
                          onClick={() => handleRatingSelect(qId, 4)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 group active:scale-95',
                            ans.numeric_value === 4
                              ? 'bg-lime-50 dark:bg-lime-950/40 border-[#a3e635] shadow-lg shadow-lime-500/10 scale-105 ring-2 ring-lime-400/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-lime-300 hover:bg-lime-50/50 dark:hover:bg-lime-950/20',
                          )}
                        >
                          <svg
                            viewBox="0 0 64 64"
                            className="w-12 h-12 sm:w-16 sm:h-16 transition-transform group-hover:scale-110 drop-shadow-sm"
                          >
                            <circle
                              cx="32"
                              cy="32"
                              r="30"
                              fill="#a3e635"
                              stroke="#65a30d"
                              strokeWidth="1.5"
                            />
                            {/* Olhos pretos */}
                            <ellipse cx="22" cy="24" rx="3.5" ry="5" fill="#111827" />
                            <ellipse cx="42" cy="24" rx="3.5" ry="5" fill="#111827" />
                            {/* Boca levemente sorridente */}
                            <path
                              d="M 21 38 Q 32 48 43 38"
                              fill="none"
                              stroke="#111827"
                              strokeWidth="3.8"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-bold text-center mt-2.5 leading-tight transition-colors',
                              ans.numeric_value === 4
                                ? 'text-[#65a30d] dark:text-[#a3e635]'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-[#65a30d]',
                            )}
                          >
                            Satisfeito
                          </span>
                        </button>

                        {/* 5 - Muito Satisfeito */}
                        <button
                          type="button"
                          onClick={() => handleRatingSelect(qId, 5)}
                          className={cn(
                            'flex flex-col items-center justify-center p-3 sm:p-4 rounded-2xl border-2 transition-all duration-200 group active:scale-95',
                            ans.numeric_value === 5
                              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-[#22c55e] shadow-lg shadow-emerald-500/10 scale-105 ring-2 ring-emerald-400/40'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-emerald-300 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20',
                          )}
                        >
                          <svg
                            viewBox="0 0 64 64"
                            className="w-12 h-12 sm:w-16 sm:h-16 transition-transform group-hover:scale-110 drop-shadow-sm"
                          >
                            <circle
                              cx="32"
                              cy="32"
                              r="30"
                              fill="#22c55e"
                              stroke="#15803d"
                              strokeWidth="1.5"
                            />
                            {/* Olhos pretos */}
                            <ellipse cx="22" cy="24" rx="3.5" ry="5" fill="#111827" />
                            <ellipse cx="42" cy="24" rx="3.5" ry="5" fill="#111827" />
                            {/* Boca muito sorridente */}
                            <path
                              d="M 18 36 Q 32 54 46 36"
                              fill="none"
                              stroke="#111827"
                              strokeWidth="4"
                              strokeLinecap="round"
                            />
                          </svg>
                          <span
                            className={cn(
                              'text-xs sm:text-sm font-bold text-center mt-2.5 leading-tight transition-colors',
                              ans.numeric_value === 5
                                ? 'text-[#16a34a] dark:text-[#22c55e]'
                                : 'text-slate-700 dark:text-slate-300 group-hover:text-[#16a34a]',
                            )}
                          >
                            Muito
                            <br className="sm:hidden" /> Satisfeito
                          </span>
                        </button>
                      </div>
                    </div>
                  )}

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
