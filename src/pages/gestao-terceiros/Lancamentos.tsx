import { useState, useEffect, useMemo } from 'react'
import { format, startOfMonth, endOfMonth, eachDayOfInterval, parseISO, isWeekend } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Check, Building2, Info, Loader2 } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
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
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'
import { TrainingStatusCell } from '@/components/gestao-terceiros/TrainingStatusCell'
import { useTrainingStatus } from '@/hooks/use-training-status'
import { cn } from '@/lib/utils'

// Robust date normalization function to fix the "missing day" bug
const normalizeDate = (dateVal: string | null | undefined) => {
  if (!dateVal) return ''
  return dateVal.split('T')[0]
}

export default function Lancamentos() {
  const { toast } = useToast()
  const { getTrainingStatuses } = useTrainingStatus()

  const [referenceMonth, setReferenceMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('')

  const [employees, setEmployees] = useState<any[]>([])
  const [equipment, setEquipment] = useState<any[]>([])
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [nonWorkingDays, setNonWorkingDays] = useState<any[]>([])
  const [trainingStatuses, setTrainingStatuses] = useState<any>({ statusMap: {}, detailsMap: {} })

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('colaboradores')
  const [toggling, setToggling] = useState<Record<string, boolean>>({})

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

  // Acts as our Query Key for Cache Invalidation: refetches when plant or month changes
  useEffect(() => {
    if (selectedPlant && referenceMonth) {
      loadData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPlant, referenceMonth])

  const fetchDailyLogs = async (
    clientId: string | null,
    plantId: string,
    startDate: Date,
    endDate: Date,
  ) => {
    let query = supabase
      .from('daily_logs')
      .select('*')
      .eq('plant_id', plantId)
      .gte('date', format(startDate, 'yyyy-MM-dd'))
      .lte('date', format(endDate, 'yyyy-MM-dd'))

    if (clientId) {
      query = query.eq('client_id', clientId)
    }

    const { data: logs, error: logsError } = await query

    if (logsError) throw logsError

    const fetchedLogs = logs || []
    setDailyLogs(fetchedLogs)
    return fetchedLogs
  }

  const loadData = async () => {
    setLoading(true)
    try {
      const [year, month] = referenceMonth.split('-').map(Number)
      const dateStart = new Date(year, month - 1, 1)
      const dateEnd = new Date(year, month, 0)
      const monthStartDb = `${referenceMonth}-01`

      const currentPlantObj = plants.find((p) => p.id === selectedPlant)
      if (!currentPlantObj) {
        setEmployees([])
        setEquipment([])
        setLoading(false)
        return
      }

      let finalClientId = currentPlantObj.client_id
      if (!finalClientId) {
        const { data: rpcClientId } = await supabase.rpc('get_user_client_id')
        if (rpcClientId) finalClientId = rpcClientId
      }

      // 1. Fetch Daily Logs first to optimize joined queries and capture all records with logs
      const fetchedLogs = await fetchDailyLogs(finalClientId, selectedPlant, dateStart, dateEnd)

      // 2. Colaboradores: Fetch active OR if they have daily_logs in the current month
      const staffLogIds = Array.from(
        new Set(fetchedLogs.filter((l) => l.type === 'staff').map((l) => l.reference_id)),
      )

      let empsQuery = supabase
        .from('employees')
        .select('id, name, company_name, function_id, registration_number, reference_month, status')
        .eq('plant_id', selectedPlant)

      if (staffLogIds.length > 0) {
        empsQuery = empsQuery.or(`status.eq.Ativo,id.in.(${staffLogIds.join(',')})`)
      } else {
        empsQuery = empsQuery.eq('status', 'Ativo')
      }
      empsQuery = empsQuery.order('name')

      const { data: emps, error: empsError } = await empsQuery

      if (empsError) throw empsError

      if (emps) {
        // Deduplicate locally just in case
        const uniqueEmps = Array.from(new Map(emps.map((e) => [e.id, e])).values())
        setEmployees(uniqueEmps)
        const statuses = await getTrainingStatuses(uniqueEmps, true)
        setTrainingStatuses(statuses || { statusMap: {}, detailsMap: {} })
      } else {
        setEmployees([])
      }

      // 3. Equipamentos: Fetch active OR if they have daily_logs in the current month
      const equipmentLogIds = Array.from(
        new Set(fetchedLogs.filter((l) => l.type === 'equipment').map((l) => l.reference_id)),
      )

      let eqsQuery = supabase
        .from('equipment')
        .select('id, name, type, quantity')
        .eq('plant_id', selectedPlant)

      if (equipmentLogIds.length > 0) {
        eqsQuery = eqsQuery.or(`status.eq.Ativo,id.in.(${equipmentLogIds.join(',')})`)
      } else {
        eqsQuery = eqsQuery.eq('status', 'Ativo')
      }
      eqsQuery = eqsQuery.order('name')

      const { data: eqs, error: eqsError } = await eqsQuery

      if (eqsError) throw eqsError

      const uniqueEqs = Array.from(new Map((eqs || []).map((e) => [e.id, e])).values())
      setEquipment(uniqueEqs)

      // Dias Não Úteis
      const { data: nwDays, error: nwDaysError } = await supabase
        .from('plant_non_working_days')
        .select('*')
        .eq('plant_id', selectedPlant)
        .gte('date', format(dateStart, 'yyyy-MM-dd'))
        .lte('date', format(dateEnd, 'yyyy-MM-dd'))

      if (nwDaysError) throw nwDaysError
      setNonWorkingDays(nwDays || [])
    } catch (error: any) {
      console.error('Data loading error:', error)
      const errorMsg = error.message || error.details || 'Ocorreu um erro ao carregar os dados.'
      toast({
        title: 'Erro ao carregar dados',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleToggleLog = async (
    type: 'staff' | 'equipment',
    referenceId: string,
    date: string,
    currentStatus: boolean,
  ) => {
    const toggleKey = `${type}-${referenceId}-${date}`
    if (toggling[toggleKey]) return

    setToggling((prev) => ({ ...prev, [toggleKey]: true }))

    const currentPlant = plants.find((p) => p.id === selectedPlant)
    const clientId = currentPlant?.client_id

    try {
      let finalClientId = clientId
      if (!finalClientId) {
        const { data: rpcClientId } = await supabase.rpc('get_user_client_id')
        if (rpcClientId) finalClientId = rpcClientId
      }

      if (!finalClientId) {
        toast({
          title: 'Vínculo de cliente inválido',
          description: `A planta '${currentPlant?.name || 'selecionada'}' não possui um cliente associado e não foi possível identificar o cliente do usuário.`,
          variant: 'destructive',
        })
        setToggling((prev) => ({ ...prev, [toggleKey]: false }))
        return
      }

      const newStatus = !currentStatus

      const payload: any = {
        client_id: finalClientId,
        plant_id: selectedPlant,
        type,
        reference_id: referenceId,
        date,
        status: newStatus,
        is_published: false,
      }

      // DO NOT pass `id` so the upsert relies entirely on the unique constraint `date,type,reference_id`.
      const response = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'date,type,reference_id' })
        .select()
        .maybeSingle()

      const data = response.data
      const error = response.error
      const status = response.status

      if (error) {
        throw error
      }

      if (!data) {
        throw {
          message: 'A operação não retornou dados. Verifique suas permissões na planta.',
          code: 'RLS_NO_DATA',
        }
      }

      if (status >= 200 && status < 300) {
        // Immediate local state update for fast UI feedback
        setDailyLogs((prev) => {
          const filtered = prev.filter((l) => {
            const logDate = normalizeDate(l.date)
            return !(l.type === type && l.reference_id === referenceId && logDate === date)
          })
          return [...filtered, data]
        })

        // State Consistency: refresh the logs from the database to ensure UI is perfectly synced
        const [year, month] = referenceMonth.split('-').map(Number)
        const dateStart = new Date(year, month - 1, 1)
        const dateEnd = new Date(year, month, 0)

        await fetchDailyLogs(finalClientId, selectedPlant, dateStart, dateEnd)

        toast({
          title: 'Sucesso',
          description: `Registro atualizado para ${newStatus ? 'Presente' : 'Ausente'} com sucesso.`,
        })
      } else {
        throw { message: 'Status inesperado ao salvar: ' + status, code: 'UNKNOWN' }
      }
    } catch (error: any) {
      console.error('[BugScanner] Save error in daily_logs:', {
        error,
        payload: { type, referenceId, date, currentStatus, newStatus: !currentStatus },
        plant: selectedPlant,
      })

      const isRLS =
        error.code === '42501' ||
        error.code === 'RLS_NO_DATA' ||
        error.message?.includes('row-level security')
      const isConflict = error.code === '23505'
      const isFK =
        error.message?.includes('violates foreign key constraint') || error.code === '23503'

      let description = error.message || error.details || 'Tente novamente mais tarde.'

      if (isRLS) {
        description = `Erro de permissão: ${error.message || 'Verifique suas permissões de acesso para esta planta.'}`
      } else if (isConflict) {
        description = `Conflito: ${error.message || 'Este lançamento já existe para esta data.'}`
      } else if (isFK) {
        description = `Erro de vínculo: ${error.message || 'Cliente ou planta inválido no sistema.'}`
      } else if (error.message) {
        description = `Detalhes do erro: ${error.message}`
      }

      toast({
        title: 'Erro ao salvar lançamento',
        description,
        variant: 'destructive',
      })
    } finally {
      setToggling((prev) => ({ ...prev, [toggleKey]: false }))
    }
  }

  const toggleNonWorkingDay = async (date: string) => {
    const currentPlant = plants.find((p) => p.id === selectedPlant)
    let clientId = currentPlant?.client_id

    if (!clientId) {
      const { data: rpcClientId } = await supabase.rpc('get_user_client_id')
      if (rpcClientId) clientId = rpcClientId
    }

    if (!clientId) {
      toast({
        title: 'Vínculo de cliente inválido',
        description: `A planta '${currentPlant?.name || 'selecionada'}' não possui um cliente associado.`,
        variant: 'destructive',
      })
      return
    }

    const existing = nonWorkingDays.find((d) => {
      const nwDate = normalizeDate(d.date)
      return nwDate === date
    })

    if (existing) {
      const { error } = await supabase.from('plant_non_working_days').delete().eq('id', existing.id)
      if (!error) {
        setNonWorkingDays((prev) => prev.filter((d) => d.id !== existing.id))
        toast({
          title: 'Sucesso',
          description: 'Dia marcado como útil.',
        })
      } else {
        console.error('[BugScanner] Error deleting non working day:', error)
        toast({
          title: 'Erro ao excluir',
          description:
            error.code === '42501' || error.message?.includes('row-level security')
              ? 'Não foi possível salvar o lançamento. Verifique suas permissões de acesso para esta planta.'
              : `Não foi possível alterar o status do dia. Erro: ${error.message || error.code}`,
          variant: 'destructive',
        })
      }
    } else {
      const { data, error } = await supabase
        .from('plant_non_working_days')
        .insert({
          client_id: clientId,
          plant_id: selectedPlant,
          date,
          description: 'Dia Não Útil',
        })
        .select()
        .maybeSingle()

      if (!error && data) {
        setNonWorkingDays((prev) => [...prev, data])
        toast({
          title: 'Sucesso',
          description: 'Dia marcado como não útil.',
        })
      } else {
        console.error('[BugScanner] Error inserting non working day:', error)
        toast({
          title: 'Erro ao salvar',
          description:
            error?.code === '42501' || error?.message?.includes('row-level security')
              ? 'Não foi possível salvar o lançamento. Verifique suas permissões de acesso para esta planta.'
              : `Não foi possível alterar o status do dia. Erro: ${error?.message || 'Desconhecido'}`,
          variant: 'destructive',
        })
      }
    }
  }

  const daysInMonth = useMemo(() => {
    if (!referenceMonth) return []
    const [year, month] = referenceMonth.split('-').map(Number)
    const dateStart = new Date(year, month - 1, 1)
    const dateEnd = new Date(year, month, 0)
    return eachDayOfInterval({ start: dateStart, end: dateEnd })
  }, [referenceMonth])

  return (
    <div className="max-w-[1400px] mx-auto space-y-6 pb-10 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0F4C81]">Lançamentos</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie a presença de terceiros e equipamentos mês a mês.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex items-center gap-2 bg-white border rounded-md px-3 py-1 shadow-sm">
            <Building2 className="h-4 w-4 text-muted-foreground" />
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="w-[200px] border-0 bg-transparent focus:ring-0 shadow-none h-8 p-0 text-sm">
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

          <Input
            type="month"
            value={referenceMonth}
            onChange={(e) => setReferenceMonth(e.target.value)}
            className="w-[180px] shadow-sm"
          />
        </div>
      </div>

      <Card className="border-t-4 border-t-[#2B95D6] shadow-md">
        <CardHeader className="pb-3">
          <CardTitle>Diário de Frequência</CardTitle>
          <CardDescription>
            Mês de Referência:{' '}
            {format(
              new Date(
                Number(referenceMonth.split('-')[0]),
                Number(referenceMonth.split('-')[1]) - 1,
                1,
              ),
              'MMMM yyyy',
              { locale: ptBR },
            )}
          </CardDescription>{' '}
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <TabsList className="bg-slate-100 p-1">
                <TabsTrigger
                  value="colaboradores"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#0F4C81] data-[state=active]:shadow-sm"
                >
                  Colaboradores
                </TabsTrigger>
                <TabsTrigger
                  value="equipamentos"
                  className="data-[state=active]:bg-white data-[state=active]:text-[#0F4C81] data-[state=active]:shadow-sm"
                >
                  Equipamentos
                </TabsTrigger>
              </TabsList>

              <div className="flex items-center gap-1.5 text-xs text-muted-foreground bg-slate-50 px-3 py-1.5 rounded-full border">
                <Info className="h-4 w-4 text-blue-500" />
                <span>
                  Clique no cabeçalho do dia para alternar <strong>Dia Não Útil</strong>.
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin mb-4 text-[#2B95D6]" />
                <p>Carregando dados da planta...</p>
              </div>
            ) : (
              <>
                <TabsContent value="colaboradores" className="m-0 focus-visible:outline-none">
                  {employees.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg bg-slate-50/50">
                      <p className="text-muted-foreground">
                        Nenhum colaborador encontrado para esta unidade neste mês.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto bg-white max-h-[60vh] overflow-y-auto relative shadow-sm">
                      <Table className="w-max min-w-full border-collapse">
                        <TableHeader className="sticky top-0 z-30 bg-slate-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
                          <TableRow className="border-b">
                            <TableHead className="min-w-[220px] sticky left-0 z-40 bg-slate-50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              Colaborador
                            </TableHead>
                            <TableHead className="min-w-[150px] border-r">Empresa</TableHead>
                            <TableHead className="min-w-[140px] border-r text-center">
                              Treinamentos
                            </TableHead>
                            {daysInMonth.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd')
                              const isNW = nonWorkingDays.some((d) => {
                                const nwDate = normalizeDate(d.date)
                                return nwDate === dateStr
                              })
                              const isWknd = isWeekend(day)
                              return (
                                <TableHead
                                  key={dateStr}
                                  className={cn(
                                    'text-center px-1 min-w-[44px] cursor-pointer hover:bg-slate-200 transition-colors border-r select-none',
                                    isNW || isWknd
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'text-slate-700',
                                  )}
                                  onClick={() => toggleNonWorkingDay(dateStr)}
                                  title={isNW ? 'Remover Dia Não Útil' : 'Marcar como Dia Não Útil'}
                                >
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-[10px] uppercase font-medium">
                                      {format(day, 'E', { locale: ptBR }).substring(0, 3)}
                                    </span>
                                    <span className="font-semibold text-sm">
                                      {format(day, 'd')}
                                    </span>
                                  </div>
                                </TableHead>
                              )
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {employees.map((emp) => (
                            <TableRow key={emp.id} className="hover:bg-slate-50/50 group">
                              <TableCell className="min-w-[220px] sticky left-0 z-20 bg-white group-hover:bg-slate-50/50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-sm">
                                <div className="truncate max-w-[200px]" title={emp.name}>
                                  {emp.name}
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[150px] border-r text-xs text-muted-foreground">
                                <div className="truncate max-w-[130px]" title={emp.company_name}>
                                  {emp.company_name}
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[140px] border-r text-center">
                                <TrainingStatusCell
                                  employeeName={emp.name}
                                  statusData={{
                                    status: trainingStatuses.statusMap?.[emp.id] || 'N/A',
                                    details: trainingStatuses.detailsMap?.[emp.id] || [],
                                  }}
                                />
                              </TableCell>
                              {daysInMonth.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const isNW = nonWorkingDays.some((d) => {
                                  const nwDate = normalizeDate(d.date)
                                  return nwDate === dateStr
                                })
                                const isWknd = isWeekend(day)
                                const log = dailyLogs.find((l) => {
                                  const logDate = normalizeDate(l.date)
                                  return (
                                    l.type === 'staff' &&
                                    l.reference_id === emp.id &&
                                    logDate === dateStr
                                  )
                                })

                                return (
                                  <TableCell
                                    key={dateStr}
                                    className={cn(
                                      'text-center p-0 border-r',
                                      isNW || isWknd ? 'bg-slate-50' : '',
                                    )}
                                  >
                                    <button
                                      onClick={() =>
                                        handleToggleLog('staff', emp.id, dateStr, !!log?.status)
                                      }
                                      className="w-full h-full min-h-[44px] flex items-center justify-center hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={isNW || toggling[`staff-${emp.id}-${dateStr}`]}
                                      title={isNW ? 'Dia não útil' : 'Marcar presença'}
                                    >
                                      {toggling[`staff-${emp.id}-${dateStr}`] ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                      ) : log?.status ? (
                                        <Check className="h-5 w-5 text-emerald-500 drop-shadow-sm" />
                                      ) : null}
                                    </button>
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="equipamentos" className="m-0 focus-visible:outline-none">
                  {equipment.length === 0 ? (
                    <div className="text-center py-16 border rounded-lg bg-slate-50/50">
                      <p className="text-muted-foreground">
                        Nenhum equipamento ativo cadastrado na planta selecionada.
                      </p>
                    </div>
                  ) : (
                    <div className="rounded-lg border overflow-x-auto bg-white max-h-[60vh] overflow-y-auto relative shadow-sm">
                      <Table className="w-max min-w-full border-collapse">
                        <TableHeader className="sticky top-0 z-30 bg-slate-50 shadow-[0_1px_3px_0_rgba(0,0,0,0.1)]">
                          <TableRow className="border-b">
                            <TableHead className="min-w-[220px] sticky left-0 z-40 bg-slate-50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                              Equipamento
                            </TableHead>
                            <TableHead className="min-w-[150px] border-r">Tipo</TableHead>
                            <TableHead className="min-w-[80px] border-r text-center">
                              Qtd.
                            </TableHead>
                            {daysInMonth.map((day) => {
                              const dateStr = format(day, 'yyyy-MM-dd')
                              const isNW = nonWorkingDays.some((d) => {
                                const nwDate = normalizeDate(d.date)
                                return nwDate === dateStr
                              })
                              const isWknd = isWeekend(day)
                              return (
                                <TableHead
                                  key={dateStr}
                                  className={cn(
                                    'text-center px-1 min-w-[44px] cursor-pointer hover:bg-slate-200 transition-colors border-r select-none',
                                    isNW || isWknd
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'text-slate-700',
                                  )}
                                  onClick={() => toggleNonWorkingDay(dateStr)}
                                >
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-[10px] uppercase font-medium">
                                      {format(day, 'E', { locale: ptBR }).substring(0, 3)}
                                    </span>
                                    <span className="font-semibold text-sm">
                                      {format(day, 'd')}
                                    </span>
                                  </div>
                                </TableHead>
                              )
                            })}
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {equipment.map((eq) => (
                            <TableRow key={eq.id} className="hover:bg-slate-50/50 group">
                              <TableCell className="min-w-[220px] sticky left-0 z-20 bg-white group-hover:bg-slate-50/50 border-r shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)] font-medium text-sm">
                                <div className="truncate max-w-[200px]" title={eq.name}>
                                  {eq.name}
                                </div>
                              </TableCell>
                              <TableCell className="min-w-[150px] border-r text-xs text-muted-foreground capitalize">
                                {eq.type}
                              </TableCell>
                              <TableCell className="min-w-[80px] border-r text-center text-sm font-medium">
                                {eq.quantity}
                              </TableCell>
                              {daysInMonth.map((day) => {
                                const dateStr = format(day, 'yyyy-MM-dd')
                                const isNW = nonWorkingDays.some((d) => {
                                  const nwDate = normalizeDate(d.date)
                                  return nwDate === dateStr
                                })
                                const isWknd = isWeekend(day)
                                const log = dailyLogs.find((l) => {
                                  const logDate = normalizeDate(l.date)
                                  return (
                                    l.type === 'equipment' &&
                                    l.reference_id === eq.id &&
                                    logDate === dateStr
                                  )
                                })

                                return (
                                  <TableCell
                                    key={dateStr}
                                    className={cn(
                                      'text-center p-0 border-r',
                                      isNW || isWknd ? 'bg-slate-50' : '',
                                    )}
                                  >
                                    <button
                                      onClick={() =>
                                        handleToggleLog('equipment', eq.id, dateStr, !!log?.status)
                                      }
                                      className="w-full h-full min-h-[44px] flex items-center justify-center hover:bg-slate-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                      disabled={isNW || toggling[`equipment-${eq.id}-${dateStr}`]}
                                      title={isNW ? 'Dia não útil' : 'Marcar presença'}
                                    >
                                      {toggling[`equipment-${eq.id}-${dateStr}`] ? (
                                        <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                                      ) : log?.status ? (
                                        <Check className="h-5 w-5 text-emerald-500 drop-shadow-sm" />
                                      ) : null}
                                    </button>
                                  </TableCell>
                                )
                              })}
                            </TableRow>
                          ))}
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
