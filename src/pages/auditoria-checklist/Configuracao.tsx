import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { getAuditConfig, saveAuditConfig } from '@/services/audit'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Save, Send } from 'lucide-react'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [clientId, setClientId] = useState('')
  const [plants, setPlants] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Geral')
  const [frequency, setFrequency] = useState('Mensal')
  const [startDate, setStartDate] = useState('')
  const [advanceNotice, setAdvanceNotice] = useState<number | ''>(15)

  const [scoring, setScoring] = useState([
    { score: 1, description: 'Muito Ruim', trigger_task: true },
    { score: 2, description: 'Ruim', trigger_task: true },
    { score: 3, description: 'Regular', trigger_task: false },
    { score: 4, description: 'Bom', trigger_task: false },
    { score: 5, description: 'Excelente', trigger_task: false },
  ])

  const [actions, setActions] = useState<any[]>([])
  const [assignments, setAssignments] = useState<any[]>([])
  const [selPlant, setSelPlant] = useState('')
  const [selUser, setSelUser] = useState('')

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single()
      if (!profile?.client_id) return

      setClientId(profile.client_id)
      const [resP, resU] = await Promise.all([
        supabase.from('plants').select('id, name').eq('client_id', profile.client_id),
        supabase.from('profiles').select('id, name').eq('client_id', profile.client_id),
      ])
      if (resP.data) setPlants(resP.data)
      if (resU.data) setUsers(resU.data)

      if (id) {
        try {
          const {
            audit,
            actions: fetchedActions,
            assignments: fetchedAssignments,
          } = await getAuditConfig(id)
          setTitle(audit.title || '')
          setType(audit.type || 'Geral')
          setFrequency(audit.frequency || 'Mensal')
          setStartDate(audit.start_date || '')
          setAdvanceNotice(audit.advance_notice_days ?? 0)
          if (audit.scoring_settings && Array.isArray(audit.scoring_settings)) {
            setScoring(audit.scoring_settings as any[])
          }
          if (fetchedActions) setActions(fetchedActions)
          if (fetchedAssignments) setAssignments(fetchedAssignments)
        } catch (e) {
          toast.error('Erro ao carregar os dados da auditoria')
        }
      }
    }
    init()
  }, [id])

  const handleSave = async (isDraft: boolean) => {
    if (!clientId) {
      toast.error('Sessão inválida. Cliente não identificado.')
      return
    }
    if (!title.trim() || !type || !frequency || !startDate) {
      toast.error('Preencha os campos obrigatórios (Título, Tipo, Frequência, Data de Início).')
      return
    }

    setLoading(true)
    try {
      await saveAuditConfig({
        auditId: id,
        clientId,
        auditData: {
          title: title.trim(),
          type,
          frequency,
          start_date: startDate,
          advance_notice_days: Number(advanceNotice) || 0,
          status: isDraft ? 'Rascunho' : 'Ativo',
          scoring_settings: scoring,
        },
        actions: actions.map((a, i) => ({ ...a, order_index: i })),
        assignments,
      })
      toast.success(isDraft ? 'Auditoria salva como rascunho!' : 'Auditoria publicada com sucesso!')
      navigate(-1)
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar a auditoria. Verifique suas permissões.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">
            {id ? 'Editar Auditoria' : 'Nova Auditoria'}
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={() => handleSave(true)} disabled={loading}>
            <Save className="w-4 h-4 mr-2" /> Salvar como Rascunho
          </Button>
          <Button onClick={() => handleSave(false)} disabled={loading}>
            <Send className="w-4 h-4 mr-2" /> Publicar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <Label>Título da Auditoria</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Auditoria Interna de Facilities"
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
                <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                <SelectItem value="Mensal">Mensal</SelectItem>
                <SelectItem value="Semestral">Semestral</SelectItem>
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
              value={advanceNotice}
              onChange={(e) => setAdvanceNotice(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Configuração de Notas</CardTitle>
            <CardDescription>Defina as notas possíveis e se geram tarefa corretiva</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setScoring([
                ...scoring,
                { score: scoring.length + 1, description: '', trigger_task: false },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Nota
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {scoring.map((s, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg">
              <div className="w-24">
                <Label>Nota</Label>
                <Input
                  type="number"
                  value={s.score}
                  onChange={(e) => {
                    const ns = [...scoring]
                    ns[idx].score = Number(e.target.value)
                    setScoring(ns)
                  }}
                />
              </div>
              <div className="flex-1 min-w-[200px]">
                <Label>Descrição</Label>
                <Input
                  value={s.description}
                  onChange={(e) => {
                    const ns = [...scoring]
                    ns[idx].description = e.target.value
                    setScoring(ns)
                  }}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id={`ts-${idx}`}
                  checked={s.trigger_task}
                  onCheckedChange={(c) => {
                    const ns = [...scoring]
                    ns[idx].trigger_task = !!c
                    setScoring(ns)
                  }}
                />
                <Label htmlFor={`ts-${idx}`} className="cursor-pointer text-sm">
                  Gera Tarefa Corretiva
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6 text-red-500 hover:text-red-700"
                onClick={() => setScoring(scoring.filter((_, i) => i !== idx))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Checklist e Ações</CardTitle>
            <CardDescription>Itens que serão avaliados na auditoria</CardDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setActions([
                ...actions,
                { title: '', weight: 1, evidence_required: false, comments_required: false },
              ])
            }
          >
            <Plus className="w-4 h-4 mr-2" /> Adicionar Ação
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((a, idx) => (
            <div key={idx} className="flex flex-wrap items-center gap-4 bg-muted/30 p-4 rounded-lg">
              <div className="flex-1 min-w-[250px]">
                <Label>Título da Ação</Label>
                <Input
                  value={a.title}
                  onChange={(e) => {
                    const na = [...actions]
                    na[idx].title = e.target.value
                    setActions(na)
                  }}
                />
              </div>
              <div className="w-24">
                <Label>Peso</Label>
                <Input
                  type="number"
                  value={a.weight}
                  onChange={(e) => {
                    const na = [...actions]
                    na[idx].weight = Number(e.target.value)
                    setActions(na)
                  }}
                />
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id={`ev-${idx}`}
                  checked={a.evidence_required}
                  onCheckedChange={(c) => {
                    const na = [...actions]
                    na[idx].evidence_required = !!c
                    setActions(na)
                  }}
                />
                <Label htmlFor={`ev-${idx}`} className="text-sm">
                  Exige Foto
                </Label>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Checkbox
                  id={`com-${idx}`}
                  checked={a.comments_required}
                  onCheckedChange={(c) => {
                    const na = [...actions]
                    na[idx].comments_required = !!c
                    setActions(na)
                  }}
                />
                <Label htmlFor={`com-${idx}`} className="text-sm">
                  Exige Obs.
                </Label>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="mt-6 text-red-500 hover:text-red-700"
                onClick={() => setActions(actions.filter((_, i) => i !== idx))}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {actions.length === 0 && (
            <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
              Nenhuma ação cadastrada.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição e Responsáveis</CardTitle>
          <CardDescription>
            Defina onde a auditoria será aplicada e quem será o responsável
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end mb-6 bg-muted/30 p-4 rounded-lg">
            <div className="flex-1 min-w-[200px]">
              <Label>Planta</Label>
              <Select value={selPlant} onValueChange={setSelPlant}>
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
            <div className="flex-1 min-w-[200px]">
              <Label>Responsável</Label>
              <Select value={selUser} onValueChange={setSelUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o responsável" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={() => {
                if (selPlant && selUser) {
                  if (assignments.some((a) => a.plant_id === selPlant && a.assignee_id === selUser))
                    return toast.error('Esta atribuição já existe.')
                  setAssignments([...assignments, { plant_id: selPlant, assignee_id: selUser }])
                  setSelPlant('')
                  setSelUser('')
                }
              }}
              disabled={!selPlant || !selUser}
            >
              Adicionar
            </Button>
          </div>
          <div className="space-y-2">
            {assignments.map((ass, idx) => (
              <div
                key={idx}
                className="flex justify-between p-3 border rounded-lg bg-card items-center"
              >
                <div>
                  <p className="font-medium">
                    {plants.find((p) => p.id === ass.plant_id)?.name || 'Planta Desconhecida'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Responsável:{' '}
                    {users.find((u) => u.id === ass.assignee_id)?.name || 'Usuário Desconhecido'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-red-500"
                  onClick={() => setAssignments(assignments.filter((_, i) => i !== idx))}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            ))}
            {assignments.length === 0 && (
              <div className="text-center py-4 text-muted-foreground text-sm">
                Nenhuma atribuição definida.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
