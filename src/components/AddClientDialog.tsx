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
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useAppStore } from '@/store/AppContext'

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { addClient } = useAppStore()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    adminName: '',
    logo: '',
    modules: {
      terceiros: true,
      manutencao: false,
      limpeza: false,
    },
  })

  const baseUrl = window.location.origin
  const previewUrl = formData.slug ? `${baseUrl}/${formData.slug}` : `${baseUrl}/[slug-da-empresa]`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const activeModules = []
    if (formData.modules.terceiros) activeModules.push('Gestão de Terceiros')
    if (formData.modules.manutencao) activeModules.push('Manutenção')
    if (formData.modules.limpeza) activeModules.push('Limpeza')

    addClient({
      name: formData.name,
      slug: formData.slug,
      url: `${baseUrl}/${formData.slug}`,
      adminName: formData.adminName,
      logo: formData.logo,
      status: 'Ativo',
      modules: activeModules,
    })

    toast({
      title: 'Sucesso!',
      description: 'Empresa cadastrada com sucesso.',
      className: 'bg-green-50 text-green-900 border-green-200',
    })

    onOpenChange(false)
    setFormData({
      name: '',
      slug: '',
      adminName: '',
      logo: '',
      modules: { terceiros: true, manutencao: false, limpeza: false },
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] backdrop-blur-md bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-brand-blue">
            Cadastrar Nova Empresa
          </DialogTitle>
          <DialogDescription>
            Configure os dados do novo cliente e provisione os módulos de acesso.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="name">Nome da Empresa *</Label>
              <Input
                id="name"
                placeholder="Ex: Acme Corp"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="slug">Identificador (Slug) *</Label>
              <Input
                id="slug"
                placeholder="ex: acme-corp"
                required
                value={formData.slug}
                onChange={(e) => {
                  const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '')
                  setFormData({ ...formData, slug: val })
                }}
              />
              <p className="text-[11px] text-muted-foreground mt-1 truncate">
                Acesso:{' '}
                <span className="font-medium text-brand-cyan inline-block max-w-full align-bottom truncate">
                  {previewUrl}
                </span>
              </p>
            </div>
            <div className="space-y-2 col-span-2">
              <Label htmlFor="logo">URL do Logotipo (Opcional)</Label>
              <Input
                id="logo"
                placeholder="https://exemplo.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 border border-brand-light rounded-xl p-4 bg-muted/30">
            <h4 className="text-sm font-semibold text-foreground">Usuário Administrador</h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="adminName">Nome Completo *</Label>
                <Input
                  id="adminName"
                  placeholder="Nome do responsável"
                  required
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>
              <div className="space-y-2 col-span-2 sm:col-span-1">
                <Label htmlFor="email">E-mail *</Label>
                <Input id="email" type="email" placeholder="admin@empresa.com" required />
              </div>
            </div>
          </div>

          <div className="space-y-4 border border-brand-light rounded-xl p-4 bg-muted/30">
            <h4 className="text-sm font-semibold text-foreground">Provisionamento de Módulos</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="mod-terceiros" className="cursor-pointer">
                  Gestão de Terceiros
                </Label>
                <Switch
                  id="mod-terceiros"
                  checked={formData.modules.terceiros}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, modules: { ...formData.modules, terceiros: c } })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mod-manutencao" className="cursor-pointer">
                  Manutenção
                </Label>
                <Switch
                  id="mod-manutencao"
                  checked={formData.modules.manutencao}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, modules: { ...formData.modules, manutencao: c } })
                  }
                />
              </div>
              <div className="flex items-center justify-between">
                <Label htmlFor="mod-limpeza" className="cursor-pointer">
                  Limpeza
                </Label>
                <Switch
                  id="mod-limpeza"
                  checked={formData.modules.limpeza}
                  onCheckedChange={(c) =>
                    setFormData({ ...formData, modules: { ...formData.modules, limpeza: c } })
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="font-medium">
              Salvar Empresa
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
