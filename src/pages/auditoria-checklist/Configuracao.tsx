import React, { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, useFieldArray, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'
import {
  Plus,
  Trash2,
  Save,
  Send,
  ArrowLeft,
  Settings2,
  Users,
  FileText,
  CheckSquare,
  Building2,
  User,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const schema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  type: z.string().min(1, 'Tipo é obrigatório'),
  frequency: z.string().min(1, 'Frequência é obrigatória'),
  start_date: z.string().min(1, 'Data de início é obrigatória'),
  advance_notice_days: z.coerce.number().min(0).optional().default(0),
  scoring_settings: z
    .array(
      z.object({
        score: z.coerce.number(),
        description: z.string().min(1, 'Descrição é obrigatória'),
        trigger_task: z.boolean(),
      }),
    )
    .min(1, 'Adicione pelo menos uma nota na escala'),
  assignments: z
    .array(
      z.object({
        plant_id: z.string().min(1, 'Planta é obrigatória'),
        assignee_id: z.string().min(1, 'Responsável é obrigatório'),
      }),
    )
    .min(1, 'Adicione pelo menos uma distribuição'),
  actions: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(1, 'Título da ação é obrigatório'),
        evidence_required: z.boolean(),
        comments_required: z.boolean(),
        weight: z.coerce.number().min(1),
      }),
    )
    .min(1, 'Adicione pelo menos uma ação no checklist'),
})

