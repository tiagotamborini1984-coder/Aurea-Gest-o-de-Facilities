import { useState, useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useTrainingStatus } from '@/hooks/use-training-status'
import { resolveActiveEmployees } from '@/lib/employee-vigencia'
import { normalizeString } from '@/lib/string-utils'
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
import { verifyTrainingPresence } from '@/lib/training-verification'
import { VerificationBadge } from '@/components/gestao-terceiros/VerificationBadge'
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
import { DocumentViewer, DocumentViewerRef } from '@/components/DocumentViewer'

export default function Treinamentos() {
  const { activeClient } = useAppStore()
  const { getTrainingStatuses } = useTrainingStatus()
  const { toast } = useToast()

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

  // Viewer State
  const viewerRef = useRef<DocumentViewerRef>(null)

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient) {
      fetchData()
    }
  }, [activeClient, selectedPlant])

  const fetchPlants = async () => {
    const { data } = await supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient?.id)
      .order('name')
    if (data) setPlants(data)
  }

  const fetchData = async () => {
    if (!activeClient?.id) return
    setIsLoading(true)

    try {
      // Busca todos os colaboradores por planta (ou todas as plantas do cliente) sem filtrar pelo mês
      // A lista de colaboradores é paginada caso haja mais de 1000 registros
      let allEmps: any[] = []
      let from = 0
      const limit = 1000
      let hasMore = true

      while (hasMore) {
        let q = supabase
          .from('employees')
          .select('*, functions(name)')
          .eq('client_id', activeClient.id)
          .range(from, from + limit - 1)

        if (selectedPlant !== 'all') {
          q = q.eq('plant_id', selectedPlant)
        }

        const { data: pageData, error } = await q
        if (error) {
          console.error('Erro ao buscar colaboradores:', error)
          break
        }

        if (pageData && pageData.length > 0) {
          allEmps = allEmps.concat(pageData)
          from += limit
          if (pageData.length < limit) hasMore = false
        } else {
          hasMore = false
        }
      }

      // Aplica regra de vigência oficial (v0.0.1716+):
      // Agrupa por pessoa (matrícula sanitizada ou nome normalizado + plant_id)
      // Versão mais recente vence (reference_month DESC, created_at DESC)
      // Se a versão vigente for "Inativo", o colaborador é descartado
      // Retorna ordenado alfabeticamente por nome em pt-BR
      const activeEmps = resolveActiveEmployees(allEmps)

      setEmployees(activeEmps)
      const statuses = (await getTrainingStatuses(activeEmps)) as Record<string, string>
      setTrainingStatuses(statuses)
    } finally {
      setIsLoading(false)
    }
  }

  const openViewer = async (rawUrl: string | undefined) => {
    if (rawUrl) {
      viewerRef.current?.open(rawUrl)
    }
  }

  // Helper para buscar todos os IDs históricos associados à mesma pessoa
  const getHistoricalEmployeeIds = async (emp: any): Promise<string[]> => {
    if (!activeClient?.id || !emp) return emp?.id ? [emp.id] : []

    if (emp.registration_number?.trim()) {
      let query = supabase
        .from('employees')
        .select('id')
        .eq('client_id', activeClient.id)
        .eq('registration_number', emp.registration_number.trim())

      if (emp.plant_id) {
        query = query.eq('plant_id', emp.plant_id)
      }

      const { data: relatedEmps } = await query
      if (relatedEmps && relatedEmps.length > 0) {
        return Array.from(new Set(relatedEmps.map((e) => e.id)))
      }
    } else if (emp.name) {
      let nameQuery = supabase.from('employees').select('id, name').eq('client_id', activeClient.id)

      if (emp.plant_id) {
        nameQuery = nameQuery.eq('plant_id', emp.plant_id)
      }

      const { data: relatedByName } = await nameQuery
      if (relatedByName && relatedByName.length > 0) {
        const empNormName = normalizeString(emp.name)
        const matched = relatedByName.filter((e) => normalizeString(e.name) === empNormName)
        if (matched.length > 0) {
          return Array.from(new Set(matched.map((e) => e.id)))
        }
      }
    }

    return [emp.id]
  }

  const openDetails = async (emp: any) => {
    setSelectedEmp(emp)
    setIsRecordsLoading(true)

    // Fetch required trainings for this function
    let reqsData: any[] = []
    if (emp.function_id) {
      const { data: reqs } = await supabase
        .from('function_required_trainings')
        .select('*, trainings(*)')
        .eq('function_id', emp.function_id)
      reqsData = reqs || []
    }

    setReqTrainings(reqsData)

    const ids = await getHistoricalEmployeeIds(emp)

    const { data: records } = await supabase
      .from('employee_training_records')
      .select('*, trainings(*)')
      .in('employee_id', ids)
      .order('completion_date', { ascending: false })

    setEmpRecords(records || [])
    setIsRecordsLoading(false)
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, trainingId: string) => {
    const file = e.target.files?.[0]
    if (!file || !selectedEmp) return

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${selectedEmp.registration_number || selectedEmp.id}_${trainingId}_${Date.now()}.${fileExt}`

      const filePath = `${activeClient?.id}/trainings/${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('training-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true })

      if (uploadError) throw uploadError

      const { data: publicUrlData } = supabase.storage
        .from('training-documents')
        .getPublicUrl(filePath)

      const { data: newRecord, error: insertError } = await supabase
        .from('employee_training_records')
        .upsert(
          {
            client_id: activeClient?.id,
            employee_id: selectedEmp.id,
            training_id: trainingId,
            document_url: publicUrlData.publicUrl,
            completion_date: new Date().toISOString().split('T')[0],
          },
          { onConflict: 'employee_id,training_id' },
        )
        .select('*, trainings(*)')
        .single()

      if (insertError) throw insertError

      if (newRecord) {
        setEmpRecords((prev) => {
          const filtered = prev.filter(
            (r) => r.training_id !== trainingId || r.employee_id !== selectedEmp.id,
          )
          return [newRecord, ...filtered]
        })
        toast({ title: 'Treinamento anexado com sucesso!' })
        // Conferência IA da lista de presença; ao terminar, atualiza modal e listagem
        verifyTrainingPresence(newRecord.id).then(() => {
          openDetails(selectedEmp)
          fetchData()
        })
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
      case 'Apto':
        return (
          <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
            <CheckCircle2 className="w-3 h-3 mr-1" /> Regular
          </Badge>
        )
      case 'Pendente':
      case 'Inapto':
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
      case 'Isento':
        return (
          <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
            <Info className="w-3 h-3 mr-1" /> Isento
          </Badge>
        )
      default:
        return (
          <Badge variant="outline" className="text-gray-500">
            <Info className="w-3 h-3 mr-1" /> {status || 'N/A'}
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
            <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto items-center">
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-full sm:w-[260px] bg-white">
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
                      Nenhum colaborador ativo encontrado.
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
                          if (req.trainings?.validity_months && req.trainings.validity_months > 0) {
                            const compDateStr = latest.completion_date.includes('T')
                              ? latest.completion_date
                              : `${latest.completion_date}T00:00:00`
                            expDate = new Date(compDateStr)
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
                                {req.trainings?.name || 'Treinamento Desconhecido'}
                              </div>
                              <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-3">
                                <span>
                                  Validade:{' '}
                                  {req.trainings?.validity_months
                                    ? `${req.trainings.validity_months} meses`
                                    : 'Vitalício'}
                                </span>
                                {latest && latest.completion_date && (
                                  <span>
                                    Última realização:{' '}
                                    {format(
                                      new Date(
                                        latest.completion_date.includes('T')
                                          ? latest.completion_date
                                          : `${latest.completion_date}T00:00:00`,
                                      ),
                                      'dd/MM/yyyy',
                                    )}
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
                              <VerificationBadge
                                status={latest?.verification_status}
                                notes={latest?.verification_notes}
                                signedName={latest?.verification_signed_name}
                              />
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
                            <TableHead>Conferência IA</TableHead>
                            <TableHead className="text-right">Ações</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {empRecords.map((record) => (
                            <TableRow key={record.id}>
                              <TableCell className="font-medium text-sm">
                                {record.trainings?.name || 'Desconhecido'}
                              </TableCell>
                              <TableCell className="text-sm">
                                {record.completion_date
                                  ? format(
                                      new Date(
                                        record.completion_date.includes('T')
                                          ? record.completion_date
                                          : `${record.completion_date}T00:00:00`,
                                      ),
                                      'dd/MM/yyyy',
                                    )
                                  : '-'}
                              </TableCell>
                              <TableCell>
                                <VerificationBadge
                                  status={record.verification_status}
                                  notes={record.verification_notes}
                                  signedName={record.verification_signed_name}
                                />
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-2">
                                  {record.document_url && (
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8 text-brand-deepBlue hover:bg-blue-50"
                                      onClick={() => openViewer(record.document_url)}
                                      title="Visualizar documento"
                                    >
                                      <FileText className="w-4 h-4" />
                                    </Button>
                                  )}{' '}
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

      <DocumentViewer ref={viewerRef} />
    </div>
  )
}
