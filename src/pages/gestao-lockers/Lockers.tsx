import { useState, useEffect, useMemo } from 'react'
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
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Trash2, Edit2, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'

type LockerRow = {
  id: string
  plant_id: string
  location: string
  identification: string
  description: string | null
  plants?: { name: string } | null
}

export default function Lockers() {
  const { activeClient, profile } = useAppStore()
  const [lockers, setLockers] = useState<LockerRow[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [selectedFilterPlant, setSelectedFilterPlant] = useState<string>('all')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<'individual' | 'bulk'>('individual')
  const [formData, setFormData] = useState({
    id: '',
    plant_id: '',
    location: '',
    identification: '',
    description: '',
  })
  const [loading, setLoading] = useState(false)

  const [bulkForm, setBulkForm] = useState({
    plant_id: '',
    location: '',
    description: '',
    prefix: 'L',
    quantity: 100,
    startNumber: 1,
  })
  const [bulkErrors, setBulkErrors] = useState<string[]>([])
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [bulkLoading, setBulkLoading] = useState(false)

  useEffect(() => {
    if (activeClient) fetchPlants()
  }, [activeClient])

  useEffect(() => {
    if (activeClient) fetchLockers()
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
    } catch {
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

  const padWidth = useMemo(() => {
    const maxNum = bulkForm.startNumber + bulkForm.quantity - 1
    return String(maxNum).length
  }, [bulkForm.startNumber, bulkForm.quantity])

  const generatedIds = useMemo(() => {
    const { prefix, quantity, startNumber } = bulkForm
    const ids: string[] = []
    for (let i = 0; i < quantity; i++) {
      const num = startNumber + i
      ids.push(`${prefix}${String(num).padStart(padWidth, '0')}`)
    }
    return ids
  }, [bulkForm.prefix, bulkForm.quantity, bulkForm.startNumber, padWidth])

  const handleBulkSubmit = async () => {
    setBulkErrors([])
    if (!bulkForm.plant_id) {
      toast.error('Selecione uma planta')
      return
    }
    if (!bulkForm.location.trim()) {
      toast.error('Informe a localização')
      return
    }
    if (!bulkForm.prefix.trim()) {
      toast.error('Informe o prefixo')
      return
    }
    if (bulkForm.quantity < 1 || bulkForm.quantity > 500) {
      toast.error('A quantidade deve estar entre 1 e 500')
      return
    }
    if (bulkForm.startNumber < 1) {
      toast.error('O número inicial deve ser maior ou igual a 1')
      return
    }

    const { data: existing } = await supabase
      .from('lockers')
      .select('identification')
      .eq('client_id', activeClient!.id)
      .eq('plant_id', bulkForm.plant_id)
      .in('identification', generatedIds)

    if (existing && existing.length > 0) {
      const dups = existing.map((e) => e.identification).join(', ')
      setBulkErrors(existing.map((e) => e.identification))
      toast.error(`Já existem lockers com as identificações: ${dups}`)
      return
    }

    setShowConfirmModal(true)
  }

  const handleBulkConfirm = async () => {
    setBulkLoading(true)
    try {
      const insertData = generatedIds.map((id) => ({
        client_id: activeClient!.id,
        plant_id: bulkForm.plant_id,
        location: bulkForm.location.trim(),
        description: bulkForm.description.trim() || null,
        identification: id,
      }))

      const { error } = await supabase.from('lockers').insert(insertData)

      if (error) throw error

      toast.success(`${generatedIds.length} lockers criados com sucesso!`)
      setShowConfirmModal(false)
      setBulkForm({
        plant_id: '',
        location: '',
        description: '',
        prefix: 'L',
        quantity: 100,
        startNumber: 1,
      })
      setBulkErrors([])
      fetchLockers()
    } catch (err: any) {
      toast.error(err?.message || 'Erro ao criar lockers em lote')
    } finally {
      setBulkLoading(false)
    }
  }

  const selectedPlantName = plants.find((p) => p.id === bulkForm.plant_id)?.name || ''

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
              setActiveTab('individual')
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
                        setActiveTab('individual')
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
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{formData.id ? 'Editar' : 'Novo'} Locker</DialogTitle>
          </DialogHeader>
          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'individual' | 'bulk')}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="individual">Criação Individual</TabsTrigger>
              <TabsTrigger value="bulk">Criação em Lote</TabsTrigger>
            </TabsList>
          </Tabs>

          {activeTab === 'individual' && (
            <div className="space-y-4 py-2">
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
                  disabled={!!formData.id}
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
          )}

          {activeTab === 'bulk' && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Planta *</Label>
                <Select
                  value={bulkForm.plant_id}
                  onValueChange={(v) => setBulkForm({ ...bulkForm, plant_id: v })}
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
                  value={bulkForm.location}
                  onChange={(e) => setBulkForm({ ...bulkForm, location: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Prefixo do Número *</Label>
                  <Input
                    placeholder="Ex: L"
                    value={bulkForm.prefix}
                    onChange={(e) => setBulkForm({ ...bulkForm, prefix: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Número Inicial *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={bulkForm.startNumber}
                    onChange={(e) =>
                      setBulkForm({ ...bulkForm, startNumber: Number(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Quantidade *</Label>
                <Input
                  type="number"
                  min={1}
                  max={500}
                  value={bulkForm.quantity}
                  onChange={(e) => setBulkForm({ ...bulkForm, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={bulkForm.description}
                  onChange={(e) => setBulkForm({ ...bulkForm, description: e.target.value })}
                />
              </div>

              {generatedIds.length > 0 && (
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 space-y-1">
                  <p className="text-sm font-medium text-slate-600">Prévia das identificações:</p>
                  <p className="text-sm text-slate-500">
                    {generatedIds.slice(0, 5).join(', ')}
                    {generatedIds.length > 5 && ` ... ${generatedIds[generatedIds.length - 1]}`}
                  </p>
                  <p className="text-xs text-slate-400">
                    Total: {generatedIds.length} locker(s) — Preenchimento: {padWidth} dígito(s)
                  </p>
                </div>
              )}

              {bulkErrors.length > 0 && (
                <div className="rounded-lg bg-red-50 border border-red-200 p-3 flex items-start gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-red-800">
                      Identificações duplicadas encontradas:
                    </p>
                    <p className="text-sm text-red-600">{bulkErrors.join(', ')}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            {activeTab === 'individual' ? (
              <Button onClick={handleSave} disabled={loading}>
                Salvar
              </Button>
            ) : (
              <Button onClick={handleBulkSubmit} disabled={loading}>
                <Plus className="h-4 w-4 mr-2" /> Criar Lote
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirmar Criação em Lote</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <span className="text-slate-500">Planta:</span>{' '}
                <span className="font-medium">{selectedPlantName}</span>
              </div>
              <div>
                <span className="text-slate-500">Localização:</span>{' '}
                <span className="font-medium">{bulkForm.location}</span>
              </div>
              <div>
                <span className="text-slate-500">Quantidade:</span>{' '}
                <span className="font-medium">{generatedIds.length}</span>
              </div>
            </div>
            <ScrollArea className="h-[200px] rounded-lg border border-slate-200">
              <div className="p-3 space-y-1">
                {generatedIds.map((id) => (
                  <div key={id} className="flex items-center gap-2 text-sm py-0.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                    <span className="font-medium">{id}</span>
                    <span className="text-slate-400">— {bulkForm.location}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmModal(false)}>
              Cancelar
            </Button>
            <Button onClick={handleBulkConfirm} disabled={bulkLoading}>
              {bulkLoading ? 'Criando...' : 'Confirmar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
