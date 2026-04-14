import { useState } from 'react'
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

export function CreateClientDialog({
  open,
  onOpenChange,
  onSuccess,
}: {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.from('clients').insert([
        {
          name: formData.name,
          url_slug: formData.url_slug,
          admin_name: formData.admin_name,
          status: formData.status,
          modules: formData.modules,
        },
      ])

      if (error) throw error

      toast.success('Cliente cadastrado com sucesso!')
      onSuccess()
      onOpenChange(false)
      setFormData({ name: '', url_slug: '', admin_name: '', status: 'Ativo', modules: [] })
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cadastrar cliente')
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
          <DialogTitle>Novo Cliente</DialogTitle>
          <DialogDescription>Cadastre um novo cliente (tenant) para o seu SaaS.</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nome da Empresa</Label>
            <Input
              id="name"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ex: Empresa ABC"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="url_slug">URL Slug</Label>
            <Input
              id="url_slug"
              required
              value={formData.url_slug}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  url_slug: e.target.value.toLowerCase().replace(/\s+/g, '-'),
                })
              }
              placeholder="Ex: empresa-abc"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="admin_name">Nome do Administrador (Contato)</Label>
            <Input
              id="admin_name"
              value={formData.admin_name}
              onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
              placeholder="Ex: João Silva"
            />
          </div>

          <div className="pt-4 border-t border-slate-100">
            <Label className="text-base font-semibold mb-3 block">Módulos Contratados</Label>
            <div className="grid grid-cols-2 gap-3">
              {AVAILABLE_MODULES.map((mod) => (
                <div key={mod} className="flex items-center space-x-2">
                  <Checkbox
                    id={`mod-${mod}`}
                    checked={formData.modules.includes(mod)}
                    onCheckedChange={() => toggleModule(mod)}
                  />
                  <Label htmlFor={`mod-${mod}`} className="font-normal cursor-pointer">
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
              {loading ? 'Salvando...' : 'Salvar Cliente'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
