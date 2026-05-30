import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Plus,
  Edit2,
  Trash2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileDown,
  Search,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { useToast } from '@/components/ui/use-toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { format, differenceInDays } from 'date-fns'

type SectorDocument = {
  id: string
  client_id: string
  plant_id: string
  name: string
  document_type: string
  expiration_date: string
  alert_lead_days: number
  file_url: string | null
  created_at: string
}

export default function Documentos() {
  const { profile, selectedMasterClient, selectedPlant } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<SectorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const [formData, setFormData] = useState<Partial<SectorDocument>>({
    name: '',
    document_type: '',
    expiration_date: '',
    alert_lead_days: 30,
    plant_id: '',
    file_url: '',
  })

  const fetchDocuments = async () => {
    if (!profile) return
    setLoading(true)

    let q = supabase.from('sector_documents').select('*')

    if (profile.role === 'Master') {
      if (selectedMasterClient !== 'all') {
        q = q.eq('client_id', selectedMasterClient)
      }
    } else {
      q = q.eq('client_id', profile.client_id)
    }

    const { data, error } = await q.order('expiration_date', { ascending: true })

    if (error) {
      console.error(error)
    } else {
      setDocuments(data || [])
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchDocuments()
  }, [profile, selectedMasterClient])

  const filteredDocuments = documents.filter((doc) => {
    const matchesPlant = selectedPlant === 'all' || doc.plant_id === selectedPlant
    const matchesSearch =
      doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
    return matchesPlant && matchesSearch
  })

  // Calculations for indicators
  const today = new Date()
  let okCount = 0
  let warningCount = 0
  let expiredCount = 0

  filteredDocuments.forEach((doc) => {
    const expDate = new Date(doc.expiration_date + 'T00:00:00')
    const diff = differenceInDays(expDate, today)
    if (diff < 0) {
      expiredCount++
    } else if (diff <= doc.alert_lead_days) {
      warningCount++
    } else {
      okCount++
    }
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (
      !formData.name ||
      !formData.document_type ||
      !formData.expiration_date ||
      !formData.plant_id
    ) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Por favor, preencha todos os campos obrigatórios (incluindo Planta).',
        variant: 'destructive',
      })
      return
    }

    try {
      const payload = {
        ...formData,
        client_id:
          profile?.role === 'Master' && selectedMasterClient !== 'all'
            ? selectedMasterClient
            : profile?.client_id,
      }

      if (isEditing && formData.id) {
        const { error } = await supabase
          .from('sector_documents')
          .update({
            name: formData.name,
            document_type: formData.document_type,
            expiration_date: formData.expiration_date,
            alert_lead_days: formData.alert_lead_days,
            plant_id: formData.plant_id,
            file_url: formData.file_url,
          })
          .eq('id', formData.id)

        if (error) throw error
        toast({ title: 'Documento atualizado com sucesso.' })
      } else {
        const { error } = await supabase.from('sector_documents').insert(payload)

        if (error) throw error
        toast({ title: 'Documento criado com sucesso.' })
      }

      setIsModalOpen(false)
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const handleEdit = (doc: SectorDocument) => {
    setFormData(doc)
    setIsEditing(true)
    setIsModalOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return

    try {
      const { error } = await supabase.from('sector_documents').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Documento excluído com sucesso.' })
      fetchDocuments()
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      })
    }
  }

  const openNewModal = () => {
    setFormData({
      name: '',
      document_type: '',
      expiration_date: '',
      alert_lead_days: 30,
      plant_id: selectedPlant !== 'all' ? selectedPlant : '',
      file_url: '',
    })
    setIsEditing(false)
    setIsModalOpen(true)
  }

  const getStatusColor = (doc: SectorDocument) => {
    const expDate = new Date(doc.expiration_date + 'T00:00:00')
    const diff = differenceInDays(expDate, today)
    if (diff < 0) return 'text-red-600 bg-red-100 dark:bg-red-900/30 dark:text-red-400'
    if (diff <= doc.alert_lead_days)
      return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/30 dark:text-yellow-400'
    return 'text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400'
  }

  const getStatusText = (doc: SectorDocument) => {
    const expDate = new Date(doc.expiration_date + 'T00:00:00')
    const diff = differenceInDays(expDate, today)
    if (diff < 0) return 'Vencido'
    if (diff <= doc.alert_lead_days) return 'Atenção'
    return 'Em dia'
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in-up">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gestão de Documentos
          </h1>
          <p className="text-muted-foreground mt-1">Gerencie os documentos e suas validades</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={openNewModal}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Documento
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Em Dia</p>
                <h3 className="text-3xl font-bold text-green-600 dark:text-green-500">{okCount}</h3>
              </div>
              <div className="p-3 bg-green-100 dark:bg-green-900/20 rounded-full">
                <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">
                  Atenção (Próximos ao Vencimento)
                </p>
                <h3 className="text-3xl font-bold text-yellow-600 dark:text-yellow-500">
                  {warningCount}
                </h3>
              </div>
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/20 rounded-full">
                <AlertTriangle className="h-6 w-6 text-yellow-600 dark:text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Vencidos</p>
                <h3 className="text-3xl font-bold text-red-600 dark:text-red-500">
                  {expiredCount}
                </h3>
              </div>
              <div className="p-3 bg-red-100 dark:bg-red-900/20 rounded-full">
                <XCircle className="h-6 w-6 text-red-600 dark:text-red-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm bg-card overflow-hidden">
        <CardHeader className="border-b border-border/50 bg-muted/20 pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Documentos Registrados
            </CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar documento..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 bg-background"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="font-semibold text-foreground">Documento</TableHead>
                  <TableHead className="font-semibold text-foreground">Planta</TableHead>
                  <TableHead className="font-semibold text-foreground">Tipo</TableHead>
                  <TableHead className="font-semibold text-foreground text-center">
                    Vencimento
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-center">
                    Status
                  </TableHead>
                  <TableHead className="font-semibold text-foreground text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Carregando documentos...
                    </TableCell>
                  </TableRow>
                ) : filteredDocuments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      Nenhum documento encontrado para a planta ativa.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocuments.map((doc) => (
                    <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>
                        {plants.find((p) => p.id === doc.plant_id)?.name || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                          {doc.document_type}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        {format(new Date(doc.expiration_date + 'T00:00:00'), 'dd/MM/yyyy')}
                      </TableCell>
                      <TableCell className="text-center">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(doc)}`}
                        >
                          {getStatusText(doc)}
                        </span>
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {doc.file_url && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-primary"
                            asChild
                          >
                            <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                              <FileDown className="h-4 w-4" />
                            </a>
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/30"
                          onClick={() => handleEdit(doc)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/30"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4" />
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

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">
                Nome do Documento <span className="text-red-500">*</span>
              </Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="plant_id">
                Planta <span className="text-red-500">*</span>
              </Label>
              <Select
                value={formData.plant_id || ''}
                onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
                required
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

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="document_type">
                  Tipo de Documento <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="document_type"
                  value={formData.document_type || ''}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  placeholder="Ex: AVCB, Alvará"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="alert_lead_days">Aviso Antecipado (Dias)</Label>
                <Input
                  id="alert_lead_days"
                  type="number"
                  min="0"
                  value={formData.alert_lead_days || 30}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_lead_days: parseInt(e.target.value) })
                  }
                />
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
                  value={formData.expiration_date || ''}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="file_url">URL do Arquivo (Opcional)</Label>
                <Input
                  id="file_url"
                  type="url"
                  placeholder="https://..."
                  value={formData.file_url || ''}
                  onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">{isEditing ? 'Salvar Alterações' : 'Criar Documento'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
