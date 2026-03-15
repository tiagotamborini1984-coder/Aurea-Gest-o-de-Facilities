import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Plus, Loader2, Trash2, Edit2, ClipboardList } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'

export default function QuadroContratado() {
  const { profile } = useAppStore()
  const { plants, locations, functions, equipment, goals, refetch } = useMasterData()
  const { toast } = useToast()

  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [entryType, setEntryType] = useState('colaboradores')

  const [filterPlant, setFilterPlant] = useState('all')
  const [filterType, setFilterType] = useState('all')

  const [form, setForm] = useState({
    plant_id: '',
    location_id: 'none',
    function_id: 'none',
    equipment_id: 'none',
    quantity: '',
    goal_id: '',
    reference_month: '',
    value: '',
  })

  const loadData = async () => {
    if (!profile?.client_id) return
    setLoading(true)
    const { data: res } = await supabase
      .from('contracted_headcount')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })
    setData(res || [])
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [profile])

  const openAdd = () => {
    setEditingId(null)
    setForm({
      plant_id: filterPlant !== 'all' ? filterPlant : '',
      location_id: 'none',
      function_id: 'none',
      equipment_id: 'none',
      quantity: '',
      goal_id: '',
      reference_month: '',
      value: '',
    })
    setEntryType('colaboradores')
    setIsModalOpen(true)
  }

  const openEdit = (item: any) => {
    setEditingId(item.id)
    setEntryType(item.type === 'colaborador' ? 'colaboradores' : 'equipamentos')
    setForm({
      plant_id: item.plant_id || '',
      location_id: item.location_id || 'none',
      function_id: item.function_id || 'none',
      equipment_id: item.equipment_id || 'none',
      quantity: item.quantity?.toString() || '',
      goal_id: '',
      reference_month: '',
      value: '',
    })
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (entryType === 'metas') {
        if (!form.plant_id || !form.goal_id || !form.reference_month || !form.value) {
          throw new Error('Preencha todos os campos obrigatórios de Metas.')
        }
        const { error } = await supabase.from('monthly_goals_data').insert({
          client_id: profile!.client_id,
          plant_id: form.plant_id,
          goal_id: form.goal_id,
          reference_month: `${form.reference_month}-01`,
          value: Number(form.value),
        })
        if (error) throw error
        toast({
          title: 'Meta lançada com sucesso',
          className: 'bg-green-500/20 text-brand-cyan border-brand-cyan/50',
        })
      } else {
        if (!form.plant_id || !form.quantity) {
          throw new Error('Preencha Planta e Quantidade.')
        }
        const isStaff = entryType === 'colaboradores'

        const payload = {
          client_id: profile!.client_id,
          type: isStaff ? 'colaborador' : 'equipamento',
          plant_id: form.plant_id,
          location_id: isStaff && form.location_id !== 'none' ? form.location_id : null,
          function_id: isStaff && form.function_id !== 'none' ? form.function_id : null,
          equipment_id: !isStaff && form.equipment_id !== 'none' ? form.equipment_id : null,
          quantity: Number(form.quantity),
        }

        if (editingId) {
          const { error } = await supabase
            .from('contracted_headcount')
            .update(payload)
            .eq('id', editingId)
          if (error) throw error
          toast({
            title: 'Quadro contratado atualizado',
            className: 'bg-green-500/20 text-brand-cyan border-brand-cyan/50',
          })
        } else {
          const { error } = await supabase.from('contracted_headcount').insert(payload)
          if (error) throw error
          toast({
            title: 'Quadro contratado salvo',
            className: 'bg-green-500/20 text-brand-cyan border-brand-cyan/50',
          })
        }
        loadData()
        refetch()
      }
      setIsModalOpen(false)
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('contracted_headcount').delete().eq('id', id)
    if (!error) {
      toast({
        title: 'Registro removido',
        className: 'bg-brand-cyan/10 text-brand-cyan border-brand-cyan/20',
      })
      loadData()
      refetch()
    }
  }

  const filteredData = data.filter((item) => {
    if (filterPlant !== 'all' && item.plant_id !== filterPlant) return false
    if (filterType !== 'all' && item.type !== filterType) return false
    return true
  })

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-cyan/10 p-2.5 rounded-xl border border-brand-cyan/20 shadow-[0_0_15px_rgba(0,255,255,0.1)]">
            <ClipboardList className="h-6 w-6 text-brand-cyan" />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-foreground">Quadro Contratado</h2>
            <p className="text-muted-foreground mt-1 text-sm">
              Dimensionamento do contrato e metas de operação
            </p>
          </div>
        </div>
        <Button onClick={openAdd} variant="tech">
          <Plus className="w-4 h-4 mr-2" /> Novo Registro
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="w-full sm:w-64">
          <Select value={filterPlant} onValueChange={setFilterPlant}>
            <SelectTrigger className="bg-background border-input text-foreground">
              <SelectValue placeholder="Filtrar por Planta" />
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
        <div className="w-full sm:w-64">
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="bg-background border-input text-foreground">
              <SelectValue placeholder="Filtrar por Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="colaborador">Colaborador</SelectItem>
              <SelectItem value="equipamento">Equipamento</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-card rounded-xl border border-border shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50 border-b border-border">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-foreground">Tipo</TableHead>
              <TableHead className="font-semibold text-foreground">Planta</TableHead>
              <TableHead className="font-semibold text-foreground">Local / Equipamento</TableHead>
              <TableHead className="font-semibold text-foreground">Função</TableHead>
              <TableHead className="font-semibold text-foreground">Quantidade</TableHead>
              <TableHead className="font-semibold text-foreground text-right pr-6">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto text-brand-cyan" />
                </TableCell>
              </TableRow>
            ) : filteredData.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-muted-foreground">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredData.map((item) => (
                <TableRow key={item.id} className="hover:bg-muted/50 border-border">
                  <TableCell>
                    {item.type === 'colaborador' ? (
                      <Badge className="bg-brand-deepBlue/40 text-brand-cyan border border-brand-cyan/30 shadow-[0_0_10px_rgba(0,255,255,0.1)] hover:bg-brand-deepBlue/60">
                        Colaborador
                      </Badge>
                    ) : (
                      <Badge className="bg-muted text-foreground border border-border hover:bg-muted/80">
                        Equipamento
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">
                    {plants.find((p) => p.id === item.plant_id)?.name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {item.type === 'colaborador'
                      ? locations.find((l) => l.id === item.location_id)?.name || '-'
                      : equipment.find((e) => e.id === item.equipment_id)?.name || '-'}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {functions.find((f) => f.id === item.function_id)?.name || '-'}
                  </TableCell>
                  <TableCell className="font-bold text-foreground">{item.quantity}</TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(item)}
                        className="text-muted-foreground hover:text-brand-cyan hover:bg-brand-cyan/10"
                        title="Editar"
                      >
                        <Edit2 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item.id)}
                        className="text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remover"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-foreground">
              {editingId ? 'Editar Registro' : 'Novo Registro'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 py-2">
            {!editingId && (
              <RadioGroup
                value={entryType}
                onValueChange={setEntryType}
                className="flex flex-wrap gap-4 bg-muted/30 p-4 rounded-xl border border-border"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="colaboradores"
                    id="r1"
                    className="text-brand-cyan border-brand-cyan/50"
                  />
                  <Label htmlFor="r1" className="cursor-pointer text-foreground font-medium">
                    Colaboradores
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="equipamentos"
                    id="r2"
                    className="text-brand-cyan border-brand-cyan/50"
                  />
                  <Label htmlFor="r2" className="cursor-pointer text-foreground font-medium">
                    Equipamentos
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem
                    value="metas"
                    id="r3"
                    className="text-brand-cyan border-brand-cyan/50"
                  />
                  <Label htmlFor="r3" className="cursor-pointer text-foreground font-medium">
                    Metas
                  </Label>
                </div>
              </RadioGroup>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-foreground">Planta *</Label>
                <Select
                  value={form.plant_id}
                  onValueChange={(v) => setForm({ ...form, plant_id: v })}
                >
                  <SelectTrigger className="bg-background">
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

              {entryType === 'colaboradores' && (
                <div className="space-y-2">
                  <Label className="text-foreground">Função</Label>
                  <Select
                    value={form.function_id}
                    onValueChange={(v) => setForm({ ...form, function_id: v })}
                  >
                    <SelectTrigger className="bg-background">
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
              )}

              {entryType === 'equipamentos' && (
                <div className="space-y-2">
                  <Label className="text-foreground">Equipamento *</Label>
                  <Select
                    value={form.equipment_id}
                    onValueChange={(v) => setForm({ ...form, equipment_id: v })}
                  >
                    <SelectTrigger className="bg-background">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Nenhum</SelectItem>
                      {equipment
                        .filter((e) => e.plant_id === form.plant_id)
                        .map((e) => (
                          <SelectItem key={e.id} value={e.id}>
                            {e.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {entryType === 'metas' && (
                <>
                  <div className="space-y-2">
                    <Label className="text-foreground">Meta *</Label>
                    <Select
                      value={form.goal_id}
                      onValueChange={(v) => setForm({ ...form, goal_id: v })}
                    >
                      <SelectTrigger className="bg-background">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {goals
                          .filter((g) => g.is_active)
                          .map((g) => (
                            <SelectItem key={g.id} value={g.id}>
                              {g.name}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Mês de Referência *</Label>
                    <Input
                      type="month"
                      value={form.reference_month}
                      onChange={(e) => setForm({ ...form, reference_month: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-foreground">Valor *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={form.value}
                      onChange={(e) => setForm({ ...form, value: e.target.value })}
                      className="bg-background"
                    />
                  </div>
                </>
              )}

              {entryType !== 'metas' && (
                <div className="space-y-2">
                  <Label className="text-foreground">Quantidade *</Label>
                  <Input
                    type="number"
                    min="1"
                    value={form.quantity}
                    onChange={(e) => setForm({ ...form, quantity: e.target.value })}
                    className="bg-background"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-border mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
