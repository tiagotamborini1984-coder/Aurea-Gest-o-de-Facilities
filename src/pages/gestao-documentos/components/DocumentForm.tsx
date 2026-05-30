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
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'

interface DocumentFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  doc: any
  plants: any[]
  onSave: () => void
}

export function DocumentForm({ open, onOpenChange, doc, plants, onSave }: DocumentFormProps) {
  const { activeClient } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [file, setFile] = useState<File | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    document_type: '',
    plant_id: '',
    expiration_date: '',
    alert_lead_days: 30,
  })

  useEffect(() => {
    if (doc) {
      setFormData({
        name: doc.name,
        document_type: doc.document_type,
        plant_id: doc.plant_id,
        expiration_date: doc.expiration_date?.split('T')[0] || '',
        alert_lead_days: doc.alert_lead_days,
      })
    } else {
      setFormData({
        name: '',
        document_type: '',
        plant_id: plants.length > 0 ? plants[0].id : '',
        expiration_date: '',
        alert_lead_days: 30,
      })
    }
    setFile(null)
  }, [doc, plants, open])

  const handleUpload = async (fileToUpload: File) => {
    if (!activeClient) throw new Error('Cliente não selecionado')
    const ext = fileToUpload.name.split('.').pop()
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${ext}`
    const filePath = `${activeClient.id}/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from('documents')
      .upload(filePath, fileToUpload)

    if (uploadError) throw uploadError

    const { data } = supabase.storage.from('documents').getPublicUrl(filePath)
    return data.publicUrl
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient) return
    setLoading(true)
    try {
      let file_url = doc?.file_url

      if (file) {
        file_url = await handleUpload(file)
      }

      const payload = {
        ...formData,
        client_id: activeClient.id,
        file_url,
      }

      if (doc) {
        const { error } = await supabase.from('sector_documents').update(payload).eq('id', doc.id)
        if (error) throw error
        toast.success('Documento atualizado com sucesso')
      } else {
        const { error } = await supabase.from('sector_documents').insert(payload)
        if (error) throw error
        toast.success('Documento cadastrado com sucesso')
      }
      onSave()
      onOpenChange(false)
    } catch (err: any) {
      toast.error('Erro ao salvar documento: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{doc ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Nome do Documento</Label>
            <Input
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: PPRA 2024"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select
                value={formData.document_type}
                onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PPRA">PPRA</SelectItem>
                  <SelectItem value="PCMSO">PCMSO</SelectItem>
                  <SelectItem value="LTCAT">LTCAT</SelectItem>
                  <SelectItem value="AVCB">AVCB</SelectItem>
                  <SelectItem value="Alvará">Alvará</SelectItem>
                  <SelectItem value="Outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Planta</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vencimento</Label>
              <Input
                type="date"
                required
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Avisar (Dias antes)</Label>
              <Input
                type="number"
                min="0"
                required
                value={formData.alert_lead_days}
                onChange={(e) =>
                  setFormData({ ...formData, alert_lead_days: Number(e.target.value) })
                }
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>
              Arquivo{' '}
              {doc?.file_url && !file && (
                <span className="text-slate-400 text-xs ml-2">(Já possui arquivo salvo)</span>
              )}
            </Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.jpg,.png"
            />
          </div>
          <DialogFooter className="pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
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
