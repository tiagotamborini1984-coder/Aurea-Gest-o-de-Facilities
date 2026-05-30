import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { startOfDay, differenceInDays } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import {
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Plus,
  Trash2,
  Edit,
  Download,
} from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'
import type { Database } from '@/lib/supabase/types'

type SectorDocument = Database['public']['Tables']['sector_documents']['Row']
type Plant = Database['public']['Tables']['plants']['Row']

function getSLA(doc: SectorDocument) {
  if (!doc.expiration_date)
    return {
      status: 'N/A',
      text: 'Sem vencimento',
      color: 'bg-slate-100 text-slate-600 border-slate-200',
    }

  const today = startOfDay(new Date())
  const [year, month, day] = doc.expiration_date.split('-').map(Number)
  const expDate = new Date(year, month - 1, day)

  const remainingDays = differenceInDays(expDate, today)

  if (remainingDays < 0) {
    const absDays = Math.abs(remainingDays)
    return {
      status: 'Vencidos',
      text: `Vencido há ${absDays} ${absDays === 1 ? 'dia' : 'dias'}`,
      color: 'bg-red-100 text-red-800 border-red-300',
    }
  } else if (remainingDays <= doc.alert_lead_days) {
    return {
      status: 'Atenção',
      text:
        remainingDays === 0
          ? 'Vence hoje'
          : `Vence em ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`,
      color: 'bg-amber-100 text-amber-800 border-amber-300',
    }
  } else {
    return {
      status: 'Em dia',
      text: `Vence em ${remainingDays} ${remainingDays === 1 ? 'dia' : 'dias'}`,
      color: 'bg-green-100 text-green-800 border-green-300',
    }
  }
}

export default function Documentos() {
  const [documents, setDocuments] = useState<SectorDocument[]>([])
  const [plants, setPlants] = useState<Plant[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    document_type: '',
    expiration_date: '',
    alert_lead_days: 30,
    plant_id: '',
    file_url: '',
  })

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
      fetchDocuments()
    }
  }, [activeClient])

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*').eq('client_id', activeClient?.id)
    if (data) {
      setPlants(data)
      if (data.length > 0 && !formData.plant_id) {
        setFormData((prev) => ({ ...prev, plant_id: data[0].id }))
      }
    }
  }

  const fetchDocuments = async () => {
    const { data } = await supabase
      .from('sector_documents')
      .select('*')
      .eq('client_id', activeClient?.id)
      .order('expiration_date', { ascending: true })
    if (data) setDocuments(data)
  }

  const filteredDocuments = documents.filter(
    (doc) => selectedPlant === 'all' || doc.plant_id === selectedPlant,
  )

  const stats = filteredDocuments.reduce(
    (acc, doc) => {
      const sla = getSLA(doc)
      acc.total++
      if (sla.status === 'Em dia') acc.emDia++
      else if (sla.status === 'Atenção') acc.atencao++
      else if (sla.status === 'Vencidos') acc.vencidos++
      return acc
    },
    { total: 0, emDia: 0, atencao: 0, vencidos: 0 },
  )

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      document_type: '',
      expiration_date: '',
      alert_lead_days: 30,
      plant_id: plants.length > 0 ? plants[0].id : '',
      file_url: '',
    })
  }

  const handleEdit = (doc: SectorDocument) => {
    setFormData({
      id: doc.id,
      name: doc.name,
      document_type: doc.document_type,
      expiration_date: doc.expiration_date,
      alert_lead_days: doc.alert_lead_days,
      plant_id: doc.plant_id,
      file_url: doc.file_url || '',
    })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return

    const { error } = await supabase.from('sector_documents').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao excluir', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Documento excluído com sucesso.' })
      fetchDocuments()
    }
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!activeClient) return

    const payload = {
      client_id: activeClient.id,
      name: formData.name,
      document_type: formData.document_type,
      expiration_date: formData.expiration_date,
      alert_lead_days: formData.alert_lead_days,
      plant_id: formData.plant_id,
      file_url: formData.file_url || null,
    }

    if (formData.id) {
      const { error } = await supabase
        .from('sector_documents')
        .update(payload)
        .eq('id', formData.id)
      if (error)
        toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Documento atualizado.' })
        setIsOpen(false)
        fetchDocuments()
      }
    } else {
      const { error } = await supabase.from('sector_documents').insert(payload)
      if (error)
        toast({ title: 'Erro ao criar', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Documento criado.' })
        setIsOpen(false)
        fetchDocuments()
      }
    }
  }

  const getPlantName = (id: string) => plants.find((p) => p.id === id)?.name || '-'

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-full">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gestão de Documentos</h1>
          <p className="text-slate-500 mt-1">Acompanhamento e SLA de vencimento de documentos.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-[200px] bg-white">
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
          <Dialog
            open={isOpen}
            onOpenChange={(v) => {
              setIsOpen(v)
              if (!v) resetForm()
            }}
          >
            <DialogTrigger asChild>
              <Button className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Novo Documento
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>{formData.id ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
              </DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nome do Documento</Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Alvará de Funcionamento"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Documento</Label>
                  <Input
                    required
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    placeholder="Ex: Alvará, AVCB, Licença"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Data de Vencimento</Label>
                    <Input
                      type="date"
                      required
                      value={formData.expiration_date}
                      onChange={(e) =>
                        setFormData({ ...formData, expiration_date: e.target.value })
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Alerta (dias antes)</Label>
                    <Input
                      type="number"
                      min="1"
                      required
                      value={formData.alert_lead_days}
                      onChange={(e) =>
                        setFormData({ ...formData, alert_lead_days: Number(e.target.value) })
                      }
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Planta</Label>
                  <Select
                    required
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
                  <Label>URL do Arquivo (Opcional)</Label>
                  <Input
                    type="url"
                    value={formData.file_url}
                    onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                    placeholder="https://..."
                  />
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancelar
                  </Button>
                  <Button type="submit" className="bg-brand-vividBlue hover:bg-brand-deepBlue">
                    Salvar
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">
              Total de Documentos
            </CardTitle>
            <FileText className="h-4 w-4 text-slate-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Em Dia</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{stats.emDia}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Atenção</CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.atencao}</div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border-slate-200/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-slate-600">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-rose-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-rose-600">{stats.vencidos}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm border-slate-200/60">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50">
              <TableHead>Nome do Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>SLA / Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredDocuments.map((doc) => {
                const sla = getSLA(doc)
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium text-slate-800">{doc.name}</TableCell>
                    <TableCell className="text-slate-600">{doc.document_type}</TableCell>
                    <TableCell className="text-slate-600">{getPlantName(doc.plant_id)}</TableCell>
                    <TableCell className="text-slate-600">
                      {doc.expiration_date.split('-').reverse().join('/')}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          'whitespace-nowrap font-medium px-2 py-0.5 shadow-sm',
                          sla.color,
                        )}
                      >
                        {sla.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-slate-500 hover:text-brand-vividBlue"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-brand-vividBlue"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-slate-500 hover:text-rose-500"
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
      </Card>
    </div>
  )
}
