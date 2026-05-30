import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { format, differenceInDays, startOfDay, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Plus, Search, Trash2, Edit2, AlertCircle } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

export default function Documentos() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(true)

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    document_type: '',
    frequency: '',
    expiration_date: '',
    alert_lead_days: 30,
    plant_id: '',
  })

  useEffect(() => {
    if (user) {
      fetchPlants()
    }
  }, [user])

  useEffect(() => {
    if (user) {
      fetchDocuments()
    }
  }, [user, selectedPlant])

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('id, name')
    setPlants(data || [])
  }

  const fetchDocuments = async () => {
    setLoading(true)
    let query = supabase
      .from('sector_documents')
      .select(`*, plants(name)`)
      .order('expiration_date', { ascending: true })

    if (selectedPlant && selectedPlant !== 'all') {
      query = query.eq('plant_id', selectedPlant)
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os documentos.',
        variant: 'destructive',
      })
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  const getStatusAndSLA = (doc: any) => {
    if (!doc.expiration_date) {
      return {
        slaText: '-',
        slaDays: 0,
        status: 'Sem Data',
        color: 'bg-slate-100 text-slate-800 border-slate-200',
      }
    }

    const today = startOfDay(new Date())
    const expDate = startOfDay(parseISO(doc.expiration_date))
    const slaDays = differenceInDays(expDate, today)

    let slaText = `${slaDays} dias`
    let status = 'Válido'
    let color = 'bg-emerald-100 text-emerald-800 border-emerald-200'

    if (slaDays < 0) {
      status = 'Vencido'
      color = 'bg-red-100 text-red-800 border-red-200 shadow-sm'
    } else if (slaDays === 0) {
      slaText = 'Vence hoje'
      status = 'Vencendo'
      color = 'bg-amber-100 text-amber-800 border-amber-200'
    } else if (slaDays <= (doc.alert_lead_days || 30)) {
      status = 'Vencendo'
      color = 'bg-amber-100 text-amber-800 border-amber-200'
    }

    return { slaText, slaDays, status, color }
  }

  const handleOpenModal = (doc?: any) => {
    if (doc) {
      setFormData({
        id: doc.id,
        name: doc.name,
        document_type: doc.document_type,
        frequency: doc.frequency || '',
        expiration_date: doc.expiration_date,
        alert_lead_days: doc.alert_lead_days,
        plant_id: doc.plant_id,
      })
    } else {
      setFormData({
        id: '',
        name: '',
        document_type: '',
        frequency: '',
        expiration_date: '',
        alert_lead_days: 30,
        plant_id: selectedPlant !== 'all' ? selectedPlant : '',
      })
    }
    setIsModalOpen(true)
  }

  const handleSave = async () => {
    if (
      !formData.name ||
      !formData.document_type ||
      !formData.expiration_date ||
      !formData.plant_id
    ) {
      toast({
        title: 'Aviso',
        description: 'Preencha os campos obrigatórios (*).',
        variant: 'destructive',
      })
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()

    if (!profile?.client_id) {
      toast({ title: 'Erro', description: 'Cliente não encontrado.', variant: 'destructive' })
      return
    }

    const payload = {
      client_id: profile.client_id,
      plant_id: formData.plant_id,
      name: formData.name,
      document_type: formData.document_type,
      frequency: formData.frequency,
      expiration_date: formData.expiration_date,
      alert_lead_days: formData.alert_lead_days,
    }

    if (formData.id) {
      const { error } = await supabase
        .from('sector_documents')
        .update(payload)
        .eq('id', formData.id)
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Sucesso', description: 'Documento atualizado com sucesso.' })
        setIsModalOpen(false)
        fetchDocuments()
      }
    } else {
      const { error } = await supabase.from('sector_documents').insert([payload])
      if (error) {
        toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      } else {
        toast({ title: 'Sucesso', description: 'Documento registrado com sucesso.' })
        setIsModalOpen(false)
        fetchDocuments()
      }
    }
  }

  const handleDelete = async (id: string) => {
    if (
      !window.confirm(
        'Tem certeza que deseja excluir este documento? Essa ação não pode ser desfeita.',
      )
    )
      return
    const { error } = await supabase.from('sector_documents').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Documento excluído com sucesso.' })
      fetchDocuments()
    }
  }

  const filteredDocuments = documents.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" />
            Gestão de Documentos
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Acompanhe os vencimentos, SLAs e status de compliance.
          </p>
        </div>
        <Button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Documento
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            placeholder="Buscar por nome ou tipo do documento..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
        <Select value={selectedPlant} onValueChange={setSelectedPlant}>
          <SelectTrigger className="w-full sm:w-[280px] bg-white">
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

      <div className="bg-white rounded-xl border shadow-sm">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50 border-b">
                <TableHead className="font-semibold text-slate-700 min-w-[200px]">
                  Nome do Documento
                </TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[150px]">Tipo</TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[140px]">
                  Data de Vencimento
                </TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[120px]">
                  Periodicidade
                </TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[100px]">SLA</TableHead>
                <TableHead className="font-semibold text-slate-700 min-w-[100px]">Status</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-slate-500">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-2"></div>
                      Carregando documentos...
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDocuments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-slate-500">
                    <AlertCircle className="h-8 w-8 mx-auto text-slate-400 mb-3" />
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocuments.map((doc) => {
                  const { slaText, slaDays, status, color } = getStatusAndSLA(doc)
                  return (
                    <TableRow key={doc.id} className="group hover:bg-slate-50/50">
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900">{doc.name}</span>
                          {selectedPlant === 'all' && doc.plants && (
                            <span className="text-xs text-slate-500 mt-0.5">{doc.plants.name}</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{doc.document_type}</TableCell>
                      <TableCell className="text-slate-700 font-medium">
                        {doc.expiration_date
                          ? format(parseISO(doc.expiration_date), 'dd/MM/yyyy', { locale: ptBR })
                          : '-'}
                      </TableCell>
                      <TableCell className="text-slate-600 capitalize">
                        {doc.frequency || '-'}
                      </TableCell>
                      <TableCell>
                        <span
                          className={cn(
                            'font-semibold whitespace-nowrap',
                            slaDays < 0 ? 'text-red-600' : 'text-slate-700',
                          )}
                        >
                          {slaText}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('whitespace-nowrap font-medium', color)}
                        >
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-primary"
                            onClick={() => handleOpenModal(doc)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-red-600"
                            onClick={() => handleDelete(doc.id)}
                          >
                            <Trash2 className="h-4 w-4" />
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
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle className="text-xl">
              {formData.id ? 'Editar Documento' : 'Novo Documento'}
            </DialogTitle>
          </DialogHeader>
          <div className="grid gap-5 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome do Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Ex: Auto de Vistoria (AVCB)"
                value={formData.name}
                onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">
                  Tipo <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="document_type"
                  placeholder="Ex: Licença, Alvará..."
                  value={formData.document_type}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, document_type: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="frequency">Periodicidade</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(val) => setFormData((prev) => ({ ...prev, frequency: val }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Anual">Anual</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Única">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="expiration_date">
                  Data de Vencimento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="expiration_date"
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, expiration_date: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert_lead_days">Avisar antecedência (dias)</Label>
                <Input
                  id="alert_lead_days"
                  type="number"
                  min="0"
                  value={formData.alert_lead_days}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      alert_lead_days: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="plant_id">
                Planta Relacionada <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.plant_id}
                onValueChange={(val) => setFormData((prev) => ({ ...prev, plant_id: val }))}
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave}>Salvar Documento</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
