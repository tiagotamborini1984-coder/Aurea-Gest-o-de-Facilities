import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { useToast } from '@/components/ui/use-toast'
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
import { Save, Plus, Trash2, ArrowLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(!!id)
  const [clientId, setClientId] = useState<string | null>(null)

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Geral')
  const [frequency, setFrequency] = useState('Única')
  const [startDate, setStartDate] = useState('')
  const [advanceNoticeDays, setAdvanceNoticeDays] = useState(0)

  const [actions, setActions] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])

  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  useEffect(() => {
    const loadContext = async () => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single()
      if (profile?.client_id) {
        setClientId(profile.client_id)

        const [{ data: pData }, { data: prData }] = await Promise.all([
          supabase.from('plants').select('id, name').eq('client_id', profile.client_id),
          supabase.from('profiles').select('id, name').eq('client_id', profile.client_id),
        ])
        setPlants(pData || [])
        setProfiles(prData || [])
      }
    }
    loadContext()
  }, [user])

  useEffect(() => {
    if (id && clientId) {
      const fetchAudit = async () => {
        const { data } = await supabase.from('audits').select('*').eq('id', id).single()
        if (data) {
          setTitle(data.title)
          setType(data.type)
          setFrequency(data.frequency)
          setStartDate(data.start_date)
          setAdvanceNoticeDays(data.advance_notice_days || 0)

          const { data: acts } = await supabase
            .from('audit_actions')
            .select('*')
            .eq('audit_id', id)
            .order('order_index')
          setActions(acts || [])

          const { data: assigns } = await supabase
            .from('audit_assignments')
            .select('*')
            .eq('audit_id', id)
          setAssignments(assigns || [])
        }
        setFetching(false)
      }
      fetchAudit()
    }
  }, [id, clientId])

  const handleSave = async (status: 'Ativo' | 'Rascunho') => {
    if (!clientId) return
    if (!title || !startDate) {
      toast({
        title: 'Erro',
        description: 'Preencha os campos obrigatórios (Título, Data Inicial).',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let auditId = id
      const auditData = {
        client_id: clientId,
        title,
        type,
        frequency,
        start_date: startDate,
        advance_notice_days: advanceNoticeDays,
        status,
      }

      if (id) {
        await supabase.from('audits').update(auditData).eq('id', id)
      } else {
        const { data, error } = await supabase.from('audits').insert([auditData]).select().single()
        if (error) throw error
        auditId = data.id
      }

      if (auditId) {
        await supabase.from('audit_actions').delete().eq('audit_id', auditId)
        if (actions.length > 0) {
          await supabase.from('audit_actions').insert(
            actions.map((a, idx) => ({
              audit_id: auditId,
              title: a.title,
              evidence_required: a.evidence_required || false,
              weight: a.weight || 1,
              comments_required: a.comments_required || false,
              order_index: idx,
            })),
          )
        }

        await supabase.from('audit_assignments').delete().eq('audit_id', auditId)
        if (assignments.length > 0) {
          await supabase.from('audit_assignments').insert(
            assignments.map((a) => ({
              audit_id: auditId,
              plant_id: a.plant_id,
              assignee_id: a.assignee_id,
            })),
          )
        }
      }

      toast({ title: 'Sucesso', description: `Auditoria salva como ${status}.` })
      navigate('/auditoria-checklist/criadas')
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  if (fetching) return <div className="p-8">Carregando...</div>

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/criadas')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold">
            {id ? 'Editar Modelo de Auditoria' : 'Novo Modelo de Auditoria'}
          </h1>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => handleSave('Rascunho')} disabled={loading}>
            Salvar como Rascunho
          </Button>
          <Button onClick={() => handleSave('Ativo')} disabled={loading}>
            <Save className="w-4 h-4 mr-2" /> {id ? 'Atualizar' : 'Publicar'}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Auditoria 5S"
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
                <SelectItem value="Segurança">Segurança</SelectItem>
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
                <SelectItem value="Anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Dias de Antecedência (Aviso)</Label>
            <Input
              type="number"
              value={advanceNoticeDays}
              onChange={(e) => setAdvanceNoticeDays(parseInt(e.target.value) || 0)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Perguntas / Ações</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setActions([...actions, { title: '', weight: 1 }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Pergunta
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((act, i) => (
            <div key={i} className="flex items-start gap-4 p-4 border rounded-md">
              <div className="flex-1 space-y-4">
                <Input
                  value={act.title}
                  onChange={(e) => {
                    const n = [...actions]
                    n[i].title = e.target.value
                    setActions(n)
                  }}
                  placeholder="Descrição da pergunta"
                />
                <div className="flex gap-4 items-center">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Peso:</Label>
                    <Input
                      type="number"
                      className="w-20 h-8"
                      value={act.weight}
                      onChange={(e) => {
                        const n = [...actions]
                        n[i].weight = parseInt(e.target.value) || 1
                        setActions(n)
                      }}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`ev-${i}`}
                      checked={act.evidence_required}
                      onCheckedChange={(c) => {
                        const n = [...actions]
                        n[i].evidence_required = !!c
                        setActions(n)
                      }}
                    />
                    <Label htmlFor={`ev-${i}`}>Exige Evidência?</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id={`com-${i}`}
                      checked={act.comments_required}
                      onCheckedChange={(c) => {
                        const n = [...actions]
                        n[i].comments_required = !!c
                        setActions(n)
                      }}
                    />
                    <Label htmlFor={`com-${i}`}>Exige Comentário?</Label>
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => setActions(actions.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {actions.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma pergunta adicionada.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Atribuições</CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setAssignments([...assignments, { plant_id: '', assignee_id: '' }])}
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Atribuição
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {assignments.map((ass, i) => (
            <div key={i} className="flex gap-4 items-center">
              <Select
                value={ass.plant_id}
                onValueChange={(v) => {
                  const n = [...assignments]
                  n[i].plant_id = v
                  setAssignments(n)
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={ass.assignee_id}
                onValueChange={(v) => {
                  const n = [...assignments]
                  n[i].assignee_id = v
                  setAssignments(n)
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Responsável" />
                </SelectTrigger>
                <SelectContent>
                  {profiles.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                variant="ghost"
                size="icon"
                className="text-destructive"
                onClick={() => setAssignments(assignments.filter((_, idx) => idx !== i))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {assignments.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhuma atribuição configurada.</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
