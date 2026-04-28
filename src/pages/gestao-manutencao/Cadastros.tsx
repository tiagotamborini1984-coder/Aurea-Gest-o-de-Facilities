import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, Plus, Trash, MapPin, Building2, LayoutGrid } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function CadastrosManutencao() {
  const { user } = useAuth()
  const [areas, setAreas] = useState<any[]>([])
  const [subareas, setSubareas] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const [newArea, setNewArea] = useState({ name: '', plant_id: '' })
  const [newSubarea, setNewSubarea] = useState({ name: '', area_id: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [pRes, aRes, sRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('*, plant:plants(name)').order('name'),
      supabase
        .from('maintenance_sublocations')
        .select('*, area:maintenance_areas(name, plant:plants(name))')
        .order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
    if (sRes.data) setSubareas(sRes.data)
    setLoading(false)
  }

  const handleAddArea = async () => {
    if (!newArea.name || !newArea.plant_id) {
      toast.error('Preencha nome e planta da Área')
      return
    }
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()

    let clientId = profile?.client_id
    if (!clientId) {
      const { data: plant } = await supabase
        .from('plants')
        .select('client_id')
        .eq('id', newArea.plant_id)
        .single()
      clientId = plant?.client_id
    }

    if (!clientId) {
      toast.error('Erro de permissão: Client ID não encontrado')
      return
    }

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
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()

    let clientId = profile?.client_id
    if (!clientId) {
      const { data: area } = await supabase
        .from('maintenance_areas')
        .select('client_id')
        .eq('id', newSubarea.area_id)
        .single()
      clientId = area?.client_id
    }

    if (!clientId) {
      toast.error('Erro de permissão: Client ID não encontrado')
      return
    }

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

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Database className="h-8 w-8 text-brand-vividBlue" />
          Cadastros Base - Manutenção
        </h1>
        <p className="text-gray-500 mt-1">
          Configure locais e sub-locais (hierarquia) para o módulo CMMS.
        </p>
      </div>

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="bg-white border rounded-lg h-auto p-1 shadow-sm">
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
