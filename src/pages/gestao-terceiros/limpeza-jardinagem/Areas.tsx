import React, { useState, useEffect, useMemo } from 'react'
import { Leaf, Plus, Trash2, Edit2, MapPin } from 'lucide-react'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function AreasLJ() {
  const { plants, refetch } = useMasterData()
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')
  const { toast } = useToast()

  const [areas, setAreas] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({})
  const [polygon, setPolygon] = useState<{ x: number; y: number }[]>([])
  const [selectedPlantFilter, setSelectedPlantFilter] = useState<string>('all')

  const authorizedPlants = useMemo(() => {
    if (!profile) return []
    if (profile.role === 'Master' || profile.role === 'Administrador') return plants
    return plants.filter((p) => profile.authorized_plants?.includes(p.id))
  }, [plants, profile])

  const loadAreas = async () => {
    if (!profile) return
    setLoading(true)
    let query = supabase
      .from('cleaning_gardening_areas')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })

    if (selectedPlantFilter !== 'all') {
      query = query.eq('plant_id', selectedPlantFilter)
    }

    const { data } = await query
    if (data) setAreas(data)
    setLoading(false)
  }

  useEffect(() => {
    loadAreas()
  }, [profile, selectedPlantFilter])

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const selectedPlant = authorizedPlants.find((p) => p.id === formData.plant_id)

  const getMapUrl = (val: any): string | null => {
    if (!val) return null
    if (typeof val === 'string') {
      if (val.trim().startsWith('[')) {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed) && parsed.length > 0) {
            return typeof parsed[0] === 'string' ? parsed[0] : parsed[0].url || null
          }
          return null
        } catch {
          return val
        }
      }
      return val
    }
    if (Array.isArray(val) && val.length > 0) {
      return typeof val[0] === 'string' ? val[0] : val[0].url || null
    }
    return null
  }

  const mapUrl = getMapUrl(selectedPlant?.map_url)

  const handleImageClick = (e: React.MouseEvent<HTMLImageElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setPolygon([...polygon, { x, y }])
  }

  const handleSave = async () => {
    try {
      if (!formData.name || !formData.plant_id || !formData.type) {
        toast({
          title: 'Campos obrigatórios',
          description: 'Preencha todos os campos obrigatórios.',
          variant: 'destructive',
        })
        return
      }

      const payload = {
        name: formData.name,
        description: formData.description,
        type: formData.type,
        plant_id: formData.plant_id,
        polygon_data: polygon,
        client_id: profile.client_id,
      }

      if (formData.id) {
        await supabase.from('cleaning_gardening_areas').update(payload).eq('id', formData.id)
        toast({ title: 'Atualizado com sucesso' })
      } else {
        await supabase.from('cleaning_gardening_areas').insert(payload)
        toast({ title: 'Adicionado com sucesso' })
      }
      setIsModalOpen(false)
      loadAreas()
    } catch (e: any) {
      toast({ title: 'Erro ao salvar', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta área?')) return
    await supabase.from('cleaning_gardening_areas').delete().eq('id', id)
    toast({ title: 'Excluído com sucesso' })
    loadAreas()
  }

  const openNew = async () => {
    await refetch()
    setFormData({ type: 'cleaning' })
    setPolygon([])
    setIsModalOpen(true)
  }

  const openEdit = async (area: any) => {
    await refetch()
    setFormData(area)
    setPolygon(area.polygon_data || [])
    setIsModalOpen(true)
  }

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <Card>
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <CardTitle className="flex items-center gap-2 text-2xl">
            <Leaf className="h-6 w-6 text-brand-vividBlue" />
            Áreas de Limpeza e Jardinagem
          </CardTitle>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 w-full md:w-auto">
            <Select value={selectedPlantFilter} onValueChange={setSelectedPlantFilter}>
              <SelectTrigger className="w-[200px] bg-white">
                <SelectValue placeholder="Todas as Plantas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Plantas</SelectItem>
                {authorizedPlants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={openNew}>
              <Plus className="h-4 w-4 mr-2" /> Nova Área
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead className="w-24">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {areas.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                      Nenhuma área cadastrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  areas.map((area) => (
                    <TableRow key={area.id}>
                      <TableCell className="font-medium">{area.name}</TableCell>
                      <TableCell>
                        {authorizedPlants.find((p) => p.id === area.plant_id)?.name || '-'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100">
                          {area.type === 'cleaning' ? 'Limpeza' : 'Jardinagem'}
                        </span>
                      </TableCell>
                      <TableCell>{area.description || '-'}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(area)}>
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(area.id)}
                            className="hover:bg-red-100 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {formData.id ? 'Editar Área' : 'Nova Área'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 py-4">
            <div className="lg:col-span-4 space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Planta *</label>
                <Select
                  value={formData.plant_id || ''}
                  onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {authorizedPlants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Nome da Área *</label>
                <Input
                  placeholder="Ex: Refeitório Principal"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo de Serviço *</label>
                <Select
                  value={formData.type || 'cleaning'}
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cleaning">Limpeza</SelectItem>
                    <SelectItem value="gardening">Jardinagem</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Descrição</label>
                <Input
                  placeholder="Detalhes adicionais..."
                  value={formData.description || ''}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>

            <div className="lg:col-span-8 space-y-4 lg:border-l lg:pl-8">
              <h3 className="text-sm font-medium flex items-center gap-2 text-gray-700">
                <MapPin className="h-4 w-4" /> Marcação no Mapa (Opcional)
              </h3>

              {!formData.plant_id ? (
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg text-center text-muted-foreground bg-gray-50/50">
                  Selecione uma planta primeiro para configurar o mapa.
                </div>
              ) : !mapUrl ? (
                <div className="p-8 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center gap-4 text-center bg-gray-50/50">
                  <p className="text-muted-foreground text-sm max-w-sm">
                    Esta planta ainda não possui uma planta baixa cadastrada. Configure o mapa no
                    módulo de Cadastros de Plantas para ativar a marcação visual.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      Clique na imagem para desenhar o perímetro da área.
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => setPolygon([])}
                    >
                      Limpar Polígono
                    </Button>
                  </div>

                  <div className="w-full overflow-auto flex justify-center bg-gray-100 p-2 rounded-lg border border-gray-200">
                    <div className="relative inline-block max-w-full shadow-sm bg-white border border-gray-300">
                      <img
                        src={mapUrl}
                        alt="Mapa da Planta"
                        className="block max-w-full h-auto cursor-crosshair"
                        onClick={handleImageClick}
                      />
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        {polygon.length > 0 && (
                          <polygon
                            points={polygon.map((p) => `${p.x},${p.y}`).join(' ')}
                            fill="rgba(59, 130, 246, 0.4)"
                            stroke="#3b82f6"
                            strokeWidth="0.5"
                            vectorEffect="non-scaling-stroke"
                          />
                        )}
                        {polygon.map((p, i) => (
                          <circle
                            key={i}
                            cx={p.x}
                            cy={p.y}
                            r="0.8"
                            fill="#1d4ed8"
                            stroke="#ffffff"
                            strokeWidth="0.2"
                            vectorEffect="non-scaling-stroke"
                          />
                        ))}
                      </svg>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="border-t pt-4 mt-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSave}
              className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
            >
              Salvar Área
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
