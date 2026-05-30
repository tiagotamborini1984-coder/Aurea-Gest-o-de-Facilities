import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
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
import { useToast } from '@/components/ui/use-toast'
import { Plus, Trash2, ArrowLeft, Save } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  const [audit, setAudit] = useState({
    title: '',
    type: 'Geral',
    frequency: 'Única',
    start_date: new Date().toISOString().split('T')[0],
  })

  const [assignments, setAssignments] = useState<any[]>([])
  const [actions, setActions] = useState<any[]>([])

  useEffect(() => {
    loadData()
  }, [id])

  const loadData = async () => {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    const clientId = profile?.client_id

    if (clientId) {
      const [plantsRes, profilesRes] = await Promise.all([
        supabase.from('plants').select('*').eq('client_id', clientId),
        supabase.from('profiles').select('*').eq('client_id', clientId),
      ])
      setPlants(plantsRes.data || [])
      setProfiles(profilesRes.data || [])
    }

    if (id) {
      const [auditRes, assignmentsRes, actionsRes] = await Promise.all([
        supabase.from('audits').select('*').eq('id', id).single(),
        supabase.from('audit_assignments').select('*').eq('audit_id', id),
        supabase.from('audit_actions').select('*').eq('audit_id', id).order('order_index'),
      ])
      if (auditRes.data) setAudit(auditRes.data as any)
      if (assignmentsRes.data) setAssignments(assignmentsRes.data)
      if (actionsRes.data) setActions(actionsRes.data)
    }
    setLoading(false)
  }

  const handleSave = async () => {
    if (!audit.title) {
      toast({ title: 'Erro', description: 'Título é obrigatório', variant: 'destructive' })
      return
    }

    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id || '')
      .single()

    let auditId = id
    if (!auditId) {
      const { data, error } = await supabase
        .from('audits')
        .insert({
          ...audit,
          client_id: profile?.client_id,
        })
        .select()
        .single()
      if (error) throw error
      auditId = data.id
    } else {
      await supabase.from('audits').update(audit).eq('id', auditId)
    }

    await supabase.from('audit_assignments').delete().eq('audit_id', auditId)
    if (assignments.length > 0) {
      const assignmentsToInsert = assignments.map((a) => ({
        audit_id: auditId,
        plant_id: a.plant_id,
        assignee_id: a.assignee_id,
      }))
      await supabase.from('audit_assignments').insert(assignmentsToInsert)
    }

    await supabase.from('audit_actions').delete().eq('audit_id', auditId)
    if (actions.length > 0) {
      const actionsToInsert = actions.map((a, i) => ({
        audit_id: auditId,
        title: a.title,
        weight: a.weight || 1,
        evidence_required: a.evidence_required || false,
        comments_required: a.comments_required || false,
        order_index: i,
      }))
      await supabase.from('audit_actions').insert(actionsToInsert as any)
    }

    toast({ title: 'Sucesso', description: 'Configuração salva com sucesso' })
    setLoading(false)
    navigate('/auditoria-checklist/criadas')
  }

  const addAssignment = () => setAssignments([...assignments, { plant_id: '', assignee_id: '' }])
  const updateAssignment = (index: number, field: string, val: string) => {
    const newArr = [...assignments]
    newArr[index][field] = val
    setAssignments(newArr)
  }
  const removeAssignment = (index: number) =>
    setAssignments(assignments.filter((_, i) => i !== index))

  const addAction = () =>
    setActions([
      ...actions,
      { title: '', weight: 1, evidence_required: false, comments_required: false },
    ])
  const updateAction = (index: number, field: string, val: any) => {
    const newArr = [...actions]
    newArr[index][field] = val
    setActions(newArr)
  }
  const removeAction = (index: number) => setActions(actions.filter((_, i) => i !== index))

  if (loading && !plants.length) return <div className="p-8">Carregando...</div>

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">{id ? 'Editar Auditoria' : 'Nova Auditoria'}</h1>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="w-4 h-4 mr-2" /> Salvar
        </Button>
      </div>

      <Tabs defaultValue="geral">
        <TabsList>
          <TabsTrigger value="geral">Dados Gerais</TabsTrigger>
          <TabsTrigger value="distribuicao">Distribuição</TabsTrigger>
          <TabsTrigger value="checklist">Checklist</TabsTrigger>
        </TabsList>

        <TabsContent value="geral" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input
                value={audit.title}
                onChange={(e) => setAudit({ ...audit, title: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={audit.type} onValueChange={(v) => setAudit({ ...audit, type: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Geral">Geral</SelectItem>
                  <SelectItem value="Qualidade">Qualidade</SelectItem>
                  <SelectItem value="Segurança">Segurança</SelectItem>
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
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Única">Única</SelectItem>
                  <SelectItem value="Diária">Diária</SelectItem>
                  <SelectItem value="Semanal">Semanal</SelectItem>
                  <SelectItem value="Mensal">Mensal</SelectItem>
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
        </TabsContent>

        <TabsContent value="distribuicao" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Plantas e Responsáveis</h3>
            <Button onClick={addAssignment} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Adicionar
            </Button>
          </div>
          {assignments.map((item, index) => (
            <div key={index} className="flex gap-4 items-end border p-4 rounded-md bg-white">
              <div className="flex-1 space-y-2">
                <Label>Planta</Label>
                <Select
                  value={item.plant_id}
                  onValueChange={(v) => updateAssignment(index, 'plant_id', v)}
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
              <div className="flex-1 space-y-2">
                <Label>Responsável</Label>
                <Select
                  value={item.assignee_id}
                  onValueChange={(v) => updateAssignment(index, 'assignee_id', v)}
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
              <Button variant="ghost" onClick={() => removeAssignment(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          {assignments.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma distribuição configurada.</p>
          )}
        </TabsContent>

        <TabsContent value="checklist" className="space-y-4 mt-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Itens do Checklist</h3>
            <Button onClick={addAction} variant="outline">
              <Plus className="w-4 h-4 mr-2" /> Adicionar Item
            </Button>
          </div>
          {actions.map((action, index) => (
            <div key={index} className="flex gap-4 items-start border p-4 rounded-md bg-white">
              <div className="flex-1 space-y-4">
                <div>
                  <Label>Título do Item</Label>
                  <Input
                    value={action.title}
                    onChange={(e) => updateAction(index, 'title', e.target.value)}
                  />
                </div>
                <div className="flex items-center gap-8">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={action.evidence_required}
                      onCheckedChange={(c) => updateAction(index, 'evidence_required', c)}
                    />
                    <Label>Obrigatório Evidência</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={action.comments_required}
                      onCheckedChange={(c) => updateAction(index, 'comments_required', c)}
                    />
                    <Label>Obrigatório Comentário</Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Label>Peso:</Label>
                    <Input
                      type="number"
                      className="w-24"
                      value={action.weight}
                      onChange={(e) => updateAction(index, 'weight', parseFloat(e.target.value))}
                    />
                  </div>
                </div>
              </div>
              <Button variant="ghost" onClick={() => removeAction(index)}>
                <Trash2 className="w-4 h-4 text-red-500" />
              </Button>
            </div>
          ))}
          {actions.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum item configurado.</p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
