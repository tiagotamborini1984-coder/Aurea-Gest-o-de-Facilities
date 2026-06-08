import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'
import { Plus, Trash2, Save, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { getAuditConfig, saveAuditConfig } from '@/services/audit'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const auditSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  frequency: z.string().min(1, 'Frequência é obrigatória'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  advance_notice_days: z.coerce.number().min(0).default(0),
  status: z.string().default('Ativo'),
  scoring_settings: z
    .array(
      z.object({
        score: z.coerce.number().min(1),
        description: z.string().min(1, 'Descrição é obrigatória'),
        trigger_task: z.boolean().default(false),
      }),
    )
    .min(1, 'Pelo menos um nível de pontuação é obrigatório'),
  actions: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1, 'Título da ação é obrigatório'),
        weight: z.coerce.number().min(1).default(1),
        evidence_required: z.boolean().default(false),
        comments_required: z.boolean().default(false),
        order_index: z.number().default(0),
      }),
    )
    .min(1, 'Pelo menos um item de checklist é obrigatório'),
  assignments: z
    .array(
      z.object({
        plant_id: z.string().min(1, 'Planta é obrigatória'),
        assignee_id: z.string().min(1, 'Responsável é obrigatório'),
      }),
    )
    .min(1, 'Pelo menos uma atribuição é obrigatória'),
})

