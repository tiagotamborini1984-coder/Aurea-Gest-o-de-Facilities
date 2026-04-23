import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Edit2 } from 'lucide-react'
import { getOrgFunctions, saveOrgFunction, deleteOrgItem } from '@/services/organograma'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'

export function FuncoesList() {
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [functions, setFunctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState<any>({ name: '', description: '' })
  const [isEditing, setIsEditing] = useState(false)

  const loadData = async () => {
    if (!activeClient) return
    try {
      const data = await getOrgFunctions(activeClient.id)
      setFunctions(data)
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
      await saveOrgFunction({ ...formData, client_id: activeClient.id })
      toast({ title: 'Sucesso', description: 'Função salva com sucesso.' })
      setFormData({ name: '', description: '' })
      setIsEditing(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    try {
      await deleteOrgItem('org_functions', id)
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
          <CardTitle>{isEditing ? 'Editar Função' : 'Nova Função'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome da Função/Cargo</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
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
                    setFormData({ name: '', description: '' })
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
          <CardTitle>Funções Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-4">
              {functions.map((fn) => (
                <div
                  key={fn.id}
                  className="flex items-center justify-between p-4 border rounded-lg bg-card"
                >
                  <div>
                    <h4 className="font-semibold">{fn.name}</h4>
                    <p className="text-sm text-muted-foreground">{fn.description}</p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData(fn)
                        setIsEditing(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(fn.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {functions.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Nenhuma função encontrada.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
