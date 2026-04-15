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
import { Textarea } from '@/components/ui/textarea'
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
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
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
  Edit,
  Paperclip,
  FileText,
  ChevronDown,
} from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { differenceInDays, format } from 'date-fns'
import { cn } from '@/lib/utils'
import { useHasAccess } from '@/hooks/use-has-access'
import { Navigate } from 'react-router-dom'

export default function Encomendas() {
  const { profile, activeClient } = useAppStore()
  const { plants, packageTypes, loading: masterLoading } = useMasterData()
  const { toast } = useToast()

  // Checking access for the renamed module
  const hasAccessGestao = useHasAccess('Gestão de Encomendas')
  const hasAccessEncomendas = useHasAccess('Encomendas')
  const hasAccess = hasAccessGestao || hasAccessEncomendas

  const [packages, setPackages] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('gestao')

  const [searchTerm, setSearchTerm] = useState('')
  const [filterPlant, setFilterPlant] = useState('all')
  const [filterStatuses, setFilterStatuses] = useState<string[]>(['Aguardando Retirada'])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingPackageId, setEditingPackageId] = useState<string | null>(null)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const [isDischargeModalOpen, setIsDischargeModalOpen] = useState(false)
  const [dischargePkg, setDischargePkg] = useState<any>(null)
  const [dischargeForm, setDischargeForm] = useState({
    date: '',
    responsible: '',
  })

  const [form, setForm] = useState({
    plant_id: '',
    package_type_id: 'none',
    arrival_date: format(new Date(), 'yyyy-MM-dd'),
    sender: '',
    recipient_name: '',
    recipient_email: '',
    tracking_code: '',
    observations: '',
    status: 'Aguardando Retirada',
    protocol_number: '',
    attachment_url: '',
  })

  const authPlants = useMemo(() => {
    if (profile?.role === 'Administrador' || profile?.role === 'Master') return plants
    const authIds = Array.isArray(profile?.authorized_plants) ? profile.authorized_plants : []
    return plants.filter((p) => authIds.includes(p.id))
  }, [plants, profile])

  const loadPackages = async () => {
    if (!profile) return
    if (profile.role !== 'Master' && !profile.client_id) return

    setLoading(true)

    let query = supabase
      .from('packages' as any)
      .select('*')
      .order('created_at', { ascending: false })

    if (profile.role === 'Master') {
      if (activeClient?.id && activeClient.id !== ('all' as any)) {
        query = query.eq('client_id', activeClient.id)
      }
    } else {
      query = query.eq('client_id', profile.client_id)
    }

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
  }, [profile])

  const openAdd = () => {
    setEditingPackageId(null)
    setSelectedFile(null)
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
      status: 'Aguardando Retirada',
      protocol_number: '',
      attachment_url: '',
    })
    setIsModalOpen(true)
  }

  const openEdit = (pkg: any) => {
    setEditingPackageId(pkg.id)
    setSelectedFile(null)
    setForm({
      plant_id: pkg.plant_id,
      package_type_id: pkg.package_type_id || 'none',
      arrival_date: pkg.arrival_date,
      sender: pkg.sender,
      recipient_name: pkg.recipient_name,
      recipient_email: pkg.recipient_email,
      tracking_code: pkg.tracking_code || '',
      observations: pkg.observations || '',
      status: pkg.status,
      protocol_number: pkg.protocol_number,
      attachment_url: pkg.attachment_url || '',
    })
    setIsModalOpen(true)
  }

  const openDischarge = (pkg: any) => {
    setDischargePkg(pkg)
    setDischargeForm({
      date: format(new Date(), "yyyy-MM-dd'T'HH:mm"),
      responsible: '',
    })
    setIsDischargeModalOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (
      !form.plant_id ||
      !form.sender ||
      !form.recipient_name ||
      !form.recipient_email ||
      !form.arrival_date ||
      !form.status
    )
      return
    setIsSubmitting(true)

    try {
      let attachment_url = form.attachment_url

      if (selectedFile) {
        const fileExt = selectedFile.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${profile!.client_id}/${fileName}`

        const { error: uploadError } = await supabase.storage
          .from('package-attachments')
          .upload(filePath, selectedFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage
          .from('package-attachments')
          .getPublicUrl(filePath)

        attachment_url = publicUrlData.publicUrl
      }

      if (editingPackageId) {
        const payload: any = {
          plant_id: form.plant_id,
          package_type_id: form.package_type_id !== 'none' ? form.package_type_id : null,
          arrival_date: form.arrival_date,
          sender: form.sender,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          tracking_code: form.tracking_code,
          observations: form.observations,
          status: form.status,
          attachment_url,
        }

        if (form.status === 'Entregue') {
          const pkg = packages.find((p) => p.id === editingPackageId)
          if (!pkg?.delivery_date) {
            payload.delivery_date = new Date().toISOString()
          }
        } else {
          payload.delivery_date = null
          payload.pickup_responsible = null
        }

        const { error } = await supabase
          .from('packages' as any)
          .update(payload)
          .eq('id', editingPackageId)
        if (error) throw error

        toast({
          title: 'Encomenda atualizada com sucesso!',
          className: 'bg-green-50 text-green-900 border-green-200',
        })
        setIsModalOpen(false)
        loadPackages()
      } else {
        const year = new Date(form.arrival_date).getFullYear()

        const targetClientId =
          plants.find((p) => p.id === form.plant_id)?.client_id || profile!.client_id

        const { data: latest } = await supabase
          .from('packages' as any)
          .select('protocol_number')
          .eq('client_id', targetClientId)
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
          client_id: targetClientId,
          plant_id: form.plant_id,
          package_type_id: form.package_type_id !== 'none' ? form.package_type_id : null,
          protocol_number: protocol,
          arrival_date: form.arrival_date,
          sender: form.sender,
          recipient_name: form.recipient_name,
          recipient_email: form.recipient_email,
          tracking_code: form.tracking_code,
          observations: form.observations,
          status: form.status,
          attachment_url,
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

        supabase.functions
          .invoke('package-notifications', {
            body: {
              recipient_email: form.recipient_email,
              recipient_name: form.recipient_name,
              protocol_number: protocol,
              sender: form.sender,
              arrival_date: form.arrival_date,
              plant_name: plants.find((p) => p.id === form.plant_id)?.name || 'sua unidade',
            },
          })
          .catch((err) => {
            console.error('Failed to invoke package-notifications:', err)
          })
      }
    } catch (err: any) {
      toast({
        title: editingPackageId
          ? 'Erro ao atualizar encomenda. Tente novamente.'
          : 'Erro ao registrar encomenda',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDischargeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!dischargeForm.responsible || !dischargeForm.date) return
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('packages' as any)
        .update({
          status: 'Entregue',
          delivery_date: new Date(dischargeForm.date).toISOString(),
          pickup_responsible: dischargeForm.responsible,
        })
        .eq('id', dischargePkg.id)

      if (error) throw error

      toast({
        title: 'Baixa realizada com sucesso!',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setIsDischargeModalOpen(false)
      loadPackages()
    } catch (err: any) {
      toast({
        title: 'Erro ao dar baixa',
        description: err.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const threshold = activeClient?.packageAlertDays ?? 3

  const filteredPackages = useMemo(() => {
    return packages.filter((p) => {
      const matchPlant = filterPlant === 'all' || p.plant_id === filterPlant
      const matchStatus = filterStatuses.length === 0 || filterStatuses.includes(p.status)
      const matchSearch =
        p.recipient_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.protocol_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.sender.toLowerCase().includes(searchTerm.toLowerCase())
      return matchPlant && matchStatus && matchSearch
    })
  }, [packages, filterPlant, filterStatuses, searchTerm])

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

  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

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
              Gestão de Encomendas
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
          <TabsTrigger
            value="gestao"
            className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600"
          >
            Lista e Gestão
          </TabsTrigger>
          <TabsTrigger
            value="relatorios"
            className="data-[state=active]:bg-slate-100 data-[state=active]:text-slate-900 text-slate-600 flex items-center gap-2"
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
          <div className="flex flex-col sm:flex-row gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex-1 flex items-center px-3 gap-2 sm:border-r border-gray-200">
              <Search className="w-5 h-5 text-slate-500" />
              <Input
                placeholder="Buscar protocolo, remetente, destinatário..."
                className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base text-slate-800 placeholder:text-slate-500"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-full sm:w-56">
              <Select value={filterPlant} onValueChange={setFilterPlant}>
                <SelectTrigger className="border-0 shadow-none bg-transparent text-slate-700 font-medium">
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
            <div className="w-full sm:w-64 border-t sm:border-t-0 sm:border-l border-gray-200 pl-0 sm:pl-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-between border-0 shadow-none hover:bg-slate-50 font-medium text-slate-700 h-10 px-3"
                  >
                    <span className="truncate">
                      {filterStatuses.length === 0
                        ? 'Status'
                        : filterStatuses.length === 3
                          ? 'Todos os Status'
                          : filterStatuses.join(', ')}
                    </span>
                    <ChevronDown className="h-4 w-4 opacity-50 shrink-0 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-white">
                  {['Aguardando Retirada', 'Entregue', 'Devolvido'].map((status) => (
                    <DropdownMenuCheckboxItem
                      key={status}
                      checked={filterStatuses.includes(status)}
                      onCheckedChange={(checked) => {
                        setFilterStatuses((prev) =>
                          checked ? [...prev, status] : prev.filter((s) => s !== status),
                        )
                      }}
                      className="cursor-pointer"
                    >
                      {status}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-slate-50/80 border-b border-gray-200">
                <TableRow>
                  <TableHead className="font-semibold text-slate-800">Protocolo</TableHead>
                  <TableHead className="font-semibold text-slate-800">Chegada</TableHead>
                  <TableHead className="font-semibold text-slate-800 hidden md:table-cell">
                    Planta
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800">Destinatário</TableHead>
                  <TableHead className="font-semibold text-slate-800 hidden lg:table-cell">
                    Tipo
                  </TableHead>
                  <TableHead className="font-semibold text-slate-800">Status</TableHead>
                  <TableHead className="font-semibold text-slate-800 text-right">Ação</TableHead>
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
                    <TableCell colSpan={7} className="text-center py-8 text-slate-600">
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
                        className={cn(
                          'hover:bg-slate-50 border-gray-100',
                          isStale && 'bg-red-50/30',
                        )}
                      >
                        <TableCell className="font-medium text-slate-800">
                          {pkg.protocol_number}
                        </TableCell>
                        <TableCell className="text-slate-700">
                          {pkg.arrival_date.split('-').reverse().join('/')}
                        </TableCell>
                        <TableCell className="text-slate-700 hidden md:table-cell">
                          {plants.find((p) => p.id === pkg.plant_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-slate-800">{pkg.recipient_name}</div>
                          <div className="text-xs text-slate-500">{pkg.sender} (Remetente)</div>
                          {pkg.attachment_url && (
                            <a
                              href={pkg.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-brand-deepBlue text-xs flex items-center hover:underline mt-1 w-fit"
                            >
                              <Paperclip className="w-3 h-3 mr-1" /> Visualizar Anexo
                            </a>
                          )}
                          {pkg.status === 'Entregue' && pkg.pickup_responsible && (
                            <div className="text-xs text-green-700 mt-1 font-medium flex items-center">
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Retirado por: {pkg.pickup_responsible}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-slate-700 hidden lg:table-cell">
                          {packageTypes.find((t) => t.id === pkg.package_type_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-medium',
                              pkg.status === 'Entregue'
                                ? 'bg-green-100 text-green-800 border-green-200'
                                : pkg.status === 'Devolvido'
                                  ? 'bg-slate-100 text-slate-800 border-slate-300'
                                  : isStale
                                    ? 'bg-red-100 text-red-800 border-red-300 shadow-sm'
                                    : 'bg-amber-100 text-amber-800 border-amber-300',
                            )}
                          >
                            {isStale && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {pkg.status}
                          </Badge>
                          {isStale && (
                            <p className="text-[10px] text-red-700 mt-1 font-semibold">
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
                          <div className="flex flex-wrap items-center justify-end gap-1">
                            {pkg.status === 'Aguardando Retirada' && (
                              <Button
                                size="sm"
                                onClick={() => openDischarge(pkg)}
                                className="bg-brand-deepBlue hover:bg-brand-deepBlue/90 text-white text-xs h-8 whitespace-nowrap shadow-sm"
                              >
                                <CheckCircle2 className="h-3.5 w-3.5 mr-1 sm:mr-1.5" />{' '}
                                <span className="hidden sm:inline">Dar Baixa</span>
                              </Button>
                            )}
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEdit(pkg)}
                              className="h-8 w-8 text-slate-600 hover:text-brand-deepBlue hover:bg-slate-100"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
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
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-amber-100 flex items-center justify-center">
                  <Inbox className="h-6 w-6 text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Itens Pendentes (Total)</p>
                  <h3 className="text-2xl font-bold text-slate-800">{metrics.openCount}</h3>
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-gray-200">
              <CardContent className="p-6 flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center">
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-600">Lead Time Médio Global</p>
                  <h3 className="text-2xl font-bold text-slate-800">{metrics.avgLead} dias</h3>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-sm border-gray-200 overflow-hidden">
              <CardHeader className="bg-slate-50/50 border-b border-gray-200 py-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-slate-800">
                  <CalendarDays className="h-5 w-5 text-slate-600" />
                  Benchmarking por Planta
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader className="bg-slate-50/80">
                    <TableRow className="border-gray-200">
                      <TableHead className="font-semibold text-slate-800">Planta</TableHead>
                      <TableHead className="text-center font-semibold text-slate-800">
                        Total Recebido
                      </TableHead>
                      <TableHead className="text-center font-semibold text-slate-800">
                        Aguardando
                      </TableHead>
                      <TableHead className="text-right font-semibold text-slate-800">
                        Lead Time Médio
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {metrics.byPlant.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-6 text-slate-600">
                          Sem dados suficientes.
                        </TableCell>
                      </TableRow>
                    ) : (
                      metrics.byPlant.map((p) => (
                        <TableRow key={p.name} className="border-gray-100 hover:bg-slate-50/50">
                          <TableCell className="font-medium text-slate-800">{p.name}</TableCell>
                          <TableCell className="text-center text-slate-700">{p.total}</TableCell>
                          <TableCell className="text-center">
                            <span
                              className={cn(
                                'px-2 py-0.5 rounded text-xs font-semibold',
                                p.open > 0 ? 'bg-amber-100 text-amber-800' : 'text-slate-600',
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
              <CardHeader className="bg-red-50/50 border-b border-red-200 py-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-red-800">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Encomendas em Atraso ({metrics.stalePkgs.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="max-h-[300px] overflow-y-auto">
                  <Table>
                    <TableHeader className="bg-white sticky top-0 shadow-sm z-10 border-b border-red-100">
                      <TableRow>
                        <TableHead className="font-semibold text-slate-800">Protocolo</TableHead>
                        <TableHead className="font-semibold text-slate-800">Destinatário</TableHead>
                        <TableHead className="text-right font-semibold text-slate-800">
                          Atraso
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.stalePkgs.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={3} className="text-center py-6 text-slate-600">
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
                            <TableRow
                              key={pkg.id}
                              className="bg-red-50/30 border-red-100 hover:bg-red-50/50"
                            >
                              <TableCell className="font-medium text-slate-800">
                                {pkg.protocol_number}
                              </TableCell>
                              <TableCell>
                                <div className="text-sm font-medium text-slate-800">
                                  {pkg.recipient_name}
                                </div>
                                <div className="text-xs text-slate-600 truncate max-w-[150px]">
                                  {plants.find((p) => p.id === pkg.plant_id)?.name}
                                </div>
                              </TableCell>
                              <TableCell className="text-right font-bold text-red-700">
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
        <DialogContent className="sm:max-w-xl bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">
              {editingPackageId ? 'Editar Encomenda' : 'Registrar Encomenda'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-slate-700">Protocolo</Label>
                <Input
                  value={form.protocol_number}
                  readOnly
                  disabled
                  className="bg-slate-50 text-slate-600 border-slate-200"
                  placeholder={editingPackageId ? '' : 'Gerado automaticamente'}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Status *</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Aguardando Retirada">Aguardando Retirada</SelectItem>
                    <SelectItem value="Entregue">Entregue</SelectItem>
                    <SelectItem value="Devolvido">Devolvido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Planta *</Label>
                <Select
                  value={form.plant_id}
                  onValueChange={(v) => setForm({ ...form, plant_id: v })}
                  required
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
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
                <Label className="text-slate-700">Tipo de Encomenda</Label>
                <Select
                  value={form.package_type_id}
                  onValueChange={(v) => setForm({ ...form, package_type_id: v })}
                >
                  <SelectTrigger className="bg-white border-slate-200 text-slate-800">
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
                <Label className="text-slate-700">Remetente *</Label>
                <Input
                  value={form.sender}
                  onChange={(e) => setForm({ ...form, sender: e.target.value })}
                  placeholder="Ex: MercadoLivre, Sedex, João..."
                  required
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Nome do Destinatário *</Label>
                <Input
                  value={form.recipient_name}
                  onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                  required
                  className="bg-white border-slate-200 text-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">E-mail do Destinatário *</Label>
                <Input
                  type="email"
                  value={form.recipient_email}
                  onChange={(e) => setForm({ ...form, recipient_email: e.target.value })}
                  required
                  className="bg-white border-slate-200 text-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Data de Chegada *</Label>
                <Input
                  type="date"
                  value={form.arrival_date}
                  onChange={(e) => setForm({ ...form, arrival_date: e.target.value })}
                  required
                  className="bg-white border-slate-200 text-slate-800"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-slate-700">Código de Rastreio</Label>
                <Input
                  value={form.tracking_code}
                  onChange={(e) => setForm({ ...form, tracking_code: e.target.value })}
                  placeholder="Opcional"
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-700">Anexar Arquivo</Label>
                <Input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                  className="bg-white border-slate-200 text-slate-800"
                  accept="image/*,.pdf,.doc,.docx"
                />
                {form.attachment_url && !selectedFile && (
                  <a
                    href={form.attachment_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-brand-deepBlue text-xs flex items-center hover:underline mt-1 w-fit"
                  >
                    <FileText className="w-3 h-3 mr-1" /> Visualizar anexo atual
                  </a>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label className="text-slate-700">Observações</Label>
                <Textarea
                  value={form.observations}
                  onChange={(e) => setForm({ ...form, observations: e.target.value })}
                  placeholder="Ex: Caixa avariada, frágil..."
                  className="bg-white border-slate-200 text-slate-800 placeholder:text-slate-400"
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-700 border-gray-300"
              >
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}{' '}
                {editingPackageId ? 'Salvar' : 'Salvar & Notificar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isDischargeModalOpen} onOpenChange={setIsDischargeModalOpen}>
        <DialogContent className="sm:max-w-md bg-white border-gray-200">
          <DialogHeader>
            <DialogTitle className="text-slate-800">Confirmar Retirada</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleDischargeSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-slate-700">Data de Retirada *</Label>
              <Input
                type="datetime-local"
                value={dischargeForm.date}
                onChange={(e) => setDischargeForm({ ...dischargeForm, date: e.target.value })}
                required
                className="bg-white border-slate-200 text-slate-800"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-700">Responsável pela Retirada *</Label>
              <Input
                value={dischargeForm.responsible}
                onChange={(e) =>
                  setDischargeForm({ ...dischargeForm, responsible: e.target.value })
                }
                required
                placeholder="Nome da pessoa que retirou"
                className="bg-white border-slate-200 text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDischargeModalOpen(false)}
                className="text-slate-700 border-gray-300"
              >
                Cancelar
              </Button>
              <Button type="submit" variant="tech" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Confirmar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
