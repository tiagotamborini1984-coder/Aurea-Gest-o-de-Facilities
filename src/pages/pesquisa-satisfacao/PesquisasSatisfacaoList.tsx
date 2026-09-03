import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
import { SatisfactionSurvey } from '@/types/satisfaction-surveys'
import { satisfactionSurveyService } from '@/services/satisfaction-surveys'
import { SurveyFormDialog } from './components/SurveyFormDialog'
import { SurveyShareDialog } from './components/SurveyShareDialog'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import {
  Plus,
  Search,
  QrCode,
  Edit,
  Trash2,
  ExternalLink,
  BarChart3,
  MoreHorizontal,
  Clock,
  Layers,
  HelpCircle,
  Tablet,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
} from 'lucide-react'
import { toast } from 'sonner'

export function PesquisasSatisfacaoList() {
  const { activeClient, selectedMasterClient, profile } = useAppStore()
  const [surveys, setSurveys] = useState<SatisfactionSurvey[]>([])
  const [plants, setPlants] = useState<{ id: string; name: string; code?: string }[]>([])
  const [loading, setLoading] = useState(true)

  // Filtros
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('all')
  const [selectedType, setSelectedType] = useState('all')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')

  // Modais
  const [formDialogOpen, setFormDialogOpen] = useState(false)
  const [editingSurvey, setEditingSurvey] = useState<SatisfactionSurvey | null>(null)

  const [shareDialogOpen, setShareDialogOpen] = useState(false)
  const [sharingSurvey, setSharingSurvey] = useState<SatisfactionSurvey | null>(null)

  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [surveyToDelete, setSurveyToDelete] = useState<SatisfactionSurvey | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const currentClientId =
    activeClient?.id ||
    (selectedMasterClient && selectedMasterClient !== 'all' ? selectedMasterClient : undefined)

  // Carregar plantas
  useEffect(() => {
    const fetchPlants = async () => {
      let q = supabase.from('plants').select('id, name, code').order('name')
      if (currentClientId) {
        q = q.eq('client_id', currentClientId)
      }
      const { data } = await q
      if (data) setPlants(data)
    }
    fetchPlants()
  }, [currentClientId])

  // Carregar lista de pesquisas
  const loadSurveys = async () => {
    setLoading(true)
    try {
      const data = await satisfactionSurveyService.getSurveys(currentClientId, selectedPlant)
      setSurveys(data)
    } catch (err: any) {
      console.error('Erro ao carregar pesquisas:', err)
      toast.error('Não foi possível carregar a lista de pesquisas.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSurveys()
  }, [currentClientId, selectedPlant])

  // Toggle de status
  const handleToggleStatus = async (survey: SatisfactionSurvey) => {
    try {
      const newStatus = !survey.is_active
      await satisfactionSurveyService.toggleSurveyStatus(survey.id, newStatus)
      setSurveys((prev) =>
        prev.map((s) => (s.id === survey.id ? { ...s, is_active: newStatus } : s)),
      )
      toast.success(newStatus ? 'Pesquisa ativada com sucesso!' : 'Pesquisa desativada.')
    } catch (err: any) {
      toast.error('Erro ao alternar status da pesquisa.')
    }
  }

  // Deletar pesquisa
  const handleDeleteConfirm = async () => {
    if (!surveyToDelete) return
    setIsDeleting(true)
    try {
      await satisfactionSurveyService.deleteSurvey(surveyToDelete.id)
      setSurveys((prev) => prev.filter((s) => s.id !== surveyToDelete.id))
      toast.success('Pesquisa excluída com sucesso!')
      setDeleteDialogOpen(false)
      setSurveyToDelete(null)
    } catch (err: any) {
      toast.error('Erro ao excluir pesquisa.')
    } finally {
      setIsDeleting(false)
    }
  }

  // Tipos únicos para o filtro
  const surveyTypes = useMemo(() => {
    const types = new Set<string>()
    surveys.forEach((s) => {
      if (s.survey_type) types.add(s.survey_type)
    })
    return Array.from(types)
  }, [surveys])

  // Filtragem local
  const filteredSurveys = useMemo(() => {
    return surveys.filter((s) => {
      const matchesSearch =
        s.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (s.location_name && s.location_name.toLowerCase().includes(searchTerm.toLowerCase()))

      const matchesType = selectedType === 'all' || s.survey_type === selectedType

      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' && s.is_active) ||
        (statusFilter === 'inactive' && !s.is_active)

      return matchesSearch && matchesType && matchesStatus
    })
  }, [surveys, searchTerm, selectedType, statusFilter])

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            <Tablet className="h-6 w-6 text-brand-vividBlue" />
            Pesquisa de Satisfação
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie pesquisas por tablet e QRCode para refeitórios, recepção, sanitários e
            instalações.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="gap-1.5 text-xs">
            <Link to="/pesquisa-satisfacao/dashboard">
              <BarChart3 className="h-4 w-4 text-primary" />
              Ver Dashboard Geral
            </Link>
          </Button>

          <Button
            size="sm"
            onClick={() => {
              setEditingSurvey(null)
              setFormDialogOpen(true)
            }}
            className="gap-1.5 text-xs bg-brand-deepBlue hover:bg-brand-vividBlue text-white"
          >
            <Plus className="h-4 w-4" />
            Nova Pesquisa
          </Button>
        </div>
      </div>

      {/* Cards de Métricas Rápidas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Total de Pesquisas</p>
            <p className="text-2xl font-bold text-foreground mt-1">{surveys.length}</p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-brand-vividBlue">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Pesquisas Ativas</p>
            <p className="text-2xl font-bold text-green-600 mt-1">
              {surveys.filter((s) => s.is_active).length}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-green-50 dark:bg-green-950 flex items-center justify-center text-green-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Respostas Coletadas</p>
            <p className="text-2xl font-bold text-brand-deepBlue dark:text-blue-400 mt-1">
              {surveys.reduce((acc, s) => acc + (s.responses_count || 0), 0)}
            </p>
          </div>
          <div className="w-10 h-10 rounded-lg bg-indigo-50 dark:bg-indigo-950 flex items-center justify-center text-indigo-600">
            <Tablet className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Barra de Filtros */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl p-4 shadow-sm space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por título, local..."
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div>
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Filtrar por Planta" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Plantas</SelectItem>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name} {p.code ? `(${p.code})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={selectedType} onValueChange={setSelectedType}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Tipo de Pesquisa" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Tipos</SelectItem>
                {surveyTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Status</SelectItem>
                <SelectItem value="active">Somente Ativas</SelectItem>
                <SelectItem value="inactive">Somente Inativas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Tabela de Pesquisas */}
      <div className="bg-white dark:bg-slate-900 border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
            <RefreshCw className="h-6 w-6 animate-spin mb-2 text-primary" />
            <span className="text-sm">Carregando pesquisas...</span>
          </div>
        ) : filteredSurveys.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <Layers className="h-10 w-10 text-muted-foreground mb-3 stroke-[1.5]" />
            <h3 className="text-base font-semibold text-foreground">Nenhuma pesquisa encontrada</h3>
            <p className="text-xs text-muted-foreground max-w-sm mt-1">
              Crie uma pesquisa de satisfação com perguntas personalizadas e faixas de horários para
              disponibilizar em tablets ou cartazes QR Code.
            </p>
            <Button
              size="sm"
              onClick={() => {
                setEditingSurvey(null)
                setFormDialogOpen(true)
              }}
              className="mt-4 gap-1.5 text-xs bg-brand-deepBlue text-white hover:bg-brand-vividBlue"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar Primeira Pesquisa
            </Button>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
              <TableRow>
                <TableHead className="w-[300px]">Título da Pesquisa</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Planta / Local</TableHead>
                <TableHead>Horários & Validade</TableHead>
                <TableHead className="text-center">Perguntas</TableHead>
                <TableHead className="text-center">Respostas</TableHead>
                <TableHead className="text-center">Ativa</TableHead>
                <TableHead className="text-right w-[140px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredSurveys.map((survey) => {
                const schedulesCount = survey.schedules?.length || 0
                const questionsCount = survey.questions?.length || 0

                return (
                  <TableRow
                    key={survey.id}
                    className="hover:bg-slate-50/70 dark:hover:bg-slate-800/50"
                  >
                    <TableCell>
                      <div className="font-semibold text-foreground text-sm flex items-center gap-1.5">
                        {survey.title}
                      </div>
                      {survey.description && (
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                          {survey.description}
                        </p>
                      )}
                    </TableCell>

                    <TableCell>
                      <Badge variant="secondary" className="text-[11px] font-medium text-white">
                        {survey.survey_type}
                      </Badge>
                    </TableCell>

                    <TableCell>
                      <div className="text-xs text-foreground font-medium flex items-center gap-1">
                        <Building2 className="h-3 w-3 text-muted-foreground" />
                        {survey.plants?.name || 'Todas as Plantas'}
                      </div>
                      {survey.location_name && (
                        <div className="text-[11px] text-muted-foreground">
                          {survey.location_name}
                        </div>
                      )}
                    </TableCell>

                    <TableCell>
                      {schedulesCount > 0 ? (
                        <div className="flex items-center gap-1 text-xs text-blue-700 dark:text-blue-300">
                          <Clock className="h-3.5 w-3.5" />
                          <span>{schedulesCount} faixa(s) de horário</span>
                        </div>
                      ) : (
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>Livre (24 horas)</span>
                        </div>
                      )}
                      {(survey.start_date || survey.end_date) && (
                        <div className="text-[11px] text-muted-foreground mt-0.5">
                          {survey.start_date
                            ? new Date(survey.start_date + 'T00:00:00').toLocaleDateString('pt-BR')
                            : 'Início imediato'}
                          {survey.end_date
                            ? ` até ${new Date(survey.end_date + 'T00:00:00').toLocaleDateString('pt-BR')}`
                            : ''}
                        </div>
                      )}
                    </TableCell>

                    <TableCell className="text-center">
                      <Badge variant="outline" className="text-xs">
                        {questionsCount} {questionsCount === 1 ? 'pergunta' : 'perguntas'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-center">
                      <span className="inline-flex items-center justify-center font-bold text-xs bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-md text-foreground">
                        {survey.responses_count || 0}
                      </span>
                    </TableCell>

                    <TableCell className="text-center">
                      <Switch
                        checked={survey.is_active}
                        onCheckedChange={() => handleToggleStatus(survey)}
                        title={survey.is_active ? 'Desativar pesquisa' : 'Ativar pesquisa'}
                      />
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                          title="QR Code e Link de Preenchimento"
                          onClick={() => {
                            setSharingSurvey(survey)
                            setShareDialogOpen(true)
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => {
                                setEditingSurvey(survey)
                                setFormDialogOpen(true)
                              }}
                              className="cursor-pointer gap-2"
                            >
                              <Edit className="h-4 w-4 text-muted-foreground" />
                              Editar Pesquisa
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer gap-2">
                              <Link to={`/p/${survey.id}`} target="_blank" rel="noreferrer">
                                <ExternalLink className="h-4 w-4 text-muted-foreground" />
                                Abrir Formulário
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuItem asChild className="cursor-pointer gap-2">
                              <Link to={`/pesquisa-satisfacao/dashboard?surveyId=${survey.id}`}>
                                <BarChart3 className="h-4 w-4 text-muted-foreground" />
                                Ver Resultados
                              </Link>
                            </DropdownMenuItem>

                            <DropdownMenuSeparator />

                            <DropdownMenuItem
                              onClick={() => {
                                setSurveyToDelete(survey)
                                setDeleteDialogOpen(true)
                              }}
                              className="cursor-pointer gap-2 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950"
                            >
                              <Trash2 className="h-4 w-4" />
                              Excluir Pesquisa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Modal de Formulário (Criação / Edição) */}
      <SurveyFormDialog
        survey={editingSurvey}
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        onSuccess={loadSurveys}
      />

      {/* Modal de QR Code / Compartilhamento */}
      <SurveyShareDialog
        survey={sharingSurvey}
        open={shareDialogOpen}
        onOpenChange={setShareDialogOpen}
        plants={plants}
      />

      {/* Alerta de Confirmação de Exclusão */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Pesquisa de Satisfação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a pesquisa <strong>"{surveyToDelete?.title}"</strong>?
              Todas as respostas e estatísticas acumuladas vinculadas a ela também serão removidas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? 'Excluindo...' : 'Sim, Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

export default PesquisasSatisfacaoList
