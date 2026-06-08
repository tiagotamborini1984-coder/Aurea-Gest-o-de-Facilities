import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Trash2, Plus, ArrowLeft, Save, AlertCircle } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

interface ScoringSetting {
  score: number
  description: string
  trigger_task: boolean
}

interface AuditAction {
  id?: string
  title: string
  weight: number
  evidence_required: boolean
  comments_required: boolean
  order_index: number
}

interface AuditAssignment {
  plant_id: string
  assignee_id: string
}

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()
  const { profile, activeClient } = useAppStore()

  const [loading, setLoading] = useState(!!id)
  const [saving, setSaving] = useState(false)

  const [audit, setAudit] = useState({
    title: '',
    type: 'Geral',
    frequency: 'Única',
    start_date: new Date().toISOString().split('T')[0],
    advance_notice_days: 0,
    scoring_settings: [
      { score: 1, description: 'Muito Ruim', trigger_task: true },
      { score: 2, description: 'Ruim', trigger_task: true },
      { score: 3, description: 'Regular', trigger_task: false },
      { score: 4, description: 'Bom', trigger_task: false },
      { score: 5, description: 'Excelente', trigger_task: false },
    ] as ScoringSetting[],
  })

  const [actions, setActions] = useState<AuditAction[]>([])
  const [assignments, setAssignments] = useState<AuditAssignment[]>([])

  const [plants, setPlants] = useState<any[]>([])
  const [profilesList, setProfilesList] = useState<any[]>([])

  useEffect(() => {
    fetchAuxData()
    if (id) fetchAudit()
  }, [id, activeClient, profile])

  const fetchAuxData = async () => {
    const clientId = activeClient?.id || profile?.client_id
    if (!clientId && profile?.role === 'Master') return

    try {
      const [plantsRes, profilesRes] = await Promise.all([
        supabase.from('plants').select('id, name').eq('client_id', clientId),
        supabase.from('profiles').select('id, name, email').eq('client_id', clientId),
      ])

      if (plantsRes.data) setPlants(plantsRes.data)
      if (profilesRes.data) setProfilesList(profilesRes.data)
    } catch (err) {
      console.error(err)
    }
  }

  const fetchAudit = async () => {
    setLoading(true)
    try {
      const { data: auditData, error: auditError } = await supabase
        .from('audits')
        .select('*')
        .eq('id', id)
        .single()

      if (auditError) throw auditError

      if (auditData) {
        setAudit({
          title: auditData.title,
          type: auditData.type,
          frequency: auditData.frequency,
          start_date: auditData.start_date,
          advance_notice_days: auditData.advance_notice_days || 0,
          scoring_settings: auditData.scoring_settings || [
            { score: 1, description: 'Muito Ruim', trigger_task: true },
            { score: 2, description: 'Ruim', trigger_task: true },
            { score: 3, description: 'Regular', trigger_task: false },
            { score: 4, description: 'Bom', trigger_task: false },
            { score: 5, description: 'Excelente', trigger_task: false },
          ],
        })
      }

      const [actionsRes, assignmentsRes] = await Promise.all([
        supabase.from('audit_actions').select('*').eq('audit_id', id).order('order_index'),
        supabase.from('audit_assignments').select('*').eq('audit_id', id),
      ])

      if (actionsRes.data) {
        setActions(
          actionsRes.data.map((a) => ({
            id: a.id,
            title: a.title,
            weight: a.weight,
            evidence_required: a.evidence_required,
            comments_required: a.comments_required,
            order_index: a.order_index,
          })),
        )
      }

      if (assignmentsRes.data) {
        setAssignments(
          assignmentsRes.data.map((a) => ({
            plant_id: a.plant_id,
            assignee_id: a.assignee_id,
          })),
        )
      }
    } catch (err: any) {
      toast({
        title: 'Erro ao carregar auditoria',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!audit.title) {
      toast({
        title: 'Atenção',
        description: 'Preencha o título da auditoria.',
        variant: 'destructive',
      })
      return
    }

    const hasEmptyAssignments = assignments.some((a) => !a.plant_id || !a.assignee_id)
    if (hasEmptyAssignments) {
      toast({
        title: 'Atenção',
        description: 'Preencha todas as unidades e responsáveis ou remova as linhas em branco.',
        variant: 'destructive',
      })
      return
    }

    const hasDuplicates = assignments.some(
      (a, idx) =>
        assignments.findIndex(
          (b) => b.plant_id === a.plant_id && b.assignee_id === a.assignee_id,
        ) !== idx,
    )
    if (hasDuplicates) {
      toast({
        title: 'Atenção',
        description: 'Existem atribuições duplicadas (mesma unidade e responsável).',
        variant: 'destructive',
      })
      return
    }

    const hasEmptyActions = actions.some((a) => !a.title.trim())
    if (hasEmptyActions) {
      toast({
        title: 'Atenção',
        description: 'Preencha o título de todos os itens do checklist.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      const clientId = activeClient?.id || profile?.client_id

      const auditDataToSave = {
        client_id: clientId,
        title: audit.title,
        type: audit.type,
        frequency: audit.frequency,
        start_date: audit.start_date,
        advance_notice_days: audit.advance_notice_days,
        scoring_settings: audit.scoring_settings,
      }

      let savedAuditId = id
      if (id) {
        const { error } = await supabase.from('audits').update(auditDataToSave).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase
          .from('audits')
          .insert(auditDataToSave)
          .select()
          .single()
        if (error) throw error
        savedAuditId = data.id
      }

      if (id) {
        const existingActionsIds = actions.filter((a) => a.id).map((a) => a.id)
        const { data: currentActions } = await supabase
          .from('audit_actions')
          .select('id')
          .eq('audit_id', savedAuditId)

        if (currentActions) {
          const idsToDelete = currentActions
            .map((a) => a.id)
            .filter((aid) => !existingActionsIds.includes(aid))
          if (idsToDelete.length > 0) {
            await supabase.from('audit_actions').delete().in('id', idsToDelete)
          }
        }
      }

      for (let i = 0; i < actions.length; i++) {
        const action = actions[i]
        const actionData = {
          audit_id: savedAuditId,
          title: action.title,
          weight: action.weight,
          evidence_required: action.evidence_required,
          comments_required: action.comments_required,
          order_index: i,
        }

        if (action.id) {
          await supabase.from('audit_actions').update(actionData).eq('id', action.id)
        } else {
          await supabase.from('audit_actions').insert(actionData)
        }
      }

      if (id) {
        await supabase.from('audit_assignments').delete().eq('audit_id', savedAuditId)
      }

      if (assignments.length > 0) {
        const assignData = assignments.map((a) => ({
          audit_id: savedAuditId,
          plant_id: a.plant_id,
          assignee_id: a.assignee_id,
        }))
        await supabase.from('audit_assignments').insert(assignData)
      }

      toast({ title: 'Sucesso', description: 'Auditoria salva com sucesso!' })
      navigate('/auditoria-checklist/criadas')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const updateScore = (index: number, field: keyof ScoringSetting, value: any) => {
    const newScores = [...audit.scoring_settings]
    newScores[index] = { ...newScores[index], [field]: value }
    setAudit({ ...audit, scoring_settings: newScores })
  }
  const addScore = () => {
    const maxScore =
      audit.scoring_settings.length > 0
        ? Math.max(...audit.scoring_settings.map((s) => s.score))
        : 0
    setAudit({
      ...audit,
      scoring_settings: [
        ...audit.scoring_settings,
        { score: maxScore + 1, description: '', trigger_task: false },
      ],
    })
  }
  const removeScore = (index: number) => {
    const newScores = [...audit.scoring_settings]
    newScores.splice(index, 1)
    setAudit({ ...audit, scoring_settings: newScores })
  }

  const updateAction = (index: number, field: keyof AuditAction, value: any) => {
    const newActions = [...actions]
    newActions[index] = { ...newActions[index], [field]: value }
    setActions(newActions)
  }
  const addAction = () => {
    setActions([
      ...actions,
      {
        title: '',
        weight: 1,
        evidence_required: false,
        comments_required: false,
        order_index: actions.length,
      },
    ])
  }
  const removeAction = (index: number) => {
    const newActions = [...actions]
    newActions.splice(index, 1)
    setActions(newActions)
  }

  const updateAssignment = (index: number, field: keyof AuditAssignment, value: any) => {
    const newAssignments = [...assignments]
    newAssignments[index] = { ...newAssignments[index], [field]: value }
    setAssignments(newAssignments)
  }
  const addAssignment = () => {
    setAssignments([...assignments, { plant_id: '', assignee_id: '' }])
  }
  const removeAssignment = (index: number) => {
    const newAssignments = [...assignments]
    newAssignments.splice(index, 1)
    setAssignments(newAssignments)
  }

  if (loading) {
    return (
      <div className="p-6 max-w-5xl mx-auto flex items-center justify-center min-h-[50vh]">
        <div className="flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-4 border-brand-vividBlue border-t-transparent rounded-full animate-spin"></div>
          <p className="text-muted-foreground">Carregando configuração...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6 pb-20">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/auditoria-checklist/criadas">Auditorias</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{id ? 'Editar Auditoria' : 'Nova Auditoria'}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/criadas')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{id ? 'Editar Configuração' : 'Criar Auditoria'}</h1>
        </div>
        <Button onClick={handleSave} disabled={saving}>
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar Tudo'}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configuração Geral</CardTitle>
          <CardDescription>Defina as informações base da auditoria.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2 md:col-span-2">
            <Label>
              Título da Auditoria <span className="text-red-500">*</span>
            </Label>
            <Input
              value={audit.title}
              onChange={(e) => setAudit({ ...audit, title: e.target.value })}
              placeholder="Ex: Auditoria 5S Mensal"
            />
          </div>

          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={audit.type} onValueChange={(val) => setAudit({ ...audit, type: val })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Geral">Geral</SelectItem>
                <SelectItem value="Qualidade">Qualidade (5S, ISO)</SelectItem>
                <SelectItem value="Segurança">Segurança (EHS)</SelectItem>
                <SelectItem value="Operacional">Operacional</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select
              value={audit.frequency}
              onValueChange={(val) => setAudit({ ...audit, frequency: val })}
            >
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

          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input
              type="date"
              value={audit.start_date}
              onChange={(e) => setAudit({ ...audit, start_date: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label>Aviso Prévio (Dias)</Label>
            <Input
              type="number"
              min={0}
              value={audit.advance_notice_days}
              onChange={(e) => setAudit({ ...audit, advance_notice_days: Number(e.target.value) })}
            />
            <p className="text-xs text-muted-foreground">
              Quantos dias antes do vencimento a tarefa será gerada.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critérios de Notas</CardTitle>
          <CardDescription>
            Defina a escala de avaliação e se a nota deve disparar a criação de uma ação corretiva
            automática.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {audit.scoring_settings.map((setting, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 bg-muted/30 p-3 rounded-lg border"
            >
              <div className="flex-none w-24 space-y-1">
                <Label className="text-xs">Nota</Label>
                <Input
                  type="number"
                  value={setting.score}
                  onChange={(e) => updateScore(index, 'score', Number(e.target.value))}
                />
              </div>
              <div className="flex-1 w-full space-y-1">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={setting.description}
                  onChange={(e) => updateScore(index, 'description', e.target.value)}
                  placeholder="Ex: Ruim"
                />
              </div>
              <div className="flex items-center gap-3 sm:mt-5">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={setting.trigger_task}
                    onCheckedChange={(checked) => updateScore(index, 'trigger_task', checked)}
                  />
                  <Label className="text-xs whitespace-nowrap">Gera Ação?</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeScore(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addScore} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Nota
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Expansão entre Unidades e Responsáveis</CardTitle>
          <CardDescription>
            Defina quais unidades realizarão esta auditoria e quem será o responsável em cada uma.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.length === 0 && (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <AlertCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
              <p>Nenhuma atribuição configurada.</p>
              <p className="text-sm">
                Esta auditoria não será gerada automaticamente sem atribuições.
              </p>
            </div>
          )}

          {assignments.map((assignment, index) => (
            <div
              key={index}
              className="flex flex-col sm:flex-row gap-4 bg-muted/30 p-4 rounded-lg border items-start sm:items-end"
            >
              <div className="flex-1 w-full space-y-2">
                <Label>Unidade (Planta)</Label>
                <Select
                  value={assignment.plant_id}
                  onValueChange={(val) => updateAssignment(index, 'plant_id', val)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione a unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 w-full space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={assignment.assignee_id}
                  onValueChange={(val) => updateAssignment(index, 'assignee_id', val)}
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Selecione o responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    {profilesList.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.email ? `(${p.email})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mb-0 sm:mb-0 text-red-500 hover:text-red-700 hover:bg-red-50 self-end"
                onClick={() => removeAssignment(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={addAssignment}
            className="w-full sm:w-auto mt-2"
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Atribuição
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checklist (Ações de Auditoria)</CardTitle>
          <CardDescription>
            Cadastre os itens que deverão ser avaliados na auditoria.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              <p>Nenhum item cadastrado no checklist.</p>
            </div>
          )}

          {actions.map((action, index) => (
            <div key={index} className="flex flex-col gap-4 bg-background p-4 rounded-lg border">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <span className="bg-muted text-muted-foreground w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </span>
                  <Label className="text-base">Item de Verificação</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAction(index)}
                  className="text-red-500 hover:text-red-700 hover:bg-red-50 -mt-2 -mr-2"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <Input
                value={action.title}
                onChange={(e) => updateAction(index, 'title', e.target.value)}
                placeholder="Descreva o item a ser avaliado..."
                className="font-medium"
              />

              <div className="flex flex-wrap gap-6 mt-2 items-center bg-muted/20 p-3 rounded border">
                <div className="flex items-center gap-2">
                  <Label className="text-xs">Peso (Multiplicador)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={action.weight}
                    onChange={(e) => updateAction(index, 'weight', Number(e.target.value))}
                    className="w-20 h-8"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={action.evidence_required}
                    onCheckedChange={(checked) => updateAction(index, 'evidence_required', checked)}
                  />
                  <Label className="text-xs">Exigir Evidência (Foto)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={action.comments_required}
                    onCheckedChange={(checked) => updateAction(index, 'comments_required', checked)}
                  />
                  <Label className="text-xs">Exigir Observação</Label>
                </div>
              </div>
            </div>
          ))}
          <Button variant="outline" size="sm" onClick={addAction} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Item ao Checklist
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
