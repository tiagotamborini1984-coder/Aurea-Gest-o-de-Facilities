import { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import {
  Wrench,
  Plus,
  Pencil,
  Trash2,
  Loader2,
  Search,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Building2,
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
  const [deleteTarget, setDeleteTarget] = useState<PlantTool | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
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

  const plantFilteredTools = useMemo(() => {
    if (filterPlant === 'all') return tools
    return tools.filter((t) => t.plant_id === filterPlant)
  }, [tools, filterPlant])

  const filteredTools = useMemo(() => {
    return plantFilteredTools.filter((t) => {
      const matchStatus = filterStatus === 'all' || t.status === filterStatus
      const matchSearch =
        !search.trim() ||
        (t.asset_number || '').toLowerCase().includes(search.toLowerCase()) ||
        t.description.toLowerCase().includes(search.toLowerCase())
      return matchStatus && matchSearch
    })
  }, [plantFilteredTools, filterStatus, search])

  const totalTools = plantFilteredTools.length
  const operatingCount = plantFilteredTools.filter((t) => t.status === 'Operando').length
  const maintenanceCount = plantFilteredTools.filter((t) => t.status === 'Em Manutenção').length

  const chartData = useMemo(() => {
    const counts: Record<string, number> = {}
    plantFilteredTools.forEach((t) => {
      counts[t.status] = (counts[t.status] || 0) + 1
    })
    return Object.entries(counts).map(([name, value]) => ({ name, value }))
  }, [plantFilteredTools])

  const openAdd = () => {
    setEditingId(null)
    setFormData({
      plant_id: filterPlant !== 'all' ? filterPlant : plants.length === 1 ? plants[0].id : '',
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

  const handleDelete = async () => {
    if (!deleteTarget) return
    setIsDeleting(true)
    try {
      const { error } = await supabase.from('plant_tools').delete().eq('id', deleteTarget.id)
      if (error) throw error
      toast.success('Ferramenta excluída com sucesso')
      setDeleteTarget(null)
      fetchTools()
    } catch (err: any) {
      if (
        err?.code === '23503' ||
        err?.message?.toLowerCase().includes('foreign key') ||
        err?.message?.toLowerCase().includes('violates foreign key')
      ) {
        toast.error('Não é possível excluir esta ferramenta pois ela possui vínculos no sistema.')
      } else {
        toast.error(err?.message || 'Erro ao excluir ferramenta')
      }
    } finally {
      setIsDeleting(false)
    }
  }

  const selectedPlantLabel = useMemo(() => {
    if (filterPlant === 'all') return 'Todas as Plantas'
    return plants.find((p) => p.id === filterPlant)?.name || 'Todas as Plantas'
  }, [filterPlant, plants])

  // Refs e estado para sincronização de rolagem horizontal superior
  const tableContainerRef = useRef<HTMLDivElement>(null)
  const topScrollRef = useRef<HTMLDivElement>(null)
  const [scrollWidth, setScrollWidth] = useState(0)
  const [isOverflowing, setIsOverflowing] = useState(false)
  const isSyncingScroll = useRef(false)

  // Medir overflow e scrollWidth da tabela sempre que os dados mudarem ou na montagem
  useEffect(() => {
    const checkOverflow = () => {
      const el = tableContainerRef.current
      if (el) {
        const hasOverflow = el.scrollWidth > el.clientWidth + 2
        setIsOverflowing(hasOverflow)
        setScrollWidth(el.scrollWidth)
      }
    }

    checkOverflow()
    const resizeObserver = new ResizeObserver(checkOverflow)
    if (tableContainerRef.current) {
      resizeObserver.observe(tableContainerRef.current)
    }

    window.addEventListener('resize', checkOverflow)
    return () => {
      resizeObserver.disconnect()
      window.removeEventListener('resize', checkOverflow)
    }
  }, [filteredTools, loading])

  // Sincronizar rolagem entre a barra do topo e o contêiner da tabela
  const handleTopScroll = () => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (tableContainerRef.current && topScrollRef.current) {
      tableContainerRef.current.scrollLeft = topScrollRef.current.scrollLeft
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

  const handleTableScroll = () => {
    if (isSyncingScroll.current) return
    isSyncingScroll.current = true
    if (topScrollRef.current && tableContainerRef.current) {
      topScrollRef.current.scrollLeft = tableContainerRef.current.scrollLeft
    }
    requestAnimationFrame(() => {
      isSyncingScroll.current = false
    })
  }

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
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 flex-1 md:flex-none">
            <Building2 className="w-5 h-5 text-slate-400 shrink-0" />
            <Select value={filterPlant} onValueChange={setFilterPlant}>
              <SelectTrigger className="w-full md:w-[260px]">
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
          </div>
          <Button onClick={openAdd} disabled={plants.length === 0}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center gap-4">
            <div className="p-3 bg-blue-100 text-blue-600 rounded-lg">
              <Wrench className="w-6 h-6" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total de Ferramentas</p>
              <h3 className="text-2xl font-bold">
                {loading ? <Loader2 className="w-5 h-5 animate-spin text-slate-400" /> : totalTools}
              </h3>
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
              <h3 className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  operatingCount
                )}
              </h3>
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
              <h3 className="text-2xl font-bold">
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
                ) : (
                  maintenanceCount
                )}
              </h3>
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
            <p className="text-xs text-slate-400">{selectedPlantLabel}</p>
          </CardHeader>
          <CardContent className="h-[280px]">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <Loader2 className="w-6 h-6 animate-spin text-brand-vividBlue" />
              </div>
            ) : chartData.length === 0 ? (
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
            <p className="text-xs text-slate-400">{selectedPlantLabel}</p>
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

            {/* Contêiner da Tabela com Barra de Rolagem Sincronizada e Coluna de Ações Congelada */}
            <div className="relative rounded-md border border-slate-200 dark:border-slate-800 bg-card overflow-hidden">
              {/* Barra de rolagem horizontal superior sincronizada quando a tabela transborda */}
              {isOverflowing && (
                <div
                  ref={topScrollRef}
                  onScroll={handleTopScroll}
                  className="overflow-x-auto border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50"
                  style={{ scrollbarWidth: 'thin' }}
                  title="Barra de rolagem horizontal rápida"
                >
                  <div style={{ width: `${scrollWidth}px`, height: '10px' }} />
                </div>
              )}

              <div
                ref={tableContainerRef}
                onScroll={handleTableScroll}
                className="overflow-auto max-h-[460px]"
                style={{ scrollbarWidth: 'thin' }}
              >
                <Table className="min-w-[760px] w-full">
                  <TableHeader className="bg-slate-50 dark:bg-slate-900 sticky top-0 z-20 shadow-[0_1px_0_0_#e2e8f0] dark:shadow-[0_1px_0_0_#334155]">
                    <TableRow>
                      <TableHead className="font-semibold w-[120px] whitespace-nowrap">
                        Ativo
                      </TableHead>
                      <TableHead className="font-semibold min-w-[200px]">Descrição</TableHead>
                      <TableHead className="font-semibold w-[160px] whitespace-nowrap">
                        Planta
                      </TableHead>
                      <TableHead className="font-semibold min-w-[220px]">Uso</TableHead>
                      <TableHead className="font-semibold w-[170px] whitespace-nowrap">
                        Status
                      </TableHead>
                      <TableHead className="font-semibold text-right w-[110px] min-w-[110px] sticky right-0 bg-slate-50 dark:bg-slate-900 z-30 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)]">
                        Ações
                      </TableHead>
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
                          {filterPlant !== 'all'
                            ? 'Nenhuma ferramenta encontrada para esta planta.'
                            : 'Nenhuma ferramenta encontrada.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTools.map((tool) => (
                        <TableRow
                          key={tool.id}
                          className="group hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors"
                        >
                          <TableCell className="font-medium text-slate-700 dark:text-slate-200 whitespace-nowrap">
                            {tool.asset_number || '-'}
                          </TableCell>
                          <TableCell className="text-slate-700 dark:text-slate-200">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block max-w-[240px] truncate cursor-default">
                                  {tool.description}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs break-words">
                                {tool.description}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300 whitespace-nowrap">
                            {tool.plant?.name || '-'}
                          </TableCell>
                          <TableCell className="text-slate-600 dark:text-slate-300">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span className="block max-w-[260px] truncate cursor-default">
                                  {tool.usage_instructions}
                                </span>
                              </TooltipTrigger>
                              <TooltipContent side="top" className="max-w-xs break-words">
                                {tool.usage_instructions}
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                          <TableCell className="whitespace-nowrap">
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
                          <TableCell className="text-right sticky right-0 bg-white dark:bg-card group-hover:bg-slate-50 dark:group-hover:bg-slate-800/60 z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)] dark:shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.3)] transition-colors">
                            <div className="flex items-center justify-end gap-1">
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => openEdit(tool)}
                                    aria-label="Editar ferramenta"
                                    className="text-slate-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Editar ferramenta</TooltipContent>
                              </Tooltip>

                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => setDeleteTarget(tool)}
                                    aria-label="Excluir ferramenta"
                                    className="text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>Excluir ferramenta</TooltipContent>
                              </Tooltip>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
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

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && !isDeleting && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Ferramenta</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a ferramenta{' '}
              {deleteTarget?.description ? (
                <strong>"{deleteTarget.description}"</strong>
              ) : (
                'selecionada'
              )}
              ? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Excluindo...
                </>
              ) : (
                'Confirmar'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
