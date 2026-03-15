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
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'
import { useAppStore, Client } from '@/store/AppContext'

interface ManageModulesDialogProps {
  client: Client | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ManageModulesDialog({ client, open, onOpenChange }: ManageModulesDialogProps) {
  const { updateClient } = useAppStore()
  const { toast } = useToast()
  const [modules, setModules] = useState({
    terceiros: false,
    manutencao: false,
    limpeza: false,
  })

  useEffect(() => {
    if (client) {
      setModules({
        terceiros: client.modules.includes('Gestão de Terceiros'),
        manutencao: client.modules.includes('Manutenção'),
        limpeza: client.modules.includes('Limpeza'),
      })
    }
  }, [client])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!client) return

    const activeModules = []
    if (modules.terceiros) activeModules.push('Gestão de Terceiros')
    if (modules.manutencao) activeModules.push('Manutenção')
    if (modules.limpeza) activeModules.push('Limpeza')

    updateClient(client.id, { modules: activeModules })

    toast({
      title: 'Módulos atualizados',
      description: `As permissões de acesso para ${client.name} foram salvas.`,
      className: 'bg-green-50 text-green-900 border-green-200',
    })

    onOpenChange(false)
  }

  if (!client) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[450px] backdrop-blur-md bg-white/95">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold text-brand-blue">Gerenciar Módulos</DialogTitle>
          <DialogDescription>
            Configure quais módulos o cliente <strong>{client.name}</strong> poderá acessar.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-4 border border-brand-light rounded-xl p-4 bg-muted/30">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mg-mod-terceiros" className="text-base cursor-pointer">
                    Gestão de Terceiros
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Controle de prestadores e documentos.
                  </p>
                </div>
                <Switch
                  id="mg-mod-terceiros"
                  checked={modules.terceiros}
                  onCheckedChange={(c) => setModules({ ...modules, terceiros: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mg-mod-manutencao" className="text-base cursor-pointer">
                    Manutenção
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Gestão de ordens de serviço e ativos.
                  </p>
                </div>
                <Switch
                  id="mg-mod-manutencao"
                  checked={modules.manutencao}
                  onCheckedChange={(c) => setModules({ ...modules, manutencao: c })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="mg-mod-limpeza" className="text-base cursor-pointer">
                    Limpeza
                  </Label>
                  <p className="text-sm text-muted-foreground">
                    Escalas e vistorias de conservação.
                  </p>
                </div>
                <Switch
                  id="mg-mod-limpeza"
                  checked={modules.limpeza}
                  onCheckedChange={(c) => setModules({ ...modules, limpeza: c })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" className="font-medium">
              Salvar Permissões
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
