import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
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
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  Wrench,
  Plus,
  Edit2,
  Loader2,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'

type ToolStatus = 'Operando' | 'Em Manutenção' | 'Indisponível'

interface PlantTool {
  id: string
  client_id: string
  plant_id: string
  asset_number: string | null
  description: string
  usage_instructions: string
  status: string
  created_at: string
  updated_at: string
  plant?: { name: string }
}

const STATUS_COLORS: Record<string, string> = {
  Operando: 'bg-green-100 text-green-800 border-green-200',
  'Em Manutenção': 'bg-amber-100 text-amber-800 border-amber-200',
  Indisponível: 'bg-red-100 text-red-800 border-red-200',
}

const PIE_COLORS: Record<string, string> = {
  Operando: '#22c55e',
  'Em Manutenção': '#f59e0b',
  Indisponível: '#ef4444',
}

export default function DashboardFerramentas() {
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const [tools, setTools] = useState<PlantTool[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [filterPlant, setFilterPlant] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const [formData, setFormData] = useState({
    plant_id: '',
    asset_number: '',
    description: '',
    usage_instructions: '',
    status: 'Operando' as ToolStatus,
  })

  const clientId = useMemo(() => {
    if (profile?.role === 'Master' && selectedMasterClient !== 'all') return selectedMasterClient
    return profile?.client_id || activeClient?.id
  }, [profile, selectedMasterClient, activeClient])

  const fetchPlants = useCallback(async () => {
    if (!clientId) return
    const { data } = await supabase.from('plants').select('*').eq('client_id', clientId)
    let plantList = data || []
    if (profile?.role !== 'Master' && profile?.role !== 'Administrador') {
      const authorized = (profile?.authorized_plants as string[]) || []
      plantList = plantList.filter((p) => authorized.includes(p.id))
    }
    setPlants(plantList)
  }, [clientId, profile])

  const fetchTools = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const { data, error } = await supabase
      .from('plant_tools')
      .select('*, plant:plants!plant_tools_plant_id_fkey(name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
    if (error) {
      toast.error('Erro ao carregar ferramentas')
    } else {
      setTools((data || []) as PlantTool[])
    }
    setLoading(false)
  }, [clientId])

  useEffect(() => {
    fetchPlants()
    fetchTools()
  }, [fetchPlants, fetchTools])

  const openAdd = () => {
    setEditingId(null)
    setFormData({
      plant_id: plants.length === 1 ? plants[0].id : '',
      asset_number: '',
      description: '',
      usage_instructions: '',
      status: 'Operando',
    })
    setModalOpen(true)
  }

  const openEdit = (tool: PlantTool) => {
    setEditingId(tool.id)
    setFormData({
      plant_id: tool.plant_id,
      asset_number: tool.asset_number || '',
      description: tool.description,
      usage_instructions: tool.usage_instructions,
      status: tool.status as ToolStatus,
    })
    setModalOpen(true)
  }

  const handleSave = async () => {
    if (!clientId) return toast.error('Cliente não identificado')
    if (!formData.plant_id) return toast.error('Selecione uma planta')
    if (!formData.description.trim()) return toast.error('Descrição é obrigatória')
    if (!formData.usage_instructions.trim()) return toast.error('Uso/Finalidade é obrigatório')

    setIsSaving(true)
    try {
      const payload = {
        client_id: clientId,
        plant_id: formData.plant_id,
        asset_number: formData.asset_number.trim() || null,
        description: formData.description.trim(),
        usage_instructions: formData.usage_instructions.trim(),
        status: formData.status,
      }

      if (editingId) {
        const { error } = await supabase.from('plant_tools').update(payload).eq('id', editingId)
        if (error) throw error
        toast.success('Ferramenta atualizada com sucesso')
      } else {
        const { error } = await supabase.from('plant_tools').insert(payload)
        if (error) throw error
        toast.success('Ferramenta cadastrada com sucesso')
      }
      setModalOpen(false)
      fetchTools()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar ferramenta')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStatusChange = async (tool: PlantTool, newStatus: ToolStatus) => {
    try {
      const { error } = await supabase
        .from('plant_tools')
        .update({ status: newStatus })
        .eq('id', tool.id)
      if (error) throw error
      toast.success('Status atualizado')
      fetchTools()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao atualizar status')
    }
  }

  const filteredTools = useMemo(() => {
    return tools.filter((t) => {
      const matchPlant = filterPlant === 'all' || t.plant_id === filterPlant
      const matchStatus = filterStatus === 'all' || t.status === filterStatus
      const matchSearch =
        !search.trim() ||
        (t.asset_number || '').toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      return matchPlant && matchStatus && matchSearch
    })
  }, [tools, filterPlant, filterStatus, search])

  const totalTools = tools.length
  const operatingCount = tools.filter((t) => t.status === 'Operando').length
  const maintenanceCount = tools.filter((t) => t.status === 'Em Manutenção').length

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    tools.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [tools])

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-3">
            <Wrench className="w-7 h-7 text-brand-vividBlue" />
            Gestão de Ferramentas
          </h1>
          <p className="text-slate-500">Cadastre, acompanhe e gerencie ferramentas por planta</p>
        </div>
        <Button onClick={openAdd} disabled={plants.length === 0}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Ferramenta
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Ferramentas</p>
              <h3 className="text-2xl font-bold">{totalTools}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-green-100 text-green-600 rounded-lg">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Em Operação</p>
              <h3 className="text-2xl font-bold">{operatingCount}</h3>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-100 text-amber-600 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Em Manutenção</p>
              <h3 className="text-2xl font-bold">{maintenanceCount}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-brand-vividBlue" />
              Distribuição por Status
            </CardTitle>
          </CardHeader>
          <CardContent className="h-[280px]">
            {chartData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-slate-400 text-sm">
                Nenhum dado disponível
              </div>
            ) : (
              <ChartContainer
                config={{ value: { label: 'Ferramentas' } }}
                className="h-full w-full"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={chartData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      label={(entry: any) => `${entry.name}: ${entry.value}`}
                    >
                      {chartData.map((entry) => (
                        <Cell key={entry.name} fill={PIE_COLORS[entry.name] || '#94a3b8'} />
                      ))}
                    </Pie>
                    <ChartTooltip content={<ChartTooltipContent />} />
                  </PieChart>
                </ResponsiveContainer>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lista de Ferramentas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <Input
                  placeholder="Buscar por ativo ou descrição..."
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterPlant} onValueChange={setFilterPlant}>
                <SelectTrigger className="w-full sm:w-[200px]">
                  <SelectValue placeholder="Todas as Plantas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {plants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Todos os Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Operando">Operando</SelectItem>
                  <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                  <SelectItem value="Indisponível">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="overflow-auto max-h-[400px] rounded-md border border-slate-100">
              <Table>
                <TableHeader className="bg-slate-50/80 sticky top-0">
                  <TableRow>
                    <TableHead className="font-semibold">Ativo</TableHead>
                    <TableHead className="font-semibold">Descrição</TableHead>
                    <TableHead className="font-semibold">Planta</TableHead>
                    <TableHead className="font-semibold">Uso</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <Loader2 className="w-6 h-6 animate-spin text-brand-vividBlue mx-auto" />
                      </TableCell>
                    </TableRow>
                  ) : filteredTools.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                        Nenhuma ferramenta encontrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredTools.map((tool) => (
                      <TableRow key={tool.id} className="hover:bg-slate-50/50">
                        <TableCell className="font-medium text-slate-700">
                          {tool.asset_number || '-'}
                        </TableCell>
                        <TableCell className="text-slate-700">{tool.description}</TableCell>
                        <TableCell className="text-slate-600">{tool.plant?.name || '-'}</TableCell>
                        <TableCell className="text-slate-600 max-w-[200px] truncate">
                          {tool.usage_instructions}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={tool.status}
                            onValueChange={(v) => handleStatusChange(tool, v as ToolStatus)}
                          >
                            <SelectTrigger className="h-8 w-[150px]">
                              <Badge
                                variant="outline"
                                className={`text-xs border ${STATUS_COLORS[tool.status] || ''}`}
                              >
                                {tool.status}
                              </Badge>
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Operando">Operando</SelectItem>
                              <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                              <SelectItem value="Indisponível">Indisponível</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(tool)}>
                            <Edit2 className="w-4 h-4 text-blue-600" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Ferramenta' : 'Adicionar Ferramenta'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 py-4">
            <div className="space-y-2">
              <Label>Planta *</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a planta" />
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
              <Label>Número de Ativo (Opcional)</Label>
              <Input
                value={formData.asset_number}
                onChange={(e) => setFormData({ ...formData, asset_number: e.target.value })}
                placeholder="Ex: ATF-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Descrição *</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Descrição da ferramenta"
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Uso / Finalidade *</Label>
              <Textarea
                value={formData.usage_instructions}
                onChange={(e) => setFormData({ ...formData, usage_instructions: e.target.value })}
                placeholder="Instruções de uso ou finalidade"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label>Status Inicial *</Label>
              <Select
                value={formData.status}
                onValueChange={(v) => setFormData({ ...formData, status: v as ToolStatus })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Operando">Operando</SelectItem>
                  <SelectItem value="Em Manutenção">Em Manutenção</SelectItem>
                  <SelectItem value="Indisponível">Indisponível</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Salvando...
                </>
              ) : (
                'Salvar'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
