import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Package,
  Search,
  Plus,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  CalendarDays,
  Inbox,
} from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { differenceInDays, format } from 'date-fns'
import { cn } from '@/lib/utils'

export default function Encomendas() {
  const { profile, activeClient } = useAppStore()
  const { plants, packageTypes, loading: masterLoading } = useMasterData()
  const { toast } = useToast()

  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('gestao')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlant, setFilterPlant] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [form, setForm] = useState({
    plant_id: '',
    package_type_id: 'none',
    arrival_date: format(new Date(), 'yyyy-MM-dd'),
    sender: '',
    recipient_name: '',
    recipient_email: '',
    tracking_code: '',
    observations: '',
  })

  const authPlants = useMemo(() => {
    if (profile?.role === 'Administrador' || profile?.role === 'Master') return plants
    const authIds = Array.isArray(profile?.authorized_plants) ? profile.authorized_plants : []
    return plants.filter((p) => authIds.includes(p.id))
  }, [plants, profile])

  const loadPackages = async () => {
    if (!profile?.client_id) return
    setLoading(true)

    let query = supabase
      .from('packages' as any)
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })

    if (profile.role !== 'Administrador' && profile.role !== 'Master') {
      const authIds = Array.isArray(profile.authorized_plants) ? profile.authorized_plants : []
      if (authIds.length > 0) {
        query = query.in('plant_id', authIds)
      } else {
        setPackages([])
        setLoading(false)
        return
      }
    }

    const { data } = await query

    setPackages(data || [])
    setLoading(false)
  }

  useEffect(() => {
    loadPackages()
  }, [profile?.client_id])

  const openAdd = () => {
    setForm({
      plant_id:
        filterPlant !== 'all' ? filterPlant : authPlants.length === 1 ? authPlants[0].id : '',
      package_type_id: 'none',
      arrival_date: format(new Date(), 'yyyy-MM-dd'),
      sender: '',
      recipient_name: '',
      recipient_email: '',
      tracking_code: '',
      observations: '',
    })
    setIsModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id || !form.sender || !form.recipient_name || !form.recipient_email) return
    setIsSubmitting(true)

    try {
      const year = new Date(form.arrival_date).getFullYear()

      const { data: latest } = await supabase
        .from('packages' as any)
        .select('protocol_number')
        .eq('client_id', profile!.client_id)
        .like('protocol_number', `ENC-${year}-%`)
        .order('created_at', { ascending: false })
        .limit(1)

      let seq = 1
      if (latest && latest.length > 0) {
        const parts = latest[0].protocol_number.split('-')
        if (parts.length === 3) {
          seq = parseInt(parts[2], 10) + 1
        }
      }
      const protocol = `ENC-${year}-${seq.toString().padStart(4, '0')}`

      const payload = {
        client_id: profile!.client_id,
        plant_id: form.plant_id,
        package_type_id: form.package_type_id !== 'none' ? form.package_type_id : null,
        protocol_number: protocol,
        arrival_date: form.arrival_date,
        sender: form.sender,
        recipient_name: form.recipient_name,
        recipient_email: form.recipient_email,
        tracking_code: form.tracking_code,
        observations: form.observations,
        status: 'Aguardando Retirada',
      }

      const { error } = await supabase.from('packages' as any).insert(payload)
      if (error) throw error

      toast({
        title: 'Encomenda registrada com sucesso!',
        description: `Protocolo: ${protocol}`,
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setIsModalOpen(false)
      loadPackages()

      await supabase.functions.invoke('package-notifications', {
        body: {
          recipient_email: form.recipient_email,
          recipient_name: form.recipient_name,
          protocol_number: protocol,
          sender: form.sender,
          arrival_date: form.arrival_date,
          plant_name: plants.find((p) => p.id === form.plant_id)?.name || 'sua unidade',
        },
      })
    } catch (err: any) {
      toast({
        title: 'Erro ao registrar encomenda',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDischarge = async (id: string) => {
    const { error } = await supabase
      .from('packages' as any)
      .update({
        status: 'Entregue',
        delivery_date: new Date().toISOString(),
      })
      .eq('id', id)

    if (error) {
      toast({ title: 'Erro ao dar baixa', variant: 'destructive' })
    } else {
      toast({
        title: 'Baixa realizada com sucesso!',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      loadPackages()
    }
  }

  const threshold = activeClient?.packageAlertDays ?? 3

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const matchPlant = filterPlant === 'all' || p.plant_id === filterPlant
      const matchStatus = filterStatus === 'all' || p.status === filterStatus
      const matchSearch =
        p.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.protocol_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sender.toLowerCase().includes(searchTerm.toLowerCase())
      return matchPlant && matchStatus && matchSearch
    })
  }, [packages, filterPlant, filterStatus, searchTerm])

  const metrics = useMemo(() => {
    let totalDeliveredLead = 0
    let deliveredCount = 0
    const openCount = packages.filter((p) => p.status === 'Aguardando Retirada').length

    packages.forEach((p) => {
      if (p.status === 'Entregue' && p.delivery_date) {
        totalDeliveredLead += Math.max(
          0,
          differenceInDays(new Date(p.delivery_date), new Date(p.arrival_date + 'T12:00:00')),
        )
        deliveredCount++
      }
    })

    const avgLead = deliveredCount > 0 ? (totalDeliveredLead / deliveredCount).toFixed(1) : '0'

    const byPlant = authPlants
      .map((plant) => {
        const pPkgs = packages.filter((p) => p.plant_id === plant.id)
        const pOpen = pPkgs.filter((p) => p.status === 'Aguardando Retirada').length
        const pDeliv = pPkgs.filter((p) => p.status === 'Entregue' && p.delivery_date)

        let pLead = 0
        pDeliv.forEach((p) => {
          pLead += Math.max(
            0,
            differenceInDays(new Date(p.delivery_date), new Date(p.arrival_date + 'T12:00:00')),
          )
        })
        const pAvg = pDeliv.length > 0 ? (pLead / pDeliv.length).toFixed(1) : '-'

        return {
          name: plant.name,
          total: pPkgs.length,
          open: pOpen,
          avgLeadTime: pAvg,
        }
      })
      .filter((p) => p.total > 0)

    const stalePkgs = packages.filter(
      (p) =>
        p.status === 'Aguardando Retirada' &&
        differenceInDays(new Date(), new Date(p.arrival_date + 'T12:00:00')) >= threshold,
    )

    return { openCount, avgLead, byPlant, stalePkgs }
  }, [packages, authPlants, threshold])

  if (masterLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-deepBlue" />
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in pb-12 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
            <Package className="h-6 w-6 text-brand-deepBlue" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
              Painel de Encomendas
            </h2>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Registro, rastreio e entrega de correspondências
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={openAdd} variant="tech" className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" /> Nova Encomenda
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white border border-gray-200">
          <TabsTrigger value="gestao" className="data-[state=active]:bg-slate-100">
            Lista e Gestão
          </TabsTrigger>
          <TabsTrigger
            value="relatorios"
            className="data-[state=active]:bg-slate-100 flex items-center gap-2"
          >
            Relatórios & Métricas
            {metrics.stalePkgs.length > 0 && (
              <Badge
                variant="destructive"
                className="h-5 px-1.5 min-w-[20px] rounded-full text-[10px] flex items-center justify-center"
              >
                {metrics.stalePkgs.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="gestao" className="space-y-6 mt-6">
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-3 rounded-xl border border-gray-100 shadow-sm">
            <div className="flex-1 flex items-center px-3 gap-2 sm:border-r border-gray-100">
              <Search className="w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Buscar protocolo, remetente, destinatário..."
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={filterPlant} onValueChange={setFilterPlant}>
                <SelectTrigger className="border-0 shadow-none bg-transparent">
                  <SelectValue placeholder="Plantas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {authPlants.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="w-full sm:w-56 border-t sm:border-t-0 sm:border-l border-gray-100 pl-0 sm:pl-4">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="border-0 shadow-none bg-transparent">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Status</SelectItem>
                  <SelectItem value="Aguardando Retirada">Aguardando Retirada</SelectItem>
                  <SelectItem value="Entregue">Entregue</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80">
                <TableRow>
                  <TableHead className="font-semibold text-slate-600">Protocolo</TableHead>
                  <TableHead className="font-semibold text-slate-600">Chegada</TableHead>
                  <TableHead className="font-semibold text-slate-600 hidden md:table-cell">
                    Planta
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">Destinatário</TableHead>
                  <TableHead className="font-semibold text-slate-600 hidden lg:table-cell">
                    Tipo
                  </TableHead>
                  <TableHead className="font-semibold text-slate-600">Status</TableHead>
                  <TableHead className="font-semibold text-slate-600 text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                    </TableCell>
                  </TableRow>
                ) : filteredPackages.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma encomenda encontrada.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPackages.map((pkg) => {
                    const isStale =
                      pkg.status === 'Aguardando Retirada' &&
                      differenceInDays(new Date(), new Date(pkg.arrival_date + 'T12:00:00')) >=
                        threshold
                    return (
                      <TableRow
                        key={pkg.id}
                        className={cn('hover:bg-slate-50', isStale && 'bg-red-50/30')}
                      >
                        <TableCell className="font-medium text-slate-800">
                          {pkg.protocol_number}
                        </TableCell>
                        <TableCell className="text-slate-600">
                          {pkg.arrival_date.split('-').reverse().join('/')}
                        </TableCell>
                        <TableCell className="text-slate-600 hidden md:table-cell">
                          {plants.find((p) => p.id === pkg.plant_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">{pkg.recipient_name}</div>
                          <div className="text-xs text-muted-foreground">
                            {pkg.sender} (Remetente)
                          </div>
                        </TableCell>
                        <TableCell className="text-slate-600 hidden lg:table-cell">
                          {packageTypes.find((t) => t.id === pkg.package_type_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-medium',
                              pkg.status === 'Entregue'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : isStale
                                  ? 'bg-red-100 text-red-800 border-red-200 shadow-sm'
                                  : 'bg-amber-100 text-amber-800 border-amber-200',
                            )}
                          >
                            {isStale && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {pkg.status}
                          </Badge>
                          {isStale && (
                            <p className="text-[10px] text-red-600 mt-1 font-semibold">
                              Parada há{' '}
                              {differenceInDays(
                                new Date(),
                                new Date(pkg.arrival_date + 'T12:00:00'),
                              )}{' '}
                              dias
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {pkg.status === 'Aguardando Retirada' && (
                            <Button
                              size="sm"
                              onClick={() => handleDischarge(pkg.id)}
                              className="bg-brand-deepBlue hover:bg-brand-deepBlue/90 text-white text-xs h-8 whitespace-nowrap"
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />{' '}
                              <span className="hidden sm:inline">Dar Baixa</span>
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="relatorios" className="space-y-6 mt-6 animate-fade-in">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="shadow-sm border-gray-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Itens Pendentes (Total)
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800">{metrics.openCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-100">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">
                    Lead Time Médio Global
                  </p>
                  <h3 className="text-2xl font-bold text-slate-800">{metrics.avgLead} dias</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-100 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-gray-100 py-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-slate-500" />
                  Benchmarking por Planta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Planta</TableHead>
                      <TableHead className="text-center">Total Recebido</TableHead>
                      <TableHead className="text-center">Aguardando</TableHead>
                      <TableHead className="text-right">Lead Time Médio</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.byPlant.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-muted-foreground">
                          Sem dados suficientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.byPlant.map((p) => (
                        <TableRow key={p.name}>
                          <TableCell className="font-medium">{p.name}</TableCell>
                          <TableCell className="text-center">{p.total}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-semibold',
                                p.open > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-500',
                              )}
                            >
                              {p.open}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold text-brand-deepBlue">
                            {p.avgLeadTime} dias
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card className="shadow-sm border-red-200 overflow-hidden">
              <CardHeader className="bg-red-50/50 border-b border-red-100 py-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-500" />
                  Encomendas em Atraso ({metrics.stalePkgs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-white sticky top-0 shadow-sm z-10">
                      <TableRow>
                        <TableHead>Protocolo</TableHead>
                        <TableHead>Destinatário</TableHead>
                        <TableHead className="text-right">Atraso</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.stalePkgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-muted-foreground">
                            Nenhuma encomenda em atraso.
                          </TableCell>
                        </TableRow>
                      ) : (
                        metrics.stalePkgs.map((pkg) => {
                          const days = differenceInDays(
                            new Date(),
                            new Date(pkg.arrival_date + 'T12:00:00'),
                          )
                          return (
                            <TableRow key={pkg.id} className="bg-red-50/10">
                              <TableCell className="font-medium text-slate-800">
                                {pkg.protocol_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium">{pkg.recipient_name}</div>
                                <div className="text-xs text-muted-foreground truncate max-w-[150px]">
                                  {plants.find((p) => p.id === pkg.plant_id)?.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-red-600">
                                {days} dias
                              </TableCell>
                            </TableRow>
                          )
                        })
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Registrar Encomenda</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Planta *</Label>
                <Select
                  value={form.plant_id}
                  onValueChange={(v) => setForm({ ...form, plant_id: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {authPlants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Encomenda</Label>
                <Select
                  value={form.package_type_id}
                  onValueChange={(v) => setForm({ ...form, package_type_id: v })}
                >
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Não classificado</SelectItem>
                    {packageTypes.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Remetente *</Label>
                <Input
                  value={form.sender}
                  onChange={(e) => setForm({ ...form, sender: e.target.value })}
                  placeholder="Ex: MercadoLivre, Sedex, João..."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nome do Destinatário *</Label>
                <Input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>E-mail do Destinatário *</Label>
                <Input
                  type="email"
                  value={form.recipient_email}
                  onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Data de Chegada *</Label>
                <Input
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Código de Rastreio</Label>
                <Input
                  value={form.tracking_code}
                  onChange={(e) => setForm({ ...form, tracking_code: e.target.value })}
                  placeholder="Opcional"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Observações</Label>
                <Input
                  value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })}
                  placeholder="Ex: Caixa avariada, frágil..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar &
                Notificar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
