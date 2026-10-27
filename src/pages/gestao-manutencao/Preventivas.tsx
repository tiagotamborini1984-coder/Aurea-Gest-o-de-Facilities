import { useEffect, useState, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  RefreshCcw,
  Plus,
  Settings2,
  Calendar,
  Trash2,
  GripVertical,
  Sparkles,
  Bot,
  CheckCircle2,
  Play,
  ClipboardList,
  Clock,
  Building2,
  Search,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { useAppStore } from '@/store/AppContext'

export default function PreventivasManutencao() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const [editPlanId, setEditPlanId] = useState<string | null>(null)
  const { user } = useAuth()
  const { activeClient, profile: appProfile } = useAppStore()
  const [profile, setProfile] = useState<{
    role: string
    client_id: string
    authorized_plants?: any
  } | null>(null)

  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [priorities, setPriorities] = useState<any[]>([])
  const [workers, setWorkers] = useState<any[]>([])
  const [legacyProfiles, setLegacyProfiles] = useState<any[]>([])

  const initialForm = {
    title: '',
    frequency: 'Mensal',
    advance_days: 0,
    start_date: '',
    description: '',
    plant_id: '',
    scope: 'area', // 'area' | 'asset'
    area_id: 'none',
    asset_id: 'none',
    type_id: 'none',
    priority_id: 'none',
    assignee_id: 'none',
  }
  const [form, setForm] = useState(initialForm)

  const [checklist, setChecklist] = useState<{ id: string; description: string }[]>([])
  const [generatingTickets, setGeneratingTickets] = useState(false)

  // Filtros de planta e busca textual
  const initialPlantParam = searchParams.get('plant') || searchParams.get('planta') || 'all'
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<string>(initialPlantParam)
  const [searchQuery, setSearchQuery] = useState('')

  const [aiOpen, setAiOpen] = useState(false)
  const [aiPlantId, setAiPlantId] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])

  const effectiveProfile = profile || appProfile
  const isAdmin = effectiveProfile?.role === 'Master' || effectiveProfile?.role === 'Administrador'

  // Plantas autorizadas para o usuário logado
  const authPlantIds = useMemo(() => {
    if (isAdmin) return null // admin tem acesso a todas as unidades
    const list = effectiveProfile?.authorized_plants
    return Array.isArray(list) ? list : []
  }, [isAdmin, effectiveProfile])

  const authorizedPlants = useMemo(() => {
    if (isAdmin) return plants
    if (!authPlantIds) return plants
    return plants.filter((p) => authPlantIds.includes(p.id))
  }, [plants, isAdmin, authPlantIds])

  // Helper para verificar se usuário pode acessar determinado plano
  const canAccessPlan = (targetPlan: any) => {
    if (!targetPlan) return false
    if (isAdmin) return true
    if (!authPlantIds || authPlantIds.length === 0) return false
    return !!targetPlan.plant_id && authPlantIds.includes(targetPlan.plant_id)
  }

  useEffect(() => {
    if (user) {
      loadAuxData()
    }
  }, [user, activeClient])

  useEffect(() => {
    if (user && effectiveProfile) {
      loadPlans(selectedPlantFilter)
    }
  }, [
    user,
    activeClient,
    selectedPlantFilter,
    effectiveProfile?.role,
    JSON.stringify(authPlantIds),
  ])

  // Validação de acesso por URL para o filtro de planta
  useEffect(() => {
    if (!loading && plants.length > 0 && !isAdmin) {
      const urlPlant = searchParams.get('plant') || searchParams.get('planta')
      if (urlPlant && urlPlant !== 'all') {
        const allowed = authPlantIds?.includes(urlPlant)
        if (!allowed) {
          toast.error('Você não tem permissão para visualizar planos desta unidade.')
          const fallback = authorizedPlants.length === 1 ? authorizedPlants[0].id : 'all'
          setSelectedPlantFilter(fallback)
          return
        }
      }
      if (authorizedPlants.length === 1 && selectedPlantFilter === 'all') {
        setSelectedPlantFilter(authorizedPlants[0].id)
      }
    }
  }, [loading, plants, isAdmin, authPlantIds, authorizedPlants, searchParams])

  // Validação de acesso por URL para abrir detalhes/edição de um plano específico (?id=... ou ?plano=...)
  const planParamProcessed = useRef(false)
  useEffect(() => {
    const urlPlanId =
      searchParams.get('id') || searchParams.get('plano') || searchParams.get('planId')
    if (urlPlanId && !loading && !planParamProcessed.current) {
      planParamProcessed.current = true
      const existing = plans.find((p) => p.id === urlPlanId)
      if (existing) {
        if (canAccessPlan(existing)) {
          handleEdit(existing)
        } else {
          toast.error('Você não tem permissão para acessar o plano desta unidade.')
        }
      } else {
        supabase
          .from('maintenance_preventive_plans')
          .select('*, maintenance_assets(name), maintenance_areas(name)')
          .eq('id', urlPlanId)
          .single()
          .then(({ data: fetchedPlan }) => {
            if (fetchedPlan) {
              if (canAccessPlan(fetchedPlan)) {
                handleEdit(fetchedPlan)
              } else {
                toast.error('Você não tem permissão para acessar o plano desta unidade.')
              }
            }
          })
      }
    }
  }, [loading, plans, searchParams, isAdmin, authPlantIds])

  const loadAuxData = async () => {
    if (!user) return

    const { data: userProfile } = await supabase
      .from('profiles')
      .select('role, client_id, authorized_plants')
      .eq('id', user.id)
      .single()

    if (userProfile) {
      setProfile({
        ...userProfile,
        authorized_plants: Array.isArray(userProfile.authorized_plants)
          ? userProfile.authorized_plants
          : [],
      })

      const clientId = activeClient?.id || userProfile.client_id

      let pQ = supabase.from('plants').select('id, name').order('name')
      let aQ = supabase.from('maintenance_areas').select('id, name, plant_id').order('name')
      let asQ = supabase
        .from('maintenance_assets')
        .select('id, name, plant_id, area_id')
        .order('name')
      let typesQ = supabase.from('maintenance_types').select('id, name').order('name')
      let prioQ = supabase.from('maintenance_priorities').select('id, name').order('name')
      let workersQ = supabase
        .from('maintenance_workers')
        .select('id, name, company, discipline, plant_id')
        .order('name')
      let profilesQ = supabase.from('profiles').select('id, name, role').order('name')

      if (clientId) {
        pQ = pQ.eq('client_id', clientId)
        aQ = aQ.eq('client_id', clientId)
        asQ = asQ.eq('client_id', clientId)
        typesQ = typesQ.eq('client_id', clientId)
        prioQ = prioQ.eq('client_id', clientId)
        workersQ = workersQ.eq('client_id', clientId)
        profilesQ = profilesQ.eq('client_id', clientId)
      }

      const [pRes, aRes, asRes, typesRes, prioRes, workersRes, profilesRes] = await Promise.all([
        pQ,
        aQ,
        asQ,
        typesQ,
        prioQ,
        workersQ,
        profilesQ,
      ])

      if (pRes.data) setPlants(pRes.data)
      if (aRes.data) setAreas(aRes.data)
      if (asRes.data) setAssets(asRes.data)
      if (typesRes.data) setTypes(typesRes.data)
      if (prioRes.data) setPriorities(prioRes.data)
      if (workersRes.data) setWorkers(workersRes.data)
      if (profilesRes.data) setLegacyProfiles(profilesRes.data)
    }
  }

  const loadPlans = async (targetPlantFilter?: string) => {
    setLoading(true)
    let q = supabase
      .from('maintenance_preventive_plans')
      .select('*, maintenance_assets(name), maintenance_areas(name)')
      .order('created_at', { ascending: false })

    if (activeClient?.id) {
      q = q.eq('client_id', activeClient.id)
    }

    // Restrição obrigatória por plantas autorizadas se não for admin
    if (!isAdmin) {
      if (!authPlantIds || authPlantIds.length === 0) {
        setPlans([])
        setLoading(false)
        return
      }
      q = q.in('plant_id', authPlantIds)
    }

    const currentFilter = targetPlantFilter !== undefined ? targetPlantFilter : selectedPlantFilter
    if (currentFilter && currentFilter !== 'all') {
      q = q.eq('plant_id', currentFilter)
    }

    const { data } = await q
    setPlans(data || [])
    setLoading(false)
  }

  const handlePlantFilterChange = (newPlant: string) => {
    setSelectedPlantFilter(newPlant)
    setSearchParams(
      (prev) => {
        if (newPlant === 'all') {
          prev.delete('plant')
          prev.delete('planta')
        } else {
          prev.set('plant', newPlant)
        }
        return prev
      },
      { replace: true },
    )
  }

  const formAreas = useMemo(
    () => areas.filter((a) => a.plant_id === form.plant_id),
    [areas, form.plant_id],
  )
  const formAssets = useMemo(
    () => assets.filter((a) => a.plant_id === form.plant_id),
    [assets, form.plant_id],
  )

  // Manutentores cadastrados (filtrados pela planta selecionada no formulário, se houver)
  const availableWorkers = useMemo(() => {
    if (!form.plant_id) return workers
    const filtered = workers.filter((w) => !w.plant_id || w.plant_id === form.plant_id)
    return filtered.length > 0 ? filtered : workers
  }, [workers, form.plant_id])

  // Helper para resolver o nome do responsável em planos existentes
  const getAssigneeLabel = useMemo(
    () => (assigneeId?: string | null) => {
      if (!assigneeId || assigneeId === 'none') return null
      const worker = workers.find((w) => w.id === assigneeId)
      if (worker) return worker.name
      const legacyProfile = legacyProfiles.find((p) => p.id === assigneeId)
      if (legacyProfile) return legacyProfile.name
      return 'Responsável anterior'
    },
    [workers, legacyProfiles],
  )

  const handleAddChecklistItem = () => {
    setChecklist([...checklist, { id: crypto.randomUUID(), description: '' }])
  }

  const handleRemoveChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item) => item.id !== id))
  }

  const handleChecklistChange = (id: string, value: string) => {
    setChecklist(checklist.map((item) => (item.id === id ? { ...item, description: value } : item)))
  }

  const handleGenerateTicketsNow = async () => {
    setGeneratingTickets(true)
    try {
      const clientId = activeClient?.id || profile?.client_id || null

      // Invoca a RPC do banco ou a Edge Function
      const { data, error } = await (supabase.rpc as any)(
        'generate_preventive_maintenance_tickets',
        {
          p_client_id: clientId,
          p_plan_id: null,
        },
      )

      if (error) {
        // Fallback para Edge Function se RPC falhar
        const { data: edgeData, error: edgeError } = await supabase.functions.invoke(
          'process-preventive-maintenance',
          { body: { client_id: clientId } },
        )
        if (edgeError) throw edgeError
        const count = (edgeData as any)?.generatedCount ?? 0
        if (count > 0) {
          toast.success(`${count} Ordem(ns) de Serviço preventiva(s) gerada(s) com sucesso!`)
        } else {
          toast.info(
            'Todos os planos preventivos já estão em dia. Nenhuma OS pendente para gerar hoje.',
          )
        }
      } else {
        const res = data as any
        const count = res?.generated_count ?? 0
        if (count > 0) {
          toast.success(`${count} Ordem(ns) de Serviço preventiva(s) gerada(s) com sucesso!`)
        } else {
          toast.info(
            'Todos os planos preventivos já estão em dia. Nenhuma OS pendente para gerar hoje.',
          )
        }
      }

      await loadPlans()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao processar preventivas')
    } finally {
      setGeneratingTickets(false)
    }
  }

  const handleAnalyzeAI = async () => {
    if (!aiPlantId) return toast.error('Selecione uma planta para análise.')
    setAiLoading(true)
    try {
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      const { data, error } = await supabase.functions.invoke('maintenance-ai-advisor', {
        body: { plant_id: aiPlantId, client_id: profile.client_id },
      })

      if (error) throw error
      if (!data?.success) throw new Error(data?.error || 'Erro ao gerar sugestões')

      if (data.suggestions && data.suggestions.length === 0) {
        toast.info('Nenhuma lacuna de manutenção encontrada para esta planta.')
      }

      setAiSuggestions(data.suggestions || [])
    } catch (error: any) {
      toast.error(error.message)
    } finally {
      setAiLoading(false)
    }
  }

  const handleAcceptSuggestion = async (suggestion: any, index: number) => {
    try {
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      const { data: newPlan, error } = await supabase
        .from('maintenance_preventive_plans')
        .insert({
          client_id: profile.client_id,
          plant_id: aiPlantId,
          area_id: suggestion.scope === 'area' ? suggestion.area_id : null,
          asset_id: suggestion.scope === 'asset' ? suggestion.asset_id : null,
          title: suggestion.title,
          frequency: suggestion.frequency,
          advance_days: 0,
          start_date: new Date().toISOString().split('T')[0],
          description: suggestion.description,
          is_active: true,
        })
        .select()
        .single()

      if (error) throw error

      if (suggestion.checklist && suggestion.checklist.length > 0 && newPlan) {
        const checklistInserts = suggestion.checklist.map((c: string, idx: number) => ({
          plan_id: newPlan.id,
          description: c,
          order_index: idx,
        }))
        const { error: checklistError } = await supabase
          .from('maintenance_plan_checklist_items')
          .insert(checklistInserts)

        if (checklistError) throw checklistError
      }

      toast.success('Plano sugerido aceito e criado com sucesso!')
      setAiSuggestions((prev) => prev.filter((_, i) => i !== index))
      loadPlans()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  const handleEdit = async (plan: any) => {
    if (!canAccessPlan(plan)) {
      toast.error('Você não tem permissão para acessar o plano desta unidade.')
      return
    }
    setEditPlanId(plan.id)
    setForm({
      title: plan.title,
      frequency: plan.frequency,
      advance_days: Number(plan.advance_days) || 0,
      start_date: plan.start_date,
      description: plan.description || '',
      plant_id: plan.plant_id,
      scope: plan.asset_id ? 'asset' : 'area',
      area_id: plan.area_id || 'none',
      asset_id: plan.asset_id || 'none',
      type_id: plan.type_id || 'none',
      priority_id: plan.priority_id || 'none',
      assignee_id: plan.assignee_id || 'none',
    })

    try {
      const { data } = await supabase
        .from('maintenance_plan_checklist_items')
        .select('*')
        .eq('plan_id', plan.id)
        .order('order_index')

      setChecklist(data?.map((c) => ({ id: c.id, description: c.description })) || [])
    } catch (err: any) {
      toast.error('Erro ao carregar checklist.')
    }
    setOpen(true)
  }

  const handleDelete = async (id: string) => {
    const plan = plans.find((p) => p.id === id)
    if (plan && !canAccessPlan(plan)) {
      toast.error('Você não tem permissão para excluir planos desta unidade.')
      return
    }

    if (
      window.confirm(
        'Tem certeza que deseja excluir este plano de manutenção? Esta ação não pode ser desfeita.',
      )
    ) {
      try {
        const { error } = await supabase.from('maintenance_preventive_plans').delete().eq('id', id)
        if (error) throw error
        toast.success('Plano excluído com sucesso!')
        loadPlans()
      } catch (err: any) {
        toast.error(err.message)
      }
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id) return toast.error('Selecione uma planta')
    if (!isAdmin && authPlantIds && !authPlantIds.includes(form.plant_id)) {
      return toast.error('Você não tem permissão para configurar planos nesta unidade.')
    }
    if (form.scope === 'area' && form.area_id === 'none') return toast.error('Selecione uma área')
    if (form.scope === 'asset' && form.asset_id === 'none')
      return toast.error('Selecione um equipamento')
    if (!profile?.client_id) return toast.error('Cliente não encontrado')

    try {
      const validChecklist = checklist.filter((c) => c.description.trim())
      const advanceDaysNum = Math.min(90, Math.max(0, Number(form.advance_days) || 0))

      const payload = {
        plant_id: form.plant_id,
        area_id: form.scope === 'area' && form.area_id !== 'none' ? form.area_id : null,
        asset_id: form.scope === 'asset' && form.asset_id !== 'none' ? form.asset_id : null,
        type_id: form.type_id !== 'none' ? form.type_id : null,
        priority_id: form.priority_id !== 'none' ? form.priority_id : null,
        assignee_id: form.assignee_id !== 'none' ? form.assignee_id : null,
        title: form.title,
        frequency: form.frequency,
        advance_days: advanceDaysNum,
        start_date: form.start_date || new Date().toISOString().split('T')[0],
        description: form.description,
      }

      if (editPlanId) {
        const { error } = await supabase
          .from('maintenance_preventive_plans')
          .update(payload)
          .eq('id', editPlanId)

        if (error) throw error

        await supabase.from('maintenance_plan_checklist_items').delete().eq('plan_id', editPlanId)

        if (validChecklist.length > 0) {
          const checklistInserts = validChecklist.map((c, idx) => ({
            plan_id: editPlanId,
            description: c.description.trim(),
            order_index: idx,
          }))
          const { error: checklistError } = await supabase
            .from('maintenance_plan_checklist_items')
            .insert(checklistInserts)

          if (checklistError) throw checklistError
        }

        toast.success('Plano atualizado com sucesso!')
      } else {
        const { data: newPlan, error } = await supabase
          .from('maintenance_preventive_plans')
          .insert({
            ...payload,
            client_id: profile.client_id,
            is_active: true,
          })
          .select()
          .single()

        if (error) throw error

        if (validChecklist.length > 0 && newPlan) {
          const checklistInserts = validChecklist.map((c, idx) => ({
            plan_id: newPlan.id,
            description: c.description.trim(),
            order_index: idx,
          }))
          const { error: checklistError } = await supabase
            .from('maintenance_plan_checklist_items')
            .insert(checklistInserts)

          if (checklistError) throw checklistError
        }

        toast.success('Plano criado com sucesso!')
      }

      setOpen(false)
      setForm(initialForm)
      setChecklist([])
      setEditPlanId(null)
      loadPlans()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <RefreshCcw className="h-8 w-8 text-brand-vividBlue" />
            Planos de Preventiva
          </h1>
          <p className="text-gray-500 mt-1">
            Configure preventivas e acompanhe a geração automática de Ordens de Serviço.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button
            variant="outline"
            onClick={handleGenerateTicketsNow}
            disabled={generatingTickets || loading}
            className="border-blue-200 text-brand-vividBlue hover:bg-blue-50 bg-white"
            title="Verifica todos os planos preventivos ativos e gera OS imediatas para os planos no período de vencimento"
          >
            {generatingTickets ? (
              <RefreshCcw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Play className="h-4 w-4 mr-2" />
            )}
            {generatingTickets ? 'Gerando OS...' : 'Gerar OS Agora'}
          </Button>

          <Sheet open={aiOpen} onOpenChange={setAiOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                className="text-purple-600 border-purple-200 hover:bg-purple-50 bg-white"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Consultor IA
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto pb-10">
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  <Bot className="h-6 w-6 text-purple-600" />
                  Especialista IA
                </SheetTitle>
              </SheetHeader>
              <div className="mt-6 space-y-6">
                <p className="text-sm text-gray-500">
                  O Especialista IA analisa seus ativos e áreas cadastrados, identificando lacunas
                  na manutenção preventiva e sugerindo planos com checklists pré-configurados.
                </p>
                <div className="space-y-3">
                  <Label>Selecione a Planta para Análise</Label>
                  <div className="flex gap-2">
                    <Select value={aiPlantId} onValueChange={setAiPlantId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {authorizedPlants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      onClick={handleAnalyzeAI}
                      disabled={aiLoading}
                      className="bg-purple-600 hover:bg-purple-700 text-white"
                    >
                      {aiLoading ? 'Analisando...' : 'Analisar'}
                    </Button>
                  </div>
                </div>

                {aiSuggestions.length > 0 && (
                  <div className="space-y-4 pt-4 border-t">
                    <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-600" /> Sugestões Encontradas
                    </h3>
                    <div className="space-y-4">
                      {aiSuggestions.map((sug, index) => (
                        <Card key={index} className="border-purple-100 bg-purple-50/30">
                          <CardHeader className="pb-2">
                            <CardTitle className="text-base text-purple-900">{sug.title}</CardTitle>
                            <p className="text-sm text-purple-700">
                              Alvo:{' '}
                              <span className="font-medium">
                                {sug.asset_name || sug.area_name || 'Geral'}
                              </span>
                            </p>
                          </CardHeader>
                          <CardContent className="space-y-3 pb-4 text-sm text-gray-700">
                            <p>{sug.description}</p>
                            <div>
                              <span className="font-medium">Periodicidade:</span> {sug.frequency}
                            </div>
                            <div>
                              <span className="font-medium">Checklist sugerido:</span>
                              <ul className="list-disc pl-5 mt-1 space-y-1">
                                {sug.checklist.map((item: string, i: number) => (
                                  <li key={i}>{item}</li>
                                ))}
                              </ul>
                            </div>
                            <Button
                              onClick={() => handleAcceptSuggestion(sug, index)}
                              className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
                            >
                              <CheckCircle2 className="h-4 w-4 mr-2" />
                              Criar Este Plano
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </SheetContent>
          </Sheet>

          <Sheet
            open={open}
            onOpenChange={(val) => {
              setOpen(val)
              if (!val) {
                setEditPlanId(null)
                setForm(initialForm)
                setChecklist([])
              }
            }}
          >
            <Button
              className="bg-brand-vividBlue"
              onClick={() => {
                setEditPlanId(null)
                const defaultPlant =
                  selectedPlantFilter !== 'all' &&
                  authorizedPlants.some((p) => p.id === selectedPlantFilter)
                    ? selectedPlantFilter
                    : authorizedPlants.length === 1
                      ? authorizedPlants[0].id
                      : ''
                setForm({ ...initialForm, plant_id: defaultPlant })
                setChecklist([])
                setOpen(true)
              }}
            >
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto pb-10">
              <SheetHeader>
                <SheetTitle>
                  {editPlanId ? 'Editar Plano Preventivo' : 'Novo Plano Preventivo'}
                </SheetTitle>
              </SheetHeader>
              <form onSubmit={handleSubmit} className="space-y-4 mt-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2 col-span-2">
                    <Label>Planta *</Label>
                    <Select
                      required
                      value={form.plant_id}
                      onValueChange={(v) =>
                        setForm({ ...form, plant_id: v, area_id: 'none', asset_id: 'none' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {authorizedPlants.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Escopo da Preventiva</Label>
                    <Select
                      value={form.scope}
                      onValueChange={(v) =>
                        setForm({ ...form, scope: v, area_id: 'none', asset_id: 'none' })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="area">Por Área/Local</SelectItem>
                        <SelectItem value="asset">Por Equipamento (Ativo)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    {form.scope === 'area' ? (
                      <>
                        <Label>Área *</Label>
                        <Select
                          disabled={!form.plant_id}
                          value={form.area_id}
                          onValueChange={(v) => setForm({ ...form, area_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione uma área</SelectItem>
                            {formAreas.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    ) : (
                      <>
                        <Label>Equipamento *</Label>
                        <Select
                          disabled={!form.plant_id}
                          value={form.asset_id}
                          onValueChange={(v) => setForm({ ...form, asset_id: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">Selecione um ativo</SelectItem>
                            {formAssets.map((a) => (
                              <SelectItem key={a.id} value={a.id}>
                                {a.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </>
                    )}
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Tipo de Manutenção</Label>
                    <Select
                      value={form.type_id}
                      onValueChange={(v) => setForm({ ...form, type_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione um tipo</SelectItem>
                        {types.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2 sm:col-span-1">
                    <Label>Prioridade</Label>
                    <Select
                      value={form.priority_id}
                      onValueChange={(v) => setForm({ ...form, priority_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Selecione uma prioridade</SelectItem>
                        {priorities.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label>Responsável (Manutentor)</Label>
                    <Select
                      value={form.assignee_id}
                      onValueChange={(v) => setForm({ ...form, assignee_id: v })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um manutentor..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">Nenhum responsável</SelectItem>

                        {/* Se o plano em edição foi criado com um responsável antigo (usuário/perfil legado) que não está em workers */}
                        {form.assignee_id &&
                          form.assignee_id !== 'none' &&
                          !availableWorkers.some((w) => w.id === form.assignee_id) && (
                            <SelectItem value={form.assignee_id}>
                              {legacyProfiles.find((p) => p.id === form.assignee_id)?.name
                                ? `${legacyProfiles.find((p) => p.id === form.assignee_id)?.name} (Usuário anterior)`
                                : 'Responsável anterior'}
                            </SelectItem>
                          )}

                        {availableWorkers.map((w) => (
                          <SelectItem key={w.id} value={w.id}>
                            {w.name} {w.discipline ? `(${w.discipline})` : ''}{' '}
                            {w.company ? `- ${w.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label>Título do Plano *</Label>{' '}
                  <Input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Revisão Mensal HVAC"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Periodicidade</Label>
                    <Select
                      value={form.frequency}
                      onValueChange={(v) => setForm({ ...form, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Diária">Diária</SelectItem>
                        <SelectItem value="Semanal">Semanal</SelectItem>
                        <SelectItem value="Quinzenal">Quinzenal</SelectItem>
                        <SelectItem value="Mensal">Mensal</SelectItem>
                        <SelectItem value="Bimestral">Bimestral</SelectItem>
                        <SelectItem value="Trimestral">Trimestral</SelectItem>
                        <SelectItem value="Semestral">Semestral</SelectItem>
                        <SelectItem value="Anual">Anual</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Data de Início</Label>
                    <Input
                      type="date"
                      required
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="advance_days">Antecedência (dias)</Label>
                    </div>
                    <Input
                      id="advance_days"
                      type="number"
                      min={0}
                      max={90}
                      value={form.advance_days}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          advance_days: Math.max(0, parseInt(e.target.value, 10) || 0),
                        })
                      }
                      placeholder="0"
                    />
                    <p className="text-xs text-muted-foreground leading-tight">
                      {form.advance_days > 0
                        ? `Gera a OS ${form.advance_days} dia(s) antes da data planejada`
                        : '0 = gera no dia da execução'}
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Escopo / Descrição (Opcional)</Label>
                  <Textarea
                    rows={2}
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                    placeholder="Instruções gerais..."
                  />
                </div>

                <div className="pt-4 border-t space-y-4">
                  <div className="flex items-center justify-between">
                    <Label className="text-base font-semibold">Checklist de Execução</Label>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddChecklistItem}
                    >
                      <Plus className="h-4 w-4 mr-2" /> Adicionar Item
                    </Button>
                  </div>
                  {checklist.length === 0 ? (
                    <p className="text-sm text-gray-500 italic">
                      Nenhum item de checklist adicionado.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {checklist.map((item, index) => (
                        <div key={item.id} className="flex items-center gap-2">
                          <div className="flex-none cursor-move text-gray-400">
                            <GripVertical className="h-4 w-4" />
                          </div>
                          <div className="flex-none w-6 text-sm text-gray-500 font-mono text-right">
                            {index + 1}.
                          </div>
                          <Input
                            value={item.description}
                            onChange={(e) => handleChecklistChange(item.id, e.target.value)}
                            placeholder="Ex: Verificar nível de óleo..."
                            className="flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveChecklistItem(item.id)}
                            className="text-red-500 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="pt-4">
                  <Button type="submit" className="w-full bg-brand-vividBlue">
                    {editPlanId ? 'Atualizar Plano' : 'Salvar Plano'}
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {/* Barra de Filtros e Busca de Planos Preventivos */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por título, área, equipamento ou periodicidade..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-transparent border-0 shadow-none focus-visible:ring-0 text-sm h-9 placeholder:text-gray-400"
          />
        </div>
        <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l border-gray-200 pt-2 sm:pt-0 sm:pl-3">
          <Select value={selectedPlantFilter} onValueChange={handlePlantFilterChange}>
            <SelectTrigger className="w-full bg-transparent border-0 shadow-none h-9 text-sm">
              <div className="flex items-center gap-2 truncate">
                <Building2 className="h-4 w-4 text-gray-500 shrink-0" />
                <SelectValue placeholder="Todas as Unidades" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {(isAdmin || authorizedPlants.length > 1) && (
                <SelectItem value="all">Todas as Unidades</SelectItem>
              )}
              {authorizedPlants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">Carregando planos...</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-gray-500 py-12 border-2 border-dashed rounded-xl bg-white/40">
          <p className="text-base font-medium">Nenhum plano preventivo encontrado.</p>
          <p className="text-sm text-gray-400 mt-1">
            {selectedPlantFilter !== 'all'
              ? 'Não há planos cadastrados para a unidade selecionada.'
              : 'Nenhum plano preventivo cadastrado para as suas unidades de acesso.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans
            .filter((plan) => {
              // Verificação defensiva de acesso à unidade
              if (!isAdmin && authPlantIds && !authPlantIds.includes(plan.plant_id)) {
                return false
              }
              // Filtro textual
              if (searchQuery.trim()) {
                const q = searchQuery.toLowerCase()
                const titleMatch = plan.title?.toLowerCase().includes(q)
                const descMatch = plan.description?.toLowerCase().includes(q)
                const assetMatch = plan.maintenance_assets?.name?.toLowerCase().includes(q)
                const areaMatch = plan.maintenance_areas?.name?.toLowerCase().includes(q)
                const freqMatch = plan.frequency?.toLowerCase().includes(q)
                const plantMatch = plants
                  .find((p) => p.id === plan.plant_id)
                  ?.name?.toLowerCase()
                  .includes(q)
                return titleMatch || descMatch || assetMatch || areaMatch || freqMatch || plantMatch
              }
              return true
            })
            .map((plan) => (
              <Card key={plan.id} className="shadow-sm hover:shadow-md transition-all">
                <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-lg font-bold truncate pr-2" title={plan.title}>
                    {plan.title}
                  </CardTitle>
                  <Badge
                    className={
                      plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                    }
                    variant="secondary"
                  >
                    {plan.is_active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </CardHeader>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Unidade:</span>
                    <span
                      className="font-medium truncate max-w-[170px] text-brand-deepBlue"
                      title={plants.find((p) => p.id === plan.plant_id)?.name || 'Geral'}
                    >
                      {plants.find((p) => p.id === plan.plant_id)?.name || 'Geral'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Periodicidade:</span>
                    <span className="font-medium">{plan.frequency}</span>
                  </div>
                  {Number(plan.advance_days) > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Antecedência:</span>
                      <span className="font-medium text-blue-700 bg-blue-50 px-2 py-0.5 rounded text-xs flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Gera OS {plan.advance_days} dia{plan.advance_days > 1 ? 's' : ''} antes
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Alvo:</span>
                    <span className="font-medium truncate max-w-[150px]">
                      {plan.maintenance_assets?.name || plan.maintenance_areas?.name || 'Geral'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Responsável:</span>
                    <span
                      className="font-medium truncate max-w-[170px]"
                      title={getAssigneeLabel(plan.assignee_id) || 'Não atribuído'}
                    >
                      {getAssigneeLabel(plan.assignee_id) || 'Não atribuído'}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Início:</span>
                    <span className="font-medium flex items-center gap-1">
                      <Calendar className="h-3 w-3 text-gray-400" />
                      {new Date(plan.start_date).toLocaleDateString('pt-BR', { timeZone: 'UTC' })}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Última OS Gerada:</span>
                    <span className="font-medium flex items-center gap-1">
                      <ClipboardList className="h-3 w-3 text-gray-400" />
                      {plan.last_generated_date
                        ? new Date(plan.last_generated_date).toLocaleDateString('pt-BR', {
                            timeZone: 'UTC',
                          })
                        : 'Nenhuma ainda'}
                    </span>
                  </div>
                </CardContent>
                {isAdmin && (
                  <div className="p-4 border-t bg-gray-50/50 flex gap-2 rounded-b-lg">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEdit(plan)}
                    >
                      <Settings2 className="h-4 w-4 mr-2" /> Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 text-red-600 border-red-200 hover:text-red-700 hover:bg-red-50"
                      onClick={() => handleDelete(plan.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir
                    </Button>
                  </div>
                )}
              </Card>
            ))}
        </div>
      )}
    </div>
  )
}
