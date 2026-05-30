import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useForm, FormProvider } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { auditConfigSchema, type AuditConfigForm } from './schema'
import { BasicSettings } from './components/BasicSettings'
import { ScoringSettings } from './components/ScoringSettings'
import { ChecklistSettings } from './components/ChecklistSettings'
import { AssignmentSettings } from './components/AssignmentSettings'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [plants, setPlants] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])

  const methods = useForm<AuditConfigForm>({
    resolver: zodResolver(auditConfigSchema),
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
      actions: [{ title: '', weight: 1, evidence_required: false, comments_required: false }],
      assignments: [],
    },
  })

  useEffect(() => {
    if (!user) return
    const loadData = async () => {
      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('client_id')
          .eq('id', user.id)
          .single()
        if (!profile?.client_id) return

        const [plantsRes, profilesRes] = await Promise.all([
          supabase
            .from('plants')
            .select('id, name')
            .eq('client_id', profile.client_id)
            .order('name'),
          supabase
            .from('profiles')
            .select('id, name')
            .eq('client_id', profile.client_id)
            .order('name'),
        ])

        setPlants(plantsRes.data || [])
        setProfiles(profilesRes.data || [])

        if (id) {
          const { data: audit } = await supabase
            .from('audits')
            .select('*, audit_actions(*), audit_assignments(*)')
            .eq('id', id)
            .single()

          if (audit) {
            methods.reset({
              title: audit.title,
              type: audit.type,
              frequency: audit.frequency,
              start_date: audit.start_date,
              advance_notice_days: audit.advance_notice_days || 0,
              scoring_settings: (audit.scoring_settings as any[]) || [],
              actions:
                audit.audit_actions
                  ?.sort((a, b) => a.order_index - b.order_index)
                  .map((a) => ({
                    id: a.id,
                    title: a.title,
                    weight: Number(a.weight),
                    evidence_required: a.evidence_required,
                    comments_required: a.comments_required,
                  })) || [],
              assignments:
                audit.audit_assignments?.map((a) => ({
                  plant_id: a.plant_id,
                  assignee_id: a.assignee_id,
                })) || [],
            })
          }
        }
      } catch (e) {
        console.error(e)
      }
    }
    loadData()
  }, [id, user, methods])

  const onSubmit = async (data: AuditConfigForm) => {
    setLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Client ID não encontrado')

      let auditId = id

      const auditData = {
        client_id: profile.client_id,
        title: data.title,
        type: data.type,
        frequency: data.frequency,
        start_date: data.start_date,
        advance_notice_days: data.advance_notice_days,
        scoring_settings: data.scoring_settings,
      }

      if (auditId) {
        const { error } = await supabase.from('audits').update(auditData).eq('id', auditId)
        if (error) throw error
      } else {
        const { data: newAudit, error } = await supabase
          .from('audits')
          .insert(auditData)
          .select()
          .single()
        if (error) throw error
        auditId = newAudit.id
      }

      if (id) {
        await supabase.from('audit_actions').delete().eq('audit_id', auditId)
        await supabase.from('audit_assignments').delete().eq('audit_id', auditId)
      }

      if (data.actions.length) {
        const actionsData = data.actions.map((a, i) => ({
          audit_id: auditId,
          title: a.title,
          weight: a.weight,
          evidence_required: a.evidence_required,
          comments_required: a.comments_required,
          order_index: i,
        }))
        const { error } = await supabase.from('audit_actions').insert(actionsData)
        if (error) throw error
      }

      if (data.assignments.length) {
        const assignmentsData = data.assignments.map((a) => ({
          audit_id: auditId,
          plant_id: a.plant_id,
          assignee_id: a.assignee_id,
        }))
        const { error } = await supabase.from('audit_assignments').insert(assignmentsData)
        if (error) throw error
      }

      toast.success('Configuração salva com sucesso!')
      navigate('/auditoria-checklist/criadas')
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {id ? 'Editar Configuração' : 'Nova Auditoria'}
          </h1>
          <p className="text-muted-foreground">
            Defina os parâmetros, notas e itens do checklist da auditoria.
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button onClick={methods.handleSubmit(onSubmit)} disabled={loading}>
            {loading ? 'Salvando...' : 'Salvar Configuração'}
          </Button>
        </div>
      </div>

      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <BasicSettings />
          <ScoringSettings />
          <ChecklistSettings />
          <AssignmentSettings plants={plants} profiles={profiles} />
        </form>
      </FormProvider>
    </div>
  )
}
