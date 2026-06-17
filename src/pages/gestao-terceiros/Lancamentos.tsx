import { useState, useEffect } from 'react'
import { format, subDays, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
  Check,
  Building2,
  Loader2,
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { TrainingStatusCell } from '@/components/gestao-terceiros/TrainingStatusCell'
import { useTrainingStatus } from '@/hooks/use-training-status'
import { cn } from '@/lib/utils'

export default function Lancamentos() {
  const { toast } = useToast()
  const { getTrainingStatuses } = useTrainingStatus()

  const [selectedDate, setSelectedDate] = useState<Date>(new Date())
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('')

  const [employees, setEmployees] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [isNonWorkingDay, setIsNonWorkingDay] = useState(false)
  const [nonWorkingDayId, setNonWorkingDayId] = useState<string | null>(null)

  const [trainingStatuses, setTrainingStatuses] = useState<any>({ statusMap: {}, detailsMap: {} })
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('colaboradores')
  const [toggling, setToggling] = useState<Record<string, boolean>>({})
  const [isEditingPublished, setIsEditingPublished] = useState(false)
  const [dirtyLogs, setDirtyLogs] = useState<Set<string>>(new Set())

  const dateStr = format(selectedDate, 'yyyy-MM-dd')

  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase.from('plants').select('id, name, client_id').order('name')
      if (data && data.length > 0) {
        setPlants(data)
        setSelectedPlant(data[0].id)
      }
    }
    fetchPlants()
  }, [])

  useEffect(() => {
    let isActive = true
    if (selectedPlant && dateStr) {
      loadDataForDate(isActive)
    }
    return () => {
      isActive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, dateStr])

  const loadDataForDate = async (isActive: boolean = true) => {
    setLoading(true)

    // Reset state
    setDailyLogs([])
    setEmployees([])
    setEquipment([])
    setTrainingStatuses({ statusMap: {}, detailsMap: {} })
    setIsNonWorkingDay(false)
    setNonWorkingDayId(null)
    setIsEditingPublished(false)
    setDirtyLogs(new Set())

    try {
      const currentPlantObj = plants.find((p) => p.id === selectedPlant)
      if (!currentPlantObj) return

      const { data: logs, error: logsError } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('plant_id', selectedPlant)
        .eq('date', dateStr)

      if (logsError && logsError.code !== 'PGRST116') throw logsError
      if (!isActive) return

      const fetchedLogs = logs || []
      setDailyLogs(fetchedLogs)

      const { data: nwDays, error: nwDaysError } = await supabase
        .from('plant_non_working_days')
        .select('*')
        .eq('plant_id', selectedPlant)
        .eq('date', dateStr)

      if (nwDaysError && nwDaysError.code !== 'PGRST116') throw nwDaysError

      if (nwDays && nwDays.length > 0) {
        setIsNonWorkingDay(true)
        setNonWorkingDayId(nwDays[0].id)
      } else {
        setIsNonWorkingDay(false)
        setNonWorkingDayId(null)
      }

      const staffLogIds = Array.from(
        new Set(
          fetchedLogs
            .filter((l) => l?.type === 'staff' && l?.reference_id)
            .map((l) => String(l.reference_id)),
        ),
      )

      const refMonth = format(selectedDate, 'yyyy-MM')
      let fetchedEmps: any[] = []

      // Try using the new RPC for unique employees
      const { data: rpcEmps, error: rpcError } = await supabase.rpc('get_attendance_employees', {
        p_plant_id: selectedPlant,
        p_reference_month: refMonth,
        p_staff_log_ids: staffLogIds,
      })

      if (!isActive) return

      if (!rpcError && rpcEmps) {
        fetchedEmps = rpcEmps
      } else {
        // Fallback to standard query if RPC fails or doesn't exist yet
        console.warn(
          'RPC get_attendance_employees failed or not available. Using fallback.',
          rpcError,
        )
        let empsQuery = supabase
          .from('employees')
          .select(
            'id, name, company_name, function_id, status, registration_number, reference_month',
          )
          .eq('plant_id', selectedPlant)

        if (staffLogIds.length > 0)
          empsQuery = empsQuery.or(`status.eq.Ativo,id.in.(${staffLogIds.join(',')})`)
        else empsQuery = empsQuery.eq('status', 'Ativo')

        const { data: emps, error: empsError } = await empsQuery
        if (empsError && empsError.code !== 'PGRST116') throw empsError

        if (emps && emps.length > 0) {
          const uniqueEmpsMap = new Map()
          emps.forEach((e) => {
            if (!e || !e.id) return
            const regNum = e.registration_number?.trim()
            const name = e.name?.toLowerCase().trim()
            const key = regNum ? regNum : name || e.id

            if (!uniqueEmpsMap.has(key)) {
              uniqueEmpsMap.set(key, e)
            } else {
              const existing = uniqueEmpsMap.get(key)
              if (e.reference_month === refMonth && existing.reference_month !== refMonth) {
                uniqueEmpsMap.set(key, e)
              } else if (staffLogIds.includes(e.id) && !staffLogIds.includes(existing.id)) {
                uniqueEmpsMap.set(key, e)
              } else if (e.status === 'Ativo' && existing.status !== 'Ativo') {
                uniqueEmpsMap.set(key, e)
              } else if (!existing.reference_month && e.reference_month) {
                uniqueEmpsMap.set(key, e)
              }
            }
          })
          fetchedEmps = Array.from(uniqueEmpsMap.values())
        }
      }

      if (fetchedEmps && fetchedEmps.length > 0) {
        const uniqueEmps = fetchedEmps.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
        if (!isActive) return
        setEmployees(uniqueEmps)
        const statuses = await getTrainingStatuses(uniqueEmps, true)
        if (!isActive) return
        setTrainingStatuses(statuses || { statusMap: {}, detailsMap: {} })
      } else {
        if (!isActive) return
        setEmployees([])
        setTrainingStatuses({ statusMap: {}, detailsMap: {} })
      }

      const equipmentLogIds = Array.from(
        new Set(
          fetchedLogs
            .filter((l) => l?.type === 'equipment' && l?.reference_id)
            .map((l) => l.reference_id),
        ),
      )
      let eqsQuery = supabase
        .from('equipment')
        .select('id, name, type, quantity, status')
        .eq('plant_id', selectedPlant)

      if (equipmentLogIds.length > 0)
        eqsQuery = eqsQuery.or(`status.eq.Ativo,id.in.(${equipmentLogIds.join(',')})`)
      else eqsQuery = eqsQuery.eq('status', 'Ativo')
      eqsQuery = eqsQuery.order('name')

      const { data: eqs, error: eqsError } = await eqsQuery
      if (eqsError && eqsError.code !== 'PGRST116') throw eqsError

      if (eqs && eqs.length > 0) {
        const uniqueEqsMap = new Map()
        eqs.forEach((e) => {
          if (e && e.id && !uniqueEqsMap.has(e.id)) {
            uniqueEqsMap.set(e.id, e)
          }
        })
        const uniqueEqs = Array.from(uniqueEqsMap.values()).sort((a, b) =>
          (a.name || '').localeCompare(b.name || ''),
        )
        if (isActive) setEquipment(uniqueEqs)
      } else {
        if (isActive) setEquipment([])
      }
    } catch (error: any) {
      if (!isActive) return
      console.error('Data loading error:', error)
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao carregar os dados.',
        variant: 'destructive',
      })
    } finally {
      if (isActive) setLoading(false)
    }
  }

  const handleToggleNonWorkingDay = async (checked: boolean) => {
    const currentPlantObj = plants.find((p) => p.id === selectedPlant)
    let clientId = currentPlantObj?.client_id

    if (!clientId) {
      const { data: rpcClientId } = await supabase.rpc('get_user_client_id')
      if (rpcClientId) clientId = rpcClientId
    }

    if (!checked && nonWorkingDayId) {
      const { error } = await supabase
        .from('plant_non_working_days')
        .delete()
        .eq('id', nonWorkingDayId)
      if (!error) {
        setIsNonWorkingDay(false)
        setNonWorkingDayId(null)
        toast({ title: 'Sucesso', description: 'Dia marcado como útil.' })
      }
    } else if (checked && clientId) {
      const { data, error } = await supabase
        .from('plant_non_working_days')
        .insert({
          client_id: clientId,
          plant_id: selectedPlant,
          date: dateStr,
          description: 'Dia Não Útil',
        })
        .select()
        .maybeSingle()

      if (!error && data) {
        setIsNonWorkingDay(true)
        setNonWorkingDayId(data.id)
        toast({ title: 'Sucesso', description: 'Dia marcado como não útil.' })
      }
    }
  }

  const handleToggleLog = async (
    type: 'staff' | 'equipment',
    referenceId: string,
    newStatus: boolean,
  ) => {
    const toggleKey = `${type}-${referenceId}`
    if (toggling[toggleKey]) return

    if (isEditingPublished) {
      setDirtyLogs((prev) => {
        const next = new Set(prev)
        next.add(toggleKey)
        return next
      })
      setDailyLogs((prev) => {
        const existing = prev.find((l) => l.type === type && l.reference_id === referenceId)
        if (existing) {
          return prev.map((l) => (l === existing ? { ...l, status: newStatus } : l))
        } else {
          return [
            ...prev,
            {
              plant_id: selectedPlant,
              date: dateStr,
              type,
              reference_id: referenceId,
              status: newStatus,
              is_published: true,
            },
          ]
        }
      })
      return
    }

    setToggling((prev) => ({ ...prev, [toggleKey]: true }))

    const currentPlant = plants.find((p) => p.id === selectedPlant)
    let clientId = currentPlant?.client_id

    try {
      if (!clientId) {
        const { data: rpcClientId } = await supabase.rpc('get_user_client_id')
        if (rpcClientId) clientId = rpcClientId
      }

      if (!clientId) throw new Error('Vínculo de cliente inválido')

      const payload = {
        client_id: clientId,
        plant_id: selectedPlant,
        type,
        reference_id: referenceId,
        date: dateStr,
        status: newStatus,
        is_published: false,
      }

      const { data, error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'date,type,reference_id' })
        .select()
        .maybeSingle()

      if (error) throw error

      if (data) {
        setDailyLogs((prev) => {
          const filtered = prev.filter((l) => !(l.type === type && l.reference_id === referenceId))
          return [...filtered, data]
        })
      }
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar o registro.',
        variant: 'destructive',
      })
    } finally {
      setToggling((prev) => ({ ...prev, [toggleKey]: false }))
    }
  }

  const handleSaveChanges = async () => {
    setLoading(true)
    try {
      const currentPlant = plants.find((p) => p.id === selectedPlant)
      let clientId = currentPlant?.client_id

      if (!clientId) {
        const { data: rpcClientId } = await supabase.rpc('get_user_client_id')
        if (rpcClientId) clientId = rpcClientId
      }

      if (!clientId) throw new Error('Vínculo de cliente inválido')

      const logsToUpsert = dailyLogs
        .filter((l) => dirtyLogs.has(`${l.type}-${l.reference_id}`))
        .map((l) => ({
          client_id: clientId,
          plant_id: selectedPlant,
          type: l.type,
          reference_id: l.reference_id,
          date: dateStr,
          status: l.status,
          is_published: true,
        }))

      if (logsToUpsert.length > 0) {
        const { error } = await supabase
          .from('daily_logs')
          .upsert(logsToUpsert, { onConflict: 'date,type,reference_id' })

        if (error) throw error
      }

      toast({ title: 'Sucesso', description: 'Alterações salvas com sucesso!' })
      setIsEditingPublished(false)
      setDirtyLogs(new Set())
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao salvar as alterações.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handlePublishDay = async () => {
    if (dailyLogs.length === 0) return
    const { error } = await supabase
      .from('daily_logs')
      .update({ is_published: true })
      .eq('plant_id', selectedPlant)
      .eq('date', dateStr)
    if (!error) {
      setDailyLogs((prev) => prev.map((l) => ({ ...l, is_published: true })))
      toast({ title: 'Sucesso', description: 'Dia finalizado com sucesso!' })
    }
  }

  const isDayPublished = dailyLogs?.length > 0 && dailyLogs.every((l) => l?.is_published)

  return (
    <div className="max-w-[1200px] mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0F4C81]">Lançamentos Diários</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie a presença de terceiros e equipamentos dia a dia.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
          <div className="flex items-center gap-2 px-2">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="w-[180px] border-0 bg-transparent focus:ring-0 shadow-none h-8 p-0 font-medium">
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

          <div className="w-[1px] h-6 bg-slate-200 hidden sm:block"></div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(subDays(selectedDate, 1))}
              className="h-8 w-8"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={'outline'}
                  className={cn(
                    'w-[200px] justify-start text-left font-medium h-8 border-transparent',
                    !selectedDate && 'text-muted-foreground',
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4 text-muted-foreground" />
                  {selectedDate ? (
                    format(selectedDate, "dd 'de' MMMM, yyyy", { locale: ptBR })
                  ) : (
                    <span>Selecione</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(d) => d && setSelectedDate(d)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>

            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSelectedDate(addDays(selectedDate, 1))}
              className="h-8 w-8"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <Card
        className={cn(
          'border-l-4 shadow-sm transition-colors',
          isNonWorkingDay ? 'border-l-amber-500 bg-amber-50/50' : 'border-l-[#2B95D6]',
        )}
      >
        <CardHeader className="pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              Diário de {format(selectedDate, 'dd/MM/yyyy')}
              {isNonWorkingDay && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
                  <AlertTriangle className="h-3 w-3" />
                  Dia Não Útil
                </span>
              )}
            </CardTitle>
            <CardDescription className="mt-1.5">
              {isNonWorkingDay
                ? 'Este dia está marcado como não útil e não impactará os indicadores.'
                : 'Lançamento de presença e utilização de recursos.'}
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            {dailyLogs.length > 0 && (
              <div className="flex items-center gap-2">
                {isDayPublished ? (
                  isEditingPublished ? (
                    <>
                      <Button
                        variant="outline"
                        onClick={() => {
                          setIsEditingPublished(false)
                          setDirtyLogs(new Set())
                          loadDataForDate(true)
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button
                        onClick={handleSaveChanges}
                        className="bg-amber-600 hover:bg-amber-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Salvar Alterações
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="inline-flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-medium shadow-sm">
                        <Check className="h-4 w-4" />
                        Dia Finalizado
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => setIsEditingPublished(true)}
                        className="text-amber-700 border-amber-200 hover:bg-amber-50"
                      >
                        Editar Lançamentos
                      </Button>
                    </>
                  )
                ) : (
                  <Button
                    variant="default"
                    onClick={handlePublishDay}
                    className="bg-[#0F4C81] hover:bg-[#0F4C81]/90 text-white"
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Finalizar Lançamentos
                  </Button>
                )}
              </div>
            )}
            <div className="flex items-center gap-3 bg-white border px-3 py-2 rounded-lg shadow-sm">
              <span className="text-sm font-medium text-slate-700">Dia Não Útil</span>
              <Switch
                checked={isNonWorkingDay}
                onCheckedChange={handleToggleNonWorkingDay}
                className="data-[state=checked]:bg-amber-500"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isEditingPublished && (
            <div className="bg-amber-100 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-center gap-3 mb-6 animate-in fade-in zoom-in duration-300">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div>
                <p className="font-semibold text-sm">Editando dia finalizado</p>
                <p className="text-sm opacity-90">
                  Você está alterando os registros de um dia que já foi publicado. Não esqueça de
                  salvar suas alterações.
                </p>
              </div>
            </div>
          )}

          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="bg-white border p-1 shadow-sm">
              <TabsTrigger
                value="colaboradores"
                className="data-[state=active]:bg-slate-100 data-[state=active]:text-[#0F4C81]"
              >
                Colaboradores
              </TabsTrigger>
              <TabsTrigger
                value="equipamentos"
                className="data-[state=active]:bg-slate-100 data-[state=active]:text-[#0F4C81]"
              >
                Equipamentos
              </TabsTrigger>
            </TabsList>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#2B95D6]" />
                <p>Carregando dados...</p>
              </div>
            ) : (
              <>
                <TabsContent value="colaboradores" className="m-0 focus-visible:outline-none">
                  {!employees || employees.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg bg-white shadow-sm">
                      <p className="text-muted-foreground">Nenhum registro encontrado.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Colaborador</TableHead>
                            <TableHead>Empresa</TableHead>
                            <TableHead className="text-center">Status Treinamentos</TableHead>
                            <TableHead className="text-right w-[140px]">Presente</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp) => {
                            if (!emp || !emp.id) return null
                            const log = dailyLogs?.find(
                              (l) => l?.type === 'staff' && l?.reference_id === emp.id,
                            )
                            const isPresent = !!log?.status
                            return (
                              <TableRow
                                key={emp.id}
                                className={cn(isNonWorkingDay && 'opacity-60')}
                              >
                                <TableCell className="font-medium">{emp.name || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-sm">
                                  {emp.company_name || '-'}
                                </TableCell>
                                <TableCell className="text-center">
                                  <TrainingStatusCell
                                    employeeName={emp?.name || ''}
                                    statusData={{
                                      status:
                                        trainingStatuses?.statusMap?.[emp.id] ||
                                        (emp?.function_id ? 'Apto' : 'Função não definida'),
                                      details: trainingStatuses?.detailsMap?.[emp.id] || [],
                                    }}
                                  />
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end pr-4">
                                    <Switch
                                      checked={isPresent}
                                      onCheckedChange={(checked) =>
                                        handleToggleLog('staff', emp.id, checked)
                                      }
                                      disabled={
                                        toggling[`staff-${emp.id}`] ||
                                        (!!log?.is_published && !isEditingPublished)
                                      }
                                      className="data-[state=checked]:bg-emerald-500"
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
                <TabsContent value="equipamentos" className="m-0 focus-visible:outline-none">
                  {!equipment || equipment.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg bg-white shadow-sm">
                      <p className="text-muted-foreground">Nenhum registro encontrado.</p>
                    </div>
                  ) : (
                    <div className="rounded-lg border bg-white shadow-sm overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Equipamento</TableHead>
                            <TableHead>Tipo</TableHead>
                            <TableHead className="text-center">Qtd.</TableHead>
                            <TableHead className="text-right w-[140px]">Em Uso</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {equipment.map((eq) => {
                            if (!eq || !eq.id) return null
                            const log = dailyLogs?.find(
                              (l) => l?.type === 'equipment' && l?.reference_id === eq.id,
                            )
                            const isUsed = !!log?.status
                            return (
                              <TableRow key={eq.id} className={cn(isNonWorkingDay && 'opacity-60')}>
                                <TableCell className="font-medium">{eq.name || '-'}</TableCell>
                                <TableCell className="text-muted-foreground text-sm capitalize">
                                  {eq.type || '-'}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                  {eq.quantity || 0}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex justify-end pr-4">
                                    <Switch
                                      checked={isUsed}
                                      onCheckedChange={(checked) =>
                                        handleToggleLog('equipment', eq.id, checked)
                                      }
                                      disabled={
                                        toggling[`equipment-${eq.id}`] ||
                                        (!!log?.is_published && !isEditingPublished)
                                      }
                                      className="data-[state=checked]:bg-emerald-500"
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            )
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>
              </>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  )
}
