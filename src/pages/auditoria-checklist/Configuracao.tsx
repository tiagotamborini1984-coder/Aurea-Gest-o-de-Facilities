import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Loader2, Save, ClipboardCheck, ArrowLeft } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { Navigate, useNavigate, useParams, Link } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { format } from 'date-fns'

type Assignment = { plant_id: string; assignee_id: string }
type Action = { title: string; evidence_required: boolean }

export default function AuditoriaConfig() {
  const { id } = useParams()
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const hasAccess = useHasAccess('Auditoria e Checklist')
  const { toast } = useToast()
  const navigate = useNavigate()

  const [title, setTitle] = useState('')
  const [type, setType] = useState('Qualidade')
  const [frequency, setFrequency] = useState('Única')
  const [startDate, setStartDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [advanceNotice, setAdvanceNotice] = useState('0')

  const [assignments, setAssignments] = useState<Assignment[]>([{ plant_id: '', assignee_id: '' }])
  const [actions, setActions] = useState<Action[]>([{ title: '', evidence_required: false }])

  const [users, setUsers] = useState<any[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingAudit, setIsLoadingAudit] = useState(false)

  useEffect(() => {
    if (profile?.client_id) {
      supabase
        .from('profiles')
        .select('id, name')
        .eq('client_id', profile.client_id)
        .then((res) => {
          if (res.data) setUsers(res.data)
        })
    }
  }, [profile])

  useEffect(() => {
    if (id && profile) {
      setIsLoadingAudit(true)
      const loadAudit = async () => {
        const { data: audit } = await supabase.from('audits').select('*').eq('id', id).single()
        if (audit) {
          setTitle(audit.title)
          setType(audit.type)
          setFrequency(audit.frequency)
          setStartDate(audit.start_date)
          setAdvanceNotice((audit as any).advance_notice_days?.toString() || '0')

          const { data: acts } = await supabase
            .from('audit_actions')
            .select('*')
            .eq('audit_id', id)
            .order('order_index')
          if (acts && acts.length > 0) setActions(acts)

          const { data: assigns } = await supabase
            .from('audit_assignments' as any)
            .select('*')
            .eq('audit_id', id)
          if (assigns && assigns.length > 0) {
            setAssignments(
              assigns.map((a: any) => ({ plant_id: a.plant_id, assignee_id: a.assignee_id })),
            )
          }
        }
        setIsLoadingAudit(false)
      }
      loadAudit()
    }
  }, [id, profile])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const addAssignment = () => setAssignments([...assignments, { plant_id: '', assignee_id: '' }])
  const removeAssignment = (index: number) =>
    setAssignments(assignments.filter((_, i) => i !== index))

  const addAction = () => setActions([...actions, { title: '', evidence_required: false }])
  const removeAction = (index: number) => setActions(actions.filter((_, i) => i !== index))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !title ||
      assignments.some((a) => !a.plant_id || !a.assignee_id) ||
      actions.some((a) => !a.title)
    ) {
      toast({ title: 'Preencha todos os campos obrigatórios', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)

    try {
      let auditId = id

      if (auditId) {
        // Update Audit
        await supabase
          .from('audits')
          .update({
            title,
            type,
            frequency,
            start_date: startDate,
            advance_notice_days: parseInt(advanceNotice) || 0,
          } as any)
          .eq('id', auditId)
      } else {
        // Create Audit Template
        const { data: newAudit, error: auditErr } = await supabase
          .from('audits')
          .insert({
            client_id: profile.client_id,
            title,
            type,
            frequency,
            start_date: startDate,
            advance_notice_days: parseInt(advanceNotice) || 0,
          } as any)
          .select()
          .single()

        if (auditErr) throw auditErr
        auditId = newAudit.id
      }

      // Recreate Actions
      await supabase.from('audit_actions').delete().eq('audit_id', auditId!)
      const actionsToInsert = actions.map((a, idx) => ({
        audit_id: auditId!,
        title: a.title,
        evidence_required: a.evidence_required,
        order_index: idx,
      }))
      await supabase.from('audit_actions').insert(actionsToInsert)

      // Recreate Assignments
      await supabase
        .from('audit_assignments' as any)
        .delete()
        .eq('audit_id', auditId!)
      const assignmentsToInsert = assignments.map((a) => ({
        audit_id: auditId!,
        plant_id: a.plant_id,
        assignee_id: a.assignee_id,
      }))
      await supabase.from('audit_assignments' as any).insert(assignmentsToInsert)

      // Generate initial tasks if date is within advance notice (for both new and updated)
      const today = new Date()
      today.setHours(0, 0, 0, 0)
      const parts = startDate.split('-')
      if (parts.length === 3) {
        const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
        const advance = parseInt(advanceNotice) || 0
        const triggerDate = new Date(start)
        triggerDate.setDate(triggerDate.getDate() - advance)

        if (today >= triggerDate) {
          let { data: typeRes } = await supabase
            .from('task_types')
            .select('id')
            .eq('client_id', profile.client_id)
            .ilike('name', '%Auditoria%')
            .limit(1)
          let typeId = typeRes?.[0]?.id

          if (!typeId) {
            const { data: newType } = await supabase
              .from('task_types')
              .insert({ client_id: profile.client_id, name: 'Auditoria', sla_hours: 24 } as any)
              .select('id')
              .single()
            typeId = newType?.id
          }

          let { data: statusRes } = await supabase
            .from('task_statuses')
            .select('id')
            .eq('client_id', profile.client_id)
            .eq('is_terminal', false)
            .order('created_at', { ascending: true })
            .limit(1)
          let statusId = statusRes?.[0]?.id

          if (!statusId) {
            const { data: newStatus } = await supabase
              .from('task_statuses')
              .insert({
                client_id: profile.client_id,
                name: 'Pendente',
                color: '#eab308',
                is_terminal: false,
              } as any)
              .select('id')
              .single()
            statusId = newStatus?.id
          }

          if (typeId && statusId) {
            for (const assign of assignments) {
              const { data: existingExec } = await supabase
                .from('audit_executions')
                .select('id')
                .eq('audit_id', auditId!)
                .eq('assignee_id', assign.assignee_id)
                .eq('plant_id', assign.plant_id)
                .eq('status', 'Pendente')

              if (!existingExec || existingExec.length === 0) {
                const year = new Date().getFullYear()
                const { data: latest } = await supabase
                  .from('tasks')
                  .select('task_number')
                  .eq('client_id', profile.client_id)
                  .like('task_number', `TSK-${year}-%`)
                  .order('created_at', { ascending: false })
                  .limit(1)

                let seq = 1
                if (latest && latest.length > 0) {
                  const p = latest[0].task_number.split('-')
                  if (p.length === 3) seq = parseInt(p[2], 10) + 1
                }
                const taskNumber = `TSK-${year}-${seq.toString().padStart(4, '0')}`

                const { data: newTask } = await supabase
                  .from('tasks')
                  .insert({
                    client_id: profile.client_id,
                    plant_id: assign.plant_id,
                    type_id: typeId,
                    status_id: statusId,
                    requester_id: profile.id,
                    assignee_id: assign.assignee_id,
                    task_number: taskNumber,
                    title: `Auditoria: ${title}`,
                    description: `Por favor, realize a auditoria "${title}" agendada para ${startDate.split('-').reverse().join('/')}. Acesse os detalhes da tarefa para preencher o checklist.`,
                    due_date: new Date(`${startDate}T23:59:59.999Z`).toISOString(),
                    status_updated_at: new Date().toISOString(),
                  } as any)
                  .select()
                  .single()

                if (newTask) {
                  await supabase.from('audit_executions').insert({
                    audit_id: auditId!,
                    task_id: newTask.id,
                    assignee_id: assign.assignee_id,
                    plant_id: assign.plant_id,
                    status: 'Pendente',
                  })
                }
              }
            }
          }
        }
      }

      toast({
        title: id ? 'Auditoria atualizada!' : 'Auditoria criada com sucesso!',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      navigate('/auditoria-checklist/criadas')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar auditoria', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingAudit) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-brand-deepBlue" />
      </div>
    )
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild className="h-10 w-10 shrink-0">
            <Link to="/auditoria-checklist/criadas">
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </Link>
          </Button>
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm shrink-0">
            <ClipboardCheck className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              {id ? 'Editar Auditoria' : 'Nova Auditoria'}
            </h2>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Crie templates, defina ações, regras e frequência.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label className="text-slate-700 font-bold">Nome da Auditoria *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Auditoria 5S - Limpeza Geral"
                  className="text-lg bg-slate-50"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Tipo de Auditoria</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Qualidade">Qualidade</SelectItem>
                    <SelectItem value="Segurança">Segurança</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                    <SelectItem value="Geral">Geral</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="bg-white">
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
                <Label className="text-slate-700">Data de Início *</Label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                  className="bg-white"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">
                  Antecedência (dias antes para abrir tarefa)
                </Label>
                <Input
                  type="number"
                  min="0"
                  value={advanceNotice}
                  onChange={(e) => setAdvanceNotice(e.target.value)}
                  className="bg-white"
                  placeholder="Ex: 5"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="text-lg font-bold text-slate-800">
                Distribuição (Plantas e Responsáveis)
              </h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAssignment}
                className="text-brand-deepBlue border-brand-deepBlue/20 hover:bg-brand-deepBlue/5"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Local
              </Button>
            </div>

            {assignments.map((assign, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row gap-4 items-end bg-slate-50 p-4 rounded-xl border border-slate-200"
              >
                <div className="w-full space-y-2">
                  <Label className="text-slate-700">Planta</Label>
                  <Select
                    value={assign.plant_id}
                    onValueChange={(v) => {
                      const newArr = [...assignments]
                      newArr[idx].plant_id = v
                      setAssignments(newArr)
                    }}
                    required
                  >
                    <SelectTrigger className="bg-white">
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
                <div className="w-full space-y-2">
                  <Label className="text-slate-700">Responsável</Label>
                  <Select
                    value={assign.assignee_id}
                    onValueChange={(v) => {
                      const newArr = [...assignments]
                      newArr[idx].assignee_id = v
                      setAssignments(newArr)
                    }}
                    required
                  >
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Selecione..." />
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
                {assignments.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => removeAssignment(idx)}
                  >
                    <Trash2 className="w-5 h-5" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="shadow-sm border-gray-200">
          <CardContent className="p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-lg font-bold text-slate-800">Checklist (Ações)</h3>
                <p className="text-xs text-slate-500">
                  Cada ação será avaliada de 1 a 5 no momento da auditoria.
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addAction}
                className="text-brand-deepBlue border-brand-deepBlue/20 hover:bg-brand-deepBlue/5"
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Ação
              </Button>
            </div>

            {actions.map((action, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row gap-4 items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-center bg-slate-100 w-8 h-8 rounded-full font-bold text-slate-500 shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 w-full">
                  <Input
                    value={action.title}
                    onChange={(e) => {
                      const newArr = [...actions]
                      newArr[idx].title = e.target.value
                      setActions(newArr)
                    }}
                    placeholder="Descreva a ação a ser avaliada..."
                    required
                    className="border-slate-200"
                  />
                </div>
                <div className="flex items-center gap-2 shrink-0 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                  <Switch
                    checked={action.evidence_required}
                    onCheckedChange={(v) => {
                      const newArr = [...actions]
                      newArr[idx].evidence_required = v
                      setActions(newArr)
                    }}
                  />
                  <Label className="text-xs font-semibold cursor-pointer">
                    Evidência Obrigatória
                  </Label>
                </div>
                {actions.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    className="h-10 w-10 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    onClick={() => removeAction(idx)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4 pb-12">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate(-1)}
            className="border-gray-300"
          >
            Cancelar
          </Button>
          <Button type="submit" variant="tech" disabled={isSubmitting} className="px-8 shadow-md">
            {isSubmitting ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <Save className="w-5 h-5 mr-2" />
            )}
            {id ? 'Salvar Alterações' : 'Criar Auditoria e Agendar'}
          </Button>
        </div>
      </form>
    </div>
  )
}
