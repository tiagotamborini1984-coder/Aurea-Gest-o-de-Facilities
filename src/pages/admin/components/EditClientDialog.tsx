import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

const AVAILABLE_MODULES = [
  'Lançamentos',
  'Gestão de Encomendas',
  'Cadastros',
  'Limpeza e Jardinagem',
  'Gestão de Tarefas',
  'Auditoria e Checklist',
  'BI Dashboard',
]

export function EditClientDialog({
  client,
  open,
  onOpenChange,
  onSuccess,
}: {
  client: any
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
}) {
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    url_slug: '',
    admin_name: '',
    status: 'Ativo',
    modules: [] as string[],
  })

  useEffect(() => {
    if (client && open) {
      setFormData({
        name: client.name || '',
        url_slug: client.url_slug || '',
        admin_name: client.admin_name || '',
        status: client.status || 'Ativo',
        modules: client.modules || [],
      })
    }
  }, [client, open])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name,
          url_slug: formData.url_slug,
          admin_name: formData.admin_name,
          status: formData.status,
          modules: formData.modules,
        })
        .eq('id', client.id)

      if (error) throw error

      toast.success('Cliente atualizado com sucesso!')
      onSuccess()
      onOpenChange(false)
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar cliente')
    } finally {
      setLoading(false)
    }
  }

  const toggleModule = (moduleName: string) => {
    setFormData((prev) => ({
      ...prev,
      modules: prev.modules.includes(moduleName)
        ? prev.modules.filter((m) => m !== moduleName)
        : [...prev.modules, moduleName],
    }))
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Editar Cliente</DialogTitle>
          <DialogDescription>Atualize as informações e permissões do cliente.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="edit-name">Nome da Empresa</Label>
            <Input
              id="edit-name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="edit-url_slug">URL Slug</Label>
              <Input
                id="edit-url_slug"
                required
                value={formData.url_slug}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    url_slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                  })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Ativo">Ativo</SelectItem>
                  <SelectItem value="Inativo">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="edit-admin_name">Nome do Administrador</Label>
            <Input
              id="edit-admin_name"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Label className="text-base font-semibold mb-3 block">Módulos Contratados</Label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_MODULES.map((mod) => (
                <div key={mod} className="flex items-center space-x-2">
                  <Checkbox
                    id={`edit-mod-${mod}`}
                    checked={formData.modules.includes(mod)}
                    onCheckedChange={() => toggleModule(mod)}
                  />
                  <Label htmlFor={`edit-mod-${mod}`} className="font-normal cursor-pointer">
                    {mod}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
