import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Plus, Copy, Edit2, Trash2, MapPin, CalendarDays, AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { format } from 'date-fns'

export default function QuadroContratado() {
  const { plants, locations, functions, equipment } = useMasterData()
  const { profile, selectedMasterClient } = useAppStore()
  const { toast } = useToast()

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])

  const currentMonthStr = format(new Date(), 'yyyy-MM') + '-01'
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr)
  const [selectedPlant, setSelectedPlant] = useState<string>('all')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  const [dupOrigin, setDupOrigin] = useState('')
  const [dupDest, setDupDest] = useState('')
  const [showDupConfirm, setShowDupConfirm] = useState(false)

  const [formData, setFormData] = useState({
    type: 'colaborador',
    plant_id: '',
    location_id: 'all',
    function_id: 'all',
    equipment_id: 'all',
    quantity: 1,
    company_id: 'all',
  })

  const clientId =
    profile?.role === 'Master'
      ? selectedMasterClient !== 'all'
        ? selectedMasterClient
        : profile?.client_id
      : profile?.client_id

  const fetchRecords = async () => {
    if (!clientId) return
    setLoading(true)

    // Fetch companies separately as they might not be in useMasterData
    const { data: compData } = await supabase
      .from('companies')
      .select('*')
      .eq('client_id', clientId)
    setCompanies(compData || [])

    let q = supabase.from('contracted_headcount').select('*').eq('reference_month', selectedMonth)

    if (selectedPlant !== 'all') {
      q = q.eq('plant_id', selectedPlant)
    }

    q = q.eq('client_id', clientId).order('created_at', { ascending: false })

    const { data, error } = await q
    if (error) {
      toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' })
    }
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchRecords()
  }, [clientId, selectedMonth, selectedPlant])

  const handleOpenAdd = () => {
    setEditingRecord(null)
    setFormData({
      type: 'colaborador',
      plant_id: selectedPlant !== 'all' ? selectedPlant : plants[0]?.id || '',
      location_id: 'all',
      function_id: 'all',
      equipment_id: 'all',
      quantity: 1,
      company_id: 'all',
    })
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (rec: any) => {
    setEditingRecord(rec)
    setFormData({
      type: rec.type,
      plant_id: rec.plant_id,
      location_id: rec.location_id || 'all',
      function_id: rec.function_id || 'all',
      equipment_id: rec.equipment_id || 'all',
      quantity: rec.quantity,
      company_id: rec.company_id || 'all',
    })
    setIsAddModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.plant_id) {
      toast({ title: 'Erro', description: 'Selecione uma planta.', variant: 'destructive' })
      return
    }
    if (formData.quantity < 1) {
      toast({ title: 'Erro', description: 'Quantidade inválida.', variant: 'destructive' })
      return
    }

    const payload = {
      client_id: clientId,
      reference_month: selectedMonth,
      plant_id: formData.plant_id,
      type: formData.type,
      quantity: formData.quantity,
      company_id: formData.company_id !== 'all' ? formData.company_id : null,
      location_id: formData.location_id !== 'all' ? formData.location_id : null,
      function_id:
        formData.type === 'colaborador' && formData.function_id !== 'all'
          ? formData.function_id
          : null,
      equipment_id:
        formData.type === 'equipamento' && formData.equipment_id !== 'all'
          ? formData.equipment_id
          : null,
    }

    if (editingRecord) {
      const { error } = await supabase
        .from('contracted_headcount')
        .update(payload)
        .eq('id', editingRecord.id)
      if (error)
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Registro atualizado.' })
        setIsAddModalOpen(false)
        fetchRecords()
      }
    } else {
      const { error } = await supabase.from('contracted_headcount').insert(payload)
      if (error)
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Registro adicionado.' })
        setIsAddModalOpen(false)
        fetchRecords()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este registro?')) return
    const { error } = await supabase.from('contracted_headcount').delete().eq('id', id)
    if (error)
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Sucesso', description: 'Registro excluído.' })
      fetchRecords()
    }
  }

  const handleDuplicateCheck = async () => {
    if (!dupOrigin || !dupDest) {
      toast({
        title: 'Atenção',
        description: 'Selecione a origem e o destino.',
        variant: 'destructive',
      })
      return
    }
    if (dupOrigin === dupDest) {
      toast({
        title: 'Atenção',
        description: 'Origem e destino não podem ser iguais.',
        variant: 'destructive',
      })
      return
    }

    const { data: destData } = await supabase
      .from('contracted_headcount')
      .select('id')
      .eq('reference_month', dupDest)
      .eq('client_id', clientId)
      .limit(1)

    if (destData && destData.length > 0) {
      setShowDupConfirm(true)
    } else {
      executeDuplicate()
    }
  }

  const executeDuplicate = async () => {
    const { data: originData } = await supabase
      .from('contracted_headcount')
      .select('*')
      .eq('reference_month', dupOrigin)
      .eq('client_id', clientId)

    if (!originData || originData.length === 0) {
      toast({
        title: 'Atenção',
        description: 'Mês de origem não possui dados para duplicar.',
        variant: 'destructive',
      })
      setShowDupConfirm(false)
      return
    }

    if (showDupConfirm) {
      await supabase
        .from('contracted_headcount')
        .delete()
        .eq('reference_month', dupDest)
        .eq('client_id', clientId)
    }

    const payload = originData.map((d) => ({
      client_id: d.client_id,
      company_id: d.company_id,
      equipment_id: d.equipment_id,
      function_id: d.function_id,
      location_id: d.location_id,
      plant_id: d.plant_id,
      quantity: d.quantity,
      type: d.type,
      reference_month: dupDest,
    }))

    const { error } = await supabase.from('contracted_headcount').insert(payload)
    if (error) {
      toast({ title: 'Erro ao duplicar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Quadro duplicado com sucesso.' })
      setIsDuplicateModalOpen(false)
      setShowDupConfirm(false)
      setSelectedMonth(dupDest)
      fetchRecords()
    }
  }

  const getMonthOptions = () => {
    const options = []
    for (let i = -6; i <= 6; i++) {
      const d = new Date()
      d.setMonth(d.getMonth() + i)
      const val = format(d, 'yyyy-MM') + '-01'
      const label = format(d, 'MM/yyyy')
      options.push({ value: val, label })
    }
    return options
  }
  const monthOptions = getMonthOptions()

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Quadro Contratado</h1>
          <p className="text-slate-500 mt-1">
            Gerencie o headcount e equipamentos por competência (Mês/Ano)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Planta Filter - RESTORED */}
          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-md shadow-sm">
            <MapPin className="h-4 w-4 text-slate-500" />
            <select
              value={selectedPlant}
              onChange={(e) => setSelectedPlant(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none min-w-[140px]"
            >
              <option value="all">Todas as Plantas</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-2 rounded-md shadow-sm">
            <CalendarDays className="h-4 w-4 text-slate-500" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-sm font-medium focus:outline-none"
            >
              {monthOptions.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          <Button
            variant="outline"
            onClick={() => {
              setDupOrigin('')
              setDupDest('')
              setIsDuplicateModalOpen(true)
              setShowDupConfirm(false)
            }}
          >
            <Copy className="h-4 w-4 mr-2" />
            Duplicar
          </Button>

          <Button onClick={handleOpenAdd}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Item (Função/Eqp)</TableHead>
              <TableHead>Local / Setor</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead>Qtd.</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                  Nenhum registro encontrado para este mês e planta.
                </TableCell>
              </TableRow>
            ) : (
              records.map((rec) => {
                const plant = plants.find((p) => p.id === rec.plant_id)?.name || '-'
                const loc = locations.find((l) => l.id === rec.location_id)?.name || '-'
                const comp = companies.find((c) => c.id === rec.company_id)?.name || '-'
                let itemName = '-'
                if (rec.type === 'colaborador' && rec.function_id) {
                  itemName = functions.find((f) => f.id === rec.function_id)?.name || '-'
                } else if (rec.type === 'equipamento' && rec.equipment_id) {
                  itemName = equipment.find((e) => e.id === rec.equipment_id)?.name || '-'
                }

                return (
                  <TableRow key={rec.id}>
                    <TableCell className="capitalize font-medium">{rec.type}</TableCell>
                    <TableCell>{plant}</TableCell>
                    <TableCell>{itemName}</TableCell>
                    <TableCell>{loc}</TableCell>
                    <TableCell>{comp}</TableCell>
                    <TableCell className="font-semibold">{rec.quantity}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          onClick={() => handleOpenEdit(rec)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => handleDelete(rec.id)}
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

      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar' : 'Adicionar'} Registro</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.type}
                  onValueChange={(v) =>
                    setFormData({ ...formData, type: v, function_id: 'all', equipment_id: 'all' })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="colaborador">Colaborador</SelectItem>
                    <SelectItem value="equipamento">Equipamento</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Quantidade</Label>
                <Input
                  type="number"
                  min={1}
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Planta</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
              >
                <SelectTrigger>
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

            <div className="space-y-2">
              <Label>Local / Setor (Opcional)</Label>
              <Select
                value={formData.location_id}
                onValueChange={(v) => setFormData({ ...formData, location_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o local" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral / Não específico</SelectItem>
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

            <div className="space-y-2">
              <Label>Empresa (Opcional)</Label>
              <Select
                value={formData.company_id}
                onValueChange={(v) => setFormData({ ...formData, company_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Geral / Não específico</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.type === 'colaborador' && (
              <div className="space-y-2">
                <Label>Função</Label>
                <Select
                  value={formData.function_id}
                  onValueChange={(v) => setFormData({ ...formData, function_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a função" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Funções / Geral</SelectItem>
                    {functions.map((f) => (
                      <SelectItem key={f.id} value={f.id}>
                        {f.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {formData.type === 'equipamento' && (
              <div className="space-y-2">
                <Label>Equipamento</Label>
                <Select
                  value={formData.equipment_id}
                  onValueChange={(v) => setFormData({ ...formData, equipment_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o equipamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Geral / Não específico</SelectItem>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDuplicateModalOpen} onOpenChange={setIsDuplicateModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Duplicar Quadro (De/Para)</DialogTitle>
            <DialogDescription>
              Copie o quadro de colaboradores e equipamentos de um mês para outro.
            </DialogDescription>
          </DialogHeader>

          {!showDupConfirm ? (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Mês de Origem (De)</Label>
                <Select value={dupOrigin} onValueChange={setDupOrigin}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês base" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Mês de Destino (Para)</Label>
                <Select value={dupDest} onValueChange={setDupDest}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o mês alvo" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthOptions.map((m) => (
                      <SelectItem key={m.value} value={m.value}>
                        {m.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : (
            <div className="py-6">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-semibold text-amber-800">Atenção! Dados existentes.</h4>
                  <p className="text-amber-700 text-sm mt-1">
                    O mês de destino ({monthOptions.find((m) => m.value === dupDest)?.label}) já
                    possui informações cadastradas. A duplicação irá <strong>SOBRESCREVER</strong>{' '}
                    (apagar) todos os registros do mês de destino antes de copiar.
                  </p>
                  <p className="text-amber-700 text-sm font-medium mt-2">
                    Deseja prosseguir mesmo assim?
                  </p>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsDuplicateModalOpen(false)
                setShowDupConfirm(false)
              }}
            >
              Cancelar
            </Button>
            {!showDupConfirm ? (
              <Button onClick={handleDuplicateCheck}>Avançar</Button>
            ) : (
              <Button variant="destructive" onClick={executeDuplicate}>
                Sim, Sobrescrever e Duplicar
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
