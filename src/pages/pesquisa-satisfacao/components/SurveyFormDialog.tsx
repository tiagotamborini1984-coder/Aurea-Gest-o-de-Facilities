import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  SatisfactionSurvey,
  SurveyQuestion,
  SurveySchedule,
  QuestionType,
} from '@/types/satisfaction-surveys'
import { satisfactionSurveyService } from '@/services/satisfaction-surveys'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import {
  Plus,
  Trash2,
  Clock,
  HelpCircle,
  GripVertical,
  Star,
  Smile,
  ListChecks,
  AlignLeft,
  Calendar,
  Building,
  Loader2,
  GitBranch,
  Info,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Checkbox } from '@/components/ui/checkbox'
import { toast } from 'sonner'

const SURVEY_TYPES = [
  'Geral',
  'Refeitório',
  'Limpeza e Conservação',
  'Portaria e Recepção',
  'Manutenção Predial',
  'Jardinagem',
  'Eventos',
  'Treinamentos',
  'Atendimento ao Cliente',
]

const QUESTION_TYPES: { type: QuestionType; label: string; icon: any; desc: string }[] = [
  {
    type: 'smiley_5',
    label: 'Escala de Rostinhos',
    icon: Smile,
    desc: '5 rostinhos coloridos (Muito Insatisfeito a Muito Satisfeito)',
  },
  {
    type: 'rating_10',
    label: 'Nota de 0 a 10',
    icon: Star,
    desc: 'Escala numérica de 0 a 10 para cálculo de NPS/CSAT',
  },
  {
    type: 'rating_5',
    label: 'Estrelas (1 a 5)',
    icon: Star,
    desc: 'Avaliação visual com 5 estrelas intuitivas',
  },
  {
    type: 'multiple_choice',
    label: 'Múltipla Escolha',
    icon: ListChecks,
    desc: 'Lista de opções personalizadas para o usuário escolher',
  },
  {
    type: 'text',
    label: 'Texto Livre',
    icon: AlignLeft,
    desc: 'Campo aberto para críticas, elogios e sugestões',
  },
]

const SMILEY_TRIGGER_OPTIONS = [
  { value: 1, label: '1 - Muito Insatisfeito (Vermelho)' },
  { value: 2, label: '2 - Insatisfeito (Laranja)' },
  { value: 3, label: '3 - Regular (Amarelo)' },
  { value: 4, label: '4 - Satisfeito (Verde Claro)' },
  { value: 5, label: '5 - Muito Satisfeito (Verde)' },
]

const RATING_10_TRIGGER_OPTIONS = [
  { value: 0, label: 'Nota 0' },
  { value: 1, label: 'Nota 1' },
  { value: 2, label: 'Nota 2' },
  { value: 3, label: 'Nota 3' },
  { value: 4, label: 'Nota 4' },
  { value: 5, label: 'Nota 5' },
  { value: 6, label: 'Nota 6' },
  { value: 7, label: 'Nota 7' },
  { value: 8, label: 'Nota 8' },
  { value: 9, label: 'Nota 9' },
  { value: 10, label: 'Nota 10' },
]

const RATING_5_TRIGGER_OPTIONS = [
  { value: 1, label: '1 Estrela' },
  { value: 2, label: '2 Estrelas' },
  { value: 3, label: '3 Estrelas' },
  { value: 4, label: '4 Estrelas' },
  { value: 5, label: '5 Estrelas' },
]

interface SurveyFormDialogProps {
  survey: SatisfactionSurvey | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}

