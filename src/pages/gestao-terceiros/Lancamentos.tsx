import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { format, addMonths, isBefore, startOfDay } from 'date-fns'
import {
  Search,
  Users,
  Wrench,
  Target,
  Save,
  CheckCircle2,
  XCircle,
  Check,
  Calendar as CalendarIcon,
  AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

export default function Lancamentos() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [month, setMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [plantId, setPlantId] = useState<string>('')
  const [selectedCompany, setSelectedCompany] = useState<string>('')
  const [activeTab, setActiveTab] = useState<'staff' | 'equipment' | 'metas'>('staff')
  const [presences, setPresences] = useState<Record<string, boolean>>({})
  const [goalValues, setGoalValues] = useState<Record<string, number>>({})
  const [searchTerm, setSearchTerm] = useState('')
  const [equipmentFilter, setEquipmentFilter] = useState('all')
  const [goalFilter, setGoalFilter] = useState('all')
  const [isSaving, setIsSaving] = useState(false)

  const { toast } = useToast()
  const {
    plants,
    employees,
    equipment,
    functions,
    locations,
    goals,
    functionRequiredTrainings,
    employeeTrainingRecords,
    trainings,
  } = useMasterData()
  const { profile, activeClient } = useAppStore()

  useEffect(() => {
    if (plants.length > 0 && !plantId) {
      setPlantId(plants[0].id)
    }
  }, [plants, plantId])

  const availableCompanies = useMemo(() => {
    if (!plantId) return []
    const emps = employees.filter((e) => e.plant_id === plantId)
    return Array.from(new Set(emps.map((e) => e.company_name).filter(Boolean))).sort()
  }, [employees, plantId])

  useEffect(() => {
    if (activeTab === 'staff' && availableCompanies.length > 0) {
      if (selectedCompany && !availableCompanies.includes(selectedCompany)) {
        setSelectedCompany('')
      }
    }
  }, [availableCompanies, activeTab, selectedCompany])

  useEffect(() => {
    if (!plantId || !profile) return
    const fetchLogs = async () => {
      if (activeTab === 'metas') {
        const referenceMonth = `${month}-01`
        const { data } = await supabase
          .from('monthly_goals_data')
          .select('*')
          .eq('plant_id', plantId)
          .eq('reference_month', referenceMonth)

        const g: Record<string, number> = {}
        if (data)
          data.forEach((d) => {
            g[d.goal_id] = Number(d.value)
          })
        setGoalValues(g)
      } else {
        const { data } = await supabase
          .from('daily_logs')
          .select('*')
          .eq('date', date)
          .eq('plant_id', plantId)
          .eq('type', activeTab)

        const p: Record<string, boolean> = {}
        if (data)
          data.forEach((d) => {
            p[d.reference_id] = d.status
          })
        setPresences(p)
      }
    }
    fetchLogs()
  }, [date, month, plantId, activeTab, profile])

  const handleSave = async () => {
    if (!profile || !plantId) return
    setIsSaving(true)

    try {
      if (activeTab === 'metas') {
        const activeGoals = goals.filter((g) => g.is_active)
        const payload = activeGoals.map((g) => ({
          client_id: profile.client_id,
          plant_id: plantId,
          goal_id: g.id,
          reference_month: `${month}-01`,
          value: goalValues[g.id] || 0,
        }))

        if (payload.length > 0) {
          const { error } = await supabase
            .from('monthly_goals_data')
            .upsert(payload, { onConflict: 'plant_id,goal_id,reference_month' })
          if (error) throw error
          toast({
            title: 'Metas salvas com sucesso',
            className: 'bg-green-50 text-green-900 border-green-200',
          })
        }
      } else {
        const list =
          activeTab === 'staff'
            ? employees.filter((e) => e.plant_id === plantId && e.company_name === selectedCompany)
            : equipment.filter((e) => e.plant_id === plantId)

        const payload = list.map((item) => ({
          client_id: profile.client_id,
          plant_id: plantId,
          date,
          type: activeTab,
          reference_id: item.id,
          status: presences[item.id] ?? false,
        }))

        if (payload.length > 0) {
          const { error } = await supabase
            .from('daily_logs')
            .upsert(payload, { onConflict: 'date,type,reference_id' })
          if (error) throw error
          toast({
            title: 'Lançamentos salvos com sucesso',
            className: 'bg-green-50 text-green-900 border-green-200',
          })
        }
      }
    } catch (error) {
      console.error(error)
      toast({ variant: 'destructive', title: 'Erro ao salvar lançamentos' })
    } finally {
      setIsSaving(false)
    }
  }

  const { filteredData, groupedData, summary, equipmentTypes } = useMemo(() => {
    const searchLower = searchTerm.toLowerCase()

    const currentPlantEq = equipment.filter((e) => e.plant_id === plantId)
    const eqTypes = Array.from(new Set(currentPlantEq.map((e) => e.type).filter(Boolean)))

    if (activeTab === 'staff') {
      if (!selectedCompany) {
        return { filteredData: [], groupedData: {}, equipmentTypes: eqTypes, summary: null }
      }

      const filtered = employees.filter(
        (e) =>
          e.plant_id === plantId &&
          e.company_name === selectedCompany &&
          e.name.toLowerCase().includes(searchLower),
      )
      const grouped = filtered.reduce(
        (acc, emp) => {
          const funcName = functions.find((f) => f.id === emp.function_id)?.name || 'Outros'
          if (!acc[funcName]) acc[funcName] = []
          acc[funcName].push(emp)
          return acc
        },
        {} as Record<string, typeof employees>,
      )

      const presentCount = filtered.filter((e) => presences[e.id]).length
      return {
        filteredData: filtered,
        groupedData: grouped,
        equipmentTypes: eqTypes,
        summary: {
          total: filtered.length,
          present: presentCount,
          absent: filtered.length - presentCount,
          labels: ['total', 'presentes', 'ausentes'],
        },
      }
    } else if (activeTab === 'equipment') {
      let filtered = currentPlantEq.filter((e) => e.name.toLowerCase().includes(searchLower))

      if (equipmentFilter !== 'all') {
        filtered = filtered.filter((e) => e.type === equipmentFilter)
      }

      const grouped = filtered.reduce(
        (acc, eq) => {
          const groupName = eq.name || 'Outros'
          if (!acc[groupName]) acc[groupName] = []
          acc[groupName].push(eq)
          return acc
        },
        {} as Record<string, typeof equipment>,
      )

      const availableCount = filtered.filter((e) => presences[e.id]).length
      return {
        filteredData: filtered,
        groupedData: grouped,
        equipmentTypes: eqTypes,
        summary: {
          total: filtered.length,
          present: availableCount,
          absent: filtered.length - availableCount,
          labels: ['total', 'disponíveis', 'indisponíveis'],
        },
      }
    } else {
      let filtered = goals.filter((g) => g.is_active && g.name.toLowerCase().includes(searchLower))

      if (goalFilter !== 'all') {
        filtered = filtered.filter((g) => g.id === goalFilter)
      }

      return {
        filteredData: filtered,
        groupedData: { Metas: filtered },
        equipmentTypes: eqTypes,
        summary: null,
      }
    }
  }, [
    activeTab,
    employees,
    equipment,
    goals,
    functions,
    plantId,
    searchTerm,
    presences,
    equipmentFilter,
    goalFilter,
    selectedCompany,
  ])

  const CustomCheckbox = ({
    checked,
    onChange,
  }: {
    checked: boolean
    onChange: (v: boolean) => void
  }) => (
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        'w-5 h-5 rounded flex items-center justify-center cursor-pointer transition-colors border shadow-sm shrink-0',
        checked
          ? 'bg-[#65a34e] border-[#65a34e]'
          : 'bg-white border-slate-300 hover:border-[#65a34e]',
      )}
    >
      {checked && <Check className="w-3.5 h-3.5 text-white" />}
    </div>
  )

  const themeColor = activeClient?.primaryColor || 'hsl(var(--primary))'
  const canSave = activeTab !== 'staff' || selectedCompany !== ''

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-slate-800">Lançamento de Presença</h2>
        <p className="text-muted-foreground mt-1">
          Registre a presença diária de colaboradores e equipamentos
        </p>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardContent className="p-4 sm:p-5 flex flex-col sm:flex-row gap-4 sm:gap-6 flex-wrap">
          {activeTab !== 'metas' ? (
            <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[300px]">
              <label className="text-xs font-medium text-slate-500">Data</label>
              <div className="relative">
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="pl-10 h-11"
                />
                <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              </div>
            </div>
          ) : (
            <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[300px]">
              <label className="text-xs font-medium text-slate-500">Mês de Referência</label>
              <div className="relative">
                <Input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="pl-10 h-11"
                />
                <CalendarIcon className="absolute left-3 top-3 h-5 w-5 text-slate-400" />
              </div>
            </div>
          )}

          <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[300px]">
            <label className="text-xs font-medium text-slate-500">Planta</label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger className="h-11 bg-white">
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

          {activeTab === 'staff' && (
            <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[300px] animate-in fade-in">
              <label className="text-xs font-medium text-slate-500">
                Empresa <span className="text-red-500">*</span>
              </label>
              <Select value={selectedCompany} onValueChange={setSelectedCompany}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  {availableCompanies.map((c) => (
                    <SelectItem key={c as string} value={c as string}>
                      {c as string}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'equipment' && (
            <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[300px] animate-in fade-in">
              <label className="text-xs font-medium text-slate-500">Tipo de Equipamento</label>
              <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os tipos</SelectItem>
                  {equipmentTypes.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {activeTab === 'metas' && (
            <div className="space-y-1.5 flex-1 min-w-[200px] max-w-[300px] animate-in fade-in">
              <label className="text-xs font-medium text-slate-500">Filtrar Meta</label>
              <Select value={goalFilter} onValueChange={setGoalFilter}>
                <SelectTrigger className="h-11 bg-white">
                  <SelectValue placeholder="Todas as metas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as metas</SelectItem>
                  {goals
                    .filter((g) => g.is_active)
                    .map((g) => (
                      <SelectItem key={g.id} value={g.id}>
                        {g.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="flex gap-2 sm:gap-3 overflow-x-auto pb-2 custom-scrollbar">
        <button
          onClick={() => {
            setActiveTab('staff')
            setEquipmentFilter('all')
            setGoalFilter('all')
          }}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0',
            activeTab === 'staff'
              ? 'text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          )}
          style={activeTab === 'staff' ? { backgroundColor: themeColor } : {}}
        >
          <Users className="h-4 w-4" /> Colaboradores
        </button>
        <button
          onClick={() => {
            setActiveTab('equipment')
            setGoalFilter('all')
          }}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0',
            activeTab === 'equipment'
              ? 'text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          )}
          style={activeTab === 'equipment' ? { backgroundColor: themeColor } : {}}
        >
          <Wrench className="h-4 w-4" /> Equipamentos
        </button>
        <button
          onClick={() => {
            setActiveTab('metas')
            setEquipmentFilter('all')
          }}
          className={cn(
            'flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-all shrink-0',
            activeTab === 'metas'
              ? 'text-white shadow-md'
              : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50',
          )}
          style={activeTab === 'metas' ? { backgroundColor: themeColor } : {}}
        >
          <Target className="h-4 w-4" /> Book de Metas
        </button>
      </div>

      {plantId && (
        <div className="space-y-4 animate-slide-up">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
            {summary ? (
              <div className="flex items-center gap-2 sm:gap-4 flex-wrap">
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 font-medium text-sm">
                  <Users className="h-4 w-4 text-slate-500" />
                  {summary.total} {summary.labels[0]}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-green-200 bg-green-50 text-green-700 font-medium text-sm">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  {summary.present} {summary.labels[1]}
                </div>
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-red-200 bg-red-50 text-red-700 font-medium text-sm">
                  <XCircle className="h-4 w-4 text-red-500" />
                  {summary.absent} {summary.labels[2]}
                </div>
              </div>
            ) : activeTab === 'staff' && !selectedCompany ? (
              <div className="text-sm font-medium text-slate-500 px-2">
                Selecione uma empresa para visualizar
              </div>
            ) : (
              <div className="text-sm font-medium text-slate-500 px-2">
                Preencha os valores do mês de referência
              </div>
            )}

            <Button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="w-full sm:w-auto shadow-md"
              style={{ backgroundColor: themeColor }}
            >
              <Save className="mr-2 h-4 w-4" />
              {isSaving ? 'Salvando...' : 'Salvar Lançamento'}
            </Button>
          </div>

          {activeTab !== 'metas' && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
              <Input
                placeholder={`Buscar ${activeTab === 'staff' ? 'colaborador' : 'equipamento'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-12 bg-white border-slate-200 rounded-xl shadow-sm text-base"
                disabled={activeTab === 'staff' && !selectedCompany}
              />
            </div>
          )}

          <div className="space-y-6 pb-10">
            {activeTab === 'metas' ? (
              <div className="space-y-3">
                {filteredData.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                    Nenhuma meta encontrada.
                  </div>
                ) : (
                  filteredData.map((goal: any) => (
                    <div
                      key={goal.id}
                      className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden flex items-center p-4 pl-0 transition-all hover:border-slate-300"
                    >
                      <div
                        className="w-1.5 self-stretch mr-4 rounded-r-full"
                        style={{ backgroundColor: themeColor }}
                      />
                      <div className="flex-1 pr-4">
                        <h4 className="text-base font-semibold text-slate-800">{goal.name}</h4>
                        {goal.description && (
                          <p className="text-sm text-slate-500 mt-0.5">{goal.description}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 pr-2">
                        <Input
                          type="number"
                          min="0"
                          max="100"
                          className="w-20 text-center font-medium shadow-sm focus-visible:ring-1"
                          value={goalValues[goal.id] === undefined ? '' : goalValues[goal.id]}
                          onChange={(e) =>
                            setGoalValues((prev) => ({
                              ...prev,
                              [goal.id]: e.target.value === '' ? 0 : Number(e.target.value),
                            }))
                          }
                        />
                        <span className="text-slate-500 font-medium">%</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : activeTab === 'staff' && !selectedCompany ? (
              <div className="p-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
                Por favor, selecione uma empresa para iniciar os lançamentos.
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                {Object.keys(groupedData).length === 0 ? (
                  <div className="p-12 text-center text-slate-500">
                    Nenhum registro encontrado para esta busca/planta.
                  </div>
                ) : (
                  Object.entries(groupedData).map(([groupName, items]: [string, any[]]) => (
                    <div key={groupName} className="border-b border-slate-100 last:border-0">
                      <div className="bg-slate-50/80 px-4 py-3 flex items-center gap-3">
                        <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
                        <h3 className="font-semibold text-slate-800 text-sm">{groupName}</h3>
                        <span className="bg-white border border-slate-200 text-slate-500 text-xs font-bold px-2 py-0.5 rounded-full shadow-sm">
                          {items.length}
                        </span>
                      </div>

                      <div className="divide-y divide-slate-100">
                        {items.map((item) => {
                          const isPresent = presences[item.id] || false
                          const locName = locations.find((l) => l.id === item.location_id)?.name

                          let isNonCompliant = false
                          let complianceMessage = ''

                          if (activeTab === 'staff') {
                            const empRequiredTrainings = functionRequiredTrainings.filter(
                              (frt) => frt.function_id === item.function_id,
                            )

                            if (empRequiredTrainings.length > 0) {
                              for (const req of empRequiredTrainings) {
                                const record = employeeTrainingRecords.find(
                                  (etr) =>
                                    etr.employee_id === item.id &&
                                    etr.training_id === req.training_id,
                                )
                                const training = trainings.find((t) => t.id === req.training_id)

                                if (!record) {
                                  isNonCompliant = true
                                  complianceMessage = `Pendente: ${training?.name}`
                                  break
                                } else if (training?.validity_months) {
                                  const completionDate = new Date(
                                    record.completion_date + 'T12:00:00',
                                  )
                                  const expirationDate = addMonths(
                                    completionDate,
                                    training.validity_months,
                                  )
                                  if (isBefore(expirationDate, startOfDay(new Date()))) {
                                    isNonCompliant = true
                                    complianceMessage = `Vencido: ${training?.name}`
                                    break
                                  }
                                }
                              }
                            }
                          }

                          return (
                            <div
                              key={item.id}
                              className="px-4 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                            >
                              <div className="flex items-start gap-4">
                                <div className="mt-1">
                                  <CustomCheckbox
                                    checked={isPresent}
                                    onChange={(v) =>
                                      setPresences((prev) => ({ ...prev, [item.id]: v }))
                                    }
                                  />
                                </div>
                                <div>
                                  <p
                                    className={cn(
                                      'font-medium',
                                      isNonCompliant ? 'text-red-600' : 'text-slate-800',
                                    )}
                                  >
                                    {item.name}
                                  </p>
                                  {activeTab === 'staff' && (
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mt-0.5">
                                      <p className="text-xs text-slate-500">
                                        {plants.find((p) => p.id === plantId)?.code}
                                        {locName ? ` - ${locName}` : ''}
                                      </p>
                                      {isNonCompliant && (
                                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded w-fit">
                                          <AlertTriangle className="h-3 w-3" />
                                          {complianceMessage}
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="shrink-0">
                                {isPresent ? (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-[#65a34e] text-white shadow-sm">
                                    {activeTab === 'staff' ? 'Presente' : 'Disponível'}
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-white border border-slate-200 text-slate-400">
                                    {activeTab === 'staff' ? 'Ausente' : 'Indisponível'}
                                  </span>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
