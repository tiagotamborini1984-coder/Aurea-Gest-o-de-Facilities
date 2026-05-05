import { useState, useEffect } from 'react'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Edit2, Trash2, Copy } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'
import { Card } from '@/components/ui/card'

export default function QuadroContratado() {
  const { plants, locations, functions, equipment } = useMasterData()
  const { profile, selectedMasterClient } = useAppStore()

  const [companies, setCompanies] = useState<any[]>([])
  const [records, setRecords] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<'colaborador' | 'equipamento'>('colaborador')
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), 'yyyy-MM'))

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any | null>(null)

  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)
  const [duplicateFrom, setDuplicateFrom] = useState<string>('')
  const [duplicateTo, setDuplicateTo] = useState<string>('')

  // Form state
  const [formData, setFormData] = useState({
    plant_id: '',
    location_id: 'none',
    company_id: 'none',
    function_id: '',
    equipment_id: '',
    quantity: 1,
  })

  useEffect(() => {
    fetchCompanies()
  }, [profile, selectedMasterClient])

  useEffect(() => {
    fetchData()
  }, [selectedPlant, selectedType, selectedMonth, profile, selectedMasterClient])

  const fetchCompanies = async () => {
    if (!profile) return
    let q = supabase.from('companies').select('*')
    if (profile.role === 'Master' && selectedMasterClient !== 'all') {
      q = q.eq('client_id', selectedMasterClient)
    } else if (profile.role !== 'Master') {
      q = q.eq('client_id', profile.client_id)
    }
    const { data } = await q
    if (data) setCompanies(data)
  }

  const fetchData = async () => {
    if (!profile) return
    let q = supabase
      .from('contracted_headcount')
      .select('*')
      .eq('reference_month', `${selectedMonth}-01`)
      .eq('type', selectedType)
      .order('created_at', { ascending: false })

    if (selectedPlant !== 'all') {
      q = q.eq('plant_id', selectedPlant)
    }

    if (profile.role === 'Master' && selectedMasterClient !== 'all') {
      q = q.eq('client_id', selectedMasterClient)
    } else if (profile.role !== 'Master') {
      q = q.eq('client_id', profile.client_id)
    }

    const { data, error } = await q
    if (!error && data) {
      setRecords(data)
    }
  }

  const handleOpenModal = (record: any = null) => {
    setEditingRecord(record)
    if (record) {
      setFormData({
        plant_id: record.plant_id || '',
        location_id: record.location_id || 'none',
        company_id: record.company_id || 'none',
        function_id: record.function_id || '',
        equipment_id: record.equipment_id || '',
        quantity: record.quantity || 1,
      })
    } else {
      setFormData({
        plant_id: selectedPlant !== 'all' ? selectedPlant : '',
        location_id: 'none',
        company_id: 'none',
        function_id: '',
        equipment_id: '',
        quantity: 1,
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.plant_id) {
      toast.error('Selecione uma planta')
      return
    }

    if (selectedType === 'colaborador' && !formData.function_id) {
      toast.error('Selecione uma função')
      return
    }

    if (selectedType === 'equipamento' && !formData.equipment_id) {
      toast.error('Selecione um equipamento')
      return
    }

    const client_id =
      plants.find((p) => p.id === formData.plant_id)?.client_id || profile?.client_id

    const payload = {
      client_id,
      plant_id: formData.plant_id,
      location_id:
        formData.location_id && formData.location_id !== 'none' ? formData.location_id : null,
      company_id:
        formData.company_id && formData.company_id !== 'none' ? formData.company_id : null,
      function_id: selectedType === 'colaborador' ? formData.function_id : null,
      equipment_id: selectedType === 'equipamento' ? formData.equipment_id : null,
      quantity: Number(formData.quantity),
      type: selectedType,
      reference_month: `${selectedMonth}-01`,
    }

    if (editingRecord) {
      const { error } = await supabase
        .from('contracted_headcount')
        .update(payload)
        .eq('id', editingRecord.id)
      if (!error) {
        toast.success('Registro atualizado')
        setIsModalOpen(false)
        fetchData()
      } else {
        toast.error('Erro ao atualizar')
      }
    } else {
      const { error } = await supabase.from('contracted_headcount').insert(payload)
      if (!error) {
        toast.success('Registro criado')
        setIsModalOpen(false)
        fetchData()
      } else {
        toast.error('Erro ao criar')
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este registro?')) return
    const { error } = await supabase.from('contracted_headcount').delete().eq('id', id)
    if (!error) {
      toast.success('Registro excluído')
      fetchData()
    } else {
      toast.error('Erro ao excluir')
    }
  }

  const handleDuplicate = async () => {
    if (!duplicateFrom || !duplicateTo) {
      toast.error('Selecione os meses de origem e destino')
      return
    }

    const fromDate = `${duplicateFrom}-01`
    const toDate = `${duplicateTo}-01`

    const { data: existing } = await supabase
      .from('contracted_headcount')
      .select('id')
      .eq('reference_month', toDate)

    if (existing && existing.length > 0) {
      if (
        !confirm(
          'Já existem dados no mês de destino. Deseja prosseguir e possivelmente adicionar duplicatas?',
        )
      ) {
        return
      }
    }

    let q = supabase.from('contracted_headcount').select('*').eq('reference_month', fromDate)
    if (profile?.role === 'Master' && selectedMasterClient !== 'all') {
      q = q.eq('client_id', selectedMasterClient)
    } else if (profile?.role !== 'Master') {
      q = q.eq('client_id', profile?.client_id)
    }

    const { data: sourceData, error: sourceError } = await q

    if (sourceError || !sourceData || sourceData.length === 0) {
      toast.error('Nenhum dado encontrado no mês de origem.')
      return
    }

    const newRecords = sourceData.map((r) => {
      const { id, created_at, ...rest } = r
      return { ...rest, reference_month: toDate }
    })

    const { error: insertError } = await supabase.from('contracted_headcount').insert(newRecords)

    if (!insertError) {
      toast.success('Dados duplicados com sucesso!')
      setIsDuplicateOpen(false)
      if (selectedMonth === duplicateTo) {
        fetchData()
      } else {
        setSelectedMonth(duplicateTo)
      }
    } else {
      toast.error('Erro ao duplicar dados.')
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quadro Contratado</h1>
          <p className="text-slate-500 mt-1">Gerencie o dimensionamento de equipe e equipamentos</p>
        </div>
      </div>

      <Card className="p-4 mb-6">
        <div className="flex flex-col md:flex-row gap-4 items-end md:items-center justify-between">
          <div className="flex flex-col md:flex-row gap-4 flex-1">
            <div className="w-full md:w-64">
              <Label>Planta</Label>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Planta" />
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

            <div className="w-full md:w-48">
              <Label>Tipo</Label>
              <Select value={selectedType} onValueChange={(val: any) => setSelectedType(val)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="colaborador">Colaboradores</SelectItem>
                  <SelectItem value="equipamento">Equipamentos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="w-full md:w-48">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
          </div>

          <div className="flex gap-2 w-full md:w-auto">
            <Button
              variant="outline"
              className="flex-1 md:flex-none"
              onClick={() => setIsDuplicateOpen(true)}
            >
              <Copy className="w-4 h-4 mr-2" />
              Duplicar Mês
            </Button>
            <Button className="flex-1 md:flex-none" onClick={() => handleOpenModal()}>
              <Plus className="w-4 h-4 mr-2" />
              Adicionar
            </Button>
          </div>
        </div>
      </Card>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/50">
                <TableHead>Planta</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Local</TableHead>
                {selectedType === 'colaborador' ? (
                  <TableHead>Função</TableHead>
                ) : (
                  <TableHead>Equipamento</TableHead>
                )}
                <TableHead className="text-right">Quantidade</TableHead>
                <TableHead className="w-24 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {records.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum registro encontrado para o mês selecionado.
                  </TableCell>
                </TableRow>
              ) : (
                records.map((record) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      {plants.find((p) => p.id === record.plant_id)?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {companies.find((c) => c.id === record.company_id)?.name || '-'}
                    </TableCell>
                    <TableCell>
                      {locations.find((l) => l.id === record.location_id)?.name || '-'}
                    </TableCell>
                    {selectedType === 'colaborador' ? (
                      <TableCell>
                        {functions.find((f) => f.id === record.function_id)?.name || '-'}
                      </TableCell>
                    ) : (
                      <TableCell>
                        {equipment.find((e) => e.id === record.equipment_id)?.name || '-'}
                      </TableCell>
                    )}
                    <TableCell className="text-right font-medium">{record.quantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleOpenModal(record)}
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleDelete(record.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editingRecord ? 'Editar' : 'Adicionar'}{' '}
              {selectedType === 'colaborador' ? 'Colaborador' : 'Equipamento'}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Planta *</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
              >
                <SelectTrigger>
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

            <div className="grid gap-2">
              <Label>Empresa Parceira</Label>
              <Select
                value={formData.company_id}
                onValueChange={(val) => setFormData({ ...formData, company_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Local</Label>
              <Select
                value={formData.location_id}
                onValueChange={(val) => setFormData({ ...formData, location_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {locations
                    .filter((l) => !formData.plant_id || l.plant_id === formData.plant_id)
                    .map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        {l.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            {selectedType === 'colaborador' ? (
              <div className="grid gap-2">
                <Label>Função *</Label>
                <Select
                  value={formData.function_id}
                  onValueChange={(val) => setFormData({ ...formData, function_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {functions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Equipamento *</Label>
                <Select
                  value={formData.equipment_id}
                  onValueChange={(val) => setFormData({ ...formData, equipment_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {equipment
                      .filter((e) => !formData.plant_id || e.plant_id === formData.plant_id)
                      .map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) =>
                  setFormData({ ...formData, quantity: parseInt(e.target.value) || 1 })
                }
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDuplicateOpen} onOpenChange={setIsDuplicateOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Duplicar Quadro Contratado</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="p-3 bg-blue-50 text-blue-800 rounded-md text-sm">
              Use esta ferramenta para copiar toda a base de colaboradores e equipamentos de um mês
              para outro.
            </div>

            <div className="grid gap-2">
              <Label>Mês de Origem (De)</Label>
              <Input
                type="month"
                value={duplicateFrom}
                onChange={(e) => setDuplicateFrom(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label>Mês de Destino (Para)</Label>
              <Input
                type="month"
                value={duplicateTo}
                onChange={(e) => setDuplicateTo(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDuplicateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleDuplicate}>Confirmar Duplicação</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
