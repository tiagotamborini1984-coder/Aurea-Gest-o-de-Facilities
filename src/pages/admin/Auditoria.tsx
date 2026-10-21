import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import {
  Calendar as CalendarIcon,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  ShieldAlert,
  FileText,
  AlertCircle,
  Database,
  ShieldCheck,
  RefreshCw,
  HardDrive,
  CheckCircle2,
  Clock,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'
import { Link, Navigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'

export default function Auditoria() {
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const [logs, setLogs] = useState<any[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const pageSize = 20

  const [searchTerm, setSearchTerm] = useState('')
  const [actionType, setActionType] = useState('all')
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: undefined,
    to: undefined,
  })
  const [selectedLog, setSelectedLog] = useState<any | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Snapshots e Proteção
  const [snapshots, setSnapshots] = useState<any[]>([])
  const [loadingSnapshots, setLoadingSnapshots] = useState(false)
  const [selectedSnapshot, setSelectedSnapshot] = useState<any | null>(null)
  const [activeTab, setActiveTab] = useState<'audit_logs' | 'snapshots'>('audit_logs')

  useEffect(() => {
    if (profile && (profile.role === 'Administrador' || profile.role === 'Master')) {
      if (activeTab === 'audit_logs') {
        fetchLogs()
      } else {
        fetchSnapshots()
      }
    }
  }, [page, actionType, dateRange, profile, activeClient, selectedMasterClient, activeTab])

  const fetchSnapshots = async () => {
    setLoadingSnapshots(true)
    try {
      const { data, error } = await (supabase as any)
        .from('system_snapshots_log')
        .select('*')
        .order('snapshot_date', { ascending: false })
        .limit(30)

      if (error) {
        console.error('Erro ao buscar snapshots:', error)
      } else if (data) {
        setSnapshots(data)
      }
    } catch (err) {
      console.error('Erro inesperado ao carregar snapshots:', err)
    } finally {
      setLoadingSnapshots(false)
    }
  }

  if (profile && profile.role !== 'Administrador' && profile.role !== 'Master') {
    return <Navigate to="/gestao-terceiros" replace />
  }

  const fetchLogs = async () => {
    setIsLoading(true)

    let query = supabase
      .from('audit_logs')
      .select(
        `
        id,
        created_at,
        action_type,
        details,
        profiles${searchTerm ? '!inner' : ''} (
          name,
          email
        )
      `,
        { count: 'exact' },
      )
      .order('created_at', { ascending: false })

    if (profile?.role === 'Master' && selectedMasterClient !== 'all' && activeClient?.id) {
      query = query.eq('client_id', activeClient.id)
    } else if (profile?.role === 'Administrador' && profile.client_id) {
      query = query.eq('client_id', profile.client_id)
    }

    if (actionType !== 'all') {
      query = query.eq('action_type', actionType)
    }

    if (dateRange.from) {
      query = query.gte('created_at', dateRange.from.toISOString())
    }
    if (dateRange.to) {
      const toDate = new Date(dateRange.to)
      toDate.setHours(23, 59, 59, 999)
      query = query.lte('created_at', toDate.toISOString())
    }

    if (searchTerm) {
      query = query.or(`name.ilike.%${searchTerm}%,email.ilike.%${searchTerm}%`, {
        foreignTable: 'profiles',
      })
    }

    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    query = query.range(from, to)

    const { data, count } = await query

    if (data) {
      setLogs(data)
      setTotal(count || 0)
    }
    setIsLoading(false)
  }

  const totalPages = Math.ceil(total / pageSize)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    setPage(1)
    fetchLogs()
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'Inclusão':
        return 'text-green-600 bg-green-50 border-green-200'
      case 'Atualização':
        return 'text-blue-600 bg-blue-50 border-blue-200'
      case 'Exclusão':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'Login':
        return 'text-purple-600 bg-purple-50 border-purple-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <Breadcrumb className="mb-6">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to="/gestao-terceiros">Início</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Log de Auditoria</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ShieldAlert className="h-8 w-8 text-brand-vividBlue" />
            Auditoria e Segurança do Banco
          </h1>
          <p className="text-gray-500 text-sm">
            Monitore acessos, histórico de alterações operacionais e conferência dos backups diários
            automáticos.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-6">
        <TabsList className="grid w-full sm:w-[480px] grid-cols-2">
          <TabsTrigger value="audit_logs" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Logs de Atividades
          </TabsTrigger>
          <TabsTrigger value="snapshots" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Snapshots &amp; Proteção
          </TabsTrigger>
        </TabsList>

        <TabsContent value="audit_logs" className="space-y-6">
          <Card className="border-border shadow-sm">
            <CardHeader className="pb-4 border-b">
              <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
                  <Input
                    placeholder="Buscar por nome ou e-mail..."
                    className="pl-9 bg-white"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>

                <Select
                  value={actionType}
                  onValueChange={(v) => {
                    setActionType(v)
                    setPage(1)
                  }}
                >
                  <SelectTrigger className="w-full sm:w-[180px] bg-white">
                    <SelectValue placeholder="Tipo de Ação" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas as Ações</SelectItem>
                    <SelectItem value="Inclusão">Inclusão</SelectItem>
                    <SelectItem value="Atualização">Atualização</SelectItem>
                    <SelectItem value="Exclusão">Exclusão</SelectItem>
                    <SelectItem value="Login">Login</SelectItem>
                  </SelectContent>
                </Select>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full sm:w-[240px] justify-start text-left font-normal bg-white',
                        !dateRange.from && !dateRange.to && 'text-muted-foreground',
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, 'dd/MM/yy', { locale: ptBR })} -{' '}
                            {format(dateRange.to, 'dd/MM/yy', { locale: ptBR })}
                          </>
                        ) : (
                          format(dateRange.from, 'dd/MM/yy', { locale: ptBR })
                        )
                      ) : (
                        <span>Filtrar por data</span>
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range: any) => {
                        setDateRange({ from: range?.from, to: range?.to })
                        setPage(1)
                      }}
                      numberOfMonths={2}
                      locale={ptBR}
                    />
                  </PopoverContent>
                </Popover>

                <Button type="submit" variant="tech">
                  Buscar
                </Button>
              </form>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Data/Hora</TableHead>
                      <TableHead>Usuário</TableHead>
                      <TableHead className="w-[150px]">Ação</TableHead>
                      <TableHead className="hidden md:table-cell">Detalhes</TableHead>
                      <TableHead className="w-[80px] text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLoading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <div className="h-6 w-6 border-2 border-brand-vividBlue border-t-transparent rounded-full animate-spin mb-2"></div>
                            Carregando logs...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : logs.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <FileText className="h-10 w-10 mb-2 opacity-20" />
                            Nenhum log de atividade encontrado.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      logs.map((log) => (
                        <TableRow
                          key={log.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              <span className="font-medium text-sm text-foreground">
                                {log.profiles?.name || 'Sistema'}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {log.profiles?.email || 'N/A'}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                'px-2.5 py-1 rounded-full text-xs font-semibold border',
                                getActionColor(log.action_type),
                              )}
                            >
                              {log.action_type}
                            </span>
                          </TableCell>
                          <TableCell className="hidden md:table-cell max-w-[300px] truncate text-sm text-muted-foreground">
                            {log.details || '-'}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-brand-vividBlue opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => setSelectedLog(log)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <div className="text-sm text-muted-foreground">
                    Página {page} de {totalPages} (Total: {total})
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      Próxima <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="snapshots" className="space-y-6">
          {/* Status das Camadas de Blindagem */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Camada 2: Guard Destrutivo
                  </CardTitle>
                  <ShieldCheck className="h-5 w-5 text-green-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-full bg-green-500 animate-pulse"></span>
                  Ativo &amp; Blindado
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Bloqueio automático de DELETE/TRUNCATE sem filtro em todas as 44 tabelas críticas
                  dos 9 módulos.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Camada 3: Snapshot Diário
                  </CardTitle>
                  <Database className="h-5 w-5 text-blue-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-500" />
                  03:00 BRT
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Execução programada via pg_cron diariamente de madrugada com retenção de 30 dias.
                </p>
              </CardContent>
            </Card>

            <Card className="border-border shadow-sm">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Último Snapshot Gerado
                  </CardTitle>
                  <HardDrive className="h-5 w-5 text-purple-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-gray-900">
                  {snapshots[0]
                    ? format(new Date(snapshots[0].created_at), 'dd/MM/yyyy HH:mm', {
                        locale: ptBR,
                      })
                    : 'N/A'}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {snapshots[0]
                    ? `${snapshots[0].tables_count} tabelas (${snapshots[0].total_records?.toLocaleString('pt-BR')} registros)`
                    : 'Aguardando execução'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Snapshots Diários */}
          <Card className="border-border shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-4 border-b">
              <div>
                <CardTitle className="text-lg font-semibold text-gray-900">
                  Histórico de Snapshots Diários (Retenção: 30 dias)
                </CardTitle>
                <CardDescription>
                  Tabelas espelho datadas (snapshot_&lt;tabela&gt;_YYYYMMDD) cobrindo os 9 módulos
                  operacionais críticos.
                </CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={fetchSnapshots}
                disabled={loadingSnapshots}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', loadingSnapshots && 'animate-spin')} />
                Atualizar
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-[180px]">Data do Snapshot</TableHead>
                      <TableHead>Tag Identificadora</TableHead>
                      <TableHead>Tabelas Copiadas</TableHead>
                      <TableHead>Total de Registros</TableHead>
                      <TableHead>Duração</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[80px] text-right">Detalhes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loadingSnapshots ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <div className="h-6 w-6 border-2 border-brand-vividBlue border-t-transparent rounded-full animate-spin mb-2"></div>
                            Carregando snapshots...
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : snapshots.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center justify-center text-muted-foreground">
                            <Database className="h-10 w-10 mb-2 opacity-20" />
                            Nenhum snapshot registrado ainda.
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      snapshots.map((snap) => (
                        <TableRow
                          key={snap.id}
                          className="hover:bg-muted/30 transition-colors group"
                        >
                          <TableCell className="font-medium text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(snap.created_at), "dd/MM/yyyy 'às' HH:mm:ss", {
                              locale: ptBR,
                            })}
                          </TableCell>
                          <TableCell>
                            <span className="font-mono text-xs font-semibold text-foreground">
                              {snap.snapshot_tag}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-medium">{snap.tables_count} tabelas</span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm font-semibold text-foreground">
                              {snap.total_records?.toLocaleString('pt-BR')} registros
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {snap.execution_duration_ms ? `${snap.execution_duration_ms} ms` : '-'}
                          </TableCell>
                          <TableCell>
                            {snap.status === 'completed' ? (
                              <Badge
                                variant="outline"
                                className="text-green-600 bg-green-50 border-green-200 gap-1"
                              >
                                <CheckCircle2 className="h-3 w-3" /> Concluído
                              </Badge>
                            ) : (
                              <Badge variant="destructive">{snap.status}</Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-brand-vividBlue"
                              onClick={() => setSelectedSnapshot(snap)}
                            >
                              <Eye className="h-4 w-4" />
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
        </TabsContent>
      </Tabs>

      {/* Modal de Detalhes do Snapshot */}
      <Dialog open={!!selectedSnapshot} onOpenChange={(open) => !open && setSelectedSnapshot(null)}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Database className="h-5 w-5 text-brand-vividBlue" />
              Contagem por Tabela do Snapshot
            </DialogTitle>
          </DialogHeader>
          {selectedSnapshot && (
            <div className="space-y-4 pt-2 overflow-hidden flex flex-col">
              <div className="grid grid-cols-3 gap-3 bg-muted/40 p-3 rounded-lg border text-xs">
                <div>
                  <span className="text-muted-foreground block">Data</span>
                  <span className="font-semibold">{selectedSnapshot.snapshot_date}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Tabelas</span>
                  <span className="font-semibold">{selectedSnapshot.tables_count}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Total Registros</span>
                  <span className="font-semibold">
                    {selectedSnapshot.total_records?.toLocaleString('pt-BR')}
                  </span>
                </div>
              </div>

              <div className="flex-1 overflow-hidden flex flex-col">
                <p className="text-xs font-semibold text-muted-foreground uppercase mb-2">
                  Tabelas Copiadas e Contagens Originais
                </p>
                <ScrollArea className="h-[350px] w-full rounded-md border p-2">
                  <div className="divide-y divide-border">
                    {Array.isArray(selectedSnapshot.details) &&
                      selectedSnapshot.details.map((item: any, idx: number) => (
                        <div
                          key={idx}
                          className="py-1.5 px-2 flex justify-between items-center text-xs hover:bg-muted/40 rounded"
                        >
                          <div>
                            <span className="font-mono font-medium text-foreground">
                              {item.table}
                            </span>
                            <span className="text-muted-foreground text-[10px] block font-mono">
                              {item.snapshot_table}
                            </span>
                          </div>
                          <Badge variant="secondary" className="font-mono text-xs">
                            {item.record_count?.toLocaleString('pt-BR')}
                          </Badge>
                        </div>
                      ))}
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <AlertCircle className="h-5 w-5 text-brand-vividBlue" />
              Detalhes do Registro
            </DialogTitle>
          </DialogHeader>
          {selectedLog && (
            <div className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4 bg-muted/50 p-3 rounded-lg border">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">Ação</p>
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-[10px] font-semibold border',
                      getActionColor(selectedLog.action_type),
                    )}
                  >
                    {selectedLog.action_type}
                  </span>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    Data/Hora
                  </p>
                  <p className="text-sm font-medium">
                    {format(new Date(selectedLog.created_at), 'dd/MM/yyyy HH:mm:ss', {
                      locale: ptBR,
                    })}
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                    Usuário
                  </p>
                  <p className="text-sm font-medium">
                    {selectedLog.profiles?.name || 'Sistema'}{' '}
                    <span className="text-muted-foreground font-normal">
                      ({selectedLog.profiles?.email || 'N/A'})
                    </span>
                  </p>
                </div>
              </div>

              <div>
                <p className="text-sm font-semibold mb-2 text-foreground border-b pb-1">
                  Descrição
                </p>
                <ScrollArea className="h-[200px] w-full rounded-md border bg-muted/30 p-4">
                  <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap break-words">
                    {selectedLog.details}
                  </pre>
                </ScrollArea>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
