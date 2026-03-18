import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { useMasterData } from '@/hooks/use-master-data'
import { useToast } from '@/hooks/use-toast'
import { logAudit } from '@/services/audit'

const MAIN_MENUS = [
  'Dashboard Gestor',
  'Lançamentos',
  'Relatórios',
  'BI Dashboard',
  'Email Reports',
  'Log de Auditoria',
  'Usuários',
  'Encomendas',
  'Limpeza e Jardinagem',
]

const CADASTROS_SUBMENUS = [
  'Plantas',
  'Locais',
  'Empresas',
  'Funções',
  'Colaboradores',
  'Equipamentos',
  'Treinamentos',
  'Quadro Contratado',
  'Book de Metas',
]

export function EditUserDialog({
  userToEdit,
  open,
  onOpenChange,
  onSuccess,
}: {
  userToEdit: any
  open: boolean
  onOpenChange: (v: boolean) => void
  onSuccess: () => void
}) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { profile } = useAppStore()
  const { user: authUser } = useAuth()
  const { plants } = useMasterData()
  const { toast } = useToast()

  const [form, setForm] = useState({
    name: '',
    email: '',
    role: 'Operacional',
    accessible_menus: [] as string[],
    authorized_plants: [] as string[],
  })

  useEffect(() => {
    if (userToEdit) {
      setForm({
        name: userToEdit.name || '',
        email: userToEdit.email || '',
        role: userToEdit.role || 'Operacional',
        accessible_menus: userToEdit.accessible_menus || [],
        authorized_plants: userToEdit.authorized_plants || [],
      })
    }
  }, [userToEdit])

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userToEdit?.id) return
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: form.name,
          role: form.role,
          accessible_menus: form.accessible_menus,
          authorized_plants: form.authorized_plants,
        })
        .eq('id', userToEdit.id)

      if (error) throw error
      toast({
        title: 'Usuário atualizado com sucesso',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      if (authUser && profile)
        logAudit(
          profile.client_id,
          authUser.id,
          'Edição de Usuário',
          `Email: ${form.email} | Nível: ${form.role}`,
        )

      onOpenChange(false)
      onSuccess()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar', description: err.message })
    } finally {
      setIsSubmitting(false)
    }
  }

  const toggleMenu = (menu: string) => {
    setForm((p) => {
      let next = [...p.accessible_menus]

      if (menu.startsWith('Cadastros:') && next.includes('Cadastros')) {
        next = next.filter((m) => m !== 'Cadastros')
        CADASTROS_SUBMENUS.forEach((sub) => {
          if (`Cadastros:${sub}` !== menu) next.push(`Cadastros:${sub}`)
        })
        return { ...p, accessible_menus: next }
      }

      if (next.includes(menu)) {
        next = next.filter((m) => m !== menu)
      } else {
        next.push(menu)
      }
      return { ...p, accessible_menus: next }
    })
  }

  const togglePlant = (plantId: string) =>
    setForm((p) => ({
      ...p,
      authorized_plants: p.authorized_plants.includes(plantId)
        ? p.authorized_plants.filter((id) => id !== plantId)
        : [...p.authorized_plants, plantId],
    }))

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Usuário</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleEditSubmit} className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>E-mail (Login)</Label>
              <Input type="email" value={form.email} disabled className="bg-slate-100" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Nível de Acesso</Label>
            <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Operacional">Operacional</SelectItem>
                <SelectItem value="Gestor">Gestor</SelectItem>
                <SelectItem value="Administrador">Administrador</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {['Gestor', 'Operacional'].includes(form.role) && (
            <div className="pt-2 animate-in fade-in space-y-4">
              <div>
                <Label className="mb-2 block">Menus Principais Acessíveis</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {MAIN_MENUS.map((menu) => (
                    <Badge
                      key={menu}
                      variant={form.accessible_menus.includes(menu) ? 'default' : 'outline'}
                      className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(menu) ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                      onClick={() => toggleMenu(menu)}
                    >
                      {menu}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <Label className="mb-2 block">Submenus de Cadastros</Label>
                <div className="flex flex-wrap gap-2 p-3 bg-slate-50 rounded-md border border-slate-100">
                  {CADASTROS_SUBMENUS.map((menu) => {
                    const key = `Cadastros:${menu}`
                    return (
                      <Badge
                        key={key}
                        variant={
                          form.accessible_menus.includes(key) ||
                          form.accessible_menus.includes('Cadastros')
                            ? 'default'
                            : 'outline'
                        }
                        className={`cursor-pointer hover:bg-slate-200 ${form.accessible_menus.includes(key) || form.accessible_menus.includes('Cadastros') ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                        onClick={() => toggleMenu(key)}
                      >
                        {menu}
                      </Badge>
                    )
                  })}
                </div>
              </div>
            </div>
          )}
          {form.role === 'Administrador' && (
            <div className="p-3 bg-brand-vividBlue/5 border border-brand-vividBlue/20 rounded-md text-sm text-brand-vividBlue mt-2">
              <strong>Acesso Total:</strong> Administradores têm acesso irrestrito a todos os
              módulos.
            </div>
          )}

          <div className="pt-2">
            <Label className="mb-2 block">Plantas Autorizadas</Label>
            <div className="flex flex-wrap gap-2">
              {plants.map((p) => (
                <Badge
                  key={p.id}
                  variant={form.authorized_plants.includes(p.id) ? 'default' : 'outline'}
                  className={`cursor-pointer ${form.authorized_plants.includes(p.id) ? 'bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90' : ''}`}
                  onClick={() => togglePlant(p.id)}
                >
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            type="submit"
            className="w-full mt-4 bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null} Salvar
            Alterações
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
