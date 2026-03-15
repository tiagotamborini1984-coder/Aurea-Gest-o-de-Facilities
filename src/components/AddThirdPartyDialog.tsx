import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/AppContext'

interface AddThirdPartyDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddThirdPartyDialog({ open, onOpenChange }: AddThirdPartyDialogProps) {
  const { addThirdParty } = useAppStore()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    cnpj: '',
    services: '',
    contractEnd: '',
    status: 'Pendente' as any,
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    addThirdParty({
      name: formData.name,
      cnpj: formData.cnpj,
      services: formData.services,
      contractEnd: formData.contractEnd,
      status: formData.status,
    })

    toast({
      title: 'Sucesso!',
      description: 'Terceiro cadastrado com sucesso.',
      className: 'bg-green-50 text-green-900 border-green-200',
    })

    onOpenChange(false)
    setFormData({ name: '', cnpj: '', services: '', contractEnd: '', status: 'Pendente' })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] backdrop-blur-md bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-[#0F4C81]">Adicionar Terceiro</DialogTitle>
          <DialogDescription>Cadastre uma nova empresa prestadora de serviços.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="tp-name">Razão Social / Nome Fantasia *</Label>
              <Input
                id="tp-name"
                placeholder="Ex: CleanService LTDA"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  placeholder="00.000.000/0001-00"
                  required
                  value={formData.cnpj}
                  onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status Inicial</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Regularizado">Regularizado</SelectItem>
                    <SelectItem value="Pendente">Pendência de Documento</SelectItem>
                    <SelectItem value="Inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="services">Serviços Prestados</Label>
                <Input
                  id="services"
                  placeholder="Ex: Limpeza"
                  value={formData.services}
                  onChange={(e) => setFormData({ ...formData, services: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="contractEnd">Fim do Contrato</Label>
                <Input
                  id="contractEnd"
                  type="date"
                  value={formData.contractEnd}
                  onChange={(e) => setFormData({ ...formData, contractEnd: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="bg-[#2B95D6] hover:bg-[#2B95D6]/90 text-white">
              Salvar Cadastro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
