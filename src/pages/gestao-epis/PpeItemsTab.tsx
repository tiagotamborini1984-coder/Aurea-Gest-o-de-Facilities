import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import { Plus, Edit2, Trash2, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { ppeService } from '@/services/ppe'
import { toast } from 'sonner'

export function PpeItemsTab() {
  const { activeClient, profile } = useAppStore()
  const [items, setItems] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    ca_number: '',
    total_quantity: '0',
    plant_id: '',
  })

  const clientId = activeClient?.id || profile?.client_id

  useEffect(() => {
    if (clientId) loadItems()
  }, [clientId])

  useEffect(() => {
    if (clientId) loadPlants()
  }, [clientId, profile])

  const loadPlants = async () => {
    if (!clientId) return
    const { data } = await supabase.from('plants').select('id, name').eq('client_id', clientId)
    if (data) {
      let filtered = data
      if (profile && profile.role !== 'Master' && profile.role !== 'Administrador') {
        const auth = profile.authorized_plants || []
        filtered = data.filter((p) => auth.includes(p.id))
      }
      setPlants(filtered)
    }
  }

  const loadItems = async () => {
    if (!clientId) return
    setLoading(true)
    try {
      setItems(await ppeService.getItems(clientId))
    } catch {
      toast.error('Erro ao carregar EPIs')
    }
    setLoading(false)
  }

  const openForm = (item?: any) => {
    setEditing(item || null)
    setFormData(
      item
        ? {
            name: item.name,
            description: item.description || '',
            ca_number: item.ca_number || '',
            total_quantity: String(item.total_quantity),
            plant_id: item.plant_id,
          }
        : {
            name: '',
            description: '',
            ca_number: '',
            total_quantity: '0',
            plant_id: plants.length === 1 ? plants[0].id : '',
          },
    )
    setIsOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name.trim() || !formData.plant_id) return toast.error('Preencha nome e planta')
    if (!clientId) return
    setSaving(true)
    try {
      await ppeService.saveItem({
        ...formData,
        client_id: clientId,
        total_quantity: Number(formData.total_quantity) || 0,
        ...(editing ? { id: editing.id } : {}),
      })
      toast.success(editing ? 'EPI atualizado!' : 'EPI criado!')
      setIsOpen(false)
      loadItems()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao salvar')
    }
    setSaving(false)
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await ppeService.deleteItem(deleteId)
      toast.success('EPI excluído')
      loadItems()
    } catch {
      toast.error('Erro ao excluir')
    }
    setDeleteId(null)
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => openForm()}>
          <Plus className="h-4 w-4 mr-2" /> Novo EPI
        </Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>CA</TableHead>
                <TableHead>Planta</TableHead>
                <TableHead className="text-center">Qtd Total</TableHead>
                <TableHead className="text-center">Estoque Atual</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell>{item.ca_number || '-'}</TableCell>
                  <TableCell>{item.plants?.name || '-'}</TableCell>
                  <TableCell className="text-center">{item.total_quantity}</TableCell>
                  <TableCell className="text-center">
                    <span
                      className={
                        item.current_stock <= 0
                          ? 'text-red-600 font-semibold'
                          : 'text-green-700 font-semibold'
                      }
                    >
                      {item.current_stock}
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => openForm(item)}>
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeleteId(item.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                    Nenhum EPI cadastrado.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Editar' : 'Novo'} EPI</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Planta *</Label>
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
              <Label>Nome *</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>CA (Certificado de Aprovação)</Label>
              <Input
                value={formData.ca_number}
                onChange={(e) => setFormData({ ...formData, ca_number: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade Total *</Label>
              <Input
                type="number"
                min="0"
                value={formData.total_quantity}
                onChange={(e) => setFormData({ ...formData, total_quantity: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir EPI?</AlertDialogTitle>
            <AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
