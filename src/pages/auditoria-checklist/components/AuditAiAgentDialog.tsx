import { useState, useEffect } from 'react'
import {
  Sparkles,
  Bot,
  Loader2,
  Printer,
  Save,
  CheckCircle2,
  Circle,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Minus,
  Building2,
  ShieldAlert,
  ClipboardList,
  ChevronDown,
  ChevronUp,
  Check,
  ChevronsUpDown,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { auditAiService } from '@/services/audit-ai-agent'
import { generateAuditAiReportPdf } from '@/pages/auditoria-checklist/utils/audit-ai-pdf-export'
import { AuditAiReportData, NonConformityRankItem, PriorityLevel } from '@/types/audit-ai'
import { cn } from '@/lib/utils'

interface AuditAiAgentDialogProps {
  availableTypes?: string[]
  availableTitles?: string[]
  selectedType?: string
  dateRange?: { from: Date; to?: Date }
  selectedPlantProp?: string
  onTypeChange?: (type: string) => void
}

export function AuditAiAgentDialog({
  availableTypes: propAvailableTypes,
  availableTitles: propAvailableTitles,
  selectedType: initialType,
  dateRange,
  selectedPlantProp,
  onTypeChange,
}: AuditAiAgentDialogProps) {
  const { toast } = useToast()
  const { activeClient, selectedPlant: globalSelectedPlant, profile } = useAppStore()
  const { plants: masterPlants } = useMasterData()

  const [open, setOpen] = useState(false)

  // 1. Tipo de Auditoria
  const [typesList, setTypesList] = useState<string[]>([])
  const [targetType, setTargetType] = useState<string>(
    initialType && initialType !== 'all' ? initialType : 'all',
  )
  const [typePopoverOpen, setTypePopoverOpen] = useState(false)
  const [typeSearchTerm, setTypeSearchTerm] = useState('')

  // 2. Título do Modelo de Auditoria
  const [titlesList, setTitlesList] = useState<string[]>([])
  const [targetTitle, setTargetTitle] = useState<string>('all')
  const [titlePopoverOpen, setTitlePopoverOpen] = useState(false)
  const [titleSearchTerm, setTitleSearchTerm] = useState('')

  // 3. Planta selecionada
  const [targetPlantId, setTargetPlantId] = useState<string>('all')
  const [plantPopoverOpen, setPlantPopoverOpen] = useState(false)
  const [plantSearchTerm, setPlantSearchTerm] = useState('')
  const [clientPlants, setClientPlants] = useState<{ id: string; name: string; code?: string }[]>(
    [],
  )

  const [analyzing, setAnalyzing] = useState(false)
  const [currentStep, setCurrentStep] = useState<string>('')
  const [progressValue, setProgressValue] = useState<number>(0)
  const [report, setReport] = useState<AuditAiReportData | null>(null)
  const [activeTab, setActiveTab] = useState<'laudo' | 'ranking' | 'plano' | 'insights'>('laudo')
  const [savedReportId, setSavedReportId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({})

  // Sincronizar Tipo inicial se vier de fora
  useEffect(() => {
    if (initialType && initialType !== 'all') {
      setTargetType(initialType)
    }
  }, [initialType])

  // Inicializar planta ao abrir ou quando planta global mudar
  useEffect(() => {
    const effectivePlant = selectedPlantProp || globalSelectedPlant
    if (effectivePlant && effectivePlant !== 'all') {
      setTargetPlantId(effectivePlant)
    }
  }, [globalSelectedPlant, selectedPlantProp, open])

  // Carregar lista de Plantas do cliente ativo com isolamento multi-tenant
  useEffect(() => {
    let isMounted = true
    const loadPlants = async () => {
      if (!activeClient?.id) {
        setClientPlants([])
        return
      }

      if (masterPlants && masterPlants.length > 0) {
        const filtered = masterPlants.filter(
          (p: any) => !p.client_id || p.client_id === activeClient.id,
        )
        if (filtered.length > 0) {
          setClientPlants(filtered)
          return
        }
      }

      try {
        const { data, error } = await supabase
          .from('plants')
          .select('id, name, code')
          .eq('client_id', activeClient.id)
          .order('name')

        if (!error && data && isMounted) {
          setClientPlants(data)
        }
      } catch (err) {
        console.error('Erro ao buscar plantas do cliente para o Agente de IA:', err)
      }
    }

    loadPlants()
    return () => {
      isMounted = false
    }
  }, [activeClient?.id, masterPlants])

  // Carregar lista de Tipos e Títulos disponíveis para o cliente ativo
  useEffect(() => {
    let isMounted = true

    const loadAuditsMetadata = async () => {
      if (!activeClient?.id) {
        setTypesList([])
        setTitlesList([])
        return
      }

      // Se já foram passados por props com valores populados, começamos com eles
      const initialTypesSet = new Set<string>(propAvailableTypes || [])
      const initialTitlesSet = new Set<string>(propAvailableTitles || [])

      try {
        // Buscar modelos de auditoria cadastrados no cliente
        const { data, error } = await supabase
          .from('audits')
          .select('id, title, type')
          .eq('client_id', activeClient.id)
          .order('title')

        if (!error && data) {
          for (const item of data) {
            if (item.type && item.type.trim()) {
              initialTypesSet.add(item.type.trim())
            }
            if (item.title && item.title.trim()) {
              initialTitlesSet.add(item.title.trim())
            }
          }
        }
      } catch (err) {
        console.error('Erro ao carregar tipos e títulos de auditoria:', err)
      }

      if (isMounted) {
        setTypesList(Array.from(initialTypesSet).sort((a, b) => a.localeCompare(b)))
        setTitlesList(Array.from(initialTitlesSet).sort((a, b) => a.localeCompare(b)))
      }
    }

    loadAuditsMetadata()
    return () => {
      isMounted = false
    }
  }, [activeClient?.id, propAvailableTypes, propAvailableTitles])

  // Obter nome da planta selecionada
  const selectedPlantObject =
    targetPlantId && targetPlantId !== 'all'
      ? clientPlants.find((p) => p.id === targetPlantId)
      : null
  const targetPlantName = selectedPlantObject?.name

  // Iniciar varredura inteligente
  const handleStartScan = async () => {
    if (!activeClient?.id) {
      toast({
        title: 'Cliente não selecionado',
        description: 'Selecione um cliente ativo para rodar o Agente de IA.',
        variant: 'destructive',
      })
      return
    }

    try {
      setAnalyzing(true)
      setProgressValue(10)
      setCurrentStep('Iniciando o agente de IA...')

      const effectivePlantId = targetPlantId && targetPlantId !== 'all' ? targetPlantId : undefined

      const result = await auditAiService.runAuditScan({
        clientId: activeClient.id,
        auditType: targetType,
        auditTitle: targetTitle && targetTitle !== 'all' ? targetTitle : undefined,
        plantId: effectivePlantId,
        plantName: targetPlantName,
        dateRange,
        onProgress: (step, pct) => {
          setCurrentStep(step)
          setProgressValue(pct)
        },
      })

      setReport(result)
      setSavedReportId(null)
      toast({
        title: 'Varredura Concluída!',
        description: `${result.totalExecutions} auditorias analisadas. ${result.ranking.length} não conformidades priorizadas.`,
      })
    } catch (err: any) {
      console.error(err)
      toast({
        title: 'Erro na varredura',
        description: err.message || 'Falha ao processar histórico de auditorias.',
        variant: 'destructive',
      })
    } finally {
      setAnalyzing(false)
    }
  }

  // Persistir laudo
  const handleSaveReport = async () => {
    if (!report || isSaving) return
    try {
      setIsSaving(true)
      const id = await auditAiService.saveReport(report, profile?.id)
      setSavedReportId(id)
      setReport({ ...report, id })
      toast({
        title: 'Laudo Salvo com Sucesso!',
        description: 'O laudo e o plano de ação foram arquivados no histórico de análises.',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível gravar o laudo.',
        variant: 'destructive',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Alternar checkbox de conclusão de ação no plano de ação
  const handleToggleAction = async (actionId: string) => {
    if (!report) return

    const updatedPlan = report.actionPlan.map((act) => {
      if (act.id === actionId) {
        const nextState = !act.completed
        return {
          ...act,
          completed: nextState,
          completedAt: nextState ? new Date().toISOString() : undefined,
        }
      }
      return act
    })

    const updatedReport = { ...report, actionPlan: updatedPlan }
    setReport(updatedReport)

    const reportId = savedReportId || report.id
    if (reportId) {
      try {
        await auditAiService.updateActionPlan(reportId, updatedPlan)
      } catch (err) {
        console.error('Falha ao sincronizar ação no banco:', err)
      }
    }
  }

  // Exportar Laudo e Plano para Impressão/PDF
  const handleExportPdf = () => {
    if (!report) return
    try {
      generateAuditAiReportPdf({
        report,
        clientName: activeClient?.name || 'Sistema Aurea',
        logoUrl: activeClient?.logo_url,
        plantName: report.plantName || targetPlantName || 'Todas as Plantas',
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao exportar PDF',
        description: err.message || 'Verifique bloqueador de pop-ups.',
        variant: 'destructive',
      })
    }
  }

  const toggleExpand = (itemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [itemId]: !prev[itemId] }))
  }

  const getPriorityBadge = (p: PriorityLevel) => {
    if (p === 'P1') {
      return (
        <Badge className="bg-red-600 hover:bg-red-700 text-white font-bold px-2 py-0.5 border-transparent">
          P1 • Crítico
        </Badge>
      )
    }
    if (p === 'P2') {
      return (
        <Badge className="bg-amber-500 hover:bg-amber-600 text-white font-bold px-2 py-0.5 border-transparent">
          P2 • Atenção
        </Badge>
      )
    }
    return (
      <Badge className="bg-yellow-500 hover:bg-yellow-600 text-white font-medium px-2 py-0.5 border-transparent">
        P3 • Moderado
      </Badge>
    )
  }

  const getTrendBadge = (item: NonConformityRankItem) => {
    if (item.trend === 'up') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
          <TrendingUp className="w-3.5 h-3.5" /> Alta recente
        </span>
      )
    }
    if (item.trend === 'down') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
          <TrendingDown className="w-3.5 h-3.5" /> Em queda
        </span>
      )
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-full">
        <Minus className="w-3.5 h-3.5" /> Estável
      </span>
    )
  }

  const completedActionsCount = report?.actionPlan.filter((a) => a.completed).length || 0

  // Filtros controlados para busca em tempo real
  const filteredTypes = typesList.filter((t) =>
    t.toLowerCase().includes(typeSearchTerm.trim().toLowerCase()),
  )
  const filteredTitles = titlesList.filter((t) =>
    t.toLowerCase().includes(titleSearchTerm.trim().toLowerCase()),
  )
  const filteredPlants = clientPlants.filter((p) => {
    const term = plantSearchTerm.trim().toLowerCase()
    return p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term))
  })

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="default"
          className="gap-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-700 hover:to-indigo-700 text-white shadow-md border-0"
        >
          <Sparkles className="w-4 h-4 text-amber-200 animate-pulse" />
          <span className="font-semibold">Agente de IA — Analisar Não Conformidades</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-5xl max-h-[92vh] flex flex-col p-0 overflow-hidden bg-white dark:bg-slate-950">
        {/* Cabeçalho do Modal */}
        <div className="p-6 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-indigo-900/40">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center shrink-0">
                <Bot className="w-7 h-7 text-indigo-300" />
              </div>
              <div>
                <DialogTitle className="text-xl font-bold flex items-center gap-2 text-white">
                  Agente de Inteligência de Auditoria
                  <Badge
                    variant="secondary"
                    className="bg-indigo-500/30 text-indigo-200 border-indigo-400/30 text-[10px]"
                  >
                    Motor Determinístico
                  </Badge>
                </DialogTitle>
                <p className="text-xs text-indigo-200/80 mt-0.5">
                  Varredura inteligente de execuções concluídas, ranking de não conformidades e
                  geração de plano de ação.
                </p>
              </div>
            </div>

            {/* Ações superiores */}
            <div className="flex items-center gap-2 self-end sm:self-center">
              {report && (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportPdf}
                    className="bg-white/10 hover:bg-white/20 text-white border-white/20 gap-1.5 text-xs h-8"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Exportar PDF / Laudo
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleSaveReport}
                    disabled={isSaving || !!savedReportId}
                    className="bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-100 border-indigo-400/30 gap-1.5 text-xs h-8"
                  >
                    {isSaving ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : savedReportId ? (
                      <Check className="w-3.5 h-3.5 text-green-300" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    {savedReportId ? 'Laudo Salvo' : 'Salvar Laudo'}
                  </Button>
                </>
              )}
            </div>
          </div>

          {/* Barra de Filtros e Acionador da Varredura */}
          <div className="mt-5 pt-4 border-t border-white/10 flex flex-wrap items-center gap-3">
            {/* Campo 1: Tipo de Auditoria (Combobox com busca digitável) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-200 whitespace-nowrap">Tipo:</span>
              <Popover open={typePopoverOpen} onOpenChange={setTypePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={typePopoverOpen}
                    className="w-44 h-8 justify-between bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-normal"
                  >
                    <span className="truncate">
                      {targetType === 'all'
                        ? 'Todos os Tipos'
                        : typesList.find((t) => t.toLowerCase() === targetType.toLowerCase()) ||
                          targetType}
                    </span>
                    <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 z-[60]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Digitar para buscar tipo..."
                      value={typeSearchTerm}
                      onValueChange={setTypeSearchTerm}
                      className="h-9 text-xs"
                    />
                    <CommandList>
                      {filteredTypes.length === 0 && typeSearchTerm.trim() !== '' ? (
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                          Nenhum tipo de auditoria encontrado.
                        </CommandEmpty>
                      ) : null}
                      <CommandGroup>
                        <CommandItem
                          value="all Todos os Tipos"
                          onSelect={() => {
                            setTargetType('all')
                            onTypeChange?.('all')
                            setTypePopoverOpen(false)
                            setTypeSearchTerm('')
                          }}
                          className="cursor-pointer text-xs"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3.5 w-3.5',
                              targetType === 'all' ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span>Todos os Tipos</span>
                        </CommandItem>
                        {filteredTypes.map((t) => {
                          const isSelected = targetType.toLowerCase() === t.toLowerCase()
                          return (
                            <CommandItem
                              key={t}
                              value={t}
                              onSelect={() => {
                                setTargetType(t)
                                onTypeChange?.(t)
                                setTypePopoverOpen(false)
                                setTypeSearchTerm('')
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-3.5 w-3.5',
                                  isSelected ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="truncate">{t}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Campo 2: Título da Auditoria (Combobox com busca digitável e lista suspensa) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-200 whitespace-nowrap">Título:</span>
              <Popover open={titlePopoverOpen} onOpenChange={setTitlePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={titlePopoverOpen}
                    className="w-56 h-8 justify-between bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-normal"
                  >
                    <span className="truncate">
                      {targetTitle === 'all'
                        ? 'Todos os Títulos'
                        : titlesList.find((t) => t.toLowerCase() === targetTitle.toLowerCase()) ||
                          targetTitle}
                    </span>
                    <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-80 p-0 z-[60]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Digitar título da auditoria..."
                      value={titleSearchTerm}
                      onValueChange={setTitleSearchTerm}
                      className="h-9 text-xs"
                    />
                    <CommandList>
                      {filteredTitles.length === 0 && titleSearchTerm.trim() !== '' ? (
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                          Nenhum título encontrado.
                        </CommandEmpty>
                      ) : null}
                      <CommandGroup>
                        <CommandItem
                          value="all Todos os Títulos"
                          onSelect={() => {
                            setTargetTitle('all')
                            setTitlePopoverOpen(false)
                            setTitleSearchTerm('')
                          }}
                          className="cursor-pointer text-xs"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3.5 w-3.5',
                              targetTitle === 'all' ? 'opacity-100' : 'opacity-0',
                            )}
                          />
                          <span>Todos os Títulos</span>
                        </CommandItem>
                        {filteredTitles.map((t) => {
                          const isSelected = targetTitle.toLowerCase() === t.toLowerCase()
                          return (
                            <CommandItem
                              key={t}
                              value={t}
                              onSelect={() => {
                                setTargetTitle(t)
                                setTitlePopoverOpen(false)
                                setTitleSearchTerm('')
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-3.5 w-3.5',
                                  isSelected ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="truncate" title={t}>
                                {t}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            {/* Campo 3: Planta com busca digitável (Combobox) */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-indigo-200 whitespace-nowrap">Planta:</span>
              <Popover open={plantPopoverOpen} onOpenChange={setPlantPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={plantPopoverOpen}
                    className="w-48 h-8 justify-between bg-white/10 hover:bg-white/20 border-white/20 text-white text-xs font-normal"
                  >
                    <span className="truncate">
                      {targetPlantId === 'all' || !targetPlantId
                        ? 'Todas as Plantas'
                        : clientPlants.find((p) => p.id === targetPlantId)?.name ||
                          'Todas as Plantas'}
                    </span>
                    <ChevronsUpDown className="ml-1.5 h-3.5 w-3.5 shrink-0 opacity-70" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-64 p-0 z-[60]" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Digitar para buscar planta..."
                      value={plantSearchTerm}
                      onValueChange={setPlantSearchTerm}
                      className="h-9 text-xs"
                    />
                    <CommandList>
                      {filteredPlants.length === 0 && plantSearchTerm.trim() !== '' ? (
                        <CommandEmpty className="py-4 text-center text-xs text-muted-foreground">
                          Nenhuma planta encontrada.
                        </CommandEmpty>
                      ) : null}
                      <CommandGroup>
                        <CommandItem
                          value="all Todas as Plantas"
                          onSelect={() => {
                            setTargetPlantId('all')
                            setPlantPopoverOpen(false)
                            setPlantSearchTerm('')
                          }}
                          className="cursor-pointer text-xs"
                        >
                          <Check
                            className={cn(
                              'mr-2 h-3.5 w-3.5',
                              targetPlantId === 'all' || !targetPlantId
                                ? 'opacity-100'
                                : 'opacity-0',
                            )}
                          />
                          <span>Todas as Plantas</span>
                        </CommandItem>
                        {filteredPlants.map((plant) => {
                          const isSelected = targetPlantId === plant.id
                          return (
                            <CommandItem
                              key={plant.id}
                              value={`${plant.code ? plant.code + ' ' : ''}${plant.name}`}
                              onSelect={() => {
                                setTargetPlantId(plant.id)
                                setPlantPopoverOpen(false)
                                setPlantSearchTerm('')
                              }}
                              className="cursor-pointer text-xs"
                            >
                              <Check
                                className={cn(
                                  'mr-2 h-3.5 w-3.5',
                                  isSelected ? 'opacity-100' : 'opacity-0',
                                )}
                              />
                              <span className="truncate">
                                {plant.code ? (
                                  <span className="font-semibold text-muted-foreground mr-1.5">
                                    [{plant.code}]
                                  </span>
                                ) : null}
                                {plant.name}
                              </span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <Button
              size="sm"
              onClick={handleStartScan}
              disabled={analyzing}
              className="ml-auto bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold gap-1.5 h-8 shadow"
            >
              {analyzing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  {report ? 'Atualizar Análise' : 'Iniciar Varredura'}
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Corpo do Modal */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Estado de Varredura / Progresso do Agente */}
          {analyzing && (
            <div className="py-12 px-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-center space-y-4">
              <div className="inline-flex p-3 rounded-full bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 border border-indigo-100 dark:border-indigo-900">
                <Loader2 className="w-8 h-8 animate-spin" />
              </div>
              <div className="max-w-md mx-auto space-y-2">
                <h4 className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  Agente analisando histórico de auditorias
                </h4>
                <p className="text-xs text-slate-500">{currentStep}</p>
                <Progress value={progressValue} className="h-2 w-full mt-3" />
              </div>
              <div className="flex justify-center gap-6 text-[11px] text-slate-400 pt-2">
                <span className={cn(progressValue >= 20 ? 'text-indigo-600 font-semibold' : '')}>
                  1. Varredura
                </span>
                <span className={cn(progressValue >= 50 ? 'text-indigo-600 font-semibold' : '')}>
                  2. Cruzamento
                </span>
                <span className={cn(progressValue >= 75 ? 'text-indigo-600 font-semibold' : '')}>
                  3. Padrões
                </span>
                <span className={cn(progressValue >= 95 ? 'text-indigo-600 font-semibold' : '')}>
                  4. Laudo e Ações
                </span>
              </div>
            </div>
          )}

          {/* Estado Inicial sem relatório */}
          {!analyzing && !report && (
            <div className="text-center py-16 space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-600 flex items-center justify-center mx-auto">
                <Sparkles className="w-7 h-7" />
              </div>
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">
                Nenhuma análise ativa
              </h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                Selecione o <strong>tipo</strong> e/ou <strong>título</strong> da auditoria acima e
                clique em <strong>"Iniciar Varredura"</strong> para o agente analisar todas as
                execuções, priorizar as não conformidades e montar o plano de ação de cobrança.
              </p>
              <Button
                onClick={handleStartScan}
                className="mt-2 bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                Iniciar Varredura Agora
              </Button>
            </div>
          )}

          {/* Exibição do Laudo e Conteúdo Estruturado */}
          {!analyzing && report && (
            <div className="space-y-6">
              {/* KPIs de Alto Nível */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Execuções Varridas
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {report.totalExecutions}
                      </span>
                      <ClipboardList className="w-5 h-5 text-indigo-500/70" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      {report.periodLabel}
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm bg-sky-50/40 dark:bg-sky-950/20">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <span className="text-[11px] font-bold text-sky-700 dark:text-sky-300 uppercase tracking-wider">
                      Score de Conformidade
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-sky-700 dark:text-sky-300">
                        {report.overallConformityScore}%
                      </span>
                      {report.scoreDelta !== undefined && (
                        <span
                          className={cn(
                            'text-xs font-bold px-1.5 py-0.5 rounded',
                            report.scoreDelta >= 0
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700',
                          )}
                        >
                          {report.scoreDelta >= 0 ? '+' : ''}
                          {report.scoreDelta}%
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-sky-600 dark:text-sky-400 mt-1">
                      aderência geral dos itens
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Não Conformidades
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-red-600">
                        {report.totalNonConformities}
                      </span>
                      <ShieldAlert className="w-5 h-5 text-red-500/70" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">
                      apontamentos registrados
                    </span>
                  </CardContent>
                </Card>

                <Card className="border-slate-200 shadow-sm">
                  <CardContent className="p-4 flex flex-col justify-between h-full">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Ações no Plano
                    </span>
                    <div className="mt-2 flex items-baseline justify-between">
                      <span className="text-2xl font-black text-slate-800 dark:text-slate-100">
                        {completedActionsCount} / {report.actionPlan.length}
                      </span>
                      <CheckCircle2 className="w-5 h-5 text-emerald-500/70" />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1">ações concluídas</span>
                  </CardContent>
                </Card>
              </div>

              {/* Navegação por Abas do Laudo */}
              <Tabs
                value={activeTab}
                onValueChange={(v) => setActiveTab(v as any)}
                className="w-full"
              >
                <TabsList className="grid grid-cols-4 w-full bg-slate-100 dark:bg-slate-900 p-1">
                  <TabsTrigger value="laudo" className="text-xs font-semibold">
                    Laudo Consolidado
                  </TabsTrigger>
                  <TabsTrigger value="ranking" className="text-xs font-semibold">
                    Ranking de Não Conformidades ({report.ranking.length})
                  </TabsTrigger>
                  <TabsTrigger value="plano" className="text-xs font-semibold">
                    Plano de Ação Priorizado ({report.actionPlan.length})
                  </TabsTrigger>
                  <TabsTrigger value="insights" className="text-xs font-semibold">
                    Insights e Padrões ({report.insights.length})
                  </TabsTrigger>
                </TabsList>

                {/* ABA 1: LAUDO CONSOLIDADO */}
                <TabsContent value="laudo" className="space-y-6 mt-4">
                  <Card className="border-slate-200">
                    <CardHeader className="py-4 border-b bg-slate-50/50">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                        <CardTitle className="text-base text-slate-800 flex items-center gap-2">
                          <span>Resumo Executivo do Laudo Técnico</span>
                        </CardTitle>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="text-xs font-normal">
                            Tipo: {report.auditType}
                          </Badge>
                          {report.auditTitle && (
                            <Badge
                              variant="outline"
                              className="text-xs font-medium max-w-xs truncate"
                              title={report.auditTitle}
                            >
                              Título: {report.auditTitle}
                            </Badge>
                          )}
                          {report.plantName ? (
                            <Badge className="bg-sky-100 text-sky-800 border-sky-300 hover:bg-sky-200 text-xs font-medium">
                              <Building2 className="w-3 h-3 mr-1" />
                              Planta: {report.plantName}
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="text-xs font-normal">
                              Todas as Plantas
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
                      <p>
                        Este laudo consolida a análise determinística de{' '}
                        <strong>{report.totalExecutions} execuções de auditorias</strong> do tipo{' '}
                        <strong>"{report.auditType}"</strong>
                        {report.auditTitle ? (
                          <>
                            {' '}
                            com o título <strong>"{report.auditTitle}"</strong>
                          </>
                        ) : null}
                        {report.plantName ? (
                          <>
                            {' '}
                            filtradas especificamente para a planta{' '}
                            <strong>"{report.plantName}"</strong>
                          </>
                        ) : (
                          ' considerando todas as plantas'
                        )}{' '}
                        realizadas no período de <strong>{report.periodLabel}</strong>. No total,
                        foram avaliados <strong>{report.totalEvaluations} itens</strong> pelo time
                        de campo, com índice global de conformidade atingindo{' '}
                        <strong>{report.overallConformityScore}%</strong>
                        {report.scoreDelta !== undefined && (
                          <span>
                            {' '}
                            (variação de {report.scoreDelta >= 0 ? '+' : ''}
                            {report.scoreDelta}% em relação ao período comparativo)
                          </span>
                        )}
                        .
                      </p>
                      <p>
                        Foram identificadas{' '}
                        <strong>
                          {report.totalNonConformities} ocorrências de não conformidades
                        </strong>
                        , distribuídas em{' '}
                        <strong>{report.ranking.length} itens ofensores recorrentes</strong>. O
                        plano de ação corretivo foi estruturado com prioridades P1, P2 e P3 para
                        permitir a cobrança imediata dos encarregados operacionais e unidades.
                      </p>
                    </CardContent>
                  </Card>

                  {/* Resumo dos Maiores Ofensores */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-red-500" />
                        Top Não Conformidades que Demandam Ação Imediata (P1)
                      </h4>
                      <Button
                        variant="link"
                        size="sm"
                        className="text-xs text-indigo-600 h-auto p-0"
                        onClick={() => setActiveTab('ranking')}
                      >
                        Ver ranking completo →
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {report.ranking.slice(0, 3).map((item, idx) => (
                        <div
                          key={item.id}
                          className="p-3 rounded-lg border border-red-200 bg-red-50/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div className="space-y-1 max-w-2xl">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-red-700">#{idx + 1}</span>
                              {getPriorityBadge(item.severity)}
                              <span className="font-semibold text-slate-900">{item.title}</span>
                            </div>
                            <p className="text-slate-600 text-[11px]">
                              <strong>Ação recomendada:</strong> {item.suggestedAction}
                            </p>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-sm font-extrabold text-red-600">
                              {item.occurrenceRate}%
                            </span>
                            <div className="text-[10px] text-slate-500">
                              {item.occurrences} ocorrências
                            </div>
                          </div>
                        </div>
                      ))}
                      {report.ranking.length === 0 && (
                        <div className="p-4 text-center text-muted-foreground text-xs border rounded-lg">
                          Nenhuma não conformidade detectada neste conjunto de auditorias.
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Distribuição por Planta */}
                  {report.plantBreakdown.length > 0 && (
                    <Card className="border-slate-200">
                      <CardHeader className="py-3 border-b bg-slate-50/50">
                        <CardTitle className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-500" />
                          Desempenho e Não Conformidades por Planta
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          {report.plantBreakdown.map((p) => (
                            <div
                              key={p.plantName}
                              className="p-3 rounded-lg border border-slate-200 bg-slate-50/60 space-y-1.5"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-800">
                                  {p.plantName}
                                </span>
                                <Badge
                                  variant="secondary"
                                  className={cn(
                                    'text-[10px]',
                                    p.conformityRate >= 85
                                      ? 'bg-green-100 text-green-700'
                                      : p.conformityRate >= 70
                                        ? 'bg-yellow-100 text-yellow-700'
                                        : 'bg-red-100 text-red-700',
                                  )}
                                >
                                  {p.conformityRate}% conf.
                                </Badge>
                              </div>
                              <div className="flex justify-between text-[11px] text-slate-500">
                                <span>{p.executionsCount} auditorias</span>
                                <span className="font-semibold text-red-600">
                                  {p.nonConformitiesCount} NCs
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>

                {/* ABA 2: RANKING DE NÃO CONFORMIDADES */}
                <TabsContent value="ranking" className="space-y-4 mt-4">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-500">
                      Itens com reprovação classificados por criticidade, frequência de ocorrência e
                      tendência temporal.
                    </p>
                    <span className="text-xs font-semibold text-slate-700">
                      {report.ranking.length} itens encontrados
                    </span>
                  </div>

                  <div className="space-y-3">
                    {report.ranking.map((item, idx) => {
                      const isExpanded = !!expandedItems[item.id]
                      return (
                        <div
                          key={item.id}
                          className="border border-slate-200 rounded-lg bg-white overflow-hidden shadow-sm transition-all"
                        >
                          <div
                            onClick={() => toggleExpand(item.id)}
                            className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer hover:bg-slate-50/80 transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <span className="w-6 h-6 rounded-md bg-slate-100 text-slate-700 font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                #{idx + 1}
                              </span>
                              <div className="space-y-1">
                                <div className="flex flex-wrap items-center gap-2">
                                  {getPriorityBadge(item.severity)}
                                  <Badge variant="outline" className="text-[10px]">
                                    {item.category}
                                  </Badge>
                                  {getTrendBadge(item)}
                                </div>
                                <h4 className="text-xs sm:text-sm font-semibold text-slate-900">
                                  {item.title}
                                </h4>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                              <div className="text-right">
                                <span className="text-base font-extrabold text-red-600">
                                  {item.occurrenceRate}%
                                </span>
                                <div className="text-[10px] text-slate-500">
                                  {item.occurrences} de {report.totalExecutions} varreduras
                                </div>
                              </div>
                              <Button variant="ghost" size="icon" className="h-7 w-7">
                                {isExpanded ? (
                                  <ChevronUp className="w-4 h-4 text-slate-400" />
                                ) : (
                                  <ChevronDown className="w-4 h-4 text-slate-400" />
                                )}
                              </Button>
                            </div>
                          </div>

                          {/* Detalhes expandidos */}
                          {isExpanded && (
                            <div className="px-4 pb-4 pt-2 border-t border-slate-100 bg-slate-50/50 space-y-3 text-xs">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="p-2.5 rounded bg-white border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    Nota Média do Item
                                  </span>
                                  <span className="text-sm font-bold text-slate-800">
                                    {item.averageScore.toFixed(2)} / 5.0
                                  </span>
                                </div>
                                <div className="p-2.5 rounded bg-white border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    Tendência Histórica
                                  </span>
                                  <span className="text-xs text-slate-700 font-medium">
                                    {item.trendLabel}
                                  </span>
                                </div>
                                <div className="p-2.5 rounded bg-white border border-slate-200">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase block">
                                    Plantas Afetadas
                                  </span>
                                  <span className="text-xs text-slate-700 font-medium">
                                    {item.affectedPlants
                                      .map((p) => `${p.plantName} (${p.count})`)
                                      .join(', ') || 'Todas'}
                                  </span>
                                </div>
                              </div>

                              {/* Ação Sugerida */}
                              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-900">
                                <span className="font-bold block mb-1">
                                  Ação Corretiva Sugerida pelo Agente:
                                </span>
                                <p className="text-xs leading-relaxed">{item.suggestedAction}</p>
                              </div>

                              {/* Evidências Reais coletadas em campo */}
                              {item.evidences.length > 0 && (
                                <div className="space-y-1.5 pt-1">
                                  <span className="font-semibold text-slate-700 block text-[11px]">
                                    Evidências e Observações dos Auditores ({item.evidences.length}
                                    ):
                                  </span>
                                  <div className="space-y-1.5">
                                    {item.evidences.map((ev, i) => (
                                      <div
                                        key={i}
                                        className="p-2 rounded bg-white border border-slate-200 text-[11px] space-y-1"
                                      >
                                        <div className="flex items-center justify-between text-slate-500 text-[10px]">
                                          <span>
                                            Planta: <strong>{ev.plantName}</strong>
                                          </span>
                                          <span>
                                            Data: {ev.date?.slice(0, 10) || '-'} | Nota:{' '}
                                            <strong className="text-red-600">{ev.score}</strong>
                                          </span>
                                        </div>
                                        {ev.observations && (
                                          <p className="text-slate-800 italic">
                                            "{ev.observations}"
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </TabsContent>

                {/* ABA 3: PLANO DE AÇÃO PRIORIZADO */}
                <TabsContent value="plano" className="space-y-4 mt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Plano de Ação Corretiva e Preventiva
                      </h4>
                      <p className="text-xs text-slate-500">
                        Marque as ações concluídas conforme o alinhamento com a equipe em campo.
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-slate-600">
                        Concluídas: {completedActionsCount} de {report.actionPlan.length}
                      </span>
                      <Progress
                        value={
                          report.actionPlan.length > 0
                            ? (completedActionsCount / report.actionPlan.length) * 100
                            : 0
                        }
                        className="w-24 h-2"
                      />
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {report.actionPlan.map((act) => (
                      <div
                        key={act.id}
                        className={cn(
                          'p-4 rounded-lg border transition-all flex items-start gap-3 text-xs',
                          act.completed
                            ? 'bg-emerald-50/40 border-emerald-200 opacity-75'
                            : 'bg-white border-slate-200 hover:border-slate-300 shadow-sm',
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => handleToggleAction(act.id)}
                          className="mt-0.5 shrink-0 focus:outline-none"
                        >
                          {act.completed ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-slate-500" />
                          )}
                        </button>

                        <div className="flex-1 space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {getPriorityBadge(act.priority)}
                            <Badge variant="outline" className="text-[10px]">
                              {act.category}
                            </Badge>
                            <span className="text-[11px] font-semibold text-slate-700">
                              Planta: {act.targetPlant}
                            </span>
                            <span className="text-[11px] text-slate-500">
                              • Prazo sugerido: <strong>{act.suggestedDeadlineDays} dias</strong>
                            </span>
                          </div>

                          <h5
                            className={cn(
                              'font-bold text-slate-900',
                              act.completed && 'line-through text-slate-500',
                            )}
                          >
                            {act.actionTitle}
                          </h5>

                          <p className="text-slate-700 leading-relaxed">{act.suggestedAction}</p>

                          <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                            <span>
                              Responsável sugerido: <strong>{act.recommendedRole}</strong>
                            </span>
                            {act.notes && (
                              <span className="italic text-slate-500">({act.notes})</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    {report.actionPlan.length === 0 && (
                      <div className="p-6 text-center text-muted-foreground text-xs border rounded-lg">
                        Nenhuma ação pendente gerada.
                      </div>
                    )}
                  </div>
                </TabsContent>

                {/* ABA 4: INSIGHTS E PADRÕES */}
                <TabsContent value="insights" className="space-y-4 mt-4">
                  <p className="text-xs text-slate-500">
                    Padrões sistêmicos, plantas com maior concentração de apontamentos e cruzamentos
                    temporais.
                  </p>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {report.insights.map((ins) => (
                      <Card
                        key={ins.id}
                        className={cn(
                          'border-l-4 shadow-sm',
                          ins.severity === 'high'
                            ? 'border-l-red-500 bg-red-50/20'
                            : ins.severity === 'medium'
                              ? 'border-l-amber-500 bg-amber-50/20'
                              : 'border-l-sky-500 bg-sky-50/20',
                        )}
                      >
                        <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between">
                          <CardTitle className="text-xs font-bold text-slate-900">
                            {ins.title}
                          </CardTitle>
                          <Badge variant="secondary" className="text-[10px]">
                            {ins.badgeText}
                          </Badge>
                        </CardHeader>
                        <CardContent className="p-4 pt-1 text-xs text-slate-600 leading-relaxed">
                          {ins.description}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Motor de Análise Determinístico (Sem dependência de IA Externa)</span>
          </div>
          <div className="flex items-center gap-2">
            {report && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExportPdf}
                className="gap-1.5 text-xs h-8"
              >
                <Printer className="w-3.5 h-3.5" />
                Imprimir Laudo
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-xs h-8 bg-slate-800 hover:bg-slate-900 text-white"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