type AuditFormValues = z.infer<typeof auditSchema>

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { profile, selectedMasterClient } = useAppStore()
  const { plants } = useMasterData()
  const [profiles, setProfiles] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const clientId = profile?.role === 'Master' ? selectedMasterClient : profile?.client_id

  const form = useForm<AuditFormValues>({
    resolver: zodResolver(auditSchema),
    defaultValues: {
      title: '',
      type: 'Geral',
      frequency: 'Mensal',
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
      actions: [
        {
          title: '',
          weight: 1,
          evidence_required: false,
          comments_required: false,
          order_index: 0,
        },
      ],
      assignments: [{ plant_id: '', assignee_id: '' }],
    },
  })

  const {
    fields: scoreFields,
    append: appendScore,
    remove: removeScore,
  } = useFieldArray({
    control: form.control,
    name: 'scoring_settings',
  })

  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({
    control: form.control,
    name: 'actions',
  })

  const {
    fields: assignmentFields,
    append: appendAssignment,
    remove: removeAssignment,
  } = useFieldArray({
    control: form.control,
    name: 'assignments',
  })

  useEffect(() => {
    async function loadData() {
      if (!clientId || clientId === 'all') return

      try {
        setLoading(true)
        // Load profiles
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('id, name, role, email')
          .eq('client_id', clientId)
          .order('name')

        if (profilesData) {
          setProfiles(profilesData)
        }

        // Load audit if editing
        if (id && id !== 'nova') {
          const { audit, actions, assignments } = await getAuditConfig(id)

          form.reset({
            title: audit.title || '',
            type: audit.type || 'Geral',
            frequency: audit.frequency || 'Mensal',
            start_date: audit.start_date || new Date().toISOString().split('T')[0],
            advance_notice_days: audit.advance_notice_days || 0,
            status: audit.status || 'Ativo',
            scoring_settings: audit.scoring_settings || [],
            actions:
              actions?.map((a: any) => ({
                id: a.id,
                title: a.title,
                weight: a.weight,
                evidence_required: a.evidence_required,
                comments_required: a.comments_required,
                order_index: a.order_index,
              })) || [],
            assignments:
              assignments?.map((a: any) => ({
                plant_id: a.plant_id,
                assignee_id: a.assignee_id,
              })) || [],
          })
        }
      } catch (error: any) {
        console.error(error)
        toast.error('Erro ao carregar os dados da auditoria')
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [id, clientId, form])

  const onSubmit = async (values: AuditFormValues) => {
    if (!clientId || clientId === 'all') {
      toast.error('Selecione um cliente válido')
      return
    }

    try {
      setSaving(true)

      const auditData = {
        title: values.title,
        type: values.type,
        frequency: values.frequency,
        start_date: values.start_date,
        advance_notice_days: values.advance_notice_days,
        status: values.status,
        scoring_settings: values.scoring_settings,
      }

      await saveAuditConfig({
        auditId: id && id !== 'nova' ? id : undefined,
        clientId,
        auditData,
        actions: values.actions.map((a, i) => ({ ...a, order_index: i })),
        assignments: values.assignments,
      })

      toast.success('Auditoria salva com sucesso!')
      navigate('/auditoria-checklist/criadas')
    } catch (error: any) {
      console.error(error)
      toast.error('Erro ao salvar auditoria')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-8 text-center text-muted-foreground animate-pulse">
        Carregando dados da auditoria...
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/criadas')}
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {id && id !== 'nova' ? 'Editar Auditoria' : 'Nova Auditoria'}
          </h1>
        </div>
        <Button onClick={form.handleSubmit(onSubmit)} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? 'Salvando...' : 'Salvar'}
        </Button>
      </div>

      <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
        <Tabs defaultValue="geral" className="w-full">
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-4 h-auto md:h-10 gap-2 mb-6">
            <TabsTrigger value="geral">Configurações Gerais</TabsTrigger>
            <TabsTrigger value="pontuacao">Escala de Pontuação</TabsTrigger>
            <TabsTrigger value="checklist">Itens do Checklist</TabsTrigger>
            <TabsTrigger value="atribuicoes">Plantas e Responsáveis</TabsTrigger>
          </TabsList>

          <TabsContent value="geral" className="focus-visible:outline-none">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  Dados Principais
                </h3>
                <p className="text-sm text-muted-foreground">
                  Informações básicas sobre a auditoria.
                </p>
              </div>
              <div className="p-6 pt-0 grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Título</Label>
                  <Input {...form.register('title')} placeholder="Ex: Inspeção de Qualidade 5S" />
                  {form.formState.errors.title && (
                    <p className="text-sm text-destructive">
                      {form.formState.errors.title.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Tipo</Label>
                  <Controller
                    name="type"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Geral">Geral</SelectItem>
                          <SelectItem value="Qualidade">Qualidade</SelectItem>
                          <SelectItem value="Segurança">Segurança</SelectItem>
                          <SelectItem value="Limpeza">Limpeza</SelectItem>
                          <SelectItem value="Manutenção">Manutenção</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Frequência</Label>
                  <Controller
                    name="frequency"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
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
                    )}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data de Início</Label>
                  <Input type="date" {...form.register('start_date')} />
                </div>

                <div className="space-y-2">
                  <Label>Dias de Aviso Prévio</Label>
                  <Input type="number" min="0" {...form.register('advance_notice_days')} />
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Controller
                    name="status"
                    control={form.control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value || undefined}>
                        <SelectTrigger>
                          <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Ativo">Ativo</SelectItem>
                          <SelectItem value="Inativo">Inativo</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="pontuacao" className="focus-visible:outline-none">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  Escala de Pontuação Global
                </h3>
                <p className="text-sm text-muted-foreground">
                  Defina a escala numérica (ex: 1 a 5) e quais notas devem gerar uma tarefa
                  corretiva automática.
                </p>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                  <div className="col-span-3 md:col-span-2">Nota</div>
                  <div className="col-span-5 md:col-span-7">Descrição</div>
                  <div className="col-span-3 md:col-span-2 text-center text-xs md:text-sm">
                    Gera Tarefa?
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {scoreFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-3 md:col-span-2">
                      <Input type="number" {...form.register(`scoring_settings.${index}.score`)} />
                    </div>
                    <div className="col-span-5 md:col-span-7">
                      <Input
                        {...form.register(`scoring_settings.${index}.description`)}
                        placeholder="Ex: Bom, Ruim..."
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2 flex justify-center">
                      <Controller
                        name={`scoring_settings.${index}.trigger_task`}
                        control={form.control}
                        render={({ field: f }) => (
                          <Switch checked={f.value} onCheckedChange={f.onChange} />
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeScore(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border-dashed"
                  onClick={() =>
                    appendScore({
                      score: scoreFields.length + 1,
                      description: '',
                      trigger_task: false,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Nota
                </Button>
                {form.formState.errors.scoring_settings && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.scoring_settings.message}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="checklist" className="focus-visible:outline-none">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  Itens do Checklist
                </h3>
                <p className="text-sm text-muted-foreground">
                  Configure as perguntas/ações, seus pesos na nota final e requisitos de evidências.
                </p>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="grid grid-cols-12 gap-2 md:gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                  <div className="col-span-5 md:col-span-6">Título / Pergunta</div>
                  <div className="col-span-3 md:col-span-2">Peso</div>
                  <div
                    className="col-span-1 text-center text-xs md:text-sm"
                    title="Exigir Foto/Evidência"
                  >
                    Foto?
                  </div>
                  <div
                    className="col-span-2 text-center text-xs md:text-sm"
                    title="Exigir Observação"
                  >
                    Obs?
                  </div>
                  <div className="col-span-1"></div>
                </div>

                {actionFields.map((field, index) => (
                  <div
                    key={field.id}
                    className="grid grid-cols-12 gap-2 md:gap-4 items-center bg-muted/20 p-3 rounded-lg border border-border/50"
                  >
                    <div className="col-span-5 md:col-span-6">
                      <Input
                        {...form.register(`actions.${index}.title`)}
                        placeholder="Descreva o que deve ser verificado..."
                      />
                    </div>
                    <div className="col-span-3 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        step="0.1"
                        {...form.register(`actions.${index}.weight`)}
                      />
                    </div>
                    <div className="col-span-1 flex justify-center">
                      <Controller
                        name={`actions.${index}.evidence_required`}
                        control={form.control}
                        render={({ field: f }) => (
                          <Switch checked={f.value} onCheckedChange={f.onChange} />
                        )}
                      />
                    </div>
                    <div className="col-span-2 flex justify-center">
                      <Controller
                        name={`actions.${index}.comments_required`}
                        control={form.control}
                        render={({ field: f }) => (
                          <Switch checked={f.value} onCheckedChange={f.onChange} />
                        )}
                      />
                    </div>
                    <div className="col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAction(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border-dashed"
                  onClick={() =>
                    appendAction({
                      title: '',
                      weight: 1,
                      evidence_required: false,
                      comments_required: false,
                      order_index: actionFields.length,
                    })
                  }
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item ao Checklist
                </Button>
                {form.formState.errors.actions && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.actions.message}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="atribuicoes" className="focus-visible:outline-none">
            <div className="rounded-xl border bg-card text-card-foreground shadow-sm">
              <div className="flex flex-col space-y-1.5 p-6">
                <h3 className="text-lg font-semibold leading-none tracking-tight">
                  Distribuição da Auditoria
                </h3>
                <p className="text-sm text-muted-foreground">
                  Selecione as plantas onde a auditoria será aplicada e quem são os responsáveis
                  pela execução.
                </p>
              </div>
              <div className="p-6 pt-0 space-y-4">
                <div className="grid grid-cols-12 gap-4 font-medium text-sm text-muted-foreground pb-2 border-b">
                  <div className="col-span-12 md:col-span-5">Planta</div>
                  <div className="col-span-10 md:col-span-6">Responsável (Executor)</div>
                  <div className="col-span-2 md:col-span-1"></div>
                </div>

                {assignmentFields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 md:gap-4 items-center">
                    <div className="col-span-12 md:col-span-5 mb-2 md:mb-0">
                      <Controller
                        name={`assignments.${index}.plant_id`}
                        control={form.control}
                        render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value || undefined}>
                            <SelectTrigger
                              className={
                                form.formState.errors.assignments?.[index]?.plant_id
                                  ? 'border-destructive'
                                  : ''
                              }
                            >
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
                        )}
                      />
                    </div>
                    <div className="col-span-10 md:col-span-6">
                      <Controller
                        name={`assignments.${index}.assignee_id`}
                        control={form.control}
                        render={({ field: f }) => (
                          <Select onValueChange={f.onChange} value={f.value || undefined}>
                            <SelectTrigger
                              className={
                                form.formState.errors.assignments?.[index]?.assignee_id
                                  ? 'border-destructive'
                                  : ''
                              }
                            >
                              <SelectValue placeholder="Selecione o responsável" />
                            </SelectTrigger>
                            <SelectContent>
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {p.name} {p.email ? `(${p.email})` : ''}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                    </div>
                    <div className="col-span-2 md:col-span-1 flex justify-end">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeAssignment(index)}
                        className="text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}

                <Button
                  type="button"
                  variant="outline"
                  className="w-full mt-4 border-dashed"
                  onClick={() => appendAssignment({ plant_id: '', assignee_id: '' })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Atribuição
                </Button>
                {form.formState.errors.assignments && (
                  <p className="text-sm text-destructive mt-2">
                    {form.formState.errors.assignments.message}
                  </p>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </form>
    </div>
  )
}
