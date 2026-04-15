import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'
import { Plus, Home, MapPin, BedDouble, Trash2, ImagePlus, Bath, Edit } from 'lucide-react'

export default function Imoveis() {
  const [properties, setProperties] = useState<any[]>([])
  const { activeClient } = useAppStore()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [managingProperty, setManagingProperty] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    daily_rate: '',
    photos: [] as string[],
    rooms: [] as any[],
  })

  const [newRoom, setNewRoom] = useState({
    name: '',
    bed_type: 'Casal',
    has_bathroom: false,
    beds_quantity: 1,
  })

  useEffect(() => {
    if (activeClient) loadProperties()
  }, [activeClient])

  async function loadProperties() {
    const { data } = await supabase
      .from('properties')
      .select('*, property_rooms(*)')
      .eq('client_id', activeClient?.id)
      .order('created_at', { ascending: false })
    if (data) setProperties(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeClient) {
      toast.error('Cliente não identificado.')
      return
    }

    if (!formData.name || !formData.city || !formData.address || !formData.daily_rate) {
      toast.error('Preencha os dados básicos do imóvel (Nome, Cidade, Diária e Endereço).')
      return
    }

    if (!editingId) {
      for (let i = 0; i < formData.rooms.length; i++) {
        const r = formData.rooms[i]
        if (!r.name || !r.bed_type || !r.beds_quantity) {
          toast.error(`Preencha todos os dados do quarto: ${r.name || `Quarto ${i + 1}`}`)
          return
        }
      }
    }

    setLoading(true)

    const photos =
      formData.photos.length > 0
        ? formData.photos
        : ['https://img.usecurling.com/p/800/600?q=apartment']

    if (editingId) {
      const { error: propError } = await supabase
        .from('properties')
        .update({
          name: formData.name,
          city: formData.city,
          address: formData.address,
          description: formData.description,
          daily_rate: Number(formData.daily_rate),
          photos,
        })
        .eq('id', editingId)

      if (propError) {
        setLoading(false)
        return toast.error('Erro ao atualizar imóvel')
      }
      toast.success('Imóvel atualizado com sucesso!')
    } else {
      const { data: newProp, error: propError } = await supabase
        .from('properties')
        .insert({
          client_id: activeClient.id,
          name: formData.name,
          city: formData.city,
          address: formData.address,
          description: formData.description,
          daily_rate: Number(formData.daily_rate),
          photos,
        })
        .select()
        .single()

      if (propError) {
        setLoading(false)
        return toast.error('Erro ao salvar imóvel')
      }

      if (formData.rooms.length > 0) {
        const roomsToInsert = formData.rooms.map((r) => ({
          client_id: activeClient.id,
          property_id: newProp.id,
          name: r.name,
          capacity: Number(r.beds_quantity),
          bed_type: r.bed_type,
          has_bathroom: r.has_bathroom,
          beds_quantity: Number(r.beds_quantity),
        }))
        await supabase.from('property_rooms').insert(roomsToInsert)
      }
      toast.success('Imóvel cadastrado com sucesso!')
    }

    setOpen(false)
    setLoading(false)
    loadProperties()
    setFormData({
      name: '',
      city: '',
      address: '',
      description: '',
      daily_rate: '',
      photos: [],
      rooms: [],
    })
  }

  async function handleAddExistingRoom(e: React.FormEvent) {
    e.preventDefault()
    if (!managingProperty || !activeClient) return

    if (!newRoom.name || !newRoom.bed_type || !newRoom.beds_quantity) {
      toast.error('Preencha todos os campos do quarto.')
      return
    }

    const { error } = await supabase.from('property_rooms').insert({
      client_id: activeClient.id,
      property_id: managingProperty.id,
      name: newRoom.name,
      bed_type: newRoom.bed_type,
      has_bathroom: newRoom.has_bathroom,
      beds_quantity: Number(newRoom.beds_quantity),
      capacity: Number(newRoom.beds_quantity),
    })
    if (error) return toast.error('Erro ao adicionar quarto')
    toast.success('Quarto adicionado')
    const { data } = await supabase
      .from('property_rooms')
      .select('*')
      .eq('property_id', managingProperty.id)
    if (data) setManagingProperty({ ...managingProperty, property_rooms: data })
    setNewRoom({ name: '', bed_type: 'Casal', has_bathroom: false, beds_quantity: 1 })
    loadProperties()
  }

  async function handleDeleteRoom(roomId: string) {
    if (!confirm('Deseja excluir este quarto?')) return
    const { error } = await supabase.from('property_rooms').delete().eq('id', roomId)
    if (error) return toast.error('Erro ao excluir')
    toast.success('Quarto excluído')
    setManagingProperty({
      ...managingProperty,
      property_rooms: managingProperty.property_rooms.filter((r: any) => r.id !== roomId),
    })
    loadProperties()
  }

  const addMockPhoto = () =>
    setFormData((p) => ({
      ...p,
      photos: [...p.photos, `https://img.usecurling.com/p/800/600?q=bedroom&seed=${Date.now()}`],
    }))
  const addFormRoom = () =>
    setFormData((p) => ({
      ...p,
      rooms: [
        ...p.rooms,
        {
          id: Date.now(),
          name: `Quarto ${p.rooms.length + 1}`,
          bed_type: 'Casal',
          has_bathroom: false,
          beds_quantity: 1,
        },
      ],
    }))
  const updateRoom = (idx: number, field: string, val: any) =>
    setFormData((p) => {
      const nr = [...p.rooms]
      nr[idx] = { ...nr[idx], [field]: val }
      return { ...p, rooms: nr }
    })

  function handleEdit(prop: any) {
    setEditingId(prop.id)
    setFormData({
      name: prop.name,
      city: prop.city,
      address: prop.address,
      description: prop.description || '',
      daily_rate: prop.daily_rate?.toString() || '',
      photos: prop.photos || [],
      rooms: [], // Hide rooms in edit mode
    })
    setOpen(true)
  }

  async function handleDelete(id: string) {
    if (!confirm('Deseja excluir este imóvel? Todas as reservas vinculadas serão perdidas.')) return
    const { error } = await supabase.from('properties').delete().eq('id', id)
    if (error) return toast.error('Erro ao excluir imóvel')
    toast.success('Imóvel excluído')
    loadProperties()
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Imóveis</h1>
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
                  city: '',
                  address: '',
                  description: '',
                  daily_rate: '',
                  photos: [],
                  rooms: [],
                })
              }}
            >
              <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Imóvel' : 'Cadastrar Imóvel'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit}>
              <Tabs defaultValue="dados">
                <TabsList className="mb-4">
                  <TabsTrigger value="dados">Dados Básicos</TabsTrigger>
                  <TabsTrigger value="fotos">Fotos</TabsTrigger>
                  {!editingId && (
                    <TabsTrigger value="quartos">Quartos ({formData.rooms.length})</TabsTrigger>
                  )}
                </TabsList>

                <TabsContent value="dados" className="space-y-4">
                  <div className="space-y-2">
                    <Label>Nome do Imóvel</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Cidade</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor Diária (R$)</Label>
                      <Input
                        type="number"
                        value={formData.daily_rate}
                        onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Endereço</Label>
                    <Input
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Descrição</Label>
                    <Input
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </TabsContent>

                <TabsContent value="fotos" className="space-y-4">
                  <div className="flex justify-between items-center">
                    <Label>Fotos do Imóvel</Label>
                    <Button type="button" variant="outline" size="sm" onClick={addMockPhoto}>
                      <ImagePlus className="w-4 h-4 mr-2" /> Adicionar Foto
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {formData.photos.map((url, idx) => (
                      <div key={idx} className="relative group">
                        <img
                          src={url}
                          alt={`Foto ${idx + 1}`}
                          className="w-full h-32 object-cover rounded-md border"
                        />
                        <button
                          type="button"
                          className="absolute top-2 right-2 bg-destructive text-white p-1.5 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() =>
                            setFormData((p) => ({
                              ...p,
                              photos: p.photos.filter((_, i) => i !== idx),
                            }))
                          }
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {formData.photos.length === 0 && (
                      <div className="col-span-2 text-center py-8 border-2 border-dashed rounded-md text-muted-foreground">
                        Nenhuma foto adicionada.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {!editingId && (
                  <TabsContent value="quartos" className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Label>Quartos</Label>
                      <Button type="button" variant="outline" size="sm" onClick={addFormRoom}>
                        <Plus className="w-4 h-4 mr-2" /> Adicionar Quarto
                      </Button>
                    </div>
                    <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2">
                      {formData.rooms.map((r, idx) => (
                        <Card key={r.id} className="p-3">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label className="text-xs">Nome</Label>
                              <Input
                                value={r.name}
                                onChange={(e) => updateRoom(idx, 'name', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Tipo de Cama</Label>
                              <Input
                                value={r.bed_type}
                                onChange={(e) => updateRoom(idx, 'bed_type', e.target.value)}
                              />
                            </div>
                            <div>
                              <Label className="text-xs">Qtd de Camas</Label>
                              <Input
                                type="number"
                                min="1"
                                value={r.beds_quantity}
                                onChange={(e) => updateRoom(idx, 'beds_quantity', e.target.value)}
                              />
                            </div>
                            <div className="flex items-center justify-between mt-6">
                              <div className="flex items-center gap-2">
                                <Switch
                                  checked={r.has_bathroom}
                                  onCheckedChange={(v) => updateRoom(idx, 'has_bathroom', v)}
                                />
                                <Label className="text-xs">Banheiro?</Label>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-destructive h-8 px-2"
                                onClick={() =>
                                  setFormData((p) => ({
                                    ...p,
                                    rooms: p.rooms.filter((_, i) => i !== idx),
                                  }))
                                }
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                      {formData.rooms.length === 0 && (
                        <div className="text-center py-8 border-2 border-dashed rounded-md text-muted-foreground text-sm">
                          Nenhum quarto. Adicione para detalhar.
                        </div>
                      )}
                    </div>
                  </TabsContent>
                )}
              </Tabs>
              <div className="mt-6 border-t pt-4">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading
                    ? 'Salvando...'
                    : editingId
                      ? 'Atualizar Imóvel'
                      : 'Salvar Imóvel Completo'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {properties.map((p) => {
          const totalBeds =
            p.property_rooms?.reduce((acc: number, r: any) => acc + (r.beds_quantity || 1), 0) || 0
          const hasBaths = p.property_rooms?.some((r: any) => r.has_bathroom)
          return (
            <Card
              key={p.id}
              className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border flex flex-col"
            >
              <div className="h-48 w-full relative group">
                <img
                  src={p.photos[0] || 'https://img.usecurling.com/p/800/600?q=house'}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  alt={p.name}
                />
                <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold shadow-md">
                  R$ {p.daily_rate}
                </div>
                <div className="absolute top-4 left-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 shadow-md"
                    onClick={() => handleEdit(p)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8 shadow-md"
                    onClick={() => handleDelete(p.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                  <Home className="h-5 w-5 text-muted-foreground" /> {p.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm pb-5 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-muted-foreground mb-1">
                    <MapPin className="h-4 w-4" /> {p.city} - {p.address}
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BedDouble className="h-4 w-4" /> {p.property_rooms?.length || 0} Quartos (
                    {totalBeds} Camas){' '}
                    {hasBaths && (
                      <span className="flex items-center gap-1 ml-2">
                        <Bath className="h-3 w-3" />
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-4"
                  onClick={() => setManagingProperty(p)}
                >
                  Gerenciar Quartos
                </Button>
              </CardContent>
            </Card>
          )
        })}
        {properties.length === 0 && (
          <div className="col-span-3 text-center py-16 bg-muted/20 border rounded-xl border-dashed">
            <Home className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground text-lg">Nenhum imóvel cadastrado.</p>
          </div>
        )}
      </div>

      <Dialog open={!!managingProperty} onOpenChange={(v) => !v && setManagingProperty(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Quartos - {managingProperty?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
              {managingProperty?.property_rooms?.map((r: any) => (
                <div
                  key={r.id}
                  className="flex justify-between items-center p-3 border rounded-md bg-muted/30"
                >
                  <div>
                    <p className="font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {r.beds_quantity}x {r.bed_type} {r.has_bathroom ? ' • Com Banheiro' : ''}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={() => handleDeleteRoom(r.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
              {managingProperty?.property_rooms?.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum quarto cadastrado.
                </p>
              )}
            </div>
            <form onSubmit={handleAddExistingRoom} className="border-t pt-4">
              <h4 className="font-medium text-sm mb-3">Adicionar Quarto</h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Nome</Label>
                  <Input
                    value={newRoom.name}
                    onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo de Cama</Label>
                  <Input
                    value={newRoom.bed_type}
                    onChange={(e) => setNewRoom({ ...newRoom, bed_type: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Qtd Camas</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newRoom.beds_quantity}
                    onChange={(e) =>
                      setNewRoom({ ...newRoom, beds_quantity: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="flex items-center justify-between mt-6">
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={newRoom.has_bathroom}
                      onCheckedChange={(v) => setNewRoom({ ...newRoom, has_bathroom: v })}
                    />
                    <Label className="text-xs">Banheiro?</Label>
                  </div>
                  <Button type="submit" size="sm">
                    Adicionar
                  </Button>
                </div>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