type FormValues = z.infer<typeof schema>

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeClient } = useAppStore()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
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
      ],
      assignments: [{ plant_id: '', assignee_id: '' }],
      actions: [{ title: '', evidence_required: false, comments_required: false, weight: 1 }],
    },
  })

  const {
    fields: scoreFields,
    append: appendScore,
    remove: removeScore,
  } = useFieldArray({ control: form.control, name: 'scoring_settings' })
  const {
    fields: assignFields,
    append: appendAssign,
    remove: removeAssign,
  } = useFieldArray({ control: form.control, name: 'assignments' })
  const {
    fields: actionFields,
    append: appendAction,
    remove: removeAction,
  } = useFieldArray({ control: form.control, name: 'actions' })

  useEffect(() => {
    async function load() {
      if (!activeClient) return
      try {
        setLoading(true)
        const [plantsRes, profilesRes] = await Promise.all([
          supabase.from('plants').select('*').eq('client_id', activeClient.id),
          supabase.from('profiles').select('*').eq('client_id', activeClient.id),
        ])

        if (plantsRes.data) setPlants(plantsRes.data)
        if (profilesRes.data) setProfiles(profilesRes.data)

        if (id) {
          const { data: audit, error: auditErr } = await supabase
            .from('audits')
            .select('*')
            .eq('id', id)
            .single()

          if (auditErr) throw auditErr

          const { data: assignments } = await supabase
            .from('audit_assignments')
            .select('*')
            .eq('audit_id', id)

          const { data: actions } = await supabase
            .from('audit_actions')
            .select('*')
            .eq('audit_id', id)
            .order('order_index', { ascending: true })

          form.reset({
            title: audit.title,
            type: audit.type,
            frequency: audit.frequency,
            start_date: audit.start_date,
            advance_notice_days: audit.advance_notice_days || 0,
            scoring_settings: audit.scoring_settings || [],
            assignments: assignments?.length
              ? assignments.map((a) => ({ plant_id: a.plant_id, assignee_id: a.assignee_id }))
              : [{ plant_id: '', assignee_id: '' }],
            actions: actions?.length
              ? actions.map((a) => ({
                  id: a.id,
                  title: a.title,
                  evidence_required: a.evidence_required,
                  comments_required: a.comments_required,
                  weight: a.weight,
                }))
              : [{ title: '', evidence_required: false, comments_required: false, weight: 1 }],
          })
        }
      } catch (e: any) {
        toast.error('Erro ao carregar dados: ' + e.message)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeClient, id, form])

  const onSubmit = async (values: FormValues, status: 'Rascunho' | 'Ativo') => {
    if (!activeClient) return
    try {
      setSaving(true)

      const auditData = {
        client_id: activeClient.id,
        title: values.title,
        type: values.type,
        frequency: values.frequency,
        start_date: values.start_date,
        advance_notice_days: values.advance_notice_days,
        scoring_settings: values.scoring_settings,
        status,
      }

      let auditId = id
      if (id) {
        const { error } = await supabase.from('audits').update(auditData).eq('id', id)
        if (error) throw error
      } else {
        const { data, error } = await supabase.from('audits').insert(auditData).select().single()
        if (error) throw error
        auditId = data.id
      }

      if (!auditId) throw new Error('Falha ao obter ID da auditoria.')

      // Handle actions cleanup
      const actionIds = values.actions.map((a) => a.id).filter(Boolean)
      if (id) {
        if (actionIds.length > 0) {
          await supabase
            .from('audit_actions')
            .delete()
            .eq('audit_id', id)
            .not('id', 'in', `(${actionIds.join(',')})`)
        } else {
          await supabase.from('audit_actions').delete().eq('audit_id', id)
        }
      }

      // Upsert actions
      const actionsToInsert = values.actions.map((a, i) => ({
        ...(a.id ? { id: a.id } : {}),
        audit_id: auditId,
        title: a.title,
        evidence_required: a.evidence_required,
        comments_required: a.comments_required,
        weight: a.weight,
        order_index: i,
      }))

      const { error: actionsErr } = await supabase.from('audit_actions').upsert(actionsToInsert)
      if (actionsErr) throw actionsErr

      // Recreate assignments
      await supabase.from('audit_assignments').delete().eq('audit_id', auditId)

      const uniqueAssigns = values.assignments.filter(
        (v, i, a) =>
          a.findIndex((t) => t.plant_id === v.plant_id && t.assignee_id === v.assignee_id) === i,
      )

      const assignsToInsert = uniqueAssigns.map((a) => ({
        audit_id: auditId,
        plant_id: a.plant_id,
        assignee_id: a.assignee_id,
      }))

      if (assignsToInsert.length > 0) {
        const { error: assignsErr } = await supabase
          .from('audit_assignments')
          .insert(assignsToInsert)
        if (assignsErr) throw assignsErr
      }

      toast.success(
        status === 'Rascunho' ? 'Rascunho salvo com sucesso!' : 'Auditoria publicada com sucesso!',
      )
      navigate('/auditoria-checklist/criadas')
    } catch (e: any) {
      toast.error('Erro ao salvar: ' + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 max-w-5xl animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              {id ? 'Editar Modelo de Auditoria' : 'Novo Modelo de Auditoria'}
            </h1>
            <p className="text-muted-foreground">
              Configure as perguntas, escala de notas e distribuição.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={form.handleSubmit((d) => onSubmit(d, 'Rascunho'))}
            disabled={saving}
          >
            <Save className="h-4 w-4 mr-2" />
            Salvar como Rascunho
          </Button>
          <Button onClick={form.handleSubmit((d) => onSubmit(d, 'Ativo'))} disabled={saving}>
            <Send className="h-4 w-4 mr-2" />
            Publicar Auditoria
          </Button>
        </div>
      </div>

      <div className="space-y-6 pb-24">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Configurações Gerais
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 md:col-span-2">
              <Label>Título da Auditoria</Label>
              <Input placeholder="Ex: Auditoria Mensal de Segurança" {...form.register('title')} />
              {form.formState.errors.title && (
                <span className="text-xs text-red-500">{form.formState.errors.title.message}</span>
              )}
            </div>

            <div className="space-y-2">
              <Label>Tipo</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Geral">Geral</SelectItem>
                      <SelectItem value="Qualidade">Qualidade</SelectItem>
                      <SelectItem value="Segurança">Segurança</SelectItem>
                      <SelectItem value="Meio Ambiente">Meio Ambiente</SelectItem>
                      <SelectItem value="5S">5S</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Frequência</Label>
              <Controller
                control={form.control}
                name="frequency"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
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
                )}
              />
            </div>

            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input type="date" {...form.register('start_date')} />
              {form.formState.errors.start_date && (
                <span className="text-xs text-red-500">
                  {form.formState.errors.start_date.message}
                </span>
              )}
            </div>

            <div className="space-y-2">
              <Label>Aviso Prévio (dias)</Label>
              <Input type="number" min="0" {...form.register('advance_notice_days')} />
              <p className="text-xs text-muted-foreground">
                Quantos dias antes a tarefa deve ser gerada.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Distribuição e Responsáveis
            </CardTitle>
            <CardDescription>
              Defina em quais plantas esta auditoria será aplicada e quem será o responsável por
              preenchê-la.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {assignFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col md:flex-row items-start md:items-end gap-4 p-4 border rounded-lg bg-slate-50/50"
                >
                  <div className="space-y-2 w-full md:flex-1">
                    <Label className="flex items-center gap-2">
                      <Building2 className="h-4 w-4" /> Planta
                    </Label>
                    <Controller
                      control={form.control}
                      name={`assignments.${index}.plant_id`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
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
                      )}
                    />
                    {form.formState.errors.assignments?.[index]?.plant_id && (
                      <span className="text-xs text-red-500">
                        {form.formState.errors.assignments[index].plant_id.message}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 w-full md:flex-1">
                    <Label className="flex items-center gap-2">
                      <User className="h-4 w-4" /> Responsável
                    </Label>
                    <Controller
                      control={form.control}
                      name={`assignments.${index}.assignee_id`}
                      render={({ field: f }) => (
                        <Select value={f.value} onValueChange={f.onChange}>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o responsável" />
                          </SelectTrigger>
                          <SelectContent>
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.name} ({p.role})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    {form.formState.errors.assignments?.[index]?.assignee_id && (
                      <span className="text-xs text-red-500">
                        {form.formState.errors.assignments[index].assignee_id.message}
                      </span>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeAssign(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-1 w-full md:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => appendAssign({ plant_id: '', assignee_id: '' })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Distribuição
              </Button>
              {form.formState.errors.assignments?.root && (
                <p className="text-sm text-red-500 mt-2">
                  {form.formState.errors.assignments.root.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Settings2 className="h-5 w-5 text-primary" />
              Configuração de Notas
            </CardTitle>
            <CardDescription>
              Defina a escala de notas, os rótulos e se uma nota baixa deve abrir uma ação corretiva
              automática.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {scoreFields.map((field, index) => (
                <div
                  key={field.id}
                  className="flex flex-col md:flex-row items-start md:items-end gap-4 p-4 border rounded-lg bg-slate-50/50"
                >
                  <div className="space-y-2 w-full md:w-24">
                    <Label>Nota</Label>
                    <Input type="number" {...form.register(`scoring_settings.${index}.score`)} />
                    {form.formState.errors.scoring_settings?.[index]?.score && (
                      <span className="text-xs text-red-500">
                        {form.formState.errors.scoring_settings[index].score.message}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 w-full md:flex-1">
                    <Label>Descrição (Ex: Ruim, Excelente)</Label>
                    <Input {...form.register(`scoring_settings.${index}.description`)} />
                    {form.formState.errors.scoring_settings?.[index]?.description && (
                      <span className="text-xs text-red-500">
                        {form.formState.errors.scoring_settings[index].description.message}
                      </span>
                    )}
                  </div>
                  <div className="space-y-2 flex items-center gap-2 md:mb-2 w-full md:w-auto">
                    <Controller
                      control={form.control}
                      name={`scoring_settings.${index}.trigger_task`}
                      render={({ field: f }) => (
                        <Switch checked={f.value} onCheckedChange={f.onChange} />
                      )}
                    />
                    <Label className="font-normal whitespace-nowrap">Gerar Ação Corretiva</Label>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    onClick={() => removeScore(index)}
                    className="text-red-500 hover:text-red-700 hover:bg-red-50 mb-1 w-full md:w-auto"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
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
              {form.formState.errors.scoring_settings?.root && (
                <p className="text-sm text-red-500 mt-2">
                  {form.formState.errors.scoring_settings.root.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CheckSquare className="h-5 w-5 text-primary" />
              Itens do Checklist
            </CardTitle>
            <CardDescription>Adicione os pontos que serão avaliados na auditoria.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {actionFields.map((field, index) => (
                <div
                  key={field.id}
                  className="p-4 border rounded-lg space-y-4 bg-white shadow-sm transition-all hover:border-primary/30"
                >
                  <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                    <div className="space-y-2 w-full md:flex-1">
                      <Label>Pergunta / Ponto de Verificação</Label>
                      <Textarea
                        placeholder="Ex: Os extintores estão dentro da validade e desobstruídos?"
                        {...form.register(`actions.${index}.title`)}
                        className="resize-none"
                      />
                      {form.formState.errors.actions?.[index]?.title && (
                        <span className="text-xs text-red-500">
                          {form.formState.errors.actions[index].title.message}
                        </span>
                      )}
                    </div>
                    <div className="space-y-2 w-full md:w-32">
                      <Label>Peso na Nota</Label>
                      <Input type="number" {...form.register(`actions.${index}.weight`)} />
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      type="button"
                      onClick={() => removeAction(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 md:mt-8 w-full md:w-auto self-end md:self-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 pt-2">
                    <div className="flex items-center gap-2">
                      <Controller
                        control={form.control}
                        name={`actions.${index}.evidence_required`}
                        render={({ field: f }) => (
                          <Switch checked={f.value} onCheckedChange={f.onChange} />
                        )}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        Exigir Foto/Evidência
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <Controller
                        control={form.control}
                        name={`actions.${index}.comments_required`}
                        render={({ field: f }) => (
                          <Switch checked={f.value} onCheckedChange={f.onChange} />
                        )}
                      />
                      <Label className="text-sm font-normal cursor-pointer">
                        Exigir Comentário
                      </Label>
                    </div>
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  appendAction({
                    title: '',
                    evidence_required: false,
                    comments_required: false,
                    weight: 1,
                  })
                }
              >
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Ponto de Verificação
              </Button>
              {form.formState.errors.actions?.root && (
                <p className="text-sm text-red-500 mt-2">
                  {form.formState.errors.actions.root.message}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
