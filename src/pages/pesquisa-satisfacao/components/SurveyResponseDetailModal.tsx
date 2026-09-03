import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DetailedSurveyResponse, SurveyResponseAnswer } from '@/types/satisfaction-surveys'
import { QuestionHierarchyNode, formatAnswerValue } from '../utils/survey-report-export'
import {
  Building2,
  Calendar,
  Clock,
  Layers,
  MapPin,
  GitBranch,
  Smile,
  Star,
  CheckCircle2,
  HelpCircle,
  Copy,
  Check,
} from 'lucide-react'
import { toast } from 'sonner'

interface SurveyResponseDetailModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  response: DetailedSurveyResponse | null
  hierarchy: QuestionHierarchyNode[]
}

export function SurveyResponseDetailModal({
  open,
  onOpenChange,
  response,
  hierarchy,
}: SurveyResponseDetailModalProps) {
  const [copied, setCopied] = useState(false)

  if (!response) return null

  const dateObj = new Date(response.submitted_at)
  const dateFormatted = dateObj.toLocaleDateString('pt-BR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const timeFormatted = dateObj.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })

  const plantName = response.plant?.name || response.survey?.plants?.name || 'Todas as Plantas'
  const location = response.location_name || response.survey?.location_name || 'Geral'
  const surveyTitle = response.survey?.title || 'Pesquisa de Satisfação'
  const surveyType = response.survey?.survey_type || 'Geral'

  const answerMap = new Map<string, SurveyResponseAnswer>()
  for (const a of response.answers || []) {
    answerMap.set(a.question_id, a)
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(response.id)
    setCopied(true)
    toast.success('ID da resposta copiado!')
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className="text-xs bg-blue-50 text-brand-deepBlue border-blue-200"
            >
              {surveyType}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              Protocolo: #{response.id.slice(0, 8)}
            </Badge>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground mt-1">
            {surveyTitle}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Detalhes completos da resposta registrada com hierarquia de perguntas e subperguntas
            condicionais.
          </DialogDescription>
        </DialogHeader>

        {/* Metadados da Submissão */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 py-3 px-4 bg-slate-50 dark:bg-slate-800/60 rounded-xl border text-xs">
          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Calendar className="h-3 w-3 text-brand-vividBlue" /> Data de Envio
            </span>
            <p className="font-semibold text-foreground capitalize">{dateFormatted}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Clock className="h-3 w-3 text-brand-vividBlue" /> Horário
            </span>
            <p className="font-semibold text-foreground">{timeFormatted}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <Building2 className="h-3 w-3 text-brand-vividBlue" /> Planta
            </span>
            <p className="font-semibold text-foreground truncate">{plantName}</p>
          </div>

          <div className="space-y-0.5">
            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
              <MapPin className="h-3 w-3 text-brand-vividBlue" /> Local / Ponto
            </span>
            <p className="font-semibold text-foreground truncate">{location}</p>
          </div>
        </div>

        {/* Lista hierárquica de perguntas e respostas */}
        <div className="space-y-3 py-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="h-3.5 w-3.5" />
              Perguntas e Respostas da Submissão ({response.answers.length} respondidas)
            </h4>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyId}
              className="h-7 text-[11px] text-muted-foreground hover:text-foreground gap-1"
            >
              {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3" />}
              {copied ? 'Copiado' : 'Copiar ID'}
            </Button>
          </div>

          <div className="space-y-3">
            {hierarchy.map((node, index) => {
              const ans = answerMap.get(node.question.id || '')
              const isAnswered = Boolean(ans)
              const formatted = formatAnswerValue(ans, node.question.question_type)
              const isSub = node.level > 0

              // Se a subpergunta não foi respondida (pois a condição pai não foi satisfeita), destacar de modo sutil
              return (
                <div
                  key={node.question.id || index}
                  style={{ marginLeft: `${Math.min(node.level * 20, 60)}px` }}
                  className={`rounded-xl border p-3 transition-colors ${
                    isAnswered
                      ? isSub
                        ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-200 dark:border-blue-900/40'
                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      : 'bg-slate-50/50 dark:bg-slate-900/40 border-dashed border-slate-200 opacity-60'
                  }`}
                >
                  {/* Cabeçalho da Pergunta */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      {isSub && (
                        <div className="flex items-center gap-1.5 text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                          <GitBranch className="h-3 w-3 shrink-0" />
                          <span>
                            Subpergunta {node.level > 1 ? `(Nível ${node.level + 1})` : ''}
                          </span>
                          {node.parentQuestion && (
                            <span className="text-muted-foreground truncate">
                              ↳ de: "{node.parentQuestion.title}"
                            </span>
                          )}
                        </div>
                      )}

                      <h5 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
                        {!isSub && (
                          <span className="text-muted-foreground font-mono text-xs">
                            {index + 1}.
                          </span>
                        )}
                        {node.question.title}
                      </h5>

                      {node.question.description && (
                        <p className="text-xs text-muted-foreground">{node.question.description}</p>
                      )}
                    </div>

                    <div className="shrink-0">
                      <Badge variant="outline" className="text-[10px] uppercase font-mono">
                        {node.question.question_type}
                      </Badge>
                    </div>
                  </div>

                  {/* Resposta */}
                  <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                    {isAnswered ? (
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Exibição específica por tipo */}
                        {node.question.question_type === 'smiley_5' && (
                          <div className="flex items-center gap-2">
                            <span className="text-lg">
                              {ans?.numeric_value === 5
                                ? '😄'
                                : ans?.numeric_value === 4
                                  ? '🙂'
                                  : ans?.numeric_value === 3
                                    ? '😐'
                                    : ans?.numeric_value === 2
                                      ? '🙁'
                                      : '😡'}
                            </span>
                            <span className="font-bold text-sm text-foreground">
                              {formatted.display}
                            </span>
                          </div>
                        )}

                        {node.question.question_type === 'rating_5' && (
                          <div className="flex items-center gap-1.5">
                            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                            <span className="font-bold text-sm text-foreground">
                              {formatted.display}
                            </span>
                          </div>
                        )}

                        {node.question.question_type === 'rating_10' && (
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-base text-brand-deepBlue dark:text-blue-400">
                              {ans?.numeric_value}
                            </span>
                            <span className="text-xs text-muted-foreground">/ 10</span>
                          </div>
                        )}

                        {node.question.question_type === 'multiple_choice' && (
                          <Badge className="bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 text-xs px-2.5 py-1">
                            <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                            {formatted.display}
                          </Badge>
                        )}

                        {node.question.question_type === 'text' && (
                          <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-xs text-foreground italic w-full">
                            "{formatted.display}"
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-xs text-muted-foreground italic flex items-center gap-1">
                        <HelpCircle className="h-3 w-3 text-slate-400" />
                        Não acionada nesta submissão (condição do gatilho não atendida).
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
