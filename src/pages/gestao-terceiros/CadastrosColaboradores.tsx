import { useState, useMemo, useEffect } from 'react'
import { Navigate } from 'react-router-dom'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { useHasAccess } from '@/hooks/use-has-access'
import { supabase } from '@/lib/supabase/client'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import {
  Users,
  Loader2,
  Plus,
  Edit2,
  Trash2,
  Search,
  FileText,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

type TrainingFileState = {
  file?: File
  completion_date: string
  document_url?: string
}

export default function CadastrosColaboradores() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Cadastros:Colaboradores')
  const {
    employees,
    plants,
    locations,
    functions,
    trainings,
    functionRequiredTrainings,
    employeeTrainingRecords,
    companies,
    refetch,
    loading,
  } = useMasterData()
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlant, setFilterPlant] = useState('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [auditEmployee, setAuditEmployee] = useState<any>(null)

  const [form, setForm] = useState({
    name: '',
    company_id: 'none',
    company_name: '',
    plant_id: '',
    location_id: 'none',
    function_id: 'none',
  })

  const [trainingFiles, setTrainingFiles] = useState<Record<string, TrainingFileState>>({})

  useEffect(() => {
    if (form.function_id && form.function_id !== 'none') {
      const reqTrainings = functionRequiredTrainings.filter(
        (frt) => frt.function_id === form.function_id,
      )
      setTrainingFiles((prev) => {
        const next = { ...prev }
        reqTrainings.forEach((rt) => {
          if (!next[rt.training_id]) {
            next[rt.training_id] = { completion_date: '' }
          }
        })
        return next
      })
    }
  }, [form.function_id, functionRequiredTrainings])

  const filteredData = useMemo(() => {
    return employees.filter((e) => {
      const cName = e.company_id
        ? companies.find((c) => c.id === e.company_id)?.name || e.company_name
        : e.company_name

      const matchSearch =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (cName || '').toLowerCase().includes(searchTerm.toLowerCase())
      const matchPlant = filterPlant === 'all' || e.plant_id === filterPlant
      return matchSearch && matchPlant
    })
  }, [employees, companies, searchTerm, filterPlant])

  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const openAdd = () => {
    setEditingId(null)
    setForm({
      name: '',
      company_id: 'none',
      company_name: '',
      plant_id: '',
      location_id: 'none',
      function_id: 'none',
    })
    setTrainingFiles({})
    setIsModalOpen(true)
  }

  const openEdit = (item: any) => {
    setEditingId(item.id)
    setForm({
      name: item.name,
      company_id: item.company_id || 'none',
      company_name: item.company_name || '',
      plant_id: item.plant_id,
      location_id: item.location_id || 'none',
      function_id: item.function_id || 'none',
    })

    const existingRecords = employeeTrainingRecords.filter((etr) => etr.employee_id === item.id)
    const tf: Record<string, TrainingFileState> = {}
    existingRecords.forEach((etr) => {
      tf[etr.training_id] = {
        completion_date: etr.completion_date,
        document_url: etr.document_url,
      }
    })
    setTrainingFiles(tf)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (!error) {
      toast({ title: 'Colaborador removido com sucesso' })
      refetch()
    } else {
      toast({ title: 'Erro ao remover colaborador', variant: 'destructive' })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile?.client_id || !form.name || form.company_id === 'none' || !form.plant_id) return
    setIsSubmitting(true)

    try {
      const newFiles = { ...trainingFiles }
      for (const tId of Object.keys(newFiles)) {
        if (newFiles[tId].file) {
          const ext = newFiles[tId].file!.name.split('.').pop()
          const fileName = `${profile.client_id}/${Date.now()}-${tId}.${ext}`
          const { data, error } = await supabase.storage
            .from('training-documents')
            .upload(fileName, newFiles[tId].file!)
          if (error) throw error
          newFiles[tId].document_url = data.path
        }
      }

      const { data: empData, error: empError } = await supabase
        .from('employees')
        .upsert({
          id: editingId || undefined,
          client_id: profile.client_id,
          plant_id: form.plant_id,
          location_id: form.location_id !== 'none' ? form.location_id : null,
          function_id: form.function_id !== 'none' ? form.function_id : null,
          company_id: form.company_id !== 'none' ? form.company_id : null,
          company_name: form.company_name,
          name: form.name,
        })
        .select()
        .single()

      if (empError) throw empError

      if (form.function_id && form.function_id !== 'none') {
        const reqTrainings = functionRequiredTrainings.filter(
          (frt) => frt.function_id === form.function_id,
        )
        for (const rt of reqTrainings) {
          const tf = newFiles[rt.training_id]
          if (tf && tf.document_url) {
            await supabase.from('employee_training_records' as any).upsert(
              {
                client_id: profile.client_id,
                employee_id: empData.id,
                training_id: rt.training_id,
                document_url: tf.document_url,
                completion_date: tf.completion_date,
              },
              { onConflict: 'employee_id, training_id' },
            )
          }
        }
      }

      toast({
        title: `Colaborador ${editingId ? 'atualizado' : 'cadastrado'} com sucesso!`,
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      refetch()
      setIsModalOpen(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleViewDoc = async (path: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('training-documents')
        .createSignedUrl(path, 300)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err: any) {
      toast({ title: 'Erro ao abrir documento', description: err.message, variant: 'destructive' })
    }
  }

  const reqTrainingsForForm =
    form.function_id !== 'none'
      ? functionRequiredTrainings.filter((frt) => frt.function_id === form.function_id)
      : []

  const missingRequired = reqTrainingsForForm.some((rt) => {
    const tf = trainingFiles[rt.training_id]
    return !tf || (!tf.file && !tf.document_url) || !tf.completion_date
  })

  const isSaveDisabled =
    isSubmitting || !form.name || form.company_id === 'none' || !form.plant_id || missingRequired

  return (
    <div className="space-y-6 animate-fade-in pb-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <Users className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Colaboradores</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Gestão de efetivo e documentação comprobatória
            </p>
          </div>
        </div>
        <Button onClick={openAdd} variant="tech">
          <Plus className="w-4 h-4 mr-2" /> Novo Colaborador
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-white p-2 rounded-xl border border-gray-100 shadow-sm">
        <div className="flex-1 flex items-center px-3 gap-2 sm:border-r border-gray-100">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar nome ou empresa..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64 pr-2">
          <Select value={filterPlant} onValueChange={setFilterPlant}>
            <SelectTrigger className="border-0 shadow-none focus:ring:0 bg-transparent h-10">
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
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-gray-100">
            <TableRow>
              <TableHead className="font-semibold text-slate-600">Nome</TableHead>
              <TableHead className="font-semibold text-slate-600">Empresa</TableHead>
              <TableHead className="font-semibold text-slate-600">Planta</TableHead>
              <TableHead className="font-semibold text-slate-600">Função</TableHead>
              <TableHead className="font-semibold text-slate-600 text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-10 text-muted-foreground">
                  Nenhum colaborador encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => {
                const displayCompany = item.company_id
                  ? companies.find((c) => c.id === item.company_id)?.name || item.company_name
                  : item.company_name

                return (
                  <TableRow key={item.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium text-slate-700">{item.name}</TableCell>
                    <TableCell className="text-slate-600">{displayCompany}</TableCell>
                    <TableCell className="text-slate-600">
                      {plants.find((p) => p.id === item.plant_id)?.name || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {functions.find((f) => f.id === item.function_id)?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => setAuditEmployee(item)}
                          className="text-brand-deepBlue hover:bg-brand-deepBlue/10"
                          title="Auditoria de Treinamentos"
                        >
                          <FileText className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(item)}
                          className="text-slate-600 hover:text-brand-deepBlue hover:bg-slate-100"
                          title="Editar"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(item.id)}
                          className="text-slate-600 hover:text-red-600 hover:bg-red-50"
                          title="Remover"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Colaborador' : 'Cadastrar Colaborador'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome Completo *</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Empresa *</Label>
                <Select
                  value={form.company_id}
                  onValueChange={(v) => {
                    const comp = companies.find((c) => c.id === v)
                    setForm({ ...form, company_id: v, company_name: comp?.name || '' })
                  }}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione a empresa..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" disabled>
                      Selecione uma empresa
                    </SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {companies.length === 0 && (
                  <p className="text-[11px] text-red-500 mt-1">
                    Cadastre empresas no menu "Empresas" primeiro.
                  </p>
                )}
                {editingId && form.company_id === 'none' && form.company_name && (
                  <p className="text-xs text-amber-600 mt-1">
                    Atual: {form.company_name}. Vincule a uma empresa cadastrada.
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Planta *</Label>
                <Select
                  value={form.plant_id}
                  onValueChange={(v) => setForm({ ...form, plant_id: v, location_id: 'none' })}
                >
                  <SelectTrigger className="bg-white">
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
              <div className="space-y-2">
                <Label>Local</Label>
                <Select
                  value={form.location_id}
                  onValueChange={(v) => setForm({ ...form, location_id: v })}
                  disabled={!form.plant_id}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {locations
                      .filter((l) => l.plant_id === form.plant_id)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Função</Label>
                <Select
                  value={form.function_id}
                  onValueChange={(v) => setForm({ ...form, function_id: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhuma</SelectItem>
                    {functions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {reqTrainingsForForm.length > 0 && (
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mt-4 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <Label className="text-base font-semibold text-slate-800">
                    Treinamentos Obrigatórios
                  </Label>
                  <Badge variant="outline" className="bg-white">
                    {reqTrainingsForForm.length} pendências
                  </Badge>
                </div>
                <div className="space-y-4">
                  {reqTrainingsForForm.map((rt) => {
                    const t = trainings.find((t) => t.id === rt.training_id)
                    const tf = trainingFiles[rt.training_id] || { completion_date: '' }
                    const hasDoc = !!tf.document_url
                    const hasFile = !!tf.file

                    return (
                      <div
                        key={rt.training_id}
                        className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white border border-slate-200 rounded-lg"
                      >
                        <div className="sm:col-span-2 flex items-center justify-between">
                          <span className="font-medium text-sm text-slate-800 flex items-center gap-2">
                            {hasDoc || hasFile ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <AlertCircle className="h-4 w-4 text-amber-500" />
                            )}
                            {t?.name}
                          </span>
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Data Conclusão *</Label>
                          <Input
                            type="date"
                            value={tf.completion_date}
                            onChange={(e) =>
                              setTrainingFiles((prev) => ({
                                ...prev,
                                [rt.training_id]: {
                                  ...prev[rt.training_id],
                                  completion_date: e.target.value,
                                },
                              }))
                            }
                            className="h-9"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">
                            Comprovante (PDF/Img) *
                          </Label>
                          {hasDoc && !hasFile ? (
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100 font-normal">
                                Documento Salvo
                              </Badge>
                              <Label
                                htmlFor={`file-${rt.training_id}`}
                                className="text-xs text-brand-deepBlue cursor-pointer hover:underline"
                              >
                                Substituir
                              </Label>
                              <input
                                id={`file-${rt.training_id}`}
                                type="file"
                                className="hidden"
                                accept="image/*,.pdf"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) {
                                    setTrainingFiles((prev) => ({
                                      ...prev,
                                      [rt.training_id]: { ...prev[rt.training_id], file },
                                    }))
                                  }
                                }}
                              />
                            </div>
                          ) : (
                            <Input
                              type="file"
                              accept="image/*,.pdf"
                              className="h-9 text-xs file:mr-2 file:h-full file:bg-slate-100 file:border-0 file:px-2"
                              onChange={(e) => {
                                const file = e.target.files?.[0]
                                if (file) {
                                  setTrainingFiles((prev) => ({
                                    ...prev,
                                    [rt.training_id]: { ...prev[rt.training_id], file },
                                  }))
                                }
                              }}
                            />
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3 pt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSaveDisabled}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={!!auditEmployee} onOpenChange={(open) => !open && setAuditEmployee(null)}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader className="pb-4 border-b">
            <SheetTitle className="text-2xl text-brand-deepBlue flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Auditoria de Certificações
            </SheetTitle>
            <SheetDescription className="text-base font-medium text-slate-700 mt-2">
              {auditEmployee?.name}
              <span className="block text-sm font-normal text-muted-foreground">
                {auditEmployee?.company_id
                  ? companies.find((c) => c.id === auditEmployee.company_id)?.name ||
                    auditEmployee.company_name
                  : auditEmployee?.company_name}{' '}
                • {functions.find((f) => f.id === auditEmployee?.function_id)?.name || 'Sem função'}
              </span>
            </SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            <h3 className="font-semibold text-slate-800 text-lg">Histórico de Treinamentos</h3>
            {auditEmployee?.function_id ? (
              functionRequiredTrainings.filter(
                (frt) => frt.function_id === auditEmployee.function_id,
              ).length > 0 ? (
                <div className="space-y-3">
                  {functionRequiredTrainings
                    .filter((frt) => frt.function_id === auditEmployee.function_id)
                    .map((rt) => {
                      const t = trainings.find((tr) => tr.id === rt.training_id)
                      const record = employeeTrainingRecords.find(
                        (etr) =>
                          etr.employee_id === auditEmployee.id &&
                          etr.training_id === rt.training_id,
                      )

                      return (
                        <div
                          key={rt.training_id}
                          className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                        >
                          <div>
                            <h4 className="font-semibold text-slate-800">{t?.name}</h4>
                            <div className="mt-1">
                              {record ? (
                                <span className="inline-flex items-center text-xs font-medium text-green-700 bg-green-50 px-2 py-1 rounded">
                                  <CheckCircle2 className="h-3 w-3 mr-1.5" />
                                  Concluído em:{' '}
                                  {record.completion_date.split('-').reverse().join('/')}
                                </span>
                              ) : (
                                <span className="inline-flex items-center text-xs font-medium text-red-700 bg-red-50 px-2 py-1 rounded">
                                  <AlertCircle className="h-3 w-3 mr-1.5" />
                                  Pendente
                                </span>
                              )}
                            </div>
                          </div>
                          {record && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewDoc(record.document_url)}
                              className="w-full sm:w-auto"
                            >
                              Ver Comprovante
                            </Button>
                          )}
                        </div>
                      )
                    })}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm py-4">
                  A função deste colaborador não possui treinamentos obrigatórios mapeados.
                </p>
              )
            ) : (
              <p className="text-muted-foreground text-sm py-4">
                Colaborador sem função atribuída.
              </p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
