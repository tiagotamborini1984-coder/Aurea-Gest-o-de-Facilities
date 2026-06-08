import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useTrainingStatus } from '@/hooks/use-training-status'
import { format } from 'date-fns'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useToast } from '@/hooks/use-toast'
import {
  FileBadge,
  Search,
  AlertCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Eye,
  Upload,
  Loader2,
  FileText,
  Trash2,
} from 'lucide-react'

export default function Treinamentos() {
  const { activeClient } = useAppStore()
  const { getTrainingStatuses } = useTrainingStatus()
  const { toast } = useToast()

  const [month, setMonth] = useState<string>(format(new Date(), 'yyyy-MM'))
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')

  const [employees, setEmployees] = useState<any[]>([])
  const [trainingStatuses, setTrainingStatuses] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)

  const [selectedEmp, setSelectedEmp] = useState<any | null>(null)
  const [empRecords, setEmpRecords] = useState<any[]>([])
  const [reqTrainings, setReqTrainings] = useState<any[]>([])
  const [isRecordsLoading, setIsRecordsLoading] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient && month) {
      fetchData()
    }
  }, [activeClient, selectedPlant, month])

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
    const referenceMonth = month + '-01'

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
    }
    setIsLoading(false)
  }

  const openDetails = async (emp: any) => {
    setSelectedEmp(emp)
    setIsRecordsLoading(true)

    // Fetch required trainings for this function
    const { data: reqs } = await supabase
      .from('function_required_trainings')
      .select('*, trainings(*)')
      .eq('function_id', emp.function_id)

    setReqTrainings(reqs || [])

    // Find all emp ids that share this registration number to get unified history
    if (emp.registration_number) {
      const { data: relatedEmps } = await supabase
        .from('employees')
        .select('id')
        .eq('client_id', activeClient?.id)
        .eq('registration_number', emp.registration_number)

      const ids = relatedEmps?.map((e) => e.id) || [emp.id]

      const { data: records } = await supabase
        .from('employee_training_records')
        .select('*, trainings(*)')
        .in('employee_id', ids)
        .order('completion_date', { ascending: false })

      setEmpRecords(records || [])
    } else {
      const { data: records } = await supabase
        .from('employee_training_records')
        .select('*, trainings(*)')
        .eq('employee_id', emp.id)
        .order('completion_date', { ascending: false })

      setEmpRecords(records || [])
    }

    setIsRecordsLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, trainingId: string) => {
    const file = e.target.files?.[0]
    if (!file || !selectedEmp) return

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedEmp.registration_number || selectedEmp.id}_${trainingId}_${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`trainings/${fileName}`, file, { cacheControl: '3600', upsert: false })

      if (uploadError) throw uploadError

      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(`trainings/${fileName}`)

      const { data: newRecord, error: insertError } = await supabase
        .from('employee_training_records')
        .insert({
          client_id: activeClient?.id,
          employee_id: selectedEmp.id,
          training_id: trainingId,
          document_url: urlData.publicUrl,
          completion_date: new Date().toISOString().split('T')[0],
        })
        .select('*, trainings(*)')
        .single()

      if (insertError) throw insertError

      if (newRecord) {
        setEmpRecords((prev) => [newRecord, ...prev])
        toast({ title: 'Treinamento anexado com sucesso!' })
        // Refresh master list status in background
        fetchData()
      }
    } catch (err: any) {
      toast({ title: 'Erro ao enviar arquivo', description: err.message, variant: 'destructive' })
    } finally {
      setIsUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleDeleteRecord = async (recordId: string) => {
    try {
      const { error } = await supabase.from('employee_training_records').delete().eq('id', recordId)
      if (error) throw error
      setEmpRecords((prev) => prev.filter((r) => r.id !== recordId))
      toast({ title: 'Registro removido com sucesso' })
      fetchData()
    } catch (err: any) {
      toast({ title: 'Erro ao remover', description: err.message, variant: 'destructive' })
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
          <FileBadge className="h-8 w-8 text-brand-vividBlue" />
          Gestão de Treinamentos
        </h1>
        <p className="text-gray-500 text-sm mt-1">
          Monitore o histórico unificado e a validade dos treinamentos obrigatórios por função.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
              <Input
                type="month"
                value={month}
                onChange={(e) => setMonth(e.target.value)}
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
                  <TableHead>Status Geral</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-vividBlue mb-2" />
                      Calculando compliance de treinamentos...
                    </TableCell>
                  </TableRow>
                ) : filteredEmployees.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                      Nenhum colaborador encontrado para este mês.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmployees.map((emp) => {
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
                          {emp.functions?.name || 'Não informada'}
                        </TableCell>
                        <TableCell>{getStatusBadge(status)}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-brand-deepBlue hover:text-brand-vividBlue hover:bg-blue-50"
                            onClick={() => openDetails(emp)}
                          >
                            <Eye className="w-4 h-4 mr-2" /> Detalhes
                          </Button>
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

      <Dialog open={!!selectedEmp} onOpenChange={(v) => !v && setSelectedEmp(null)}>
        <DialogContent className="sm:max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Histórico de Treinamentos</DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Colaborador:{' '}
              <span className="font-semibold text-foreground">{selectedEmp?.name}</span>
              {selectedEmp?.registration_number && ` | Reg: ${selectedEmp.registration_number}`}
            </p>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 space-y-6 mt-4">
            {isRecordsLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-8 h-8 animate-spin text-brand-vividBlue" />
              </div>
            ) : (
              <>
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">
                    Treinamentos Obrigatórios (Função: {selectedEmp?.functions?.name})
                  </h3>
                  {reqTrainings.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Esta função não possui treinamentos obrigatórios cadastrados.
                    </p>
                  ) : (
                    <div className="grid gap-3">
                      {reqTrainings.map((req) => {
                        const trRecords = empRecords.filter(
                          (r) => r.training_id === req.training_id,
                        )
                        const latest = trRecords[0]
                        let trStatus = 'Pendente'
                        let expDate: Date | null = null

                        if (latest) {
                          trStatus = 'Concluído'
                          if (req.trainings.validity_months > 0) {
                            expDate = new Date(latest.completion_date)
                            expDate.setMonth(expDate.getMonth() + req.trainings.validity_months)
                            if (expDate < new Date()) trStatus = 'Vencido'
                          }
                        }

                        return (
                          <div
                            key={req.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-slate-50 border rounded-lg gap-4"
                          >
                            <div>
                              <div className="font-medium text-sm text-gray-900">
                                {req.trainings?.name}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                                <span>
                                  Validade:{' '}
                                  {req.trainings.validity_months
                                    ? `${req.trainings.validity_months} meses`
                                    : 'Vitalício'}
                                </span>
                                {latest && (
                                  <span>
                                    Última realização:{' '}
                                    {format(new Date(latest.completion_date), 'dd/MM/yyyy')}
                                  </span>
                                )}
                                {expDate && (
                                  <span
                                    className={
                                      trStatus === 'Vencido' ? 'text-red-600 font-semibold' : ''
                                    }
                                  >
                                    Vence em: {format(expDate, 'dd/MM/yyyy')}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              {getStatusBadge(trStatus)}
                              <div className="relative">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="relative cursor-pointer hover:bg-slate-100"
                                  disabled={isUploading}
                                >
                                  {isUploading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                  ) : (
                                    <Upload className="w-4 h-4 mr-2" />
                                  )}
                                  {isUploading ? 'Enviando' : 'Anexar'}
                                </Button>
                                <input
                                  type="file"
                                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                                  accept=".pdf,image/*"
                                  onChange={(e) => handleFileUpload(e, req.training_id)}
                                  disabled={isUploading}
                                />
                              </div>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-semibold border-b pb-2">
                    Histórico Completo de Documentos
                  </h3>
                  {empRecords.length === 0 ? (
                    <p className="text-sm text-muted-foreground italic">
                      Nenhum registro encontrado no histórico unificado.
                    </p>
                  ) : (
                    <div className="border rounded-lg overflow-hidden">
                      <Table>
                        <TableHeader className="bg-slate-50">
                          <TableRow>
                            <TableHead>Treinamento</TableHead>
                            <TableHead>Data Realização</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {empRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium text-sm">
                                {record.trainings?.name}
                              </TableCell>
                              <TableCell className="text-sm">
                                {format(new Date(record.completion_date), 'dd/MM/yyyy')}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    asChild
                                    className="h-8 w-8 text-brand-deepBlue hover:bg-blue-50"
                                  >
                                    <a
                                      href={record.document_url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </a>
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                    onClick={() => handleDeleteRecord(record.id)}
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
