import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useTrainingStatus } from '@/hooks/use-training-status'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  CalendarCheck,
  Search,
  Users,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function Lancamentos() {
  const { activeClient } = useAppStore()
  const { getTrainingStatuses } = useTrainingStatus()
  const { toast } = useToast()

  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'))
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [employees, setEmployees] = useState<any[]>([])
  const [dailyLogs, setDailyLogs] = useState<any[]>([])
  const [trainingStatuses, setTrainingStatuses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient && date) {
      fetchData()
    }
  }, [activeClient, selectedPlant, date])

  const fetchPlants = async () => {
    const { data } = await supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient?.id)
      .order('name')
    if (data) setPlants(data)
  }

  const fetchData = async () => {
    setIsLoading(true)
    const referenceMonth = date.substring(0, 7) + '-01'

    let q = supabase
      .from('employees')
      .select('*, functions(name)')
      .eq('client_id', activeClient?.id)
      .eq('reference_month', referenceMonth)
      .eq('status', 'Ativo')

    if (selectedPlant !== 'all') {
      q = q.eq('plant_id', selectedPlant)
    }

    const { data: emps } = await q

    if (emps) {
      setEmployees(emps)
      const statuses = await getTrainingStatuses(emps)
      setTrainingStatuses(statuses)

      // Fetch logs for the specific date
      const { data: logs } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('client_id', activeClient?.id)
        .eq('date', date)
        .eq('type', 'staff')

      setDailyLogs(logs || [])
    }
    setIsLoading(false)
  }

  const handleToggleLog = async (employeeId: string, plantId: string, currentStatus: boolean) => {
    const existingLog = dailyLogs.find((l) => l.reference_id === employeeId)

    if (existingLog) {
      if (currentStatus) {
        // Remove log to set false
        await supabase.from('daily_logs').delete().eq('id', existingLog.id)
        setDailyLogs((prev) => prev.filter((l) => l.id !== existingLog.id))
      }
    } else {
      if (!currentStatus) {
        // Add log to set true
        const newLog = {
          client_id: activeClient?.id,
          plant_id: plantId,
          reference_id: employeeId,
          type: 'staff',
          date: date,
          status: true,
        }
        const { data, error } = await supabase.from('daily_logs').insert(newLog).select().single()
        if (data && !error) {
          setDailyLogs((prev) => [...prev, data])
        } else if (error) {
          toast({
            title: 'Erro ao registrar presença',
            description: error.message,
            variant: 'destructive',
          })
        }
      }
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluído':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Regular
          </Badge>
        )
      case 'Pendente':
        return (
          <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
            <AlertTriangle className="w-3 h-3 mr-1" /> Pendente
          </Badge>
        )
      case 'Vencido':
        return (
          <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
            <AlertCircle className="w-3 h-3 mr-1" /> Vencido
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-500">
            <Info className="w-3 h-3 mr-1" /> N/A
          </Badge>
        )
    }
  }

  const filteredEmployees = employees.filter(
    (e) =>
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      e.company_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.registration_number &&
        e.registration_number.toLowerCase().includes(searchTerm.toLowerCase())),
  )

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <CalendarCheck className="h-8 w-8 text-brand-vividBlue" />
          Lançamentos de Presença
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Registre a presença diária e verifique a conformidade de treinamentos.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full sm:w-auto bg-white"
              />
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-full sm:w-[220px] bg-white">
                  <SelectValue placeholder="Todas as Plantas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar colaborador..."
                className="pl-9 bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Função</TableHead>
                  <TableHead className="text-center">Treinamentos</TableHead>
                  <TableHead className="text-right">Presença</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Carregando colaboradores...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      <Users className="h-10 w-10 mx-auto mb-2 opacity-20" />
                      Nenhum colaborador encontrado para este filtro.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => {
                    const isPresent = dailyLogs.some((l) => l.reference_id === emp.id)
                    const status = trainingStatuses[emp.id] || 'N/A'

                    return (
                      <TableRow key={emp.id} className="hover:bg-slate-50/50">
                        <TableCell>
                          <div className="font-medium text-gray-900">{emp.name}</div>
                          {emp.registration_number && (
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {emp.registration_number}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {emp.company_name}
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {emp.functions?.name || '-'}
                        </TableCell>
                        <TableCell className="text-center">{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-3">
                            <span className="text-sm font-medium text-gray-600">
                              {isPresent ? 'Presente' : 'Ausente'}
                            </span>
                            <Switch
                              checked={isPresent}
                              onCheckedChange={() =>
                                handleToggleLog(emp.id, emp.plant_id, isPresent)
                              }
                              className={
                                status === 'Vencido' || status === 'Pendente'
                                  ? 'data-[state=checked]:bg-amber-500'
                                  : ''
                              }
                            />
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
