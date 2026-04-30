import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function ColaboradoresLockers() {
  const { activeClient } = useAppStore()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({ id: '', name: '', company: '', department: '' })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeClient) fetchCollaborators()
  }, [activeClient])

  const fetchCollaborators = async () => {
    const { data } = await supabase
      .from('locker_collaborators')
      .select('*')
      .eq('client_id', activeClient!.id)
      .order('name', { ascending: true })
    setCollaborators(data || [])
  }

  const handleSave = async () => {
    if (!formData.name) {
      toast.error('Nome é obrigatório')
      return
    }
    setLoading(true)
    try {
      if (formData.id) {
        await supabase
          .from('locker_collaborators')
          .update({
            name: formData.name,
            company: formData.company,
            department: formData.department,
          } as any)
          .eq('id', formData.id)
        toast.success('Colaborador atualizado!')
      } else {
        await supabase.from('locker_collaborators').insert({
          client_id: activeClient!.id,
          name: formData.name,
          company: formData.company,
          department: formData.department,
        } as any)
        toast.success('Colaborador criado!')
      }
      setIsModalOpen(false)
      fetchCollaborators()
    } catch (error) {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este colaborador?')) return
    await supabase.from('locker_collaborators').delete().eq('id', id)
    toast.success('Colaborador excluído')
    fetchCollaborators()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Colaboradores (Lockers)</h1>
        <Button
          onClick={() => {
            setFormData({ id: '', name: '', company: '', department: '' })
            setIsModalOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Adicionar Colaborador
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Setor</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collaborators.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.company}</TableCell>
                  <TableCell>{c.department}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData({
                          id: c.id,
                          name: c.name,
                          company: c.company || '',
                          department: c.department || '',
                        })
                        setIsModalOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Colaborador</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Empresa</Label>
              <Input
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Setor</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
