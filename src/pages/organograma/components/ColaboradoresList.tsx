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
import { MultiSelect } from '@/components/ui/multi-select'
import { Badge } from '@/components/ui/badge'
import { useMasterData } from '@/hooks/use-master-data'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { supabase } from '@/lib/supabase/client'

export function ColaboradoresList() {
  const { activeClient, profile } = useAppStore()
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
    plant_ids: [] as string[],
    unit_id: '',
    function_id: '',
    manager_id: 'none',
  }
  const [formData, setFormData] = useState<any>(defaultForm)
  const [fileInputKey, setFileInputKey] = useState<number>(0)

  const loadData = async () => {
    if (!activeClient) return
    try {
      const isAdmin = profile?.role === 'Administrador' || profile?.role === 'Master'
      const authorizedPlants: string[] = profile?.authorized_plants || []
      const plantFilter = !isAdmin && authorizedPlants.length > 0 ? authorizedPlants : undefined

      const [cData, uData, fData] = await Promise.all([
        getOrgCollaborators(activeClient.id, plantFilter),
        getOrgUnits(activeClient.id),
        getOrgFunctions(activeClient.id),
      ])
      setCollaborators(cData.sort((a: any, b: any) => (a.name || '').localeCompare(b.name || '')))
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
  }, [activeClient, profile])

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (!activeClient?.id) {
      toast({
        title: 'Cliente não selecionado',
        description: 'Selecione uma empresa antes de fazer upload da foto.',
        variant: 'destructive',
      })
      return
    }

    // Validar tipo de arquivo
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Arquivo inválido',
        description: 'Selecione um arquivo de imagem válido (PNG, JPG, JPEG, WEBP).',
        variant: 'destructive',
      })
      return
    }

    // Limite de tamanho: 10MB
    const maxSize = 10 * 1024 * 1024
    if (file.size > maxSize) {
      toast({
        title: 'Arquivo muito grande',
        description: 'A imagem deve ter no máximo 10MB.',
        variant: 'destructive',
      })
      return
    }

    setIsUploading(true)
    try {
      const rawExt = file.name.split('.').pop() || 'jpg'
      const ext = rawExt.toLowerCase()
      const safeRandom = Math.random().toString(36).substring(2, 8)
      const path = `${activeClient.id}/${Date.now()}-${safeRandom}.${ext}`
      const { error } = await supabase.storage.from('org_photos').upload(path, file, {
        cacheControl: '3600',
        upsert: false,
      })
      if (error) {
        throw new Error(error.message || 'Falha ao salvar a imagem no storage.')
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from('org_photos').getPublicUrl(path)
      setFormData((prev: any) => ({ ...prev, photo_url: publicUrl }))
      toast({ title: 'Sucesso', description: 'Foto enviada com sucesso.' })
    } catch (e: any) {
      const errorMsg = e?.message || 'Erro desconhecido ao enviar foto.'
      toast({
        title: 'Erro no upload da foto',
        description: errorMsg,
        variant: 'destructive',
      })
    } finally {
      setIsUploading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient) {
      toast({
        title: 'Erro',
        description: 'Nenhum cliente selecionado.',
        variant: 'destructive',
      })
      return
    }
    if (!formData.name?.trim()) {
      toast({
        title: 'Campo obrigatório',
        description: 'Informe o nome do colaborador.',
        variant: 'destructive',
      })
      return
    }

    try {
      const selectedPlantIds: string[] = Array.isArray(formData.plant_ids)
        ? formData.plant_ids
        : formData.plant_id
          ? [formData.plant_id]
          : []

      const payload: any = {
        client_id: activeClient.id,
        name: formData.name.trim(),
        email: formData.email?.trim() || null,
        phone: formData.phone?.trim() || null,
        photo_url: formData.photo_url?.trim() || null,
        plant_id: selectedPlantIds.length > 0 ? selectedPlantIds[0] : null,
        unit_id: formData.unit_id || null,
        function_id: formData.function_id || null,
        manager_id:
          formData.manager_id === 'none' || !formData.manager_id ? null : formData.manager_id,
      }

      if (formData.id) {
        payload.id = formData.id
      }

      await saveOrgCollaborator(payload, selectedPlantIds)
      toast({
        title: 'Sucesso',
        description: formData.id
          ? 'Colaborador atualizado com sucesso.'
          : 'Colaborador adicionado com sucesso.',
      })
      setFormData(defaultForm)
      setFileInputKey((k) => k + 1)
      setIsEditing(false)
      loadData()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar colaborador',
        description: e?.message || 'Falha ao gravar os dados do colaborador.',
        variant: 'destructive',
      })
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
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Foto (Upload)</label>
                {formData.photo_url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-6 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      setFormData((prev: any) => ({ ...prev, photo_url: '' }))
                      setFileInputKey((k) => k + 1)
                    }}
                  >
                    Remover foto
                  </Button>
                )}
              </div>
              <Input
                key={fileInputKey}
                type="file"
                accept="image/*"
                onChange={handleUpload}
                disabled={isUploading}
              />
              {isUploading && <p className="text-xs text-muted-foreground">Enviando foto...</p>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Nome</label>
              <Input
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center justify-between">
                  <span>Plantas Responsáveis</span>
                  {formData.plant_ids?.length > 1 && (
                    <span className="text-xs text-blue-600 font-normal">
                      {formData.plant_ids.length} plantas
                    </span>
                  )}
                </label>
                <MultiSelect
                  options={plants.map((p) => ({ label: p.name, value: p.id }))}
                  selected={formData.plant_ids || []}
                  onChange={(selected) => {
                    setFormData((prev: any) => ({
                      ...prev,
                      plant_ids: selected,
                      plant_id: selected.length > 0 ? selected[0] : '',
                    }))
                  }}
                  placeholder="Selecione as plantas..."
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Unidade / Setor</label>
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
                    setFileInputKey((k) => k + 1)
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
                      <div className="text-xs text-muted-foreground flex flex-wrap items-center gap-1 mt-0.5">
                        <span>{c.org_functions?.name || 'Sem função'}</span>
                        <span>•</span>
                        {c.plants_list && c.plants_list.length > 0 ? (
                          <div className="inline-flex flex-wrap gap-1">
                            {c.plants_list.map((p: any) => (
                              <Badge
                                key={p.id}
                                variant="outline"
                                className="text-[10px] px-1.5 py-0 h-4 bg-muted/50"
                              >
                                {p.name}
                              </Badge>
                            ))}
                          </div>
                        ) : (
                          <span>{c.plants?.name || 'Sem planta'}</span>
                        )}
                      </div>
                      {c.manager_id && (
                        <p className="text-[10px] text-blue-500 mt-1">
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
                        const pids =
                          c.plant_ids && c.plant_ids.length > 0
                            ? c.plant_ids
                            : c.plant_id
                              ? [c.plant_id]
                              : []
                        setFormData({
                          id: c.id,
                          name: c.name || '',
                          email: c.email || '',
                          phone: c.phone || '',
                          photo_url: c.photo_url || '',
                          plant_id: pids[0] || '',
                          plant_ids: pids,
                          unit_id: c.unit_id || '',
                          function_id: c.function_id || '',
                          manager_id: c.manager_id || 'none',
                        })
                        setFileInputKey((k) => k + 1)
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
