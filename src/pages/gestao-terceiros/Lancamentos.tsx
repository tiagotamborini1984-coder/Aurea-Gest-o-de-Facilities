import { useState, useEffect, useMemo } from 'react'
import { format, parseISO, subDays, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  CalendarIcon,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Save,
  Send,
  Users,
  Wrench,
  Building2,
  AlertTriangle,
  FileEdit,
} from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export default function Lancamentos() {
  const { activeClient, profile } = useAppStore()
  const { toast } = useToast()

  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [selectedPlant, setSelectedPlant] = useState<string>('')
  const [plants, setPlants] = useState<any[]>([])

  const [employees, setEmployees] = useState<any[]>([])
  const [equipments, setEquipments] = useState<any[]>([])

  const [logs, setLogs] = useState<Record<string, boolean>>({})
  const [isNonWorkingDay, setIsNonWorkingDay] = useState(false)
  const [isPublished, setIsPublished] = useState(false)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  const isPlantAuthorized = (plantId: string) => {
    if (profile?.role === 'Master' || profile?.role === 'Administrador') return true
    const authPlants = profile?.authorized_plants as string[] | undefined
    return authPlants ? authPlants.includes(plantId) : false
  }

  useEffect(() => {
    if (!activeClient?.id) return
    supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .order('name')
      .then(({ data }) => {
        const authorized = data?.filter((p) => isPlantAuthorized(p.id)) || []
        setPlants(authorized)
        if (authorized.length > 0 && !selectedPlant) {
          setSelectedPlant(authorized[0].id)
        }
      })
  }, [activeClient?.id, profile])

  useEffect(() => {
    if (!selectedPlant || !date) return
    loadData()
  }, [selectedPlant, date])

  const loadData = async () => {
    setLoading(true)

    // 1. Fetch Non-Working Day Status
    const { data: nwd } = await supabase
      .from('plant_non_working_days')
      .select('id')
      .eq('plant_id', selectedPlant)
      .eq('date', date)
    setIsNonWorkingDay(nwd && nwd.length > 0 ? true : false)

    // 2. Fetch Active Employees and Equipment
    const [empRes, eqRes] = await Promise.all([
      supabase
        .from('employees')
        .select('id, name, company_name, function_id')
        .eq('plant_id', selectedPlant)
        .eq('status', 'Ativo')
        .order('name'),
      supabase
        .from('equipment')
        .select('id, name, type')
        .eq('plant_id', selectedPlant)
        .eq('status', 'Ativo')
        .order('name'),
    ])
    setEmployees(empRes.data || [])
    setEquipments(eqRes.data || [])

    // 3. Fetch Existing Logs
    const { data: logRes } = await supabase
      .from('daily_logs')
      .select('reference_id, status, type, is_published')
      .eq('plant_id', selectedPlant)
      .eq('date', date)

    const newLogs: Record<string, boolean> = {}
    let published = false
    if (logRes && logRes.length > 0) {
      logRes.forEach((l) => {
        newLogs[l.reference_id] = l.status
        // Consider day published if any entry is marked as published
        if (l.is_published) published = true
      })
    }
    setLogs(newLogs)
    setIsPublished(published)
    setLoading(false)
  }

  const handleSave = async (publish: boolean) => {
    if (!activeClient?.id || !selectedPlant) return
    setSaving(true)

    // Manage Non-Working Day
    if (isNonWorkingDay) {
      await supabase.from('plant_non_working_days').upsert(
        {
          client_id: activeClient.id,
          plant_id: selectedPlant,
          date: date,
          description: 'Feriado / Dia não útil',
        },
        { onConflict: 'plant_id, date' },
      )
    } else {
      await supabase
        .from('plant_non_working_days')
        .delete()
        .eq('plant_id', selectedPlant)
        .eq('date', date)
    }

    // Prepare upsert payload
    const payload = []

    employees.forEach((emp) => {
      payload.push({
        client_id: activeClient.id,
        plant_id: selectedPlant,
        date: date,
        type: 'staff',
        reference_id: emp.id,
        status: !!logs[emp.id],
        is_published: publish,
      })
    })

    equipments.forEach((eq) => {
      payload.push({
        client_id: activeClient.id,
        plant_id: selectedPlant,
        date: date,
        type: 'equipment',
        reference_id: eq.id,
        status: !!logs[eq.id],
        is_published: publish,
      })
    })

    if (payload.length > 0) {
      const { error } = await supabase.from('daily_logs').upsert(payload as any, {
        onConflict: 'date, type, reference_id',
      })
      if (error) {
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
        setSaving(false)
        return
      }
    }

    setIsPublished(publish)
    toast({
      title: publish ? 'Lançamentos publicados com sucesso!' : 'Rascunho salvo com sucesso!',
      className: publish ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : '',
    })
    setSaving(false)
  }

  const markAll = (type: 'staff' | 'equipment', val: boolean) => {
    const newLogs = { ...logs }
    if (type === 'staff') {
      employees.forEach((e) => {
        newLogs[e.id] = val
      })
    } else {
      equipments.forEach((e) => {
        newLogs[e.id] = val
      })
    }
    setLogs(newLogs)
  }

  // Group Employees by Company
  const groupedEmployees = useMemo(() => {
    return employees.reduce(
      (acc, emp) => {
        const comp = emp.company_name || 'Sem Empresa'
        if (!acc[comp]) acc[comp] = []
        acc[comp].push(emp)
        return acc
      },
      {} as Record<string, any[]>,
    )
  }, [employees])

  // Group Equipment by Type
  const groupedEquipments = useMemo(() => {
    return equipments.reduce(
      (acc, eq) => {
        const t = eq.type || 'Geral'
        if (!acc[t]) acc[t] = []
        acc[t].push(eq)
        return acc
      },
      {} as Record<string, any[]>,
    )
  }, [equipments])

  const handlePrevDay = () => setDate((prev) => format(subDays(parseISO(prev), 1), 'yyyy-MM-dd'))
  const handleNextDay = () => setDate((prev) => format(addDays(parseISO(prev), 1), 'yyyy-MM-dd'))

  const formattedDate = format(parseISO(date), "dd 'de' MMMM, yyyy", { locale: ptBR })

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <FileEdit className="h-8 w-8 text-brand-vividBlue" />
            Lançamentos Operacionais
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            Gerencie o apontamento diário de presença do efetivo e utilização de equipamentos.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
          <Building2 className="h-5 w-5 text-slate-400 ml-2 shrink-0" />
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-full md:w-[250px] border-0 shadow-none focus:ring-0 text-base h-10 bg-transparent">
              <SelectValue placeholder="Selecione uma planta..." />
            </SelectTrigger>
            <SelectContent>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-base py-2">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-5 border-b bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <Button variant="ghost" size="icon" onClick={handlePrevDay} className="h-9 w-9">
                <ChevronLeft className="h-5 w-5" />
              </Button>
              <div className="flex items-center px-4 font-medium text-slate-700 min-w-[180px] justify-center gap-2">
                <CalendarIcon className="h-4 w-4 text-brand-vividBlue" />
                <span className="capitalize">{formattedDate}</span>
              </div>
              <Button variant="ghost" size="icon" onClick={handleNextDay} className="h-9 w-9">
                <ChevronRight className="h-5 w-5" />
              </Button>
            </div>

            {isPublished && (
              <Badge
                variant="default"
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-3 py-1.5 text-sm font-medium"
              >
                Publicado
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-lg border border-slate-200 shadow-sm">
            <Label
              htmlFor="nwd-toggle"
              className="text-base font-medium text-slate-700 cursor-pointer"
            >
              Dia Não Útil
            </Label>
            <Switch
              id="nwd-toggle"
              checked={isNonWorkingDay}
              onCheckedChange={setIsNonWorkingDay}
              className="data-[state=checked]:bg-amber-500"
            />
          </div>
        </CardHeader>

        <CardContent className="p-6">
          {!selectedPlant ? (
            <div className="py-20 text-center text-slate-500">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg">Selecione uma planta para carregar os apontamentos.</p>
            </div>
          ) : loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-10 w-10 animate-spin text-brand-vividBlue" />
            </div>
          ) : (
            <div className="space-y-6">
              {isNonWorkingDay && (
                <div className="bg-amber-50 border-l-4 border-amber-500 p-4 rounded-md flex items-start shadow-sm mb-6 animate-fade-in">
                  <AlertTriangle className="h-6 w-6 text-amber-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-amber-900 font-bold text-base">
                      Dia marcado como Não Útil
                    </h3>
                    <p className="text-amber-800 text-sm mt-1">
                      Você ainda pode realizar apontamentos (ex: equipes de plantão), mas os
                      indicadores do dashboard irão ignorar o efetivo total esperado para este dia.
                    </p>
                  </div>
                </div>
              )}

              <Tabs defaultValue="efetivo" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px] h-12">
                  <TabsTrigger
                    value="efetivo"
                    className="text-base h-10 data-[state=active]:bg-brand-vividBlue data-[state=active]:text-white transition-all"
                  >
                    <Users className="w-4 h-4 mr-2" /> Efetivo ({employees.length})
                  </TabsTrigger>
                  <TabsTrigger
                    value="equipamentos"
                    className="text-base h-10 data-[state=active]:bg-brand-vividBlue data-[state=active]:text-white transition-all"
                  >
                    <Wrench className="w-4 h-4 mr-2" /> Equipamentos ({equipments.length})
                  </TabsTrigger>
                </TabsList>

                {/* EFETIVO TAB */}
                <TabsContent value="efetivo" className="mt-6 space-y-6 animate-fade-in">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('staff', true)}
                      className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                    >
                      Marcar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('staff', false)}
                      className="text-slate-600"
                    >
                      Desmarcar Todos
                    </Button>
                  </div>

                  {employees.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 border rounded-lg bg-slate-50">
                      <p>Nenhum colaborador ativo encontrado nesta planta.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(groupedEmployees).map(([company, emps]) => (
                        <div
                          key={company}
                          className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col"
                        >
                          <div className="bg-slate-100/80 px-4 py-3 border-b flex justify-between items-center">
                            <span
                              className="font-semibold text-slate-800 text-[15px] truncate pr-2"
                              title={company}
                            >
                              {company}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-white text-slate-600 font-medium border border-slate-200"
                            >
                              {emps.filter((e) => logs[e.id]).length} / {emps.length}
                            </Badge>
                          </div>
                          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[400px]">
                            {emps.map((emp) => (
                              <label
                                key={emp.id}
                                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                              >
                                <div className="flex flex-col pr-4">
                                  <span className="font-medium text-slate-700 text-sm group-hover:text-brand-vividBlue transition-colors">
                                    {emp.name}
                                  </span>
                                </div>
                                <Checkbox
                                  checked={!!logs[emp.id]}
                                  onCheckedChange={(c) =>
                                    setLogs((prev) => ({ ...prev, [emp.id]: !!c }))
                                  }
                                  className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* EQUIPAMENTOS TAB */}
                <TabsContent value="equipamentos" className="mt-6 space-y-6 animate-fade-in">
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('equipment', true)}
                      className="text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-200"
                    >
                      Marcar Todos
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => markAll('equipment', false)}
                      className="text-slate-600"
                    >
                      Desmarcar Todos
                    </Button>
                  </div>

                  {equipments.length === 0 ? (
                    <div className="py-10 text-center text-slate-500 border rounded-lg bg-slate-50">
                      <p>Nenhum equipamento ativo encontrado nesta planta.</p>
                    </div>
                  ) : (
                    <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
                      {Object.entries(groupedEquipments).map(([type, eqs]) => (
                        <div
                          key={type}
                          className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm flex flex-col"
                        >
                          <div className="bg-slate-100/80 px-4 py-3 border-b flex justify-between items-center">
                            <span
                              className="font-semibold text-slate-800 text-[15px] truncate pr-2"
                              title={type}
                            >
                              {type}
                            </span>
                            <Badge
                              variant="secondary"
                              className="bg-white text-slate-600 font-medium border border-slate-200"
                            >
                              {eqs.filter((e) => logs[e.id]).length} / {eqs.length}
                            </Badge>
                          </div>
                          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto max-h-[400px]">
                            {eqs.map((eq) => (
                              <label
                                key={eq.id}
                                className="flex items-center justify-between px-4 py-3.5 hover:bg-slate-50 cursor-pointer transition-colors group"
                              >
                                <div className="flex flex-col pr-4">
                                  <span className="font-medium text-slate-700 text-sm group-hover:text-brand-vividBlue transition-colors">
                                    {eq.name}
                                  </span>
                                </div>
                                <Checkbox
                                  checked={!!logs[eq.id]}
                                  onCheckedChange={(c) =>
                                    setLogs((prev) => ({ ...prev, [eq.id]: !!c }))
                                  }
                                  className="h-5 w-5 data-[state=checked]:bg-emerald-500 data-[state=checked]:border-emerald-500"
                                />
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </div>
          )}
        </CardContent>

        {selectedPlant && !loading && (
          <div className="p-6 bg-slate-50 border-t flex flex-col sm:flex-row justify-end items-center gap-3 rounded-b-xl">
            <Button
              variant="outline"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="w-full sm:w-auto h-11 text-base bg-white shadow-sm hover:bg-slate-100"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Save className="h-5 w-5 mr-2" />
              )}
              Salvar como Rascunho
            </Button>
            <Button
              onClick={() => handleSave(true)}
              disabled={saving}
              className="w-full sm:w-auto h-11 text-base bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white shadow-sm"
            >
              {saving ? (
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
              ) : (
                <Send className="h-5 w-5 mr-2" />
              )}
              Publicar Lançamentos
            </Button>
          </div>
        )}
      </Card>
    </div>
  )
}
