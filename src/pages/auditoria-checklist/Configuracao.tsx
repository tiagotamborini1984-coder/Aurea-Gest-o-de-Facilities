import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/components/ui/use-toast'
import { useAuth } from '@/hooks/use-auth'
import { Loader2, Plus, Trash2, ArrowLeft } from 'lucide-react'

interface ScoringSetting {
  score: number
  description: string
  trigger_task: boolean
}

interface AuditAction {
  id?: string
  title: string
  evidence_required: boolean
  comments_required: boolean
  weight: number
  order_index: number
}

const DEFAULT_SCORING: ScoringSetting[] = [
  { score: 1, description: 'Muito Ruim', trigger_task: true },
  { score: 2, description: 'Ruim', trigger_task: true },
  { score: 3, description: 'Regular', trigger_task: false },
  { score: 4, description: 'Bom', trigger_task: false },
  { score: 5, description: 'Excelente', trigger_task: false },
]

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { user } = useAuth()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Geral')
  const [frequency, setFrequency] = useState('Única')
  const [startDate, setStartDate] = useState('')
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(0)

  const [scoringSettings, setScoringSettings] = useState<ScoringSetting[]>(DEFAULT_SCORING)
  const [actions, setActions] = useState<AuditAction[]>([])

  useEffect(() => {
    const fetchClientAndData = async () => {
      setLoading(true)
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user?.id)
          .single()

        if (profile?.client_id) {
          setClientId(profile.client_id)
        }

        if (id) {
          const { data: audit, error: auditError } = await supabase
            .from('audits')
            .select('*')
            .eq('id', id)
            .single()

          if (auditError) throw auditError

          if (audit) {
            setTitle(audit.title)
            setType(audit.type)
            setFrequency(audit.frequency)
            setStartDate(audit.start_date)
            setAdvanceNoticeDays(audit.advance_notice_days || 0)

            try {
              if (audit.scoring_settings && Array.isArray(audit.scoring_settings)) {
                setScoringSettings(audit.scoring_settings as ScoringSetting[])
              }
            } catch {
              toast({
                variant: 'destructive',
                title: 'Erro',
                description: 'Estrutura JSON de pontuação corrompida.',
              })
            }

            const { data: actionsData, error: actionsError } = await supabase
              .from('audit_actions')
              .select('*')
              .eq('audit_id', id)
              .order('order_index', { ascending: true })

            if (actionsError) throw actionsError

            if (actionsData && actionsData.length > 0) {
              setActions(
                actionsData.map((a) => ({
                  id: a.id,
                  title: a.title,
                  evidence_required: a.evidence_required,
                  comments_required: a.comments_required,
                  weight: Number(a.weight),
                  order_index: a.order_index,
                })),
              )
            } else {
              setActions([
                {
                  title: '',
                  evidence_required: false,
                  comments_required: false,
                  weight: 1,
                  order_index: 0,
                },
              ])
            }
          }
        } else {
          setStartDate(new Date().toISOString().split('T')[0])
          setActions([
            {
              title: '',
              evidence_required: false,
              comments_required: false,
              weight: 1,
              order_index: 0,
            },
          ])
        }
      } catch (error: any) {
        toast({
          variant: 'destructive',
          title: 'Erro',
          description: 'Não foi possível carregar os dados.',
        })
      } finally {
        setLoading(false)
      }
    }

    if (user) {
      fetchClientAndData()
    }
  }, [id, user, toast])

  const handleAddAction = () => {
    setActions([
      ...actions,
      {
        title: '',
        evidence_required: false,
        comments_required: false,
        weight: 1,
        order_index: actions.length,
      },
    ])
  }

  const handleRemoveAction = (index: number) => {
    setActions(actions.filter((_, i) => i !== index))
  }

  const handleActionChange = (index: number, field: keyof AuditAction, value: any) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], [field]: value }
    setActions(newActions)
  }

  const handleAddScore = () => {
    const nextScore =
      scoringSettings.length > 0 ? Math.max(...scoringSettings.map((s) => s.score)) + 1 : 1
    setScoringSettings([
      ...scoringSettings,
      { score: nextScore, description: '', trigger_task: false },
    ])
  }

  const handleRemoveScore = (index: number) => {
    setScoringSettings(scoringSettings.filter((_, i) => i !== index))
  }

  const handleScoreChange = (index: number, field: keyof ScoringSetting, value: any) => {
    const newScores = [...scoringSettings]
    newScores[index] = { ...newScores[index], [field]: value }
    setScoringSettings(newScores)
  }

  const validate = (isPublish: boolean) => {
    if (!title.trim()) return 'O título é obrigatório.'
    if (!startDate) return 'A data de início é obrigatória.'

    if (scoringSettings.length === 0) return 'Defina pelo menos um nível de pontuação.'
    for (const score of scoringSettings) {
      if (!score.description.trim()) return `A descrição da pontuação ${score.score} é obrigatória.`
      if (typeof score.score !== 'number' || isNaN(score.score))
        return 'A pontuação deve ser um número válido.'
    }

    if (isPublish) {
      if (actions.length === 0) return 'Adicione pelo menos um item ao checklist para publicar.'
      for (const action of actions) {
        if (!action.title.trim()) return 'Todos os itens do checklist devem ter uma descrição.'
      }
    }

    return null
  }

  const handleSave = async (status: 'Rascunho' | 'Ativo') => {
    const validationError = validate(status === 'Ativo')
    if (validationError) {
      toast({ variant: 'destructive', title: 'Atenção', description: validationError })
      return
    }

    if (!clientId) {
      toast({ variant: 'destructive', title: 'Erro', description: 'Client ID não encontrado.' })
      return
    }

    setSaving(true)
    try {
      const auditData = {
        client_id: clientId,
        title,
        type,
        frequency,
        start_date: startDate,
        advance_notice_days: advanceNoticeDays,
        scoring_settings: scoringSettings,
        status,
      }

      let currentAuditId = id

      if (id) {
        const { error } = await supabase.from('audits').update(auditData).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('audits').insert([auditData]).select().single()
        if (error) throw error
        currentAuditId = data.id
      }

      if (currentAuditId) {
        const { data: existingActions } = await supabase
          .from('audit_actions')
          .select('id')
          .eq('audit_id', currentAuditId)
        const existingIds = existingActions?.map((a) => a.id) || []
        const currentIds = actions.map((a) => a.id).filter(Boolean) as string[]
        const idsToDelete = existingIds.filter((eid) => !currentIds.includes(eid))

        if (idsToDelete.length > 0) {
          await supabase.from('audit_actions').delete().in('id', idsToDelete)
        }

        for (let i = 0; i < actions.length; i++) {
          const actionData = {
            audit_id: currentAuditId,
            title: actions[i].title,
            evidence_required: actions[i].evidence_required,
            comments_required: actions[i].comments_required,
            weight: actions[i].weight,
            order_index: i,
          }

          if (actions[i].id) {
            await supabase.from('audit_actions').update(actionData).eq('id', actions[i].id)
          } else {
            await supabase.from('audit_actions').insert([actionData])
          }
        }
      }

      toast({
        title: 'Sucesso',
        description: `Auditoria ${status === 'Rascunho' ? 'salva como rascunho' : 'publicada'} com sucesso!`,
      })
      navigate('/auditoria-checklist/dashboard')
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/dashboard')}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {id ? 'Editar Auditoria' : 'Nova Auditoria'}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave('Rascunho')} disabled={saving}>
            Salvar como Rascunho
          </Button>
          <Button onClick={() => handleSave('Ativo')} disabled={saving}>
            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Publicar
          </Button>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Configurações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Título da Auditoria</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Auditoria de 5S"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Qualidade">Qualidade</SelectItem>
                  <SelectItem value="Segurança">Segurança (SSMA)</SelectItem>
                  <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                  <SelectItem value="Operacional">Operacional</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Única">Única</SelectItem>
                  <SelectItem value="Diária">Diária</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Aviso Prévio (dias)</Label>
                <Input
                  type="number"
                  min="0"
                  value={advanceNoticeDays}
                  onChange={(e) => setAdvanceNoticeDays(parseInt(e.target.value) || 0)}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Configuração de Pontuação</CardTitle>
            <CardDescription>
              Defina a escala de notas e quais delas devem gerar um plano de ação (Corretiva)
              automaticamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scoringSettings.map((score, index) => (
              <div key={index} className="flex items-center gap-3 bg-muted/50 p-3 rounded-md">
                <div className="w-16">
                  <Label className="text-xs text-muted-foreground mb-1 block">Nota</Label>
                  <Input
                    type="number"
                    value={score.score}
                    onChange={(e) =>
                      handleScoreChange(index, 'score', parseInt(e.target.value) || 0)
                    }
                  />
                </div>
                <div className="flex-1">
                  <Label className="text-xs text-muted-foreground mb-1 block">Descrição</Label>
                  <Input
                    value={score.description}
                    onChange={(e) => handleScoreChange(index, 'description', e.target.value)}
                    placeholder="Ex: Bom"
                  />
                </div>
                <div className="flex flex-col items-center justify-center pt-5">
                  <Label className="text-xs text-muted-foreground mb-1">Ação?</Label>
                  <Switch
                    checked={score.trigger_task}
                    onCheckedChange={(checked) => handleScoreChange(index, 'trigger_task', checked)}
                  />
                </div>
                <div className="pt-5">
                  <Button variant="ghost" size="icon" onClick={() => handleRemoveScore(index)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
            <Button variant="outline" size="sm" className="w-full" onClick={handleAddScore}>
              <Plus className="h-4 w-4 mr-2" /> Adicionar Nível de Pontuação
            </Button>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens do Checklist</CardTitle>
          <CardDescription>Defina as perguntas ou itens a serem inspecionados.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((action, index) => (
            <div key={index} className="flex gap-4 items-start border p-4 rounded-lg bg-card">
              <div className="flex-1 space-y-4">
                <div className="space-y-2">
                  <Label>Item {index + 1}</Label>
                  <Input
                    value={action.title}
                    onChange={(e) => handleActionChange(index, 'title', e.target.value)}
                    placeholder="Ex: O ambiente está limpo e organizado?"
                  />
                </div>
                <div className="flex items-center gap-6 flex-wrap">
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`evidence-${index}`}
                      checked={action.evidence_required}
                      onCheckedChange={(checked) =>
                        handleActionChange(index, 'evidence_required', checked)
                      }
                    />
                    <Label htmlFor={`evidence-${index}`}>Exigir Foto/Evidência</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id={`comments-${index}`}
                      checked={action.comments_required}
                      onCheckedChange={(checked) =>
                        handleActionChange(index, 'comments_required', checked)
                      }
                    />
                    <Label htmlFor={`comments-${index}`}>Exigir Comentário</Label>
                  </div>
                  <div className="flex items-center space-x-2 w-32">
                    <Label>Peso</Label>
                    <Input
                      type="number"
                      min="1"
                      value={action.weight}
                      onChange={(e) =>
                        handleActionChange(index, 'weight', parseFloat(e.target.value) || 1)
                      }
                    />
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleRemoveAction(index)}
                className="mt-6"
              >
                <Trash2 className="h-5 w-5 text-destructive" />
              </Button>
            </div>
          ))}
          <Button variant="outline" className="w-full" onClick={handleAddAction}>
            <Plus className="h-4 w-4 mr-2" /> Adicionar Novo Item
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
