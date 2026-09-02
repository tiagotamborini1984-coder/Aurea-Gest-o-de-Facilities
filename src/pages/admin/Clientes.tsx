import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Switch } from '@/components/ui/switch'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Edit, Plus, Loader2 } from 'lucide-react'

const MODULES = [
  'Gestão de Terceiros',
  'Limpeza e Jardinagem',
  'Gestão de Tarefas',
  'Organograma e Fluxos',
  'Auditoria e Checklist',
  'Gestão de Acidentes',
  'Gestão da Manutenção',
  'Gestão de Budget',
  'Gestão de Lockers',
  'Gestão de Documentos',
  'Gestão de Imóveis',
  'Gestão de Estoque',
  'Gestão de Encomendas',
  'Book de Metas',
  'Log de Auditoria',
  'Dashboard Estratégico',
  'Gestão de Férias',
  'Pesquisa de Satisfação',
]

export default function Clientes() {
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isOpen, setIsOpen] = useState(false)
  const [editing, setEditing] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    url_slug: '',
    admin_name: '',
    status: 'Ativo',
    plan_type: 'Profissional',
    modules: [] as string[],
  })
  const { toast } = useToast()

  const fetchClients = async () => {
    setLoading(true)
    const { data } = await supabase.from('clients').select('*').order('name')
    if (data) setClients(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClients()
  }, [])

  const save = async () => {
    try {
      if (editing) {
        await supabase.from('clients').update(formData).eq('id', editing.id)
        toast({ title: 'Cliente atualizado' })
      } else {
        await supabase.from('clients').insert([formData])
        toast({ title: 'Cliente criado' })
      }
      setIsOpen(false)
      fetchClients()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const openForm = (client?: any) => {
    setEditing(client || null)
    setFormData(
      client
        ? {
            name: client.name,
            url_slug: client.url_slug,
            admin_name: client.admin_name,
            status: client.status,
            plan_type: client.plan_type || 'Profissional',
            modules: client.modules || [],
          }
        : {
            name: '',
            url_slug: '',
            admin_name: '',
            status: 'Ativo',
            plan_type: 'Profissional',
            modules: [],
          },
    )
    setIsOpen(true)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Gestão de Clientes</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => openForm()}>
              <Plus className="w-4 h-4 mr-2" /> Novo Cliente
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Editar' : 'Novo'} Cliente</DialogTitle>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">URL Slug</label>
                <Input
                  value={formData.url_slug}
                  onChange={(e) => setFormData({ ...formData, url_slug: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Nome</label>
                <Input
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Ativo">Ativo</option>
                  <option value="Inativo">Inativo</option>
                </select>
              </div>
              <div className="col-span-2 space-y-3 mt-2 p-4 rounded-lg border border-slate-200 bg-slate-50/50">
                <label className="text-sm font-medium border-b pb-1 block">
                  Módulos Disponíveis
                </label>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Gestão de Ferramentas</p>
                    <p className="text-xs text-slate-500">
                      Habilita o módulo de gestão de ferramentas para este cliente
                    </p>
                  </div>
                  <Switch
                    checked={formData.modules.includes('Gestão de Ferramentas')}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        modules: checked
                          ? [...formData.modules, 'Gestão de Ferramentas']
                          : formData.modules.filter((m) => m !== 'Gestão de Ferramentas'),
                      })
                    }}
                  />
                </div>
                <div className="flex items-center justify-between py-2">
                  <div>
                    <p className="text-sm font-medium">Gestão de EPIs</p>
                    <p className="text-xs text-slate-500">
                      Habilita o módulo de gestão de EPIs para este cliente
                    </p>
                  </div>
                  <Switch
                    checked={formData.modules.includes('Gestão de EPIs')}
                    onCheckedChange={(checked) => {
                      setFormData({
                        ...formData,
                        modules: checked
                          ? [...formData.modules, 'Gestão de EPIs']
                          : formData.modules.filter((m) => m !== 'Gestão de EPIs'),
                      })
                    }}
                  />
                </div>
              </div>
              <div className="col-span-2 space-y-2 mt-2">
                <label className="text-sm font-medium border-b pb-1 block">Módulos Ativos</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-2">
                  {MODULES.map((mod) => (
                    <div key={mod} className="flex items-center space-x-2">
                      <Checkbox
                        id={mod}
                        checked={formData.modules.includes(mod)}
                        onCheckedChange={(c) => {
                          setFormData({
                            ...formData,
                            modules: c
                              ? [...formData.modules, mod]
                              : formData.modules.filter((m) => m !== mod),
                          })
                        }}
                      />
                      <label htmlFor={mod} className="text-sm cursor-pointer truncate" title={mod}>
                        {mod}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <Button onClick={save} className="w-full mt-4">
              Salvar
            </Button>
          </DialogContent>
        </Dialog>
      </div>

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
        </div>
      ) : (
        <div className="bg-white rounded-lg border shadow-sm">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-20"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {clients.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>{c.url_slug}</TableCell>
                  <TableCell>
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${c.status === 'Ativo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}
                    >
                      {c.status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <Button variant="ghost" size="icon" onClick={() => openForm(c)}>
                      <Edit className="w-4 h-4 text-blue-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  )
}