export function SurveyFormDialog({ survey, open, onOpenChange, onSuccess }: SurveyFormDialogProps) {
  const { activeClient, selectedMasterClient } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [plants, setPlants] = useState<{ id: string; name: string; code?: string }[]>([])

  // Estado geral da pesquisa
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    survey_type: 'Geral',
    plant_id: 'all',
    location_name: '',
    start_date: '',
    end_date: '',
    is_active: true,
  })

  // Estado das perguntas
  const [questions, setQuestions] = useState<SurveyQuestion[]>([])

  // Estado das faixas de horário
  const [schedules, setSchedules] = useState<SurveySchedule[]>([])

  // Carregar plantas do cliente
  useEffect(() => {
    const fetchPlants = async () => {
      const clientId =
        activeClient?.id ||
        (selectedMasterClient && selectedMasterClient !== 'all' ? selectedMasterClient : null)
      let q = supabase.from('plants').select('id, name, code').order('name')
      if (clientId) {
        q = q.eq('client_id', clientId)
      }
      const { data } = await q
      if (data) setPlants(data)
    }
    if (open) {
      fetchPlants()
    }
  }, [open, activeClient, selectedMasterClient])

  // Preencher formulário ao abrir para criar ou editar
  useEffect(() => {
    if (open) {
      if (survey) {
        setFormData({
          title: survey.title || '',
          description: survey.description || '',
          survey_type: survey.survey_type || 'Geral',
          plant_id: survey.plant_id || 'all',
          location_name: survey.location_name || '',
          start_date: survey.start_date || '',
          end_date: survey.end_date || '',
          is_active: survey.is_active ?? true,
        })
        setQuestions(
          (survey.questions || []).map((q, idx) => ({
            ...q,
            temp_id: q.id || `q_${Date.now()}_${idx}`,
            order_index: idx + 1,
            is_conditional: q.is_conditional ?? false,
            parent_question_id: q.parent_question_id || null,
            trigger_values: q.trigger_values || [],
            options: q.options || [],
          })),
        )
        setSchedules(
          (survey.schedules || []).map((s) => ({
            ...s,
            start_time: s.start_time?.slice(0, 5) || '08:00',
            end_time: s.end_time?.slice(0, 5) || '18:00',
          })),
        )
      } else {
        // Novo cadastro com perguntas padrão amigáveis
        setFormData({
          title: '',
          description: '',
          survey_type: 'Geral',
          plant_id: 'all',
          location_name: '',
          start_date: '',
          end_date: '',
          is_active: true,
        })
        const initialTempId1 = `q_${Date.now()}_1`
        const initialTempId2 = `q_${Date.now()}_2`
        setQuestions([
          {
            temp_id: initialTempId1,
            title: 'Como você avalia a sua experiência hoje?',
            description: 'Selecione o rostinho que melhor representa seu sentimento',
            question_type: 'smiley_5',
            options: [],
            is_required: true,
            order_index: 1,
            is_conditional: false,
            parent_question_id: null,
            trigger_values: [],
          },
          {
            temp_id: initialTempId2,
            title: 'O que podemos fazer para melhorar seu atendimento?',
            description: 'Por favor nos ajude a entender o motivo de sua insatisfação',
            question_type: 'text',
            options: [],
            is_required: false,
            order_index: 2,
            is_conditional: true,
            parent_question_id: initialTempId1,
            trigger_values: [1, 2, 3], // Respostas negativas ou regulares ativam a subpergunta
          },
        ])
        setSchedules([])
      }
    }
  }, [open, survey])

  // Adicionar Pergunta
  const addQuestion = (type: QuestionType = 'smiley_5') => {
    const defaultOptions = type === 'multiple_choice' ? ['Opção 1', 'Opção 2', 'Opção 3'] : []
    const newTempId = `q_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    setQuestions((prev) => [
      ...prev,
      {
        temp_id: newTempId,
        title: '',
        description: '',
        question_type: type,
        options: defaultOptions,
        is_required: true,
        order_index: prev.length + 1,
        is_conditional: false,
        parent_question_id: null,
        trigger_values: [],
      },
    ])
  }

  // Remover Pergunta
  const removeQuestion = (index: number) => {
    setQuestions((prev) => prev.filter((_, i) => i !== index))
  }

  // Atualizar campo de Pergunta
  const updateQuestion = (index: number, updates: Partial<SurveyQuestion>) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== index) return q
        const updated = { ...q, ...updates }
        if (
          updates.question_type === 'multiple_choice' &&
          (!updated.options || updated.options.length === 0)
        ) {
          updated.options = ['Excelente', 'Bom', 'Regular', 'Ruim']
        }
        return updated
      }),
    )
  }

  // Gerenciar Opções de Múltipla Escolha
  const addOption = (qIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          options: [...(q.options || []), `Opção ${(q.options?.length || 0) + 1}`],
        }
      }),
    )
  }

  const updateOption = (qIndex: number, optIndex: number, val: string) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        const newOpts = [...(q.options || [])]
        newOpts[optIndex] = val
        return { ...q, options: newOpts }
      }),
    )
  }

  const removeOption = (qIndex: number, optIndex: number) => {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q
        return {
          ...q,
          options: (q.options || []).filter((_, oi) => oi !== optIndex),
        }
      }),
    )
  }

  // Adicionar Faixa de Horário
  const addSchedule = () => {
    setSchedules((prev) => [
      ...prev,
      {
        start_time: '11:00',
        end_time: '14:00',
        description: `Faixa ${prev.length + 1}`,
        days_of_week: [0, 1, 2, 3, 4, 5, 6],
      },
    ])
  }

  const removeSchedule = (index: number) => {
    setSchedules((prev) => prev.filter((_, i) => i !== index))
  }

  const updateSchedule = (index: number, updates: Partial<SurveySchedule>) => {
    setSchedules((prev) => prev.map((s, i) => (i === index ? { ...s, ...updates } : s)))
  }

  // Salvar
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.title.trim()) {
      toast.error('Informe o título da pesquisa.')
      return
    }

    if (questions.length === 0) {
      toast.error('Adicione ao menos uma pergunta à pesquisa.')
      return
    }

    // Validar perguntas vazias
    for (let i = 0; i < questions.length; i++) {
      if (!questions[i].title.trim()) {
        toast.error(`A pergunta #${i + 1} precisa ter um enunciado preenchido.`)
        return
      }
      if (
        questions[i].question_type === 'multiple_choice' &&
        (questions[i].options?.length || 0) < 2
      ) {
        toast.error(`A pergunta de múltipla escolha #${i + 1} precisa ter ao menos 2 opções.`)
        return
      }
    }

    // Validar faixas de horários
    for (let i = 0; i < schedules.length; i++) {
      if (!schedules[i].start_time || !schedules[i].end_time) {
        toast.error(`Preencha o horário de início e fim da faixa #${i + 1}.`)
        return
      }
    }

    const clientId =
      survey?.client_id ||
      activeClient?.id ||
      (selectedMasterClient && selectedMasterClient !== 'all' ? selectedMasterClient : null)

    if (!clientId) {
      toast.error('Cliente não identificado. Selecione um cliente ativo.')
      return
    }

    setLoading(true)
    try {
      await satisfactionSurveyService.saveSurvey(
        {
          id: survey?.id,
          client_id: clientId,
          title: formData.title.trim(),
          description: formData.description.trim() || null,
          survey_type: formData.survey_type,
          plant_id: formData.plant_id === 'all' ? null : formData.plant_id,
          location_name: formData.location_name.trim() || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          is_active: formData.is_active,
        },
        questions,
        schedules,
      )

      toast.success(
        survey
          ? 'Pesquisa de satisfação atualizada com sucesso!'
          : 'Pesquisa de satisfação criada com sucesso!',
      )
      onSuccess()
      onOpenChange(false)
    } catch (err: any) {
      console.error('Erro ao salvar pesquisa:', err)
      toast.error(err.message || 'Erro ao salvar pesquisa.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">
            {survey ? 'Editar Pesquisa de Satisfação' : 'Nova Pesquisa de Satisfação'}
          </DialogTitle>
          <DialogDescription>
            Configure os critérios, perguntas, horários de disponibilidade e locais da pesquisa.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-2">
          {/* SEÇÃO 1: INFORMAÇÕES GERAIS */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <Building className="h-4 w-4 text-primary" />
                Dados Principais da Pesquisa
              </h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="status-switch" className="text-xs cursor-pointer">
                  {formData.is_active ? 'Pesquisa Ativa' : 'Pesquisa Inativa'}
                </Label>
                <Switch
                  id="status-switch"
                  checked={formData.is_active}
                  onCheckedChange={(val) => setFormData({ ...formData, is_active: val })}
                />
              </div>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <Label htmlFor="title" className="text-xs font-medium">
                  Título da Pesquisa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="title"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Ex: Avaliação do Refeitório & Alimentação"
                  className="bg-white dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1">
                <Label htmlFor="description" className="text-xs font-medium">
                  Descrição / Mensagem aos Usuários (Opcional)
                </Label>
                <Textarea
                  id="description"
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Ex: Conte-nos o que achou da refeição de hoje para aprimorarmos nosso atendimento."
                  className="bg-white dark:bg-slate-950 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">Tipo / Categoria</Label>
                  <Select
                    value={formData.survey_type}
                    onValueChange={(val) => setFormData({ ...formData, survey_type: val })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SURVEY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Planta Vinculada</Label>
                  <Select
                    value={formData.plant_id}
                    onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
                  >
                    <SelectTrigger className="bg-white dark:bg-slate-950">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as Plantas (Global)</SelectItem>
                      {plants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name} {p.code ? `(${p.code})` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="location_name" className="text-xs font-medium">
                    Local / Ponto de Coleta
                  </Label>
                  <Input
                    id="location_name"
                    value={formData.location_name}
                    onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                    placeholder="Ex: Totem Refeitório Bloco A"
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
              </div>

              {/* Período de Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Data de Início da Pesquisa
                  </Label>
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-medium flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                    Data de Término da Pesquisa (Opcional)
                  </Label>
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    className="bg-white dark:bg-slate-950"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* SEÇÃO 2: FAIXAS DE HORÁRIO DE DISPONIBILIDADE */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border space-y-3">
            <div className="flex items-center justify-between border-b pb-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Clock className="h-4 w-4 text-primary" />
                  Horários de Disponibilidade (Bloqueio Automático)
                </h3>
                <p className="text-xs text-muted-foreground">
                  Se configurado, o formulário público só aceita envios nestas faixas (ex: almoço
                  11:00 às 14:00). Deixe vazio para funcionar 24h.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addSchedule}
                className="text-xs gap-1"
              >
                <Plus className="h-3.5 w-3.5" />
                Adicionar Faixa
              </Button>
            </div>

            {schedules.length === 0 ? (
              <div className="text-center py-4 text-xs text-muted-foreground bg-white/50 dark:bg-slate-950/50 rounded-lg border border-dashed">
                Nenhum horário restritivo configurado. A pesquisa estará disponível 24 horas por
                dia.
              </div>
            ) : (
              <div className="space-y-2">
                {schedules.map((schedule, index) => (
                  <div
                    key={index}
                    className="flex flex-wrap items-center gap-3 p-3 bg-white dark:bg-slate-950 border rounded-lg shadow-sm"
                  >
                    <div className="flex-1 min-w-[140px] space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Descrição da Faixa
                      </Label>
                      <Input
                        value={schedule.description || ''}
                        onChange={(e) => updateSchedule(index, { description: e.target.value })}
                        placeholder="Ex: Almoço / Turno 1"
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Início</Label>
                      <Input
                        type="time"
                        value={schedule.start_time}
                        onChange={(e) => updateSchedule(index, { start_time: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="w-28 space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Fim</Label>
                      <Input
                        type="time"
                        value={schedule.end_time}
                        onChange={(e) => updateSchedule(index, { end_time: e.target.value })}
                        className="h-8 text-xs"
                      />
                    </div>
                    <div className="pt-4">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={() => removeSchedule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SEÇÃO 3: PERGUNTAS E CRITÉRIOS DE RESPOSTA */}
          <div className="bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-xl border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b pb-2 gap-2">
              <div>
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <HelpCircle className="h-4 w-4 text-primary" />
                  Perguntas da Pesquisa ({questions.length})
                </h3>
                <p className="text-xs text-muted-foreground">
                  Configure perguntas com rostinhos, notas, estrelas, múltipla escolha e
                  subperguntas condicionais.
                </p>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion('smiley_5')}
                  className="text-xs gap-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 border-emerald-200"
                >
                  <Smile className="h-3.5 w-3.5 text-emerald-600" />+ Rostinhos
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion('rating_10')}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />+ Nota (0-10)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion('rating_5')}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />+ Estrelas
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion('multiple_choice')}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />+ Múltipla Escolha
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => addQuestion('text')}
                  className="text-xs gap-1"
                >
                  <Plus className="h-3.5 w-3.5" />+ Texto Livre
                </Button>
              </div>
            </div>
            {questions.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground bg-white dark:bg-slate-950 rounded-lg border border-dashed">
                Nenhuma pergunta adicionada ainda. Clique nos botões acima para adicionar.
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q, qIndex) => (
                  <div
                    key={qIndex}
                    className="p-4 bg-white dark:bg-slate-950 border rounded-xl shadow-sm space-y-3 relative group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
                          {qIndex + 1}
                        </span>
                        <div className="w-52">
                          <Select
                            value={q.question_type}
                            onValueChange={(val: QuestionType) =>
                              updateQuestion(qIndex, { question_type: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs font-medium">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {QUESTION_TYPES.map((qt) => (
                                <SelectItem key={qt.type} value={qt.type}>
                                  <div className="flex items-center gap-1.5">
                                    <qt.icon className="h-3.5 w-3.5 text-primary" />
                                    <span>{qt.label}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 mr-2">
                          <Label className="text-xs text-muted-foreground cursor-pointer">
                            Obrigatória
                          </Label>
                          <Switch
                            checked={q.is_required}
                            onCheckedChange={(val) => updateQuestion(qIndex, { is_required: val })}
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:bg-red-50"
                          onClick={() => removeQuestion(qIndex)}
                          title="Remover pergunta"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    {/* Título e Descrição da Pergunta */}
                    <div className="space-y-2">
                      <Input
                        value={q.title}
                        onChange={(e) => updateQuestion(qIndex, { title: e.target.value })}
                        placeholder="Enunciado da pergunta (ex: Qual seu nível de satisfação com a limpeza?)"
                        className="font-medium text-sm"
                      />
                      <Input
                        value={q.description || ''}
                        onChange={(e) => updateQuestion(qIndex, { description: e.target.value })}
                        placeholder="Subtítulo ou instrução de apoio ao usuário (opcional)"
                        className="text-xs text-muted-foreground"
                      />
                    </div>
                    {/* Visualização de Prévia de Rostinhos */}
                    {q.question_type === 'smiley_5' && (
                      <div className="bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-lg border border-slate-200 dark:border-slate-800">
                        <div className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1.5">
                          <Smile className="h-3.5 w-3.5 text-emerald-600" />
                          Prévia da Escala de Rostinhos (5 níveis):
                        </div>
                        <div className="flex items-center justify-between gap-2 max-w-md mx-auto py-1">
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-[#ef4444] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              ☹
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Muito Insatisfeito (1)
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-[#f97316] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              🙁
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Insatisfeito (2)
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-[#eab308] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              😐
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Regular (3)
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-[#a3e635] text-slate-900 flex items-center justify-center font-bold text-xs shadow-sm">
                              🙂
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Satisfeito (4)
                            </span>
                          </div>
                          <div className="flex flex-col items-center gap-1 text-center">
                            <div className="w-8 h-8 rounded-full bg-[#22c55e] text-white flex items-center justify-center font-bold text-xs shadow-sm">
                              😀
                            </div>
                            <span className="text-[10px] text-muted-foreground font-medium">
                              Muito Satisfeito (5)
                            </span>
                          </div>
                        </div>
                      </div>
                    )}
                    {/* CONFIGURAÇÃO DE LÓGICA CONDICIONAL (SUBPERGUNTA) */}
                    {qIndex > 0 && (
                      <div className="pt-2 border-t border-dashed border-slate-200 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <GitBranch className="h-4 w-4 text-blue-600" />
                            <Label className="text-xs font-semibold text-foreground cursor-pointer flex items-center gap-1.5">
                              Subpergunta Condicional
                              <span className="text-[10px] text-muted-foreground font-normal">
                                (Exibir somente se uma pergunta anterior tiver determinada resposta)
                              </span>
                            </Label>
                          </div>
                          <Switch
                            checked={Boolean(q.is_conditional)}
                            onCheckedChange={(checked) => {
                              const previousQuestion = questions[qIndex - 1]
                              const defaultParentId =
                                previousQuestion.id || previousQuestion.temp_id
                              let defaultTriggers: any[] = []

                              if (previousQuestion.question_type === 'smiley_5') {
                                // Default para insatisfação / regular
                                defaultTriggers = [1, 2, 3]
                              } else if (previousQuestion.question_type === 'rating_10') {
                                defaultTriggers = [0, 1, 2, 3, 4, 5, 6]
                              } else if (previousQuestion.question_type === 'rating_5') {
                                defaultTriggers = [1, 2, 3]
                              } else if (previousQuestion.question_type === 'multiple_choice') {
                                defaultTriggers = previousQuestion.options?.slice(0, 1) || []
                              }

                              updateQuestion(qIndex, {
                                is_conditional: checked,
                                parent_question_id: checked ? defaultParentId : null,
                                trigger_values: checked ? defaultTriggers : [],
                              })
                            }}
                          />
                        </div>

                        {q.is_conditional && (
                          <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200 dark:border-blue-900 space-y-3">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                  Pergunta Pai (Gatilho)
                                </Label>
                                <Select
                                  value={q.parent_question_id || ''}
                                  onValueChange={(val) => {
                                    const targetParent = questions.find(
                                      (pq) => (pq.id || pq.temp_id) === val,
                                    )
                                    let newTriggers: any[] = []
                                    if (targetParent?.question_type === 'smiley_5') {
                                      newTriggers = [1, 2, 3]
                                    } else if (targetParent?.question_type === 'rating_10') {
                                      newTriggers = [0, 1, 2, 3, 4, 5, 6]
                                    } else if (targetParent?.question_type === 'rating_5') {
                                      newTriggers = [1, 2, 3]
                                    }
                                    updateQuestion(qIndex, {
                                      parent_question_id: val,
                                      trigger_values: newTriggers,
                                    })
                                  }}
                                >
                                  <SelectTrigger className="h-8 text-xs bg-white dark:bg-slate-950">
                                    <SelectValue placeholder="Selecione a pergunta anterior" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {questions.slice(0, qIndex).map((pq, pIdx) => {
                                      const pKey = pq.id || pq.temp_id || `q_temp_${pIdx}`
                                      return (
                                        <SelectItem key={pKey} value={pKey}>
                                          #{pIdx + 1}: {pq.title || `Pergunta ${pIdx + 1}`} (
                                          {pq.question_type === 'smiley_5'
                                            ? 'Rostinhos'
                                            : pq.question_type === 'rating_10'
                                              ? 'Nota 0-10'
                                              : pq.question_type === 'rating_5'
                                                ? 'Estrelas'
                                                : pq.question_type === 'multiple_choice'
                                                  ? 'Múltipla Escolha'
                                                  : 'Texto'}
                                          )
                                        </SelectItem>
                                      )
                                    })}
                                  </SelectContent>
                                </Select>
                              </div>

                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium text-slate-700 dark:text-slate-300">
                                  Atalhos Rápidos de Gatilho
                                </Label>
                                <div className="flex flex-wrap gap-1 pt-0.5">
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 text-[11px] px-2 bg-red-100 hover:bg-red-200 text-red-800 dark:bg-red-950 dark:text-red-300"
                                    onClick={() => {
                                      const parentQ = questions.find(
                                        (pq) => (pq.id || pq.temp_id) === q.parent_question_id,
                                      )
                                      if (parentQ?.question_type === 'rating_10') {
                                        updateQuestion(qIndex, {
                                          trigger_values: [0, 1, 2, 3, 4, 5, 6],
                                        })
                                      } else {
                                        updateQuestion(qIndex, { trigger_values: [1, 2, 3] })
                                      }
                                    }}
                                  >
                                    Negativas e Regular (Crítico)
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="secondary"
                                    size="sm"
                                    className="h-7 text-[11px] px-2 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                                    onClick={() => {
                                      const parentQ = questions.find(
                                        (pq) => (pq.id || pq.temp_id) === q.parent_question_id,
                                      )
                                      if (parentQ?.question_type === 'rating_10') {
                                        updateQuestion(qIndex, { trigger_values: [7, 8, 9, 10] })
                                      } else {
                                        updateQuestion(qIndex, { trigger_values: [4, 5] })
                                      }
                                    }}
                                  >
                                    Positivas (Satisfeito)
                                  </Button>
                                </div>
                              </div>
                            </div>

                            {/* Seleção detalhada dos valores de gatilho */}
                            {(() => {
                              const parentQ = questions.find(
                                (pq) => (pq.id || pq.temp_id) === q.parent_question_id,
                              )

                              if (!parentQ) {
                                return (
                                  <p className="text-xs text-muted-foreground">
                                    Selecione uma pergunta pai acima para definir as respostas que
                                    ativam esta subpergunta.
                                  </p>
                                )
                              }

                              const currentTriggers = q.trigger_values || []

                              if (parentQ.question_type === 'smiley_5') {
                                return (
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      Exibir esta subpergunta quando o usuário selecionar:
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {SMILEY_TRIGGER_OPTIONS.map((opt) => {
                                        const checked = currentTriggers.includes(opt.value)
                                        return (
                                          <label
                                            key={opt.value}
                                            className="flex items-center gap-2 p-2 bg-white dark:bg-slate-950 rounded-lg border text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                                          >
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(c) => {
                                                const next = c
                                                  ? [...currentTriggers, opt.value]
                                                  : currentTriggers.filter((v) => v !== opt.value)
                                                updateQuestion(qIndex, { trigger_values: next })
                                              }}
                                            />
                                            <span className="font-medium text-foreground">
                                              {opt.label}
                                            </span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }

                              if (parentQ.question_type === 'rating_10') {
                                return (
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      Exibir esta subpergunta quando a nota for:
                                    </Label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {RATING_10_TRIGGER_OPTIONS.map((opt) => {
                                        const checked = currentTriggers.includes(opt.value)
                                        return (
                                          <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => {
                                              const next = checked
                                                ? currentTriggers.filter((v) => v !== opt.value)
                                                : [...currentTriggers, opt.value]
                                              updateQuestion(qIndex, { trigger_values: next })
                                            }}
                                            className={cn(
                                              'px-2.5 py-1 rounded-md text-xs font-semibold border transition-colors',
                                              checked
                                                ? 'bg-blue-600 text-white border-blue-600'
                                                : 'bg-white dark:bg-slate-950 border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100',
                                            )}
                                          >
                                            {opt.value}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }

                              if (parentQ.question_type === 'rating_5') {
                                return (
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      Exibir quando a quantidade de estrelas for:
                                    </Label>
                                    <div className="flex flex-wrap gap-2">
                                      {RATING_5_TRIGGER_OPTIONS.map((opt) => {
                                        const checked = currentTriggers.includes(opt.value)
                                        return (
                                          <button
                                            type="button"
                                            key={opt.value}
                                            onClick={() => {
                                              const next = checked
                                                ? currentTriggers.filter((v) => v !== opt.value)
                                                : [...currentTriggers, opt.value]
                                              updateQuestion(qIndex, { trigger_values: next })
                                            }}
                                            className={cn(
                                              'px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors flex items-center gap-1',
                                              checked
                                                ? 'bg-amber-500 text-white border-amber-500'
                                                : 'bg-white dark:bg-slate-950 border-slate-300 text-slate-700 dark:text-slate-300 hover:bg-slate-100',
                                            )}
                                          >
                                            <Star className="h-3.5 w-3.5" />
                                            {opt.label}
                                          </button>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }

                              if (parentQ.question_type === 'multiple_choice') {
                                return (
                                  <div className="space-y-1.5">
                                    <Label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                                      Exibir quando a opção escolhida for:
                                    </Label>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {(parentQ.options || []).map((opt, oIdx) => {
                                        const checked = currentTriggers.includes(opt)
                                        return (
                                          <label
                                            key={oIdx}
                                            className="flex items-center gap-2 p-2 bg-white dark:bg-slate-950 rounded-lg border text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900"
                                          >
                                            <Checkbox
                                              checked={checked}
                                              onCheckedChange={(c) => {
                                                const next = c
                                                  ? [...currentTriggers, opt]
                                                  : currentTriggers.filter((v) => v !== opt)
                                                updateQuestion(qIndex, { trigger_values: next })
                                              }}
                                            />
                                            <span className="font-medium text-foreground">
                                              {opt}
                                            </span>
                                          </label>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              }

                              return null
                            })()}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Renderização de opções para múltipla escolha */}{' '}
                    {q.question_type === 'multiple_choice' && (
                      <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-lg space-y-2">
                        <div className="flex items-center justify-between">
                          <Label className="text-xs font-semibold text-muted-foreground">
                            Opções de Resposta:
                          </Label>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => addOption(qIndex)}
                            className="text-xs h-7 gap-1 text-primary hover:bg-primary/10"
                          >
                            <Plus className="h-3 w-3" />
                            Adicionar Opção
                          </Button>
                        </div>

                        <div className="space-y-1.5">
                          {(q.options || []).map((opt, optIdx) => (
                            <div key={optIdx} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-4 text-right">
                                {optIdx + 1}.
                              </span>
                              <Input
                                value={opt}
                                onChange={(e) => updateOption(qIndex, optIdx, e.target.value)}
                                placeholder={`Opção ${optIdx + 1}`}
                                className="h-8 text-xs bg-white dark:bg-slate-950"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-muted-foreground hover:text-red-500"
                                onClick={() => removeOption(qIndex, optIdx)}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <DialogFooter className="pt-2 sticky bottom-0 bg-background py-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-brand-deepBlue hover:bg-brand-vividBlue gap-2 text-white"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {survey ? 'Salvar Alterações' : 'Criar Pesquisa'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
