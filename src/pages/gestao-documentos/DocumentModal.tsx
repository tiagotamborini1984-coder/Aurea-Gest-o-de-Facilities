import { useState, useEffect } from 'react'
import { toast } from 'sonner'
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
import { SectorDocument } from './utils'

const DOC_TYPES = [
  'Alvará',
  'Certificado',
  'Laudo',
  'Licença',
  'Planta',
  'Projeto',
  'Treinamento',
  'Outros',
]

interface DocumentModalProps {
  isOpen: boolean
  onClose: () => void
  document: SectorDocument | null
  onSaved: () => void
}

export function DocumentModal({ isOpen, onClose, document, onSaved }: DocumentModalProps) {
  const { activeClient, selectedPlant } = useAppStore()
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [documentType, setDocumentType] = useState('')
  const [expirationDate, setExpirationDate] = useState('')
  const [alertLeadDays, setAlertLeadDays] = useState('30')
  const [file, setFile] = useState<File | null>(null)

  useEffect(() => {
    if (document && isOpen) {
      setName(document.name)
      setDocumentType(document.document_type)
      setExpirationDate(document.expiration_date)
      setAlertLeadDays(document.alert_lead_days.toString())
      setFile(null)
    } else if (isOpen) {
      setName('')
      setDocumentType('')
      setExpirationDate('')
      setAlertLeadDays('30')
      setFile(null)
    }
  }, [document, isOpen])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient || !selectedPlant) return
    if (!name || !documentType || !expirationDate || !alertLeadDays) {
      toast.error('Preencha os campos obrigatórios.')
      return
    }

    setLoading(true)
    try {
      let file_url = document?.file_url || null

      if (file) {
        // Option to delete the old file to save space
        if (file_url) {
          await supabase.storage.from('documents').remove([file_url])
        }

        const fileExt = file.name.split('.').pop()
        const fileName = `${activeClient.id}/${selectedPlant}/${Date.now()}.${fileExt}`

        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file)

        if (uploadError) throw uploadError
        file_url = fileName
      }

      const payload = {
        client_id: activeClient.id,
        plant_id: selectedPlant,
        name,
        document_type: documentType,
        expiration_date: expirationDate,
        alert_lead_days: parseInt(alertLeadDays, 10),
        file_url,
      }

      if (document) {
        const { error } = await supabase
          .from('sector_documents')
          .update(payload)
          .eq('id', document.id)
        if (error) throw error
        toast.success('Documento atualizado com sucesso!')
      } else {
        const { error } = await supabase.from('sector_documents').insert([payload])
        if (error) throw error
        toast.success('Documento adicionado com sucesso!')
      }

      onSaved()
      onClose()
    } catch (err: any) {
      console.error(err)
      toast.error(err.message || 'Erro ao salvar documento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{document ? 'Editar Documento' : 'Adicionar Documento'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>
              Nome do Documento <span className="text-red-500">*</span>
            </Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Alvará de Funcionamento"
              required
            />
          </div>

          <div className="space-y-2">
            <Label>
              Tipo de Documento <span className="text-red-500">*</span>
            </Label>
            <Select value={documentType} onValueChange={setDocumentType} required>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>
                Vencimento <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>
                Aviso Prévio (Dias) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                min="0"
                value={alertLeadDays}
                onChange={(e) => setAlertLeadDays(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Arquivo {document ? '(Opcional)' : ''}</Label>
            <Input
              type="file"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg"
            />
            {document?.file_url && !file && (
              <p className="text-xs text-muted-foreground mt-1">
                Já existe um arquivo associado. Envie outro para substituir.
              </p>
            )}
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
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
