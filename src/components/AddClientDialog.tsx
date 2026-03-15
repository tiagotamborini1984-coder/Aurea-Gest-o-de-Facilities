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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

interface AddClientDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function AddClientDialog({ open, onOpenChange }: AddClientDialogProps) {
  const { addClient } = useAppStore()
  const { toast } = useToast()

  const initialData = {
    name: '',
    slug: '',
    adminName: '',
    logo: '',
    primaryColor: '#1e293b', // Graphite
    secondaryColor: '#0ea5e9', // Tech Cyan
    modules: {
      terceiros: true,
      manutencao: false,
      limpeza: false,
    },
  }

  const [formData, setFormData] = useState(initialData)

  const baseUrl = window.location.origin
  const previewUrl = formData.slug ? `${baseUrl}/${formData.slug}` : `${baseUrl}/[slug-da-empresa]`

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onloadend = () => {
        setFormData((prev) => ({ ...prev, logo: reader.result as string }))
      }
      reader.readAsDataURL(file)
    }
  }

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
      primaryColor: formData.primaryColor,
      secondaryColor: formData.secondaryColor,
      status: 'Ativo',
      modules: activeModules,
    })

    toast({
      title: 'Sucesso!',
      description: 'Empresa cadastrada com sucesso.',
      className: 'bg-green-50 text-green-900 border-green-200',
    })

    onOpenChange(false)
    setFormData(initialData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] backdrop-blur-md bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-brand-blue">
            Cadastrar Nova Empresa
          </DialogTitle>
          <DialogDescription>
            Configure os dados do novo cliente e identidade visual.
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

            {/* Identidade Visual */}
            <div className="col-span-2 space-y-4 border border-brand-light rounded-xl p-4 bg-muted/30">
              <h4 className="text-sm font-semibold text-foreground">Identidade Visual</h4>

              <div className="space-y-2">
                <Label htmlFor="logo">Logotipo da Empresa</Label>
                <div className="flex items-center gap-4">
                  {formData.logo && (
                    <Avatar className="h-12 w-12 border shadow-sm">
                      <AvatarImage src={formData.logo} className="object-cover" />
                      <AvatarFallback>LG</AvatarFallback>
                    </Avatar>
                  )}
                  <Input
                    id="logo"
                    type="file"
                    accept="image/png, image/jpeg, image/svg+xml"
                    onChange={handleFileChange}
                    className="cursor-pointer file:cursor-pointer file:text-brand-blue"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="primaryColor">Cor Primária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    />
                    <Input
                      type="text"
                      className="flex-1"
                      value={formData.primaryColor}
                      onChange={(e) => setFormData({ ...formData, primaryColor: e.target.value })}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="secondaryColor">Cor Secundária</Label>
                  <div className="flex gap-2">
                    <Input
                      id="secondaryColor"
                      type="color"
                      className="w-12 h-10 p-1 cursor-pointer"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    />
                    <Input
                      type="text"
                      className="flex-1"
                      value={formData.secondaryColor}
                      onChange={(e) => setFormData({ ...formData, secondaryColor: e.target.value })}
                    />
                  </div>
                </div>
              </div>
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
