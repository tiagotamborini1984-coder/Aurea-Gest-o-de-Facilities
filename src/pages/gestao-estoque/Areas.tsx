import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { inventoryService } from '@/services/inventory'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Plus, Edit2, Trash2, Search, MapPin } from 'lucide-react'
import { toast } from 'sonner'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AreasEstoque() {
  const { activeClient } = useAppStore()
  const [areas, setAreas] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [currentArea, setCurrentArea] = useState<any>(null)
  const [formData, setFormData] = useState({ name: '', plant_id: '' })
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeClient) {
      loadData()
    }
  }, [activeClient])

  const loadData = async () => {
    try {
      setLoading(true)
      const [areasData, plantsData] = await Promise.all([
        inventoryService.getAreasByClient(activeClient.id),
        inventoryService.getPlants(activeClient.id),
      ])
      setAreas(areasData)
      setPlants(plantsData)
    } catch (err) {
      toast.error('Erro ao carregar áreas')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDialog = (area?: any) => {
    if (area) {
      setCurrentArea(area)
      setFormData({ name: area.name, plant_id: area.plant_id })
    } else {
      setCurrentArea(null)
      setFormData({ name: '', plant_id: '' })
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.plant_id) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        ...formData,
        client_id: activeClient.id,
        ...(currentArea ? { id: currentArea.id } : {}),
      }
      await inventoryService.saveArea(payload)
      toast.success('Área salva com sucesso')
      setIsDialogOpen(false)
      loadData()
    } catch (err) {
      toast.error('Erro ao salvar área')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (areaId: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta área?')) return
    try {
      await inventoryService.deleteArea(areaId)
      toast.success('Área excluída com sucesso')
      loadData()
    } catch (err: any) {
      if (err?.code === '23503') {
        toast.error('Não é possível excluir a área pois ela está vinculada a outros registros.')
      } else {
        toast.error('Erro ao excluir área')
      }
    }
  }

  const filteredAreas = areas.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.plant?.name?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Cadastro de Áreas</h1>
          <p className="text-slate-500">
            Gerencie as áreas vinculadas às plantas para uso no estoque
          </p>
        </div>
        <Button onClick={() => handleOpenDialog()}>
          <Plus className="w-4 h-4 mr-2" />
          Nova Área
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Buscar por nome ou planta..."
              className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome da Área</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead className="w-[100px] text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredAreas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center py-8 text-slate-500">
                      Nenhuma área encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAreas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <MapPin className="w-4 h-4 text-slate-400" />
                          {area.plant?.name || 'Não vinculada'}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(area)}
                          >
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(area.id)}>
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentArea ? 'Editar Área' : 'Nova Área'}</DialogTitle>
            <DialogDescription>
              Preencha os dados abaixo para {currentArea ? 'atualizar' : 'criar'} a área.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome da Área</Label>
              <Input
                placeholder="Ex: Refeitório, Recepção..."
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Planta Vinculada</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
