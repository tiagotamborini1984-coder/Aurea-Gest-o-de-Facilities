import React, { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Plus, Edit2, Trash2, MapPin } from 'lucide-react'
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

export default function CadastrosColaboradores() {
  const { plants, locations, functions } = useMasterData()
  const { profile, selectedMasterClient } = useAppStore()
  const { toast } = useToast()

  const [records, setRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [companies, setCompanies] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')

  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [editingRecord, setEditingRecord] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    plant_id: '',
    location_id: 'all',
    function_id: 'all',
    company_id: 'all',
    company_name: '',
  })

  const clientId =
    profile?.role === 'Master'
      ? selectedMasterClient !== 'all'
        ? selectedMasterClient
        : profile?.client_id
      : profile?.client_id

  const fetchData = async () => {
    if (!clientId) return
    setLoading(true)

    // Fetch companies
    const { data: compData } = await supabase
      .from('companies')
      .select('*')
      .eq('client_id', clientId)
    setCompanies(compData || [])

    let q = supabase.from('employees').select('*')

    if (selectedPlant !== 'all') {
      q = q.eq('plant_id', selectedPlant)
    }

    q = q.eq('client_id', clientId).order('name')

    const { data, error } = await q
    if (error) {
      toast({ title: 'Erro ao buscar dados', description: error.message, variant: 'destructive' })
    }
    setRecords(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [clientId, selectedPlant])

  const handleOpenAdd = () => {
    setEditingRecord(null)
    setFormData({
      name: '',
      plant_id: selectedPlant !== 'all' ? selectedPlant : plants[0]?.id || '',
      location_id: 'all',
      function_id: 'all',
      company_id: 'all',
      company_name: '',
    })
    setIsAddModalOpen(true)
  }

  const handleOpenEdit = (rec: any) => {
    setEditingRecord(rec)
    setFormData({
      name: rec.name,
      plant_id: rec.plant_id,
      location_id: rec.location_id || 'all',
      function_id: rec.function_id || 'all',
      company_id: rec.company_id || 'all',
      company_name: rec.company_name || '',
    })
    setIsAddModalOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.plant_id) {
      toast({ title: 'Erro', description: 'Preencha nome e planta.', variant: 'destructive' })
      return
    }

    // Try to find company name if company_id is selected
    let compName = formData.company_name
    if (formData.company_id !== 'all') {
      const comp = companies.find((c) => c.id === formData.company_id)
      if (comp) compName = comp.name
    }

    const payload = {
      client_id: clientId,
      name: formData.name,
      plant_id: formData.plant_id,
      location_id: formData.location_id !== 'all' ? formData.location_id : null,
      function_id: formData.function_id !== 'all' ? formData.function_id : null,
      company_id: formData.company_id !== 'all' ? formData.company_id : null,
      company_name: compName,
    }

    if (editingRecord) {
      const { error } = await supabase.from('employees').update(payload).eq('id', editingRecord.id)
      if (error)
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Registro atualizado.' })
        setIsAddModalOpen(false)
        fetchData()
      }
    } else {
      const { error } = await supabase.from('employees').insert(payload)
      if (error)
        toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Registro adicionado.' })
        setIsAddModalOpen(false)
        fetchData()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este colaborador?')) return
    const { error } = await supabase.from('employees').delete().eq('id', id)
    if (error)
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Sucesso', description: 'Registro excluído.' })
      fetchData()
    }
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Colaboradores</h1>
          <p className="text-slate-500 mt-1">Gestão de terceiros e prestadores de serviço</p>
        </div>

        <div className="flex items-center gap-2">
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
              <TableHead>Nome</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Local</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>Empresa</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : records.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhum registro encontrado para esta planta.
                </TableCell>
              </TableRow>
            ) : (
              records.map((rec) => {
                const plant = plants.find((p) => p.id === rec.plant_id)?.name || '-'
                const loc = locations.find((l) => l.id === rec.location_id)?.name || '-'
                const func = functions.find((f) => f.id === rec.function_id)?.name || '-'
                const comp =
                  companies.find((c) => c.id === rec.company_id)?.name || rec.company_name || '-'

                return (
                  <TableRow key={rec.id}>
                    <TableCell className="font-medium">{rec.name}</TableCell>
                    <TableCell>{plant}</TableCell>
                    <TableCell>{loc}</TableCell>
                    <TableCell>{func}</TableCell>
                    <TableCell>{comp}</TableCell>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRecord ? 'Editar' : 'Adicionar'} Colaborador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nome do colaborador"
              />
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
              <Label>Local / Setor</Label>
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
              <Label>Função</Label>
              <Select
                value={formData.function_id}
                onValueChange={(v) => setFormData({ ...formData, function_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a função" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Sem função específica</SelectItem>
                  {functions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Empresa</Label>
              <Select
                value={formData.company_id}
                onValueChange={(v) => setFormData({ ...formData, company_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a empresa" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Outra (Digitar Nome)</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {formData.company_id === 'all' && (
              <div className="space-y-2">
                <Label>Nome da Empresa (Manual)</Label>
                <Input
                  value={formData.company_name}
                  onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                  placeholder="Digite o nome da empresa"
                />
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
    </div>
  )
}
