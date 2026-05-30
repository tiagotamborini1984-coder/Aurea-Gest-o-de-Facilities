import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
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
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Plus, ArrowLeft, Save, FileText } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  // Audit Form State
  const [title, setTitle] = useState('')
  const [type, setType] = useState('Geral')
  const [frequency, setFrequency] = useState('Única')
  const [startDate, setStartDate] = useState('')
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState<number>(0)
  const [scoringSettings, setScoringSettings] = useState<any>(null)

  const [actions, setActions] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

  useEffect(() => {
    fetchDependencies()
    if (id) {
      fetchAudit()
    }
  }, [id])

  const fetchDependencies = async () => {
    const [plantsRes, profilesRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('profiles').select('id, name, email').order('name'),
    ])
    if (plantsRes.data) setPlants(plantsRes.data)
    if (profilesRes.data) setProfiles(profilesRes.data)
  }

  const fetchAudit = async () => {
    setLoading(true)
    try {
      const { data: audit, error } = await supabase.from('audits').select('*').eq('id', id).single()
      if (error) throw error
      if (audit) {
        setTitle(audit.title)
        setType(audit.type)
        setFrequency(audit.frequency)
        setStartDate(audit.start_date)
        setAdvanceNoticeDays(audit.advance_notice_days || 0)
        setScoringSettings(audit.scoring_settings)

        const [actionsRes, assignmentsRes] = await Promise.all([
          supabase.from('audit_actions').select('*').eq('audit_id', id).order('order_index'),
          supabase.from('audit_assignments').select('*').eq('audit_id', id),
        ])

        if (actionsRes.data) setActions(actionsRes.data)
        if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar auditoria',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (status: string) => {
    if (!title || !startDate) {
      toast({
        title: 'Aviso',
        description: 'Título e Data de Início são obrigatórios.',
        variant: 'destructive',
      })
      return
    }
    if (actions.some((a) => !a.title)) {
      toast({
        title: 'Aviso',
        description: 'Preencha o título de todas as ações no checklist.',
        variant: 'destructive',
      })
      return
    }
    if (assignments.some((a) => !a.plant_id || !a.assignee_id)) {
      toast({
        title: 'Aviso',
        description: 'Preencha Planta e Responsável para todas as distribuições.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      let auditId = id
      const auditPayload = {
        title,
        type,
        frequency,
        start_date: startDate,
        advance_notice_days: advanceNoticeDays,
        status,
        ...(scoringSettings ? { scoring_settings: scoringSettings } : {}),
      }

      if (auditId) {
        const { error } = await supabase.from('audits').update(auditPayload).eq('id', auditId)
        if (error) throw error
      } else {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user?.id)
          .single()
        if (!profile?.client_id) throw new Error('Client ID não encontrado no perfil do usuário.')

        const { data, error } = await supabase
          .from('audits')
          .insert({
            ...auditPayload,
            client_id: profile.client_id,
          })
          .select()
          .single()
        if (error) throw error
        auditId = data.id
      }

      if (auditId) {
        // Actions
        await supabase.from('audit_actions').delete().eq('audit_id', auditId)
        if (actions.length > 0) {
          const actionsPayload = actions.map((a, i) => ({
            audit_id: auditId,
            title: a.title,
            evidence_required: a.evidence_required || false,
            comments_required: a.comments_required || false,
            weight: Number(a.weight) || 1,
            order_index: i,
          }))
          const { error } = await supabase.from('audit_actions').insert(actionsPayload)
          if (error) throw error
        }

        // Assignments
        await supabase.from('audit_assignments').delete().eq('audit_id', auditId)
        if (assignments.length > 0) {
          const assignmentsPayload = assignments.map((a) => ({
            audit_id: auditId,
            plant_id: a.plant_id,
            assignee_id: a.assignee_id,
          }))
          const { error } = await supabase.from('audit_assignments').insert(assignmentsPayload)
          if (error) throw error
        }
      }

      toast({
        title: 'Sucesso',
        description: `Auditoria ${status === 'Rascunho' ? 'salva como rascunho' : 'publicada'} com sucesso.`,
      })
      navigate('/auditoria-checklist/criadas')
    } catch (error: any) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="p-8">Carregando...</div>
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-3xl font-bold tracking-tight">
            {id ? 'Editar Auditoria' : 'Nova Auditoria'}
          </h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('Rascunho')} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Salvar Rascunho
          </Button>
          <Button onClick={() => handleSave('Ativo')} disabled={saving}>
            <FileText className="mr-2 h-4 w-4" />
            Publicar
          </Button>
        </div>
      </div>

      <Tabs defaultValue="geral" className="space-y-4">
        <TabsList>
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card>
            <CardHeader>
              <CardTitle>Configurações Gerais</CardTitle>
              <CardDescription>Defina as informações básicas da auditoria.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título da Auditoria</Label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Ex: Auditoria 5S Mensal"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Select value={type} onValueChange={setType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Geral">Geral</SelectItem>
                      <SelectItem value="5S">5S</SelectItem>
                      <SelectItem value="Segurança">Segurança</SelectItem>
                      <SelectItem value="Qualidade">Qualidade</SelectItem>
                      <SelectItem value="Ambiental">Ambiental</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Select value={frequency} onValueChange={setFrequency}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a frequência" />
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
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dias de Antecedência (Notificação)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={advanceNoticeDays}
                    onChange={(e) => setAdvanceNoticeDays(parseInt(e.target.value))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="checklist">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ações (Checklist)</CardTitle>
                <CardDescription>
                  Defina os itens que serão verificados nesta auditoria.
                </CardDescription>
              </div>
              <Button
                onClick={() =>
                  setActions([
                    ...actions,
                    { title: '', weight: 1, evidence_required: false, comments_required: false },
                  ])
                }
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Item
              </Button>
            </CardHeader>
            <CardContent>
              {actions.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhum item adicionado.
                </div>
              ) : (
                <div className="space-y-4">
                  {actions.map((action, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 border rounded-lg bg-card"
                    >
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Descrição do Item</Label>
                        <Input
                          value={action.title}
                          onChange={(e) => {
                            const newActions = [...actions]
                            newActions[index].title = e.target.value
                            setActions(newActions)
                          }}
                          placeholder="O que deve ser verificado?"
                        />
                      </div>
                      <div className="w-full md:w-24 space-y-2">
                        <Label>Peso</Label>
                        <Input
                          type="number"
                          min={1}
                          value={action.weight}
                          onChange={(e) => {
                            const newActions = [...actions]
                            newActions[index].weight = Number(e.target.value)
                            setActions(newActions)
                          }}
                        />
                      </div>
                      <div className="flex items-center gap-4 pt-6">
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={action.evidence_required}
                            onCheckedChange={(c) => {
                              const newActions = [...actions]
                              newActions[index].evidence_required = c
                              setActions(newActions)
                            }}
                          />
                          <Label className="text-sm">Exigir Evidência</Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={action.comments_required}
                            onCheckedChange={(c) => {
                              const newActions = [...actions]
                              newActions[index].comments_required = c
                              setActions(newActions)
                            }}
                          />
                          <Label className="text-sm">Exigir Comentário</Label>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setActions(actions.filter((_, i) => i !== index))}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="distribuicao">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Distribuição entre Plantas e Responsáveis</CardTitle>
                <CardDescription>
                  Determine em quais plantas esta auditoria ocorrerá e quem será o responsável por
                  executá-la.
                </CardDescription>
              </div>
              <Button
                onClick={() => setAssignments([...assignments, { plant_id: '', assignee_id: '' }])}
                size="sm"
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar Distribuição
              </Button>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma distribuição configurada.
                </div>
              ) : (
                <div className="space-y-4">
                  {assignments.map((assignment, index) => (
                    <div
                      key={index}
                      className="flex flex-col md:flex-row gap-4 items-end p-4 border rounded-lg bg-card"
                    >
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Planta</Label>
                        <Select
                          value={assignment.plant_id}
                          onValueChange={(v) => {
                            const newAssignments = [...assignments]
                            newAssignments[index].plant_id = v
                            setAssignments(newAssignments)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a planta" />
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
                      <div className="flex-1 space-y-2 w-full">
                        <Label>Responsável (Auditor)</Label>
                        <Select
                          value={assignment.assignee_id}
                          onValueChange={(v) => {
                            const newAssignments = [...assignments]
                            newAssignments[index].assignee_id = v
                            setAssignments(newAssignments)
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.email})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setAssignments(assignments.filter((_, i) => i !== index))}
                        className="text-destructive mb-0.5"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
