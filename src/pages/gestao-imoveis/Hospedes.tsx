import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Plus, Users, Briefcase, Edit, Trash2 } from 'lucide-react'

export default function Hospedes() {
  const [guests, setGuests] = useState<any[]>([])
  const [costCenters, setCostCenters] = useState<any[]>([])
  const { activeClient } = useAppStore()
  const [open, setOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cost_center_id: 'none',
    department: '',
  })

  useEffect(() => {
    if (activeClient) {
      loadData()
      loadCostCenters()
    }
  }, [activeClient])

  async function loadData() {
    const { data } = await supabase
      .from('property_guests')
      .select('*, property_cost_centers(name)')
      .eq('client_id', activeClient?.id)
      .order('created_at', { ascending: false })

    if (data) setGuests(data)
  }

  async function loadCostCenters() {
    const { data } = await supabase
      .from('property_cost_centers')
      .select('*')
      .eq('client_id', activeClient?.id)
      .order('name')

    if (data) setCostCenters(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeClient) return

    const payload = {
      client_id: activeClient.id,
      name: formData.name,
      email: formData.email || null,
      phone: formData.phone || null,
      cost_center_id: formData.cost_center_id !== 'none' ? formData.cost_center_id : null,
      department: formData.department || null,
    }

    if (editingId) {
      const { error } = await supabase.from('property_guests').update(payload).eq('id', editingId)
      if (error) {
        toast.error('Erro ao atualizar hóspede')
      } else {
        toast.success('Hóspede atualizado com sucesso!')
        setOpen(false)
        loadData()
      }
    } else {
      const { error } = await supabase.from('property_guests').insert(payload)
      if (error) {
        toast.error('Erro ao cadastrar hóspede')
      } else {
        toast.success('Hóspede cadastrado com sucesso!')
        setOpen(false)
        loadData()
      }
    }
  }

  function handleEdit(guest: any) {
    setEditingId(guest.id)
    setFormData({
      name: guest.name,
      email: guest.email || '',
      phone: guest.phone || '',
      cost_center_id: guest.cost_center_id || 'none',
      department: guest.department || '',
    })
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir este hóspede?')) return
    const { error } = await supabase.from('property_guests').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir hóspede. Verifique se ele possui reservas vinculadas.')
    } else {
      toast.success('Hóspede excluído com sucesso')
      loadData()
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
          <Users className="h-8 w-8 text-primary" /> Hóspedes
        </h1>
        <Dialog
          open={open}
          onOpenChange={(val) => {
            setOpen(val)
            if (!val) setEditingId(null)
          }}
        >
          <DialogTrigger asChild>
            <Button
              onClick={() => {
                setEditingId(null)
                setFormData({
                  name: '',
                  email: '',
                  phone: '',
                  cost_center_id: 'none',
                  department: '',
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Hóspede
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Hóspede' : 'Cadastrar Hóspede'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nome Completo</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="João da Silva"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>E-mail</Label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="joao@empresa.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Telefone</Label>
                  <Input
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    placeholder="(11) 99999-9999"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Centro de Custo</Label>
                <Select
                  value={formData.cost_center_id}
                  onValueChange={(val) => setFormData({ ...formData, cost_center_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione um centro de custo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Nenhum</SelectItem>
                    {costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Departamento</Label>
                <Input
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Ex: Recursos Humanos, TI"
                />
              </div>
              <Button type="submit" className="w-full mt-4">
                {editingId ? 'Atualizar Hóspede' : 'Salvar Hóspede'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-xl bg-white shadow-sm overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="font-semibold text-slate-700">Nome</TableHead>
              <TableHead className="font-semibold text-slate-700">E-mail</TableHead>
              <TableHead className="font-semibold text-slate-700">Telefone</TableHead>
              <TableHead className="font-semibold text-slate-700">Centro de Custo</TableHead>
              <TableHead className="font-semibold text-slate-700">Departamento</TableHead>
              <TableHead className="font-semibold text-slate-700 text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {guests.map((g) => (
              <TableRow key={g.id} className="hover:bg-slate-50/50">
                <TableCell className="font-medium text-slate-900">{g.name}</TableCell>
                <TableCell className="text-slate-600">{g.email || '-'}</TableCell>
                <TableCell className="text-slate-600">{g.phone || '-'}</TableCell>
                <TableCell>
                  {g.property_cost_centers?.name ? (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      <Briefcase className="w-3 h-3 mr-1" />
                      {g.property_cost_centers.name}
                    </span>
                  ) : (
                    <span className="text-slate-400 text-sm">Não vinculado</span>
                  )}
                </TableCell>
                <TableCell className="text-slate-600">{g.department || '-'}</TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(g)}>
                      <Edit className="h-4 w-4 text-slate-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(g.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {guests.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                  <div className="flex flex-col items-center justify-center">
                    <Users className="h-10 w-10 text-slate-300 mb-3" />
                    <p>Nenhum hóspede cadastrado.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
