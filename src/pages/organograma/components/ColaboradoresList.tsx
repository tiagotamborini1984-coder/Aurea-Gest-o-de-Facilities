import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Trash2, Edit2, Upload } from 'lucide-react'
import {
  getOrgCollaborators,
  saveOrgCollaborator,
  deleteOrgItem,
  getOrgUnits,
  getOrgFunctions,
} from '@/services/organograma'
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'

export function ColaboradoresList() {
  const { activeClient } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])
  const [functions, setFunctions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const defaultForm = {
    name: '',
    email: '',
    phone: '',
    photo_url: '',
    plant_id: '',
    unit_id: '',
    function_id: '',
    manager_id: 'none',
  }
  const [formData, setFormData] = useState<any>(defaultForm)

  const loadData = async () => {
    if (!activeClient) return
    try {
      const [cData, uData, fData] = await Promise.all([
        getOrgCollaborators(activeClient.id),
        getOrgUnits(activeClient.id),
        getOrgFunctions(activeClient.id),
      ])
      setCollaborators(cData)
      setUnits(uData)
      setFunctions(fData)
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [activeClient])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !activeClient) return
    setIsUploading(true)
    try {
      const ext = file.name.split('.').pop()
      const path = `${activeClient.id}/${Date.now()}.${ext}`
      const { error } = await supabase.storage.from('org_photos').upload(path, file)
      if (error) throw error
      const {
        data: { publicUrl },
      } = supabase.storage.from('org_photos').getPublicUrl(path)
      setFormData({ ...formData, photo_url: publicUrl })
      toast({ title: 'Sucesso', description: 'Foto enviada com sucesso.' })
    } catch (e: any) {
      toast({ title: 'Erro no upload', description: e.message, variant: 'destructive' })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient) return
    try {
      const payload: any = {
        client_id: activeClient.id,
        name: formData.name,
        email: formData.email || null,
        phone: formData.phone || null,
        photo_url: formData.photo_url || null,
        plant_id: formData.plant_id || null,
        unit_id: formData.unit_id || null,
        function_id: formData.function_id || null,
        manager_id: formData.manager_id === 'none' ? null : formData.manager_id,
      }

      if (formData.id) {
        payload.id = formData.id
      }

      await saveOrgCollaborator(payload)
      toast({ title: 'Sucesso', description: 'Colaborador salvo.' })
      setFormData(defaultForm)
      setIsEditing(false)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir?')) return
    try {
      await deleteOrgItem('org_collaborators', id)
      toast({ title: 'Sucesso', description: 'Excluído com sucesso.' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-1 h-fit">
        <CardHeader>
          <CardTitle>{isEditing ? 'Editar Colaborador' : 'Novo Colaborador'}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex justify-center mb-4">
              <Avatar className="h-20 w-20">
                <AvatarImage
                  src={
                    formData.photo_url ||
                    `https://img.usecurling.com/ppl/thumbnail?seed=${formData.name}`
                  }
                />
                <AvatarFallback>FT</AvatarFallback>
              </Avatar>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Foto (Upload)</label>
              <Input type="file" accept="image/*" onChange={handleUpload} disabled={isUploading} />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Planta</label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Planta" />
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
                <label className="text-sm font-medium">Unidade</label>
                <Select
                  value={formData.unit_id}
                  onValueChange={(v) => setFormData({ ...formData, unit_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Unidade" />
                  </SelectTrigger>
                  <SelectContent>
                    {units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Função</label>
              <Select
                value={formData.function_id}
                onValueChange={(v) => setFormData({ ...formData, function_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a Função" />
                </SelectTrigger>
                <SelectContent>
                  {functions.map((f) => (
                    <SelectItem key={f.id} value={f.id}>
                      {f.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Subordinado a (Gestor)</label>
              <Select
                value={formData.manager_id || 'none'}
                onValueChange={(v) => setFormData({ ...formData, manager_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o Gestor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum (Nível Raiz)</SelectItem>
                  {collaborators
                    .filter((c) => c.id !== formData.id)
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button type="submit" className="w-full" disabled={isUploading}>
                {isEditing ? 'Salvar' : 'Adicionar'}
              </Button>
              {isEditing && (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsEditing(false)
                    setFormData(defaultForm)
                  }}
                >
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Colaboradores do Organograma</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            <div className="space-y-3">
              {collaborators.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-card"
                >
                  <div className="flex items-center gap-4">
                    <Avatar>
                      <AvatarImage
                        src={
                          c.photo_url || `https://img.usecurling.com/ppl/thumbnail?seed=${c.name}`
                        }
                      />
                      <AvatarFallback>{c.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-semibold text-sm">{c.name}</h4>
                      <p className="text-xs text-muted-foreground">
                        {c.org_functions?.name} • {c.plants?.name}
                      </p>
                      {c.manager_id && (
                        <p className="text-[10px] text-blue-500">
                          Subordinado a: {collaborators.find((x) => x.id === c.manager_id)?.name}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setFormData({ ...c, manager_id: c.manager_id || 'none' })
                        setIsEditing(true)
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="icon" onClick={() => handleDelete(c.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {collaborators.length === 0 && (
                <p className="text-muted-foreground text-center py-4">
                  Nenhum colaborador encontrado.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
