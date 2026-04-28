import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Database,
  Plus,
  Trash,
  MapPin,
  Building2,
  LayoutGrid,
  Wrench,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

export default function CadastrosManutencao() {
  const { user } = useAuth()
  const [areas, setAreas] = useState<any[]>([])
  const [subareas, setSubareas] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [tipos, setTipos] = useState<any[]>([])
  const [prioridades, setPrioridades] = useState<any[]>([])
  const [manutentores, setManutentores] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [newArea, setNewArea] = useState({ name: '', plant_id: '' })
  const [newManutentor, setNewManutentor] = useState({ name: '', email: '', password: '' })
  const [newSubarea, setNewSubarea] = useState({ name: '', area_id: '' })
  const [newTipo, setNewTipo] = useState({ name: '', category: 'Corretiva' })
  const [newPrioridade, setNewPrioridade] = useState({ name: '', sla_hours: 24, color: '#3b82f6' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [pRes, aRes, sRes, tRes, prRes, mRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('*, plant:plants(name)').order('name'),
      supabase
        .from('maintenance_sublocations')
        .select('*, area:maintenance_areas(name, plant:plants(name))')
        .order('name'),
      supabase.from('maintenance_types').select('*').order('name'),
      supabase.from('maintenance_priorities').select('*').order('sla_hours'),
      supabase.from('profiles').select('*').eq('role', 'Manutentor').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
    if (sRes.data) setSubareas(sRes.data)
    if (tRes.data) setTipos(tRes.data)
    if (prRes.data) setPrioridades(prRes.data)
    if (mRes.data) setManutentores(mRes.data)
    setLoading(false)
  }

  const getClientId = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()
    return profile?.client_id
  }

  const handleAddArea = async () => {
    if (!newArea.name || !newArea.plant_id) {
      toast.error('Preencha nome e planta da Área')
      return
    }
    const clientId = await getClientId()
    if (!clientId) return toast.error('Erro de permissão: Client ID não encontrado')

    const { error } = await supabase.from('maintenance_areas').insert({
      client_id: clientId,
      plant_id: newArea.plant_id,
      name: newArea.name,
    })

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Área de Manutenção adicionada')
      setNewArea({ name: '', plant_id: '' })
      loadData()
    }
  }

  const handleDeleteArea = async (id: string) => {
    const { error } = await supabase.from('maintenance_areas').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar área (pode estar em uso)')
    else {
      toast.success('Área removida')
      loadData()
    }
  }

  const handleAddSubarea = async () => {
    if (!newSubarea.name || !newSubarea.area_id) {
      toast.error('Preencha nome e selecione a Área Pai')
      return
    }
    const clientId = await getClientId()
    if (!clientId) return toast.error('Erro de permissão: Client ID não encontrado')

    const { error } = await supabase.from('maintenance_sublocations').insert({
      client_id: clientId,
      area_id: newSubarea.area_id,
      name: newSubarea.name,
    } as any)

    if (error) {
      toast.error('Erro ao salvar: ' + error.message)
    } else {
      toast.success('Subárea adicionada')
      setNewSubarea({ name: '', area_id: '' })
      loadData()
    }
  }

  const handleDeleteSubarea = async (id: string) => {
    const { error } = await supabase.from('maintenance_sublocations').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar subárea')
    else {
      toast.success('Subárea removida')
      loadData()
    }
  }

  const handleAddTipo = async () => {
    if (!newTipo.name) {
      toast.error('Preencha o nome do tipo')
      return
    }
    const clientId = await getClientId()
    if (!clientId) return toast.error('Erro de permissão: Client ID não encontrado')

    const { error } = await supabase.from('maintenance_types').insert({
      client_id: clientId,
      name: newTipo.name,
      category: newTipo.category,
    } as any)

    if (error) toast.error('Erro ao salvar: ' + error.message)
    else {
      toast.success('Tipo adicionado')
      setNewTipo({ name: '', category: 'Corretiva' })
      loadData()
    }
  }

  const handleDeleteTipo = async (id: string) => {
    const { error } = await supabase.from('maintenance_types').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar (pode estar em uso)')
    else {
      toast.success('Tipo removido')
      loadData()
    }
  }

  const handleAddPrioridade = async () => {
    if (!newPrioridade.name) {
      toast.error('Preencha o nome da criticidade')
      return
    }
    const clientId = await getClientId()
    if (!clientId) return toast.error('Erro de permissão: Client ID não encontrado')

    const { error } = await supabase.from('maintenance_priorities').insert({
      client_id: clientId,
      name: newPrioridade.name,
      sla_hours: newPrioridade.sla_hours,
      color: newPrioridade.color,
    } as any)

    if (error) toast.error('Erro ao salvar: ' + error.message)
    else {
      toast.success('Criticidade adicionada')
      setNewPrioridade({ name: '', sla_hours: 24, color: '#3b82f6' })
      loadData()
    }
  }

  const handleDeletePrioridade = async (id: string) => {
    const { error } = await supabase.from('maintenance_priorities').delete().eq('id', id)
    if (error) toast.error('Erro ao deletar (pode estar em uso)')
    else {
      toast.success('Criticidade removida')
      loadData()
    }
  }

  const handleAddManutentor = async () => {
    if (!newManutentor.name || !newManutentor.email || !newManutentor.password) {
      toast.error('Preencha nome, e-mail e senha do Manutentor')
      return
    }
    const clientId = await getClientId()
    if (!clientId) return toast.error('Erro de permissão: Client ID não encontrado')

    toast.loading('Criando manutentor...', { id: 'create-manutentor' })
    const { data, error } = await supabase.functions.invoke('create-user', {
      body: {
        email: newManutentor.email,
        password: newManutentor.password,
        name: newManutentor.name,
        role: 'Manutentor',
        client_id: clientId,
      },
    })

    if (error || data?.error) {
      toast.error('Erro ao salvar: ' + (error?.message || data?.error), { id: 'create-manutentor' })
    } else {
      toast.success('Manutentor adicionado', { id: 'create-manutentor' })
      setNewManutentor({ name: '', email: '', password: '' })
      loadData()
    }
  }

  const handleDeleteManutentor = async (id: string) => {
    if (!confirm('Deseja realmente remover este manutentor? O acesso dele será revogado.')) return

    toast.loading('Removendo manutentor...', { id: 'del-manutentor' })
    const { data, error } = await supabase.functions.invoke('delete-user', {
      body: { userId: id },
    })

    if (error || data?.error) {
      toast.error('Erro ao remover: ' + (error?.message || data?.error), { id: 'del-manutentor' })
    } else {
      toast.success('Manutentor removido', { id: 'del-manutentor' })
      loadData()
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Database className="h-8 w-8 text-brand-vividBlue" />
          Cadastros Base - Manutenção
        </h1>
        <p className="text-gray-500 mt-1">
          Configure locais, hierarquias, tipos e criticidades do módulo CMMS.
        </p>
      </div>

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="bg-white border rounded-lg h-auto p-1 shadow-sm flex-wrap">
          <TabsTrigger value="areas" className="py-2.5 px-4 flex items-center gap-2">
            <Building2 className="w-4 h-4" />
            Áreas (Locais)
          </TabsTrigger>
          <TabsTrigger value="subareas" className="py-2.5 px-4 flex items-center gap-2">
            <LayoutGrid className="w-4 h-4" />
            Subáreas
          </TabsTrigger>
          <TabsTrigger value="ativos" className="py-2.5 px-4 flex items-center gap-2">
            <MapPin className="w-4 h-4" />
            Equipamentos/Ativos
          </TabsTrigger>
          <TabsTrigger value="tipos" className="py-2.5 px-4 flex items-center gap-2">
            <Wrench className="w-4 h-4" />
            Tipos de O.S.
          </TabsTrigger>
          <TabsTrigger value="prioridades" className="py-2.5 px-4 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            Criticidades / SLA
          </TabsTrigger>
          <TabsTrigger value="manutentores" className="py-2.5 px-4 flex items-center gap-2">
            <Users className="w-4 h-4" />
            Manutentores
          </TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Nova Área</CardTitle>
                <CardDescription>Crie um novo local macro (Prédio, Setor, etc.)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Planta / Filial</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-vividBlue"
                    value={newArea.plant_id}
                    onChange={(e) => setNewArea({ ...newArea, plant_id: e.target.value })}
                  >
                    <option value="">Selecione a Planta...</option>
                    {plants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Área</Label>
                  <Input
                    placeholder="Ex: Prédio Administrativo"
                    value={newArea.name}
                    onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleAddArea}
                  className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90"
                >
                  <Plus className="h-4 w-4 mr-2" /> Salvar Área
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Áreas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Carregando áreas...</p>
                ) : (
                  <div className="space-y-2">
                    {areas.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-900">{a.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <Building2 className="w-3 h-3" />
                            {a.plant?.name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteArea(a.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {areas.length === 0 && (
                      <p className="text-sm text-gray-500 italic py-4 text-center">
                        Nenhuma área macro cadastrada.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="subareas" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Nova Subárea</CardTitle>
                <CardDescription>Vincule locais menores a uma Área macro</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Área Pai (Local Macro)</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-vividBlue"
                    value={newSubarea.area_id}
                    onChange={(e) => setNewSubarea({ ...newSubarea, area_id: e.target.value })}
                  >
                    <option value="">Selecione a Área...</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name} ({a.plant?.name})
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Nome da Subárea</Label>
                  <Input
                    placeholder="Ex: Sala de Reuniões 01"
                    value={newSubarea.name}
                    onChange={(e) => setNewSubarea({ ...newSubarea, name: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleAddSubarea}
                  className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90"
                >
                  <Plus className="h-4 w-4 mr-2" /> Salvar Subárea
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Subáreas Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Carregando subáreas...</p>
                ) : (
                  <div className="space-y-2">
                    {subareas.map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-900">{s.name}</p>
                          <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                            <LayoutGrid className="w-3 h-3" />
                            {s.area?.name} <span className="text-gray-300 mx-1">•</span>{' '}
                            {s.area?.plant?.name}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteSubarea(s.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {subareas.length === 0 && (
                      <p className="text-sm text-gray-500 italic py-4 text-center">
                        Nenhuma subárea cadastrada.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tipos" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Novo Tipo de O.S.</CardTitle>
                <CardDescription>Crie tipos de manutenção (Preventiva, etc.)</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Tipo</Label>
                  <Input
                    placeholder="Ex: Preventiva Elétrica"
                    value={newTipo.name}
                    onChange={(e) => setNewTipo({ ...newTipo, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Categoria</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-vividBlue"
                    value={newTipo.category}
                    onChange={(e) => setNewTipo({ ...newTipo, category: e.target.value })}
                  >
                    <option value="Corretiva">Corretiva (Reativa)</option>
                    <option value="Preventiva">Preventiva</option>
                    <option value="Preditiva">Preditiva</option>
                    <option value="Melhoria">Melhoria / Projeto</option>
                  </select>
                </div>
                <Button
                  onClick={handleAddTipo}
                  className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90"
                >
                  <Plus className="h-4 w-4 mr-2" /> Salvar Tipo
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Tipos Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Carregando tipos...</p>
                ) : (
                  <div className="space-y-2">
                    {tipos.map((t) => (
                      <div
                        key={t.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div>
                          <p className="font-medium text-sm text-gray-900">{t.name}</p>
                          <p className="text-xs text-gray-500 mt-0.5">Cat: {t.category}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteTipo(t.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {tipos.length === 0 && (
                      <p className="text-sm text-gray-500 italic py-4 text-center">
                        Nenhum tipo cadastrado.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="prioridades" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Nova Criticidade</CardTitle>
                <CardDescription>Defina prioridades e seus limites de SLA</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome</Label>
                  <Input
                    placeholder="Ex: Urgente, Alta..."
                    value={newPrioridade.name}
                    onChange={(e) => setNewPrioridade({ ...newPrioridade, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SLA Limite (Horas)</Label>
                  <Input
                    type="number"
                    min="1"
                    value={newPrioridade.sla_hours}
                    onChange={(e) =>
                      setNewPrioridade({ ...newPrioridade, sla_hours: Number(e.target.value) })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Cor de Destaque</Label>
                  <Input
                    type="color"
                    className="h-10 p-1 w-full"
                    value={newPrioridade.color}
                    onChange={(e) => setNewPrioridade({ ...newPrioridade, color: e.target.value })}
                  />
                </div>
                <Button
                  onClick={handleAddPrioridade}
                  className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90"
                >
                  <Plus className="h-4 w-4 mr-2" /> Salvar Criticidade
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Criticidades Cadastradas</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Carregando prioridades...</p>
                ) : (
                  <div className="space-y-2">
                    {prioridades.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-4 h-4 rounded-full border"
                            style={{ backgroundColor: p.color }}
                          />
                          <div>
                            <p className="font-medium text-sm text-gray-900">{p.name}</p>
                            <p className="text-xs text-gray-500 mt-0.5">SLA: {p.sla_hours} horas</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeletePrioridade(p.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {prioridades.length === 0 && (
                      <p className="text-sm text-gray-500 italic py-4 text-center">
                        Nenhuma criticidade cadastrada.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="manutentores" className="mt-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Novo Manutentor</CardTitle>
                <CardDescription>Cadastre um técnico para assumir as O.S.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome Completo</Label>
                  <Input
                    placeholder="Ex: João Silva"
                    value={newManutentor.name}
                    onChange={(e) => setNewManutentor({ ...newManutentor, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>E-mail de Acesso</Label>
                  <Input
                    type="email"
                    placeholder="joao.silva@email.com"
                    value={newManutentor.email}
                    onChange={(e) => setNewManutentor({ ...newManutentor, email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Senha Inicial</Label>
                  <Input
                    type="password"
                    placeholder="******"
                    value={newManutentor.password}
                    onChange={(e) =>
                      setNewManutentor({ ...newManutentor, password: e.target.value })
                    }
                  />
                </div>
                <Button
                  onClick={handleAddManutentor}
                  className="w-full bg-brand-vividBlue hover:bg-brand-vividBlue/90"
                >
                  <Plus className="h-4 w-4 mr-2" /> Cadastrar Manutentor
                </Button>
              </CardContent>
            </Card>

            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Manutentores Cadastrados</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Carregando manutentores...</p>
                ) : (
                  <div className="space-y-2">
                    {manutentores.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-brand-vividBlue text-white text-xs">
                              {m.name?.[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm text-gray-900">{m.name}</p>
                            <p className="text-xs text-gray-500">{m.email}</p>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteManutentor(m.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 h-8 w-8"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {manutentores.length === 0 && (
                      <p className="text-sm text-gray-500 italic py-4 text-center">
                        Nenhum manutentor cadastrado.
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="ativos" className="mt-6">
          <Card className="shadow-sm">
            <CardContent className="p-16 text-center text-gray-500 border-2 border-dashed m-4 rounded-xl">
              Gerenciamento da árvore de ativos será configurado aqui em breve...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
