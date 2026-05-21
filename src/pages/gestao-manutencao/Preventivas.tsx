import { useEffect, useState, useMemo } from 'react'
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

export default function PreventivasManutencao() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  const [plants, setPlants] = useState<any[]>([])
  const [areas, setAreas] = useState<any[]>([])
  const [assets, setAssets] = useState<any[]>([])

  const [form, setForm] = useState({
    title: '',
    frequency: 'Mensal',
    start_date: '',
    description: '',
    plant_id: '',
    scope: 'area', // 'area' | 'asset'
    area_id: 'none',
    asset_id: 'none',
  })

  const [checklist, setChecklist] = useState<{ id: string; description: string }[]>([])

  const [aiOpen, setAiOpen] = useState(false)
  const [aiPlantId, setAiPlantId] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiSuggestions, setAiSuggestions] = useState<any[]>([])

  useEffect(() => {
    loadPlans()
    loadAuxData()
  }, [])

  const loadAuxData = async () => {
    const [pRes, aRes, asRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('id, name, plant_id').order('name'),
      supabase.from('maintenance_assets').select('id, name, plant_id, area_id').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
    if (asRes.data) setAssets(asRes.data)
  }

  const loadPlans = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_preventive_plans')
      .select('*, maintenance_assets(name), maintenance_areas(name)')
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  const formAreas = useMemo(
    () => areas.filter((a) => a.plant_id === form.plant_id),
    [areas, form.plant_id],
  )
  const formAssets = useMemo(
    () => assets.filter((a) => a.plant_id === form.plant_id),
    [assets, form.plant_id],
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

  const handleAnalyzeAI = async () => {
    if (!aiPlantId) return toast.error('Selecione uma planta para análise.')
    setAiLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
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
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id) return toast.error('Selecione uma planta')
    if (form.scope === 'area' && form.area_id === 'none') return toast.error('Selecione uma área')
    if (form.scope === 'asset' && form.asset_id === 'none')
      return toast.error('Selecione um equipamento')

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      const validChecklist = checklist.filter((c) => c.description.trim())

      const { data: newPlan, error } = await supabase
        .from('maintenance_preventive_plans')
        .insert({
          client_id: profile.client_id,
          plant_id: form.plant_id,
          area_id: form.scope === 'area' ? form.area_id : null,
          asset_id: form.scope === 'asset' ? form.asset_id : null,
          title: form.title,
          frequency: form.frequency,
          start_date: form.start_date || new Date().toISOString().split('T')[0],
          description: form.description,
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
      setOpen(false)
      setForm({
        title: '',
        frequency: 'Mensal',
        start_date: '',
        description: '',
        plant_id: '',
        scope: 'area',
        area_id: 'none',
        asset_id: 'none',
      })
      setChecklist([])
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
            Configure preventivas e associe checklists de execução.
          </p>
        </div>

        <div className="flex gap-2">
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
                        {plants.map((p) => (
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

          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button className="bg-brand-vividBlue">
                <Plus className="h-4 w-4 mr-2" />
                Novo Plano
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-xl overflow-y-auto pb-10">
              <SheetHeader>
                <SheetTitle>Novo Plano Preventivo</SheetTitle>
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
                        {plants.map((p) => (
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
                </div>

                <div className="space-y-2 pt-2 border-t">
                  <Label>Título do Plano *</Label>
                  <Input
                    required
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="Ex: Revisão Mensal HVAC"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
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
                      required
                      value={form.start_date}
                      onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                    />
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
                    Salvar Plano
                  </Button>
                </div>
              </form>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">Carregando planos...</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed rounded-lg">
          Nenhum plano preventivo cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
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
                  <span className="text-gray-500">Periodicidade:</span>
                  <span className="font-medium">{plan.frequency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Alvo:</span>
                  <span className="font-medium truncate max-w-[150px]">
                    {plan.maintenance_assets?.name || plan.maintenance_areas?.name || 'Geral'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Início:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(plan.start_date).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
