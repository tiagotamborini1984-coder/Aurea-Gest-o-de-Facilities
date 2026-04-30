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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

export default function Lockers() {
  const { activeClient, profile } = useAppStore()
  const [lockers, setLockers] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [selectedFilterPlant, setSelectedFilterPlant] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    plant_id: '',
    location: '',
    identification: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient) {
      fetchLockers()
    }
  }, [activeClient, selectedFilterPlant])

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*').eq('client_id', activeClient!.id)
    if (data) {
      let filteredPlants = data
      if (profile && profile.role !== 'Master' && profile.role !== 'Administrador') {
        const authorized = profile.authorized_plants || []
        filteredPlants = data.filter((p) => authorized.includes(p.id))
      }
      setPlants(filteredPlants)
    }
  }

  const fetchLockers = async () => {
    let query = supabase.from('lockers').select('*, plants(name)').eq('client_id', activeClient!.id)

    if (selectedFilterPlant !== 'all') {
      query = query.eq('plant_id', selectedFilterPlant)
    } else if (profile && profile.role !== 'Master' && profile.role !== 'Administrador') {
      const authorized = profile.authorized_plants || []
      if (authorized.length > 0) {
        query = query.in('plant_id', authorized)
      } else {
        setLockers([])
        return
      }
    }

    const { data } = await query

    const sortedLockers = (data || []).sort((a, b) =>
      a.identification.localeCompare(b.identification, undefined, {
        numeric: true,
        sensitivity: 'base',
      }),
    )
    setLockers(sortedLockers)
  }

  const handleSave = async () => {
    if (!formData.plant_id || !formData.location || !formData.identification) {
      toast.error('Preencha os campos obrigatórios')
      return
    }
    setLoading(true)
    try {
      if (formData.id) {
        await supabase
          .from('lockers')
          .update({
            plant_id: formData.plant_id,
            location: formData.location,
            identification: formData.identification,
            description: formData.description,
          })
          .eq('id', formData.id)
        toast.success('Locker atualizado!')
      } else {
        await supabase.from('lockers').insert({
          client_id: activeClient!.id,
          plant_id: formData.plant_id,
          location: formData.location,
          identification: formData.identification,
          description: formData.description,
        })
        toast.success('Locker criado!')
      }
      setIsModalOpen(false)
      fetchLockers()
    } catch (error) {
      toast.error('Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este locker?')) return
    await supabase.from('lockers').delete().eq('id', id)
    toast.success('Locker excluído')
    fetchLockers()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Cadastros de Lockers</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedFilterPlant} onValueChange={setSelectedFilterPlant}>
            <SelectTrigger className="w-[200px] bg-white">
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
          <Button
            onClick={() => {
              setFormData({
                id: '',
                plant_id: plants.length === 1 ? plants[0].id : '',
                location: '',
                identification: '',
                description: '',
              })
              setIsModalOpen(true)
            }}
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Locker
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Identificação</TableHead>
                <TableHead>Planta</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lockers.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.identification}</TableCell>
                  <TableCell>{l.plants?.name}</TableCell>
                  <TableCell>{l.location}</TableCell>
                  <TableCell>{l.description}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData({
                          id: l.id,
                          plant_id: l.plant_id,
                          location: l.location,
                          identification: l.identification,
                          description: l.description || '',
                        })
                        setIsModalOpen(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleDelete(l.id)}>
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
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Locker</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Planta *</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Planta" />
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
              <Label>Localização *</Label>
              <Input
                placeholder="Ex: Vestiário Masculino"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Identificação *</Label>
              <Input
                placeholder="Ex: L01"
                value={formData.identification}
                onChange={(e) => setFormData({ ...formData, identification: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
