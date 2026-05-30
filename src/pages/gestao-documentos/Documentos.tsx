import { useState } from 'react'
import { Plus, Search, FileText, Download, Edit2, Trash2, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Label } from '@/components/ui/label'
import { useCrud } from '@/hooks/use-crud'
import { useToast } from '@/components/ui/use-toast'
import { differenceInDays, parseISO, format } from 'date-fns'
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
import { cn } from '@/lib/utils'

export default function Documentos() {
  const { data: documents, loading, add, update, remove } = useCrud<any>('sector_documents')
  const { data: plants } = useCrud<any>('plants')
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('all')

  const [isAddOpen, setIsAddOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)

  const [selectedDoc, setSelectedDoc] = useState<any>(null)

  const [formData, setFormData] = useState({
    name: '',
    document_type: '',
    plant_id: '',
    expiration_date: '',
    alert_lead_days: 30,
    frequency: 'Anual',
  })
  const [isSubmitting, setIsSubmitting] = useState(false)

  const filteredDocs = documents.filter((doc) => {
    const matchesSearch =
      doc.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.document_type?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesPlant = selectedPlant === 'all' || doc.plant_id === selectedPlant
    return matchesSearch && matchesPlant
  })

  function getSlaStatus(expirationDate: string, alertLeadDays: number) {
    if (!expirationDate) return { label: '-', color: 'bg-gray-100 text-gray-800 border-gray-200' }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const expDate = parseISO(expirationDate)
    expDate.setHours(0, 0, 0, 0)

    const diffDays = differenceInDays(expDate, today)

    if (diffDays <= 0) {
      return {
        label: `${diffDays} dias`,
        color: 'bg-red-100 text-red-800 border-red-300 font-medium',
      }
    } else if (diffDays <= alertLeadDays) {
      return {
        label: `${diffDays} dias`,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-medium',
      }
    } else {
      return {
        label: `${diffDays} dias`,
        color: 'bg-green-100 text-green-800 border-green-300 font-medium',
      }
    }
  }

  const handleDownload = (doc: any) => {
    let url = doc.file_url
    if (!url && doc.file_urls && Array.isArray(doc.file_urls) && doc.file_urls.length > 0) {
      url = doc.file_urls[0]
    }
    if (url) {
      window.open(url, '_blank')
    } else {
      toast({
        title: 'Arquivo indisponível',
        description: 'Não há arquivo associado a este documento.',
        variant: 'destructive',
      })
    }
  }

  const openAdd = () => {
    setFormData({
      name: '',
      document_type: '',
      plant_id: '',
      expiration_date: '',
      alert_lead_days: 30,
      frequency: 'Anual',
    })
    setIsAddOpen(true)
  }

  const openEdit = (doc: any) => {
    setSelectedDoc(doc)
    setFormData({
      name: doc.name || '',
      document_type: doc.document_type || '',
      plant_id: doc.plant_id || '',
      expiration_date: doc.expiration_date ? doc.expiration_date.split('T')[0] : '',
      alert_lead_days: doc.alert_lead_days || 30,
      frequency: doc.frequency || 'Anual',
    })
    setIsEditOpen(true)
  }

  const openDelete = (doc: any) => {
    setSelectedDoc(doc)
    setIsDeleteOpen(true)
  }

  const handleAddSubmit = async () => {
    if (
      !formData.name ||
      !formData.document_type ||
      !formData.plant_id ||
      !formData.expiration_date
    ) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    const { success, error } = await add(formData)
    setIsSubmitting(false)

    if (success) {
      toast({ title: 'Documento adicionado com sucesso' })
      setIsAddOpen(false)
    } else {
      toast({ title: 'Erro ao adicionar', description: error?.message, variant: 'destructive' })
    }
  }

  const handleEditSubmit = async () => {
    if (!formData.name || !formData.document_type || !formData.expiration_date) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    const payload = {
      name: formData.name,
      document_type: formData.document_type,
      expiration_date: formData.expiration_date,
      alert_lead_days: Number(formData.alert_lead_days),
      frequency: formData.frequency,
    }
    const { success, error } = await update(selectedDoc.id, payload)
    setIsSubmitting(false)

    if (success) {
      toast({ title: 'Documento atualizado com sucesso' })
      setIsEditOpen(false)
    } else {
      toast({ title: 'Erro ao atualizar', description: error?.message, variant: 'destructive' })
    }
  }

  const handleDeleteConfirm = async () => {
    setIsSubmitting(true)
    const { success, error } = await remove(selectedDoc.id)
    setIsSubmitting(false)

    if (success) {
      toast({ title: 'Documento excluído com sucesso' })
      setIsDeleteOpen(false)
    } else {
      toast({ title: 'Erro ao excluir', description: error?.message, variant: 'destructive' })
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Documentos</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os documentos do setor e acompanhe os prazos de validade.
          </p>
        </div>
        <Button onClick={openAdd} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <CardTitle>Documentos Cadastrados</CardTitle>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar documento..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
              <Select value={selectedPlant} onValueChange={setSelectedPlant}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filtrar por Planta" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Plantas</SelectItem>
                  {plants.map((plant: any) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Planta</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status/SLA</TableHead>
                  <TableHead className="w-[80px]">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhum documento encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredDocs.map((doc: any) => {
                    const plant = plants.find((p: any) => p.id === doc.plant_id)
                    const sla = getSlaStatus(doc.expiration_date, doc.alert_lead_days)
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4 text-blue-500" />
                            {doc.name}
                          </div>
                        </TableCell>
                        <TableCell>{doc.document_type}</TableCell>
                        <TableCell>{plant?.name || '-'}</TableCell>
                        <TableCell>{doc.frequency || 'Anual'}</TableCell>
                        <TableCell>
                          {doc.expiration_date
                            ? format(parseISO(doc.expiration_date), 'dd/MM/yyyy')
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={cn('whitespace-nowrap', sla.color)}>
                            {sla.label}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => handleDownload(doc)}>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(doc)}>
                                <Edit2 className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => openDelete(doc)}
                                className="text-red-600 focus:text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Excluir
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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

      {/* Add Modal */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome do Documento</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: PPRA 2024"
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de Documento</Label>
              <Input
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                placeholder="Ex: PPRA, PCMSO, LTCAT"
              />
            </div>
            <div className="grid gap-2">
              <Label>Planta</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((plant: any) => (
                    <SelectItem key={plant.id} value={plant.id}>
                      {plant.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Aviso de Vencimento (Dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.alert_lead_days}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_lead_days: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Periodicidade</Label>
              <Select
                value={formData.frequency}
                onValueChange={(v) => setFormData({ ...formData, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a periodicidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="Bianual">Bianual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAddSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Documento</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Nome do Documento</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label>Tipo de Documento</Label>
              <Input
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                />
              </div>
              <div className="grid gap-2">
                <Label>Aviso de Vencimento (Dias)</Label>
                <Input
                  type="number"
                  min="1"
                  value={formData.alert_lead_days}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_lead_days: Number(e.target.value) })
                  }
                />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Periodicidade</Label>
              <Select
                value={formData.frequency}
                onValueChange={(v) => setFormData({ ...formData, frequency: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a periodicidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Mensal">Mensal</SelectItem>
                  <SelectItem value="Trimestral">Trimestral</SelectItem>
                  <SelectItem value="Semestral">Semestral</SelectItem>
                  <SelectItem value="Anual">Anual</SelectItem>
                  <SelectItem value="Bianual">Bianual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleEditSubmit} disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento <strong>{selectedDoc?.name}</strong>? Esta
              ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
