import { useEffect, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useCrud } from '@/hooks/use-crud'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/AppContext'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export function DocumentForm({
  open,
  onOpenChange,
  docToEdit,
  onSuccess,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  docToEdit?: any
  onSuccess: () => void
}) {
  const { add, update } = useCrud<any>('sector_documents')
  const { selectedPlant } = useAppStore()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    document_type: '',
    expiration_date: '',
    alert_lead_days: 30,
    file_url: '',
  })

  useEffect(() => {
    if (docToEdit) {
      setFormData({
        name: docToEdit.name || '',
        document_type: docToEdit.document_type || '',
        expiration_date: docToEdit.expiration_date || '',
        alert_lead_days: docToEdit.alert_lead_days || 30,
        file_url: docToEdit.file_url || '',
      })
    } else {
      setFormData({
        name: '',
        document_type: '',
        expiration_date: '',
        alert_lead_days: 30,
        file_url: '',
      })
    }
  }, [docToEdit, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.document_type || !formData.expiration_date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    if (selectedPlant === 'all' && !docToEdit) {
      toast({ title: 'Selecione uma planta no filtro superior', variant: 'destructive' })
      return
    }

    setLoading(true)
    const payload = {
      ...formData,
      ...(docToEdit ? {} : { plant_id: selectedPlant }),
    }

    const res = docToEdit ? await update(docToEdit.id, payload) : await add(payload)

    setLoading(false)
    if (res.success) {
      toast({ title: `Documento ${docToEdit ? 'atualizado' : 'criado'} com sucesso!` })
      onSuccess()
      onOpenChange(false)
    } else {
      toast({ title: 'Erro ao salvar documento', variant: 'destructive' })
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{docToEdit ? 'Editar' : 'Novo'} Documento</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome do Documento *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: AVCB"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="document_type">Tipo de Documento *</Label>
            <Select
              value={formData.document_type}
              onValueChange={(val) => setFormData({ ...formData, document_type: val })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Licença">Licença</SelectItem>
                <SelectItem value="Alvará">Alvará</SelectItem>
                <SelectItem value="Certificado">Certificado</SelectItem>
                <SelectItem value="Laudo">Laudo</SelectItem>
                <SelectItem value="Planta">Planta</SelectItem>
                <SelectItem value="Outros">Outros</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="expiration_date">Data de Vencimento *</Label>
              <Input
                id="expiration_date"
                type="date"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="alert_lead_days">Aviso Prévio (dias)</Label>
              <Input
                id="alert_lead_days"
                type="number"
                min="1"
                value={formData.alert_lead_days}
                onChange={(e) =>
                  setFormData({ ...formData, alert_lead_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="file_url">URL do Arquivo (Opcional)</Label>
            <Input
              id="file_url"
              type="url"
              value={formData.file_url}
              onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
              placeholder="https://..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
