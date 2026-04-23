import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Plus, Trash2, Edit2 } from 'lucide-react'
import { getOrgUnits, saveOrgUnit, deleteOrgItem } from '@/services/organograma'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useMasterData } from '@/hooks/use-master-data'

export function UnidadesList() {
  const { activeClient } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()
  const [units, setUnits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<any>({ name: '', description: '', plant_id: '' })
  const [isEditing, setIsEditing] = useState(false)

  const loadData = async () => {
    if (!activeClient) return
    try {
      const data = await getOrgUnits(activeClient.id)
      setUnits(data)
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient) return
    try {
      await saveOrgUnit({ ...formData, client_id: activeClient.id })
      toast({ title: 'Sucesso', description: 'Unidade salva com sucesso.' })
      setFormData({ name: '', description: '', plant_id: '' })
      setIsEditing(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    try {
      await deleteOrgItem('org_units', id)
      toast({ title: 'Sucesso', description: 'Excluído com sucesso.' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
      <Card className="md:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Unidade' : 'Nova Unidade'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Unidade</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Planta Vinculada</label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Descrição</label>
              <Input
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="w-full">
                {isEditing ? 'Salvar' : 'Adicionar'}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData({ name: '', description: '', plant_id: '' })
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle>Unidades Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-4">
              {units.map((unit) => (
                <div
                  key={unit.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div>
                    <h4 className="font-semibold">{unit.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {unit.plants?.name} • {unit.description}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData(unit)
                        setIsEditing(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(unit.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {units.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhuma unidade encontrada.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
