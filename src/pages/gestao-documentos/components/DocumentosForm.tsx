import { useState, useEffect } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { supabase } from '@/lib/supabase/client'
import { Database } from '@/lib/supabase/types'

type SectorDocument = Database['public']['Tables']['sector_documents']['Row']

export function DocumentosForm({
  open,
  onOpenChange,
  initialData,
}: {
  open: boolean
  onOpenChange: () => void
  initialData: SectorDocument | null
}) {
  const { selectedPlant } = useAppStore()
  const { add } = useCrud<SectorDocument>('sector_documents')
  const [loading, setLoading] = useState(false)
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([])

  const [formData, setFormData] = useState({
    plant_id: initialData?.plant_id || (selectedPlant !== 'all' ? selectedPlant : ''),
    name: initialData?.name || '',
    document_type: initialData?.document_type || '',
    expiration_date: initialData?.expiration_date || '',
    alert_lead_days: initialData?.alert_lead_days?.toString() || '30',
    file_url: initialData?.file_url || '',
  })

  useEffect(() => {
    const fetchPlants = async () => {
      const { data } = await supabase.from('plants').select('id, name')
      if (data) setPlants(data)
    }
    fetchPlants()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const payload = {
        ...formData,
        alert_lead_days: parseInt(formData.alert_lead_days) || 30,
      }

      if (initialData) {
        await supabase.from('sector_documents').update(payload).eq('id', initialData.id)
      } else {
        await add(payload)
      }
      onOpenChange()
    } catch (error) {
      console.error(error)
      alert('Erro ao salvar documento')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{initialData ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="plant_id">Planta</Label>
            <select
              id="plant_id"
              required
              className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              value={formData.plant_id}
              onChange={(e) => setFormData({ ...formData, plant_id: e.target.value })}
            >
              <option value="">Selecione uma planta</option>
              {plants.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Nome do Documento</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo</Label>
            <Input
              id="document_type"
              required
              placeholder="Ex: Alvará, AVCB, Licença..."
              value={formData.document_type}
              onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiration_date">Data de Vencimento</Label>
              <Input
                id="expiration_date"
                type="date"
                required
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert_lead_days">Dias de Alerta</Label>
              <Input
                id="alert_lead_days"
                type="number"
                min="1"
                required
                value={formData.alert_lead_days}
                onChange={(e) => setFormData({ ...formData, alert_lead_days: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_url">URL do Arquivo (opcional)</Label>
            <Input
              id="file_url"
              type="url"
              value={formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onOpenChange}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
