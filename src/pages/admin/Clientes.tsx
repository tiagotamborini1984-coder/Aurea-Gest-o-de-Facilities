import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Building2,
  Plus,
  Search,
  Shield,
  Settings2,
  MoreVertical,
  Edit2,
  ArrowRightLeft,
} from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Checkbox } from '@/components/ui/checkbox'

const AVAILABLE_MODULES = [
  'Lançamentos',
  'Gestão de Encomendas',
  'Cadastros',
  'Limpeza e Jardinagem',
  'Gestão de Tarefas',
  'Auditoria e Checklist',
  'Gestão de Terceiros',
  'Gestão de Imóveis',
  'Gestão de Lockers',
  'Gestão de Budget',
  'BI Dashboard',
  'Book de Metas',
  'Organograma e Fluxos',
  'Gestão de Acidentes',
  'Gestão da Manutenção',
]

export default function Clientes() {
  const { profile } = useAppStore()
  const [clients, setClients] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingClient, setEditingClient] = useState<any>(null)

  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false)
  const [migrationData, setMigrationData] = useState({
    source_client_id: '',
    target_client_id: '',
  })
  const [isMigrating, setIsMigrating] = useState(false)

  const [formData, setFormData] = useState({
    name: '',
    url_slug: '',
    admin_name: '',
    status: 'Ativo',
    modules: [] as string[],
  })

  const role = profile?.role || 'Operacional'

  useEffect(() => {
    if (role === 'Master' || role === 'Administrador') {
      fetchClients()
    }
  }, [role])

  if (role !== 'Master' && role !== 'Administrador') {
    return <Navigate to="/gestao-terceiros" replace />
  }

  const fetchClients = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clients').select('*').order('name')
    if (error) {
      toast.error('Erro ao buscar clientes')
    } else {
      setClients(data || [])
    }
    setLoading(false)
  }

  const handleOpenDialog = (client?: any) => {
    if (client) {
      setEditingClient(client)
      setFormData({
        name: client.name,
        url_slug: client.url_slug,
        admin_name: client.admin_name || '',
        status: client.status,
        modules: client.modules || [],
      })
    } else {
      setEditingClient(null)
      setFormData({
        name: '',
        url_slug: '',
        admin_name: '',
        status: 'Ativo',
        modules: AVAILABLE_MODULES,
      })
    }
    setIsDialogOpen(true)
  }

  const handleSave = async () => {
    if (!formData.name || !formData.url_slug) {
      toast.error('Preencha os campos obrigatórios')
      return
    }

    const payload = {
      name: formData.name,
      url_slug: formData.url_slug,
      admin_name: formData.admin_name,
      status: formData.status,
      modules: formData.modules,
    }

    if (editingClient) {
      const { error } = await supabase.from('clients').update(payload).eq('id', editingClient.id)

      if (error) toast.error('Erro ao atualizar cliente')
      else {
        toast.success('Cliente atualizado com sucesso')
        setIsDialogOpen(false)
        fetchClients()
      }
    } else {
      const { error } = await supabase.from('clients').insert([payload])
      if (error) {
        if (error.code === '23505') {
          toast.error('Este Slug (URL) já está em uso.')
        } else {
          toast.error(error.message || 'Erro ao criar cliente. Verifique suas permissões.')
        }
      } else {
        toast.success('Cliente criado com sucesso')
        setIsDialogOpen(false)
        fetchClients()
      }
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

  const handleMigrate = async () => {
    if (!migrationData.source_client_id || !migrationData.target_client_id) {
      toast.error('Selecione as duas empresas.')
      return
    }
    if (migrationData.source_client_id === migrationData.target_client_id) {
      toast.error('A empresa de origem e destino não podem ser a mesma.')
      return
    }

    setIsMigrating(true)
    try {
      const { error } = await supabase.rpc('migrate_client_data', {
        source_client_id: migrationData.source_client_id,
        target_client_id: migrationData.target_client_id,
      })

      if (error) throw error

      toast.success('Dados migrados com sucesso!')
      setIsMigrationDialogOpen(false)
      setMigrationData({ source_client_id: '', target_client_id: '' })
      fetchClients()
    } catch (e: any) {
      toast.error(e.message || 'Erro ao migrar dados.')
    } finally {
      setIsMigrating(false)
    }
  }

  const filteredClients = clients.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.url_slug.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <Shield className="h-8 w-8 text-brand-vividBlue" />
            Painel Master
          </h1>
          <p className="text-gray-500 mt-1">
            Gerencie os clientes e seus respectivos módulos de acesso.
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setIsMigrationDialogOpen(true)}
            className="shadow-sm"
          >
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Migrar Dados
          </Button>
          <Button
            onClick={() => handleOpenDialog()}
            className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 shadow-lg"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo Cliente
          </Button>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader className="pb-3 border-b border-border/50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-gray-500" />
              Empresas Cadastradas
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
              <Input
                placeholder="Buscar clientes..."
                className="pl-9 bg-gray-50 dark:bg-gray-900/50"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-gray-50/50 dark:bg-gray-900/20">
                <TableRow>
                  <TableHead className="w-[300px] pl-6">Empresa</TableHead>
                  <TableHead>Slug (URL)</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Módulos Ativos</TableHead>
                  <TableHead className="text-right pr-6">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                      Carregando clientes...
                    </TableCell>
                  </TableRow>
                ) : filteredClients.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                      Nenhum cliente encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClients.map((client) => (
                    <TableRow
                      key={client.id}
                      className="hover:bg-gray-50/50 dark:hover:bg-gray-800/50 transition-colors"
                    >
                      <TableCell className="font-medium pl-6">
                        <div className="flex flex-col">
                          <span>{client.name}</span>
                          <span className="text-xs text-gray-500 font-normal">
                            {client.admin_name || 'Sem administrador'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-gray-500">{client.url_slug}</TableCell>
                      <TableCell>
                        <Badge
                          variant={client.status === 'Ativo' ? 'default' : 'secondary'}
                          className={
                            client.status === 'Ativo'
                              ? 'bg-green-100 text-green-800 hover:bg-green-200 border-none'
                              : ''
                          }
                        >
                          {client.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {client.modules?.slice(0, 2).map((m: string) => (
                            <Badge key={m} variant="outline" className="text-xs bg-gray-50">
                              {m}
                            </Badge>
                          ))}
                          {client.modules?.length > 2 && (
                            <Badge variant="outline" className="text-xs bg-gray-50">
                              +{client.modules.length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right pr-6">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-gray-500 hover:text-gray-900"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel>Ações</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenDialog(client)}
                              className="cursor-pointer"
                            >
                              <Edit2 className="h-4 w-4 mr-2 text-gray-500" />
                              Editar Cliente
                            </DropdownMenuItem>
                            <DropdownMenuItem className="cursor-pointer">
                              <Settings2 className="h-4 w-4 mr-2 text-gray-500" />
                              Configurações
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] overflow-hidden p-0">
          <div className="px-6 pt-6 pb-4 border-b border-border/50 bg-gray-50/50 dark:bg-gray-900/20">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Building2 className="h-5 w-5 text-brand-vividBlue" />
              {editingClient ? 'Editar Cliente' : 'Novo Cliente'}
            </DialogTitle>
            <DialogDescription className="mt-1.5">
              Configure as informações da empresa e libere os módulos de acesso.
            </DialogDescription>
          </div>

          <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome da Empresa <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ex: Acme Corp"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="url_slug">
                  Slug (URL) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="url_slug"
                  value={formData.url_slug}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      url_slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                    })
                  }
                  placeholder="ex: acme-corp"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="admin_name">Nome do Administrador</Label>
                <Input
                  id="admin_name"
                  value={formData.admin_name}
                  onChange={(e) => setFormData({ ...formData, admin_name: e.target.value })}
                  placeholder="Ex: João Silva"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="status">Status da Conta</Label>
                <div className="flex items-center space-x-2 pt-2">
                  <Switch
                    id="status"
                    checked={formData.status === 'Ativo'}
                    onCheckedChange={(c) =>
                      setFormData({ ...formData, status: c ? 'Ativo' : 'Inativo' })
                    }
                  />
                  <Label htmlFor="status" className="font-normal cursor-pointer">
                    {formData.status === 'Ativo' ? 'Ativo' : 'Inativo'}
                  </Label>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-border/50">
              <Label className="text-base font-semibold mb-4 block">Módulos Contratados</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {AVAILABLE_MODULES.map((module) => (
                  <div
                    key={module}
                    className="flex items-start space-x-3 p-3 rounded-lg border border-border/50 bg-gray-50/50 dark:bg-gray-900/30 hover:bg-gray-100 dark:hover:bg-gray-800/50 transition-colors"
                  >
                    <Checkbox
                      id={`module-${module}`}
                      checked={formData.modules.includes(module)}
                      onCheckedChange={() => toggleModule(module)}
                    />
                    <div className="space-y-1 leading-none">
                      <Label htmlFor={`module-${module}`} className="font-medium cursor-pointer">
                        {module}
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter className="px-6 py-4 border-t border-border/50 bg-gray-50/50 dark:bg-gray-900/20">
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} className="bg-brand-vividBlue hover:bg-brand-vividBlue/90">
              Salvar Cliente
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5 text-brand-vividBlue" />
              Migrar Dados entre Empresas
            </DialogTitle>
            <DialogDescription>
              Transfira todos os dados (plantas, tarefas, funcionários, etc.) de uma empresa para
              outra. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            <div className="space-y-2">
              <Label>Empresa de Origem (Onde os dados estão)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={migrationData.source_client_id}
                onChange={(e) =>
                  setMigrationData({ ...migrationData, source_client_id: e.target.value })
                }
              >
                <option value="" disabled>
                  Selecione a empresa de origem
                </option>
                {clients.map((c) => (
                  <option key={`src-${c.id}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label>Empresa de Destino (Para onde os dados vão)</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                value={migrationData.target_client_id}
                onChange={(e) =>
                  setMigrationData({ ...migrationData, target_client_id: e.target.value })
                }
              >
                <option value="" disabled>
                  Selecione a empresa de destino
                </option>
                {clients.map((c) => (
                  <option key={`tgt-${c.id}`} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMigrationDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleMigrate}
              disabled={isMigrating}
              className="bg-brand-vividBlue hover:bg-brand-vividBlue/90"
            >
              {isMigrating ? 'Migrando...' : 'Confirmar Migração'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
