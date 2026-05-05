import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { format, addMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Search, Copy, Pencil, Trash2 } from 'lucide-react'
import { DuplicateHeadcountDialog } from '@/components/gestao-terceiros/DuplicateHeadcountDialog'

export default function CadastrosColaboradores() {
  const { profile, selectedMasterClient } = useAppStore()
  const { plants, locations, functions, refetch } = useMasterData()
  const { toast } = useToast()

  const clientId =
    profile?.role === 'Master' && selectedMasterClient !== 'all'
      ? selectedMasterClient
      : profile?.client_id

  const [currentDate, setCurrentDate] = useState<Date>(new Date())
  const [employees, setEmployees] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedCompany, setSelectedCompany] = useState<string>('all')

  const [isDupOpen, setIsDupOpen] = useState(false)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    plant_id: '',
    location_id: 'all',
    function_id: 'all',
    company_id: 'all',
  })

  useEffect(() => {
    if (clientId) {
      supabase
        .from('companies')
        .select('*')
        .eq('client_id', clientId)
        .then(({ data }) => setCompanies(data || []))
    }
  }, [clientId])

  const fetchEmployees = async () => {
    if (!clientId) return
    setIsLoading(true)

    const monthStr = format(currentDate, 'yyyy-MM') + '-01'

    let q = supabase
      .from('employees')
      .select('*')
      .eq('client_id', clientId)
      .eq('reference_month', monthStr)
      .order('name', { ascending: true })

    if (selectedPlant !== 'all') {
      q = q.eq('plant_id', selectedPlant)
    }
    if (selectedCompany !== 'all') {
      q = q.eq('company_id', selectedCompany)
    }

    const { data } = await q
    setEmployees(data || [])
    setIsLoading(false)
  }

  useEffect(() => {
    fetchEmployees()
  }, [clientId, currentDate, selectedPlant, selectedCompany])

  const generateMonthOptions = () => {
    const opts = []
    for (let i = -12; i <= 6; i++) {
      const d = addMonths(new Date(), i)
      opts.push({
        value: format(d, 'yyyy-MM'),
        label: format(d, 'MMMM yyyy', { locale: ptBR }),
      })
    }
    return opts.reverse()
  }
  const monthOptions = generateMonthOptions()

  const handleSave = async () => {
    if (!formData.name || !formData.plant_id) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    const monthStr = format(currentDate, 'yyyy-MM') + '-01'
    const company = companies.find((c) => c.id === formData.company_id)

    const payload = {
      client_id: clientId,
      name: formData.name,
      plant_id: formData.plant_id,
      location_id: formData.location_id === 'all' ? null : formData.location_id,
      function_id: formData.function_id === 'all' ? null : formData.function_id,
      company_id: formData.company_id === 'all' ? null : formData.company_id,
      company_name: company ? company.name : 'N/A',
      reference_month: monthStr,
    }

    let error
    if (editingId) {
      const { error: err } = await supabase.from('employees').update(payload).eq('id', editingId)
      error = err
    } else {
      const { error: err } = await supabase.from('employees').insert(payload)
      error = err
    }

    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Salvo com sucesso' })
      setIsModalOpen(false)
      fetchEmployees()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este colaborador? O histórico em outros meses não será afetado.'))
      return
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (!error) {
      toast({ title: 'Excluído com sucesso' })
      fetchEmployees()
    } else {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const openEdit = (emp: any) => {
    setEditingId(emp.id)
    setFormData({
      name: emp.name,
      plant_id: emp.plant_id || '',
      location_id: emp.location_id || 'all',
      function_id: emp.function_id || 'all',
      company_id: emp.company_id || 'all',
    })
    setIsModalOpen(true)
  }

  const filteredData = employees.filter((e) => e.name.toLowerCase().includes(search.toLowerCase()))

  return (
    <div className="space-y-6 max-w-7xl mx-auto animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Colaboradores</h2>
          <p className="text-slate-500">Gestão do quadro de colaboradores por competência.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <Select
              value={format(currentDate, 'yyyy-MM')}
              onValueChange={(v) => setCurrentDate(new Date(`${v}-01T00:00:00`))}
            >
              <SelectTrigger className="w-[180px] border-0 shadow-none focus:ring-0">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button variant="outline" onClick={() => setIsDupOpen(true)} className="gap-2">
            <Copy className="w-4 h-4" />
            Duplicar Mês
          </Button>

          <Button
            onClick={() => {
              setEditingId(null)
              setFormData({
                name: '',
                plant_id: '',
                location_id: 'all',
                function_id: 'all',
                company_id: 'all',
              })
              setIsModalOpen(true)
            }}
            className="gap-2 bg-tech text-white hover:bg-tech/90"
          >
            <Plus className="w-4 h-4" />
            Novo Colaborador
          </Button>
        </div>
      </div>

      <Card className="p-4 flex flex-col md:flex-row gap-4 bg-slate-50/50">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={selectedPlant} onValueChange={setSelectedPlant}>
          <SelectTrigger className="w-full md:w-[200px] bg-white">
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
        <Select value={selectedCompany} onValueChange={setSelectedCompany}>
          <SelectTrigger className="w-full md:w-[200px] bg-white">
            <SelectValue placeholder="Todas as Empresas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Empresas</SelectItem>
            {companies.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Planta</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Função</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredData.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum colaborador encontrado para este mês.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((emp) => (
                  <TableRow key={emp.id}>
                    <TableCell className="font-medium">{emp.name}</TableCell>
                    <TableCell>{plants.find((p) => p.id === emp.plant_id)?.name || '-'}</TableCell>
                    <TableCell>
                      {locations.find((l) => l.id === emp.location_id)?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {functions.find((f) => f.id === emp.function_id)?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {companies.find((c) => c.id === emp.company_id)?.name ||
                        emp.company_name ||
                        '-'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(emp)}>
                          <Pencil className="w-4 h-4 text-slate-500" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(emp.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <DuplicateHeadcountDialog
        open={isDupOpen}
        onOpenChange={setIsDupOpen}
        clientId={clientId}
        monthOptions={monthOptions}
        defaultSource={format(currentDate, 'yyyy-MM')}
        defaultTarget={format(addMonths(currentDate, 1), 'yyyy-MM')}
        tableName="employees"
        onSuccess={(targetMonth: string) => {
          setCurrentDate(new Date(`${targetMonth}-01T00:00:00`))
        }}
      />

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Colaborador' : 'Novo Colaborador'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData((p) => ({ ...p, name: e.target.value }))}
                placeholder="Nome do colaborador"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Planta *</label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, plant_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
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
                <label className="text-sm font-medium">Local</label>
                <Select
                  value={formData.location_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, location_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Nenhum</SelectItem>
                    {locations
                      .filter((l) => l.plant_id === formData.plant_id)
                      .map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Função</label>
                <Select
                  value={formData.function_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, function_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Nenhuma</SelectItem>
                    {functions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Empresa Terceira</label>
                <Select
                  value={formData.company_id}
                  onValueChange={(v) => setFormData((p) => ({ ...p, company_id: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Nenhuma</SelectItem>
                    {companies.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-tech text-white hover:bg-tech/90">
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
