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
import { useAppStore } from '@/store/AppContext'
import { toast } from 'sonner'
import { Plus, Home, MapPin, BedDouble } from 'lucide-react'

export default function Imoveis() {
  const [properties, setProperties] = useState<any[]>([])
  const { activeClient } = useAppStore()
  const [open, setOpen] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    city: '',
    address: '',
    description: '',
    daily_rate: '',
  })

  useEffect(() => {
    if (activeClient) loadProperties()
  }, [activeClient])

  async function loadProperties() {
    const { data } = await supabase
      .from('properties')
      .select('*, property_rooms(count)')
      .eq('client_id', activeClient?.id)
      .order('created_at', { ascending: false })

    if (data) setProperties(data)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!activeClient) return
    const { error } = await supabase.from('properties').insert({
      client_id: activeClient.id,
      name: formData.name,
      city: formData.city,
      address: formData.address,
      description: formData.description,
      daily_rate: Number(formData.daily_rate),
      photos: ['https://img.usecurling.com/p/800/600?q=apartment'],
    })
    if (error) toast.error('Erro ao salvar imóvel')
    else {
      toast.success('Imóvel cadastrado com sucesso!')
      setOpen(false)
      loadProperties()
      setFormData({ name: '', city: '', address: '', description: '', daily_rate: '' })
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Imóveis e Quartos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Imóvel
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Cadastrar Imóvel</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome do Imóvel</Label>
                <Input
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Cidade</Label>
                  <Input
                    required
                    value={formData.city}
                    onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Valor Diária (R$)</Label>
                  <Input
                    type="number"
                    required
                    value={formData.daily_rate}
                    onChange={(e) => setFormData({ ...formData, daily_rate: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Endereço</Label>
                <Input
                  required
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
              <Button type="submit" className="w-full">
                Salvar Imóvel
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {properties.map((p) => (
          <Card
            key={p.id}
            className="overflow-hidden hover:shadow-lg transition-all duration-300 bg-card border"
          >
            <div className="h-48 w-full relative group">
              <img
                src={p.photos[0]}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                alt={p.name}
              />
              <div className="absolute top-4 right-4 bg-primary text-primary-foreground px-3 py-1 rounded-full font-bold shadow-md">
                R$ {p.daily_rate}
              </div>
            </div>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-lg text-slate-800">
                <Home className="h-5 w-5 text-muted-foreground" /> {p.name}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm pb-5">
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> {p.city} - {p.address}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <BedDouble className="h-4 w-4" /> {p.property_rooms[0]?.count || 0} Quarto(s)
              </div>
              <Button variant="outline" className="w-full mt-2">
                Gerenciar Quartos
              </Button>
            </CardContent>
          </Card>
        ))}

        {properties.length === 0 && (
          <div className="col-span-3 text-center py-16 bg-muted/20 border rounded-xl border-dashed">
            <Home className="h-12 w-12 mx-auto text-muted-foreground opacity-50 mb-3" />
            <p className="text-muted-foreground text-lg">Nenhum imóvel cadastrado.</p>
          </div>
        )}
      </div>
    </div>
  )
}
