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
import { toast } from 'sonner'
import { Plus, Users, Briefcase } from 'lucide-react'

export default function Hospedes() {
  const [guests, setGuests] = useState<any[]>([])
  const { activeClient } = useAppStore()
  const [open, setOpen] = useState(false)
  const [formData, setFormData] = useState({ name: '', email: '', phone: '' })

  useEffect(() => {
    if (activeClient) loadData()
  }, [activeClient])

  async function loadData() {
    const { data } = await supabase
      .from('property_guests')
      .select('*, property_cost_centers(name)')
      .eq('client_id', activeClient?.id)
      .order('created_at', { ascending: false })

    if (data) setGuests(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeClient) return
    const { error } = await supabase.from('property_guests').insert({
      client_id: activeClient.id,
      ...formData,
    })
    if (error) toast.error('Erro ao cadastrar hóspede')
    else {
      toast.success('Hóspede cadastrado com sucesso!')
      setOpen(false)
      setFormData({ name: '', email: '', phone: '' })
      loadData()
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
          <Users className="h-8 w-8 text-primary" /> Hóspedes
        </h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Hóspede
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Hóspede</DialogTitle>
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
              <Button type="submit" className="w-full mt-4">
                Salvar Hóspede
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
              </TableRow>
            ))}
            {guests.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-12 text-slate-500">
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
