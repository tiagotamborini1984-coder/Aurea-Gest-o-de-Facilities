import { useState, useMemo } from 'react'
import { Plus, Search, Trash2, Edit, FileText, MoreVertical } from 'lucide-react'
import { format, isBefore, addDays, parseISO } from 'date-fns'
import { useCrud } from '@/hooks/use-crud'
import { useAppStore } from '@/store/AppContext'
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { FileUpload } from '@/components/FileUpload'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Documentos() {
  const { profile, selectedMasterClient } = useAppStore()
  const { data: documents, loading, add, update, remove } = useCrud<any>('sector_documents')
  const { data: plants } = useCrud<any>('plants')
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [selectedPlant, setSelectedPlant] = useState('all')

  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultForm = {
    name: '',
    document_type: 'Alvará',
    plant_id: '',
    expiration_date: '',
    alert_lead_days: 30,
    file_urls: [] as string[],
    frequency: 'Anual',
  }

  const [formData, setFormData] = useState(defaultForm)

  const handleOpenDialog = (doc?: any) => {
    if (doc) {
      setEditingDoc(doc)
      setFormData({
        name: doc.name || '',
        document_type: doc.document_type || 'Alvará',
        plant_id: doc.plant_id || '',
        expiration_date: doc.expiration_date || '',
        alert_lead_days: doc.alert_lead_days || 30,
        file_urls: Array.isArray(doc.file_urls)
          ? doc.file_urls
          : doc.file_url
            ? [doc.file_url]
            : [],
        frequency: doc.frequency || 'Anual',
      })
    } else {
      setEditingDoc(null)
      setFormData(defaultForm)
    }
    setIsDialogOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const payload = {
        name: formData.name,
        document_type: formData.document_type,
        plant_id: formData.plant_id,
        expiration_date: formData.expiration_date,
        alert_lead_days: Number(formData.alert_lead_days),
        frequency: formData.frequency,
        file_urls: formData.file_urls,
        file_url: formData.file_urls.length > 0 ? formData.file_urls[0] : null,
        client_id: profile?.role === 'Master' ? selectedMasterClient : profile?.client_id,
      }

      if (editingDoc) {
        const { success, error } = await update(editingDoc.id, payload)
        if (success) {
          toast({ title: 'Documento atualizado com sucesso' })
          setIsDialogOpen(false)
        } else throw error
      } else {
        const { success, error } = await add(payload)
        if (success) {
          toast({ title: 'Documento criado com sucesso' })
          setIsDialogOpen(false)
        } else throw error
      }
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar documento',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    const { success, error } = await remove(id)
    if (success) {
      toast({ title: 'Documento excluído' })
    } else {
      toast({ title: 'Erro ao excluir', description: error?.message, variant: 'destructive' })
    }
  }

  const getStatus = (doc: any) => {
    if (!doc.expiration_date) return { label: 'Regular', color: 'bg-green-500' }

    const expDate = parseISO(doc.expiration_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (isBefore(expDate, today)) {
      return { label: 'Vencido', color: 'bg-red-500' }
    }

    const alertDate = addDays(today, doc.alert_lead_days || 30)
    if (isBefore(expDate, alertDate) || expDate.getTime() === alertDate.getTime()) {
      return { label: 'Vence em breve', color: 'bg-orange-500' }
    }

    return { label: 'Regular', color: 'bg-green-500' }
  }

  const filteredDocs = useMemo(() => {
    return documents.filter((doc: any) => {
      const matchesSearch =
        doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        doc.document_type.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesPlant = selectedPlant === 'all' || doc.plant_id === selectedPlant
      return matchesSearch && matchesPlant
    })
  }, [documents, searchTerm, selectedPlant])

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            Gestão de Documentos
          </h1>
          <p className="text-muted-foreground mt-1">
            Gerencie alvarás, licenças e outros documentos do setor
          </p>
        </div>
        <Button
          onClick={() => handleOpenDialog()}
          className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white shadow-md"
        >
          <Plus className="h-5 w-5 mr-2" />
          Novo Documento
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
        <Select value={selectedPlant} onValueChange={setSelectedPlant}>
          <SelectTrigger className="w-[200px] bg-background">
            <SelectValue placeholder="Todas as Plantas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Plantas</SelectItem>
            {plants.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Anexos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                  Carregando documentos...
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
                const status = getStatus(doc)
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.document_type}</TableCell>
                    <TableCell>
                      {plants.find((p: any) => p.id === doc.plant_id)?.name || 'N/A'}
                    </TableCell>
                    <TableCell>
                      {doc.expiration_date
                        ? format(parseISO(doc.expiration_date), 'dd/MM/yyyy')
                        : 'N/A'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`${status.color} text-white border-none shadow-sm`}>
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.file_urls && doc.file_urls.length > 0 ? (
                        <div className="flex -space-x-2">
                          {doc.file_urls.slice(0, 3).map((url: string, i: number) => (
                            <a
                              key={i}
                              href={url}
                              target="_blank"
                              rel="noreferrer"
                              className="h-8 w-8 rounded-full bg-card border-2 border-background flex items-center justify-center hover:bg-brand-vividBlue/20 hover:border-brand-vividBlue/50 transition-colors z-10 shadow-sm"
                              title="Ver anexo"
                            >
                              <FileText className="h-3.5 w-3.5 text-brand-vividBlue" />
                            </a>
                          ))}
                          {doc.file_urls.length > 3 && (
                            <div className="h-8 w-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-bold text-muted-foreground z-0 shadow-sm">
                              +{doc.file_urls.length - 3}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground font-medium">
                          Sem anexos
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            className="h-8 w-8 p-0 hover:bg-brand-vividBlue/10 hover:text-brand-vividBlue"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => handleOpenDialog(doc)}
                            className="cursor-pointer"
                          >
                            <Edit className="h-4 w-4 mr-2 text-brand-vividBlue" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => handleDelete(doc.id)}
                            className="text-destructive focus:text-destructive cursor-pointer"
                          >
                            <Trash2 className="h-4 w-4 mr-2" /> Excluir
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

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] bg-card p-0 overflow-hidden border-border shadow-xl">
          <DialogHeader className="p-6 pb-0">
            <DialogTitle className="text-xl font-bold">
              {editingDoc ? 'Editar Documento' : 'Novo Documento'}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="p-6 pt-4 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Nome do Documento</Label>
                <Input
                  required
                  placeholder="Ex: AVCB Prédio Principal"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(v) => setFormData({ ...formData, document_type: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alvará">Alvará</SelectItem>
                    <SelectItem value="Licença">Licença</SelectItem>
                    <SelectItem value="AVCB">AVCB</SelectItem>
                    <SelectItem value="PGRS">PGRS</SelectItem>
                    <SelectItem value="Contrato">Contrato</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Planta (Local)</Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Data de Vencimento</Label>
                <Input
                  type="date"
                  required
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Avisar Vencimento (Dias antes)</Label>
                <Input
                  type="number"
                  required
                  min={1}
                  value={formData.alert_lead_days}
                  onChange={(e) =>
                    setFormData({ ...formData, alert_lead_days: Number(e.target.value) })
                  }
                />
              </div>

              <div className="space-y-2">
                <Label>Frequência de Renovação</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                    <SelectItem value="Única">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-2 space-y-2 pt-4 border-t border-border mt-2">
                <Label className="text-base font-semibold">Anexos do Documento</Label>
                <FileUpload
                  existingUrls={formData.file_urls}
                  onUploadComplete={(urls) => setFormData({ ...formData, file_urls: urls })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-6 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsDialogOpen(false)}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
              >
                {isSubmitting ? 'Salvando...' : 'Salvar Documento'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
