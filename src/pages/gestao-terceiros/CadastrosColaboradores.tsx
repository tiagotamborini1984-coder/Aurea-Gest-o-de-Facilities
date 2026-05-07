import { useState, useEffect, useMemo } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAppStore } from '@/store/AppContext'
import { Plus, Search, Pencil, Trash2, Copy, FileText } from 'lucide-react'
import { DuplicateHeadcountDialog } from '@/components/gestao-terceiros/DuplicateHeadcountDialog'
import { useToast } from '@/components/ui/use-toast'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Card, CardContent } from '@/components/ui/card'

export default function CadastrosColaboradores({
  canAdd,
  hasAccess,
  plants,
  locations,
  functions,
}: any) {
  const { profile, selectedMasterClient } = useAppStore()
  const { toast } = useToast()

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)

  const monthOptions = useMemo(() => {
    const options = []
    const today = new Date()
    for (let i = -12; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return options
  }, [])

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)

  const [form, setForm] = useState({
    name: '',
    company_name: '',
    function_id: '',
    plant_id: '',
    location_id: 'none',
  })

  const [requiredTrainings, setRequiredTrainings] = useState<any[]>([])
  const [trainingRecords, setTrainingRecords] = useState<
    Record<string, { completion_date: string; document_url: string }>
  >({})

  const clientId =
    profile?.role === 'Master' && selectedMasterClient !== 'all'
      ? selectedMasterClient
      : profile?.client_id

  const fetchData = async () => {
    setLoading(true)
    let q = supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false })
      .eq('reference_month', `${selectedMonth}-01`)

    if (clientId) {
      q = q.eq('client_id', clientId)
    }

    const { data: result } = await q
    setData(result || [])
    setLoading(false)
  }

  useEffect(() => {
    if (clientId) {
      fetchData()
    }
  }, [clientId, selectedMonth])

  // Fetch function required trainings when function changes
  useEffect(() => {
    async function loadRequiredTrainings() {
      if (!form.function_id) {
        setRequiredTrainings([])
        return
      }

      const { data: reqs } = await supabase
        .from('function_required_trainings')
        .select('training_id, trainings(id, name)')
        .eq('function_id', form.function_id)

      if (reqs) {
        setRequiredTrainings(
          reqs.map((r: any) => ({
            id: r.training_id,
            name: r.trainings?.name || 'Treinamento',
          })),
        )
      } else {
        setRequiredTrainings([])
      }
    }
    loadRequiredTrainings()
  }, [form.function_id])

  // Fetch existing training records if editing
  useEffect(() => {
    async function loadExistingRecords() {
      if (editingItem && editingItem.id) {
        const { data: recs } = await supabase
          .from('employee_training_records')
          .select('*')
          .eq('employee_id', editingItem.id)

        const trMap: Record<string, any> = {}
        recs?.forEach((r) => {
          trMap[r.training_id] = {
            completion_date: r.completion_date,
            document_url: r.document_url,
          }
        })
        setTrainingRecords(trMap)
      } else {
        setTrainingRecords({})
      }
    }
    loadExistingRecords()
  }, [editingItem])

  const handleSave = async () => {
    if (!form.name || !form.company_name || !form.plant_id || !form.function_id) {
      toast({
        title: 'Aviso',
        description: 'Preencha todos os campos obrigatórios',
        variant: 'destructive',
      })
      return
    }

    const payload = {
      name: form.name,
      company_name: form.company_name,
      function_id: form.function_id,
      plant_id: form.plant_id,
      location_id: form.location_id === 'none' ? null : form.location_id,
      reference_month: `${selectedMonth}-01`,
      client_id: clientId as string,
    }

    let employeeId = editingItem?.id

    if (editingItem) {
      const { error } = await supabase.from('employees').update(payload).eq('id', employeeId)
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
        return
      }
    } else {
      const { data: inserted, error } = await supabase
        .from('employees')
        .insert(payload)
        .select()
        .single()
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
        return
      }
      employeeId = inserted.id
    }

    // Save training records
    for (const t of requiredTrainings) {
      const rec = trainingRecords[t.id]

      // Always delete first to clean up or before upsert
      await supabase
        .from('employee_training_records')
        .delete()
        .eq('employee_id', employeeId)
        .eq('training_id', t.id)

      if (rec && rec.completion_date && rec.document_url) {
        await supabase.from('employee_training_records').insert({
          client_id: clientId as string,
          employee_id: employeeId,
          training_id: t.id,
          completion_date: rec.completion_date,
          document_url: rec.document_url,
        })
      }
    }

    toast({ title: 'Sucesso', description: 'Colaborador salvo com sucesso!' })
    setIsDialogOpen(false)
    fetchData()
  }

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja excluir?')) {
      const { error } = await supabase.from('employees').delete().eq('id', id)
      if (!error) {
        fetchData()
      }
    }
  }

  const filteredData = data.filter(
    (d) =>
      d.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      d.company_name?.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Colaboradores</h1>
          <p className="text-slate-500 mt-1">Cadastro de equipe e terceiros</p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="w-[180px] bg-white">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setIsDuplicateOpen(true)}>
            <Copy className="w-4 h-4 mr-2" /> Duplicar Mês
          </Button>
          {canAdd && hasAccess && (
            <Button
              onClick={() => {
                setEditingItem(null)
                setForm({
                  name: '',
                  company_name: '',
                  function_id: '',
                  plant_id: '',
                  location_id: 'none',
                })
                setTrainingRecords({})
                setIsDialogOpen(true)
              }}
              className="bg-brand-primary text-white hover:bg-brand-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" /> Novo Colaborador
            </Button>
          )}
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm">
        <div className="p-4 border-b">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou empresa..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="rounded-b-xl overflow-hidden">
          <Table>
            <TableHeader className="bg-slate-50/50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Planta</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium text-slate-900">{item.name}</TableCell>
                    <TableCell className="text-slate-600">{item.company_name}</TableCell>
                    <TableCell className="text-slate-600">
                      {functions?.find((f: any) => f.id === item.function_id)?.name || '-'}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {plants?.find((p: any) => p.id === item.plant_id)?.name || '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingItem(item)
                          setForm({
                            name: item.name,
                            company_name: item.company_name,
                            function_id: item.function_id || '',
                            plant_id: item.plant_id || '',
                            location_id: item.location_id || 'none',
                          })
                          setIsDialogOpen(true)
                        }}
                      >
                        <Pencil className="w-4 h-4 text-blue-600" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDelete(item.id)}>
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingItem ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[70vh]">
            <div className="grid gap-6 py-4 px-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Colaborador *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Empresa / Terceiro *</Label>
                  <Input
                    value={form.company_name}
                    onChange={(e) => setForm({ ...form, company_name: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Planta *</Label>
                  <Select
                    value={form.plant_id}
                    onValueChange={(v) => setForm({ ...form, plant_id: v, location_id: 'none' })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {plants?.map((p: any) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Local (Opcional)</Label>
                  <Select
                    value={form.location_id}
                    onValueChange={(v) => setForm({ ...form, location_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Todos os locais</SelectItem>
                      {locations
                        ?.filter((l: any) => !form.plant_id || l.plant_id === form.plant_id)
                        .map((l: any) => (
                          <SelectItem key={l.id} value={l.id}>
                            {l.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2 md:col-span-2">
                  <Label>Função *</Label>
                  <Select
                    value={form.function_id}
                    onValueChange={(v) => setForm({ ...form, function_id: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {functions?.map((f: any) => (
                        <SelectItem key={f.id} value={f.id}>
                          {f.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {requiredTrainings.length > 0 && (
                <div className="space-y-4 pt-4 border-t">
                  <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-brand-primary" />
                    Treinamentos Obrigatórios
                  </h3>
                  <p className="text-sm text-slate-500">
                    Esta função possui os seguintes treinamentos obrigatórios. Preencha a data e o
                    link do certificado para vinculá-los.
                  </p>
                  <div className="grid gap-3">
                    {requiredTrainings.map((t) => (
                      <Card key={t.id} className="shadow-sm">
                        <CardContent className="p-4">
                          <p className="font-medium text-sm mb-3">{t.name}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">Data de Conclusão</Label>
                              <Input
                                type="date"
                                value={trainingRecords[t.id]?.completion_date || ''}
                                onChange={(e) =>
                                  setTrainingRecords((prev) => ({
                                    ...prev,
                                    [t.id]: { ...prev[t.id], completion_date: e.target.value },
                                  }))
                                }
                              />
                            </div>
                            <div className="space-y-1.5">
                              <Label className="text-xs text-slate-500">URL do Certificado</Label>
                              <Input
                                type="url"
                                placeholder="https://"
                                value={trainingRecords[t.id]?.document_url || ''}
                                onChange={(e) =>
                                  setTrainingRecords((prev) => ({
                                    ...prev,
                                    [t.id]: { ...prev[t.id], document_url: e.target.value },
                                  }))
                                }
                              />
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-brand-primary text-white hover:bg-brand-primary/90"
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DuplicateHeadcountDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        clientId={clientId as string}
        monthOptions={monthOptions}
        defaultSource={selectedMonth}
        defaultTarget={selectedMonth}
        tableName="employees"
        onSuccess={(targetMonth: string) => {
          setSelectedMonth(targetMonth)
          fetchData()
        }}
      />
    </div>
  )
}
