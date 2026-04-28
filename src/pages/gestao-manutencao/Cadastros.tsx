import { useEffect, useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Database, Plus, Trash } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function CadastrosManutencao() {
  const { user } = useAuth()
  const [areas, setAreas] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [newArea, setNewArea] = useState({ name: '', plant_id: '' })

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    setLoading(true)
    const [pRes, aRes] = await Promise.all([
      supabase.from('plants').select('id, name').order('name'),
      supabase.from('maintenance_areas').select('*, plant:plants(name)').order('name'),
    ])
    if (pRes.data) setPlants(pRes.data)
    if (aRes.data) setAreas(aRes.data)
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
    if (!profile?.client_id) return

    const { error } = await supabase.from('maintenance_areas').insert({
      client_id: profile.client_id,
      plant_id: newArea.plant_id,
      name: newArea.name,
    })

    if (error) toast.error(error.message)
    else {
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

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
          <Database className="h-8 w-8 text-brand-vividBlue" />
          Cadastros Base - Manutenção
        </h1>
        <p className="text-gray-500 mt-1">Configure as entidades exclusivas do módulo CMMS.</p>
      </div>

      <Tabs defaultValue="areas" className="w-full">
        <TabsList className="bg-white border rounded-lg h-auto p-1 shadow-sm">
          <TabsTrigger value="areas" className="py-2.5">
            Áreas (Locais)
          </TabsTrigger>
          <TabsTrigger value="ativos" className="py-2.5">
            Equipamentos/Ativos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="areas" className="mt-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="md:col-span-1 shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="text-lg">Nova Área de Manutenção</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
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
                <Input
                  placeholder="Nome da Área (ex: Prédio Administrativo)"
                  value={newArea.name}
                  onChange={(e) => setNewArea({ ...newArea, name: e.target.value })}
                />
                <Button onClick={handleAddArea} className="w-full bg-brand-vividBlue">
                  <Plus className="h-4 w-4 mr-2" /> Adicionar Área
                </Button>
              </CardContent>
            </Card>

            <Card className="md:col-span-2 shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg">Áreas Cadastradas no Módulo</CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <p className="text-sm text-gray-500">Carregando...</p>
                ) : (
                  <div className="space-y-2">
                    {areas.map((a) => (
                      <div
                        key={a.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-sm">{a.name}</p>
                          <p className="text-xs text-gray-500">{a.plant?.name}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteArea(a.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    {areas.length === 0 && (
                      <p className="text-sm text-gray-500 italic">Nenhuma área cadastrada.</p>
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
              Gerenciamento da árvore de ativos virá aqui...
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
