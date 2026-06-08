import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Loader2, Save, ArrowLeft, Plus, Trash2 } from 'lucide-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [audit, setAudit] = useState<any>({
    title: '',
    type: 'Geral',
    frequency: 'Única',
    start_date: new Date().toISOString().split('T')[0],
    advance_notice_days: 0,
    status: 'Ativo',
    scoring_settings: [
      { score: 1, description: 'Muito Ruim', trigger_task: true },
      { score: 2, description: 'Ruim', trigger_task: true },
      { score: 3, description: 'Regular', trigger_task: false },
      { score: 4, description: 'Bom', trigger_task: false },
      { score: 5, description: 'Excelente', trigger_task: false },
    ],
  })

  const [actions, setActions] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    fetchData()
  }, [id])

  const fetchData = async () => {
    try {
      const [{ data: pData }, { data: prData }] = await Promise.all([
        supabase.from('plants').select('id, name'),
        supabase.from('profiles').select('id, name'),
      ])

      setPlants(pData || [])
      setProfiles(prData || [])

      if (id) {
        const { data: auditData, error: auditError } = await supabase
          .from('audits')
          .select('*')
          .eq('id', id)
          .single()

        if (auditError) throw auditError
        if (auditData) setAudit(auditData)

        const { data: actionsData } = await supabase
          .from('audit_actions')
          .select('*')
          .eq('audit_id', id)
          .order('order_index')
        setActions(actionsData || [])

        const { data: assignData } = await supabase
          .from('audit_assignments')
          .select('*')
          .eq('audit_id', id)
        setAssignments(assignData || [])
      }
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async (isDraft: boolean) => {
    setSaving(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', userData.user?.id)
        .single()

      const payload = {
        ...audit,
        client_id: profile?.client_id,
        status: isDraft ? 'Rascunho' : 'Ativo',
      }

      let auditId = id
      if (id) {
        const { error } = await supabase.from('audits').update(payload).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('audits').insert(payload).select().single()
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
            weight: a.weight || 1,
            order_index: i,
          }))
          await supabase.from('audit_actions').insert(actionsPayload)
        }

        // Assignments
        await supabase.from('audit_assignments').delete().eq('audit_id', auditId)
        if (assignments.length > 0) {
          const assignPayload = assignments.map((a) => ({
            audit_id: auditId,
            plant_id: a.plant_id,
            assignee_id: a.assignee_id,
          }))
          await supabase.from('audit_assignments').insert(assignPayload)
        }
      }

      toast({
        title: isDraft ? 'Rascunho salvo' : 'Configuração salva',
        description: 'Os dados foram salvos com sucesso.',
      })
      navigate('/auditoria-checklist/criadas')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const addAction = () =>
    setActions([...actions, { title: '', evidence_required: false, weight: 1 }])
  const removeAction = (index: number) => setActions(actions.filter((_, i) => i !== index))
  const updateAction = (index: number, field: string, value: any) => {
    const newActions = [...actions]
    newActions[index][field] = value
    setActions(newActions)
  }

  const addAssignment = () => setAssignments([...assignments, { plant_id: '', assignee_id: '' }])
  const removeAssignment = (index: number) =>
    setAssignments(assignments.filter((_, i) => i !== index))
  const updateAssignment = (index: number, field: string, value: any) => {
    const newAssigns = [...assignments]
    newAssigns[index][field] = value
    setAssignments(newAssigns)
  }

  if (loading)
    return (
      <div className="flex h-full items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {id ? 'Editar Auditoria' : 'Nova Auditoria'}
            </h1>
            <p className="text-muted-foreground">
              Configure os parâmetros e critérios da auditoria
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar como Rascunho
          </Button>
          <Button onClick={() => handleSave(false)} disabled={saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Salvar Configuração
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Detalhes da Auditoria</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={audit.title}
                onChange={(e) => setAudit({ ...audit, title: e.target.value })}
                placeholder="Ex: Auditoria de Segurança"
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={audit.type} onValueChange={(v) => setAudit({ ...audit, type: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Segurança">Segurança</SelectItem>
                  <SelectItem value="Qualidade">Qualidade</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Frequência</Label>
              <Select
                value={audit.frequency}
                onValueChange={(v) => setAudit({ ...audit, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Unidades e Responsáveis</CardTitle>
            <CardDescription>Defina quem irá realizar a auditoria e onde</CardDescription>
          </div>
          <Button onClick={addAssignment} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Adicionar
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.map((assign, idx) => (
            <div
              key={idx}
              className="flex flex-col md:flex-row gap-4 items-end md:items-center p-4 border rounded-md"
            >
              <div className="flex-1 space-y-2 w-full">
                <Label>Unidade (Planta)</Label>
                <Select
                  value={assign.plant_id}
                  onValueChange={(v) => updateAssignment(idx, 'plant_id', v)}
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
                <Label>Responsável</Label>
                <Select
                  value={assign.assignee_id}
                  onValueChange={(v) => updateAssignment(idx, 'assignee_id', v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o responsável" />
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
                size="icon"
                onClick={() => removeAssignment(idx)}
                className="text-destructive mb-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          {assignments.length === 0 && (
            <div className="text-center p-6 text-muted-foreground border border-dashed rounded-md">
              Nenhuma atribuição adicionada.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Critérios e Notas</CardTitle>
            <CardDescription>
              Configure os itens que serão avaliados (criteria notes)
            </CardDescription>
          </div>
          <Button onClick={addAction} size="sm">
            <Plus className="h-4 w-4 mr-2" /> Adicionar Critério
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((action, idx) => (
            <div
              key={idx}
              className="flex flex-col md:flex-row gap-4 items-start md:items-center p-4 border rounded-md"
            >
              <div className="flex-1 space-y-2 w-full">
                <Label>Descrição do Critério</Label>
                <Input
                  value={action.title}
                  onChange={(e) => updateAction(idx, 'title', e.target.value)}
                  placeholder="Ex: Verificação de extintores"
                />
              </div>
              <div className="w-full md:w-32 space-y-2">
                <Label>Peso</Label>
                <Input
                  type="number"
                  min="1"
                  value={action.weight}
                  onChange={(e) => updateAction(idx, 'weight', parseFloat(e.target.value))}
                />
              </div>
              <div className="flex items-center gap-4 mt-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id={`ev-${idx}`}
                    checked={action.evidence_required}
                    onCheckedChange={(c) => updateAction(idx, 'evidence_required', c)}
                  />
                  <Label htmlFor={`ev-${idx}`}>Exigir Evidência</Label>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeAction(idx)}
                  className="text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
          {actions.length === 0 && (
            <div className="text-center p-6 text-muted-foreground border border-dashed rounded-md">
              Nenhum critério adicionado.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
