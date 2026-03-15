import { useState, useEffect } from 'react'
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
import { useToast } from '@/hooks/use-toast'
import { useAppStore, Client } from '@/store/AppContext'

interface EditClientDialogProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function EditClientDialog({ client, open, onOpenChange }: EditClientDialogProps) {
  const { updateClient } = useAppStore()
  const { toast } = useToast()
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    adminName: '',
    logo: '',
  })

  useEffect(() => {
    if (client) {
      setFormData({
        name: client.name,
        slug: client.slug,
        adminName: client.adminName,
        logo: client.logo || '',
      })
    }
  }, [client])

  const baseUrl = window.location.origin
  const previewUrl = formData.slug ? `${baseUrl}/${formData.slug}` : `${baseUrl}/[slug-da-empresa]`

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    updateClient(client.id, {
      name: formData.name,
      slug: formData.slug,
      adminName: formData.adminName,
      logo: formData.logo,
      url: `${baseUrl}/${formData.slug}`,
    })

    toast({
      title: 'Empresa atualizada',
      description: 'Os dados do cliente foram salvos com sucesso.',
      className: 'bg-green-50 text-green-900 border-green-200',
    })

    onOpenChange(false)
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[550px] backdrop-blur-md bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-brand-blue">Editar Empresa</DialogTitle>
          <DialogDescription>Atualize as informações do perfil do cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-name">Nome da Empresa *</Label>
              <Input
                id="edit-name"
                placeholder="Ex: Acme Corp"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2 col-span-2 sm:col-span-1">
              <Label htmlFor="edit-slug">Identificador (Slug) *</Label>
              <Input
                id="edit-slug"
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
              <Label htmlFor="edit-logo">URL do Logotipo (Opcional)</Label>
              <Input
                id="edit-logo"
                placeholder="https://exemplo.com/logo.png"
                value={formData.logo}
                onChange={(e) => setFormData({ ...formData, logo: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-4 border border-brand-light rounded-xl p-4 bg-muted/30">
            <h4 className="text-sm font-semibold text-foreground">Usuário Administrador</h4>
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-adminName">Nome Completo *</Label>
                <Input
                  id="edit-adminName"
                  placeholder="Nome do responsável"
                  required
                  value={formData.adminName}
                  onChange={(e) => setFormData({ ...formData, adminName: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="font-medium">
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
