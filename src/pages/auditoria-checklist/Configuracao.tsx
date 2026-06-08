import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/components/ui/use-toast'
import { Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [clientId, setClientId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Geral')
  const [frequency, setFrequency] = useState('Única')
  const [startDate, setStartDate] = useState('')
  const [advanceNotice, setAdvanceNotice] = useState(0)

  const [scoringSettings, setScoringSettings] = useState([
    { score: 1, description: 'Muito Ruim', trigger_task: true },
    { score: 2, description: 'Ruim', trigger_task: true },
    { score: 3, description: 'Regular', trigger_task: false },
    { score: 4, description: 'Bom', trigger_task: false },
    { score: 5, description: 'Excelente', trigger_task: false },
  ])

  const [actions, setActions] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  const [expandedAssignments, setExpandedAssignments] = useState(true)

  useEffect(() => {
    if (user) loadData()
  }, [id, user])

  const loadData = async () => {
    setLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Cliente não encontrado')
      setClientId(profile.client_id)

      const [plantsRes, profilesRes] = await Promise.all([
        supabase.from('plants').select('id, name').eq('client_id', profile.client_id),
        supabase.from('profiles').select('id, name').eq('client_id', profile.client_id),
      ])
      if (plantsRes.data) setPlants(plantsRes.data)
      if (profilesRes.data) setProfiles(profilesRes.data)

      if (id) {
        const { data: audit } = await supabase.from('audits').select('*').eq('id', id).single()
        if (audit) {
          setTitle(audit.title)
          setType(audit.type)
          setFrequency(audit.frequency)
          setStartDate(audit.start_date)
          setAdvanceNotice(audit.advance_notice_days || 0)
          if (audit.scoring_settings) setScoringSettings(audit.scoring_settings as any)

          const { data: acts } = await supabase
            .from('audit_actions')
            .select('*')
            .eq('audit_id', id)
            .order('order_index')
          if (acts) setActions(acts)

          const { data: asgs } = await supabase
            .from('audit_assignments')
            .select('*')
            .eq('audit_id', id)
          if (asgs) setAssignments(asgs)
        }
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (status: string) => {
    if (!title || !startDate) {
      toast({
        title: 'Aviso',
        description: 'Preencha os campos obrigatórios (Título e Data)',
        variant: 'destructive',
      })
      return
    }
    setSaving(true)
    try {
      let auditId = id
      const auditData = {
        client_id: clientId,
        title,
        type,
        frequency,
        start_date: startDate,
        advance_notice_days: advanceNotice,
        scoring_settings: scoringSettings,
        status,
      }

      if (auditId) {
        await supabase.from('audits').update(auditData).eq('id', auditId)
      } else {
        const { data, error } = await supabase.from('audits').insert(auditData).select().single()
        if (error) throw error
        auditId = data.id
      }

      if (auditId) {
        await supabase.from('audit_actions').delete().eq('audit_id', auditId)
        await supabase.from('audit_assignments').delete().eq('audit_id', auditId)

        if (actions.length > 0) {
          const acts = actions.map((a, i) => ({
            ...a,
            id: undefined,
            audit_id: auditId,
            order_index: i,
          }))
          await supabase.from('audit_actions').insert(acts)
        }
        if (assignments.length > 0) {
          const asgs = assignments.map((a) => ({ ...a, id: undefined, audit_id: auditId }))
          await supabase.from('audit_assignments').insert(asgs)
        }
      }

      toast({ title: 'Sucesso', description: 'Auditoria salva com sucesso!' })
      navigate('/auditoria-checklist/dashboard')
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const ActionButtons = () => (
    <div className="flex gap-3">
      <Button variant="outline" onClick={() => handleSave('Rascunho')} disabled={saving}>
        Salvar como Rascunho
      </Button>
      <Button variant="default" onClick={() => handleSave('Ativo')} disabled={saving}>
        Salvar
      </Button>
    </div>
  )

  if (loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="animate-spin h-8 w-8 text-primary" />
      </div>
    )

  return (
    <div className="container mx-auto p-6 max-w-5xl space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Configuração de Auditoria</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Defina os parâmetros, critérios e checklist da auditoria.
          </p>
        </div>
        <ActionButtons />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Básicos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label>Título da Auditoria *</Label>
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ex: Auditoria de Segurança"
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
                  <SelectItem value="Segurança">Segurança</SelectItem>
                  <SelectItem value="Qualidade">Qualidade</SelectItem>
                  <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                  <SelectItem value="5S">5S</SelectItem>
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
            <div className="space-y-2">
              <Label>Data de Início *</Label>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Aviso Prévio (dias antes da execução)</Label>
              <Input
                type="number"
                min="0"
                value={advanceNotice}
                onChange={(e) => setAdvanceNotice(Number(e.target.value))}
                className="max-w-[200px]"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Critérios e Notas</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Configure a escala de avaliação e quais notas exigem plano de ação.
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-[80px_1fr_100px] gap-4 mb-2 px-3">
            <Label className="text-xs text-muted-foreground uppercase">Nota</Label>
            <Label className="text-xs text-muted-foreground uppercase">Descrição</Label>
            <Label className="text-xs text-muted-foreground uppercase text-center">
              Gera Ação?
            </Label>
          </div>
          <div className="space-y-3">
            {scoringSettings.map((setting, idx) => (
              <div
                key={idx}
                className="grid grid-cols-[80px_1fr_100px] gap-4 items-center p-3 bg-muted/30 rounded-md border border-border/50"
              >
                <Input
                  type="number"
                  value={setting.score}
                  onChange={(e) => {
                    const newSettings = [...scoringSettings]
                    newSettings[idx].score = Number(e.target.value)
                    setScoringSettings(newSettings)
                  }}
                />
                <Input
                  value={setting.description}
                  onChange={(e) => {
                    const newSettings = [...scoringSettings]
                    newSettings[idx].description = e.target.value
                    setScoringSettings(newSettings)
                  }}
                />
                <div className="flex justify-center">
                  <Checkbox
                    checked={setting.trigger_task}
                    onCheckedChange={(c) => {
                      const newSettings = [...scoringSettings]
                      newSettings[idx].trigger_task = !!c
                      setScoringSettings(newSettings)
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ações / Checklist</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Adicione os itens que serão verificados nesta auditoria.
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {actions.map((action, idx) => (
              <div
                key={idx}
                className="flex gap-4 items-start bg-muted/20 p-4 rounded-md border border-border/50"
              >
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label>Item de Verificação</Label>
                    <Input
                      value={action.title}
                      onChange={(e) => {
                        const newActions = [...actions]
                        newActions[idx].title = e.target.value
                        setActions(newActions)
                      }}
                      placeholder="Ex: Equipamentos de proteção individual em uso"
                    />
                  </div>
                  <div className="flex gap-6">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={action.evidence_required}
                        onCheckedChange={(c) => {
                          const newActions = [...actions]
                          newActions[idx].evidence_required = !!c
                          setActions(newActions)
                        }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        Exigir Evidência (Foto)
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={action.comments_required}
                        onCheckedChange={(c) => {
                          const newActions = [...actions]
                          newActions[idx].comments_required = !!c
                          setActions(newActions)
                        }}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        Exigir Comentário
                      </Label>
                    </div>
                  </div>
                </div>

                <div className="w-24 space-y-2">
                  <Label>Peso</Label>
                  <Input
                    type="number"
                    min="1"
                    value={action.weight}
                    onChange={(e) => {
                      const newActions = [...actions]
                      newActions[idx].weight = Number(e.target.value)
                      setActions(newActions)
                    }}
                  />
                </div>

                <div className="pt-8">
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10"
                    size="icon"
                    onClick={() => setActions(actions.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}

            <Button
              variant="outline"
              onClick={() =>
                setActions([
                  ...actions,
                  { title: '', weight: 1, evidence_required: false, comments_required: false },
                ])
              }
            >
              <Plus className="w-4 h-4 mr-2" />
              Adicionar Item
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <div
          className="px-6 py-4 flex flex-row justify-between items-center cursor-pointer hover:bg-muted/30 transition-colors"
          onClick={() => setExpandedAssignments(!expandedAssignments)}
        >
          <div>
            <CardTitle className="text-lg">Unidades e Responsáveis</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Defina onde a auditoria será aplicada e quem irá realizá-la.
            </p>
          </div>
          <Button variant="ghost" size="icon" className="pointer-events-none">
            {expandedAssignments ? (
              <ChevronUp className="h-5 w-5" />
            ) : (
              <ChevronDown className="h-5 w-5" />
            )}
          </Button>
        </div>
        {expandedAssignments && (
          <CardContent className="pt-2 border-t border-border/50">
            <div className="space-y-4 pt-4">
              {assignments.map((asg, idx) => (
                <div
                  key={idx}
                  className="flex flex-col md:flex-row gap-4 items-end bg-muted/20 p-4 rounded-md border border-border/50"
                >
                  <div className="flex-1 w-full">
                    <Label className="mb-2 block">Unidade / Planta</Label>
                    <Select
                      value={asg.plant_id}
                      onValueChange={(val) => {
                        const newAsgs = [...assignments]
                        newAsgs[idx].plant_id = val
                        setAssignments(newAsgs)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
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
                  <div className="flex-1 w-full">
                    <Label className="mb-2 block">Responsável</Label>
                    <Select
                      value={asg.assignee_id}
                      onValueChange={(val) => {
                        const newAsgs = [...assignments]
                        newAsgs[idx].assignee_id = val
                        setAssignments(newAsgs)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 md:w-auto w-full"
                    onClick={() => setAssignments(assignments.filter((_, i) => i !== idx))}
                  >
                    <Trash2 className="w-4 h-4 md:mr-0 mr-2" />
                    <span className="md:hidden">Remover Responsável</span>
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                onClick={() => setAssignments([...assignments, { plant_id: '', assignee_id: '' }])}
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Responsável
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      <div className="flex justify-end pt-4">
        <ActionButtons />
      </div>
    </div>
  )
}
