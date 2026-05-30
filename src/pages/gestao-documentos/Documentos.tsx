import { useState } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Search, Plus, Download, Trash2, FileText, FileDown } from 'lucide-react'
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
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export default function Documentos() {
  const { data: documents, loading, add, remove } = useCrud<any>('sector_documents')
  const { data: plants } = useCrud<any>('plants')
  const { toast } = useToast()

  const [search, setSearch] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [formData, setFormData] = useState<any>({
    name: '',
    document_type: 'Alvará',
    plant_id: '',
    expiration_date: '',
    alert_lead_days: 30,
    frequency: 'Anual',
    file_url: '',
  })

  const [uploading, setUploading] = useState(false)

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    const fileExt = file.name.split('.').pop()
    const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`
    const filePath = `documents/${fileName}`

    const { error: uploadError } = await supabase.storage.from('attachments').upload(filePath, file)

    if (uploadError) {
      toast({
        title: 'Erro',
        description: 'Erro ao fazer upload do arquivo',
        variant: 'destructive',
      })
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage.from('attachments').getPublicUrl(filePath)

    setFormData((prev: any) => ({ ...prev, file_url: publicUrl.publicUrl }))
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!formData.name || !formData.plant_id || !formData.expiration_date) {
      toast({ title: 'Atenção', description: 'Preencha os campos obrigatórios' })
      return
    }

    const { success } = await add(formData)
    if (success) {
      toast({ title: 'Sucesso', description: 'Documento salvo com sucesso' })
      setIsModalOpen(false)
      setFormData({
        name: '',
        document_type: 'Alvará',
        plant_id: '',
        expiration_date: '',
        alert_lead_days: 30,
        frequency: 'Anual',
        file_url: '',
      })
    } else {
      toast({ title: 'Erro', description: 'Erro ao salvar documento', variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (confirm('Deseja realmente excluir este documento?')) {
      await remove(id)
      toast({ title: 'Sucesso', description: 'Documento excluído' })
    }
  }

  const filteredDocs = documents.filter(
    (d) =>
      d.name?.toLowerCase().includes(search.toLowerCase()) ||
      d.document_type?.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Gestão de Documentos</h1>
          <p className="text-slate-500 mt-1">
            Gerencie alvarás, licenças e certificados da operação
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Buscar documentos..."
              className="pl-9 bg-white"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white shrink-0 shadow-sm transition-all"
          >
            <Plus className="h-4 w-4 mr-2" />
            Novo
          </Button>
        </div>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50/80 border-b">
              <TableRow>
                <TableHead className="font-semibold text-slate-700">Documento</TableHead>
                <TableHead className="font-semibold text-slate-700">Planta</TableHead>
                <TableHead className="font-semibold text-slate-700">Periodicidade</TableHead>
                <TableHead className="font-semibold text-slate-700">Vencimento</TableHead>
                <TableHead className="font-semibold text-slate-700">SLA</TableHead>
                <TableHead className="font-semibold text-slate-700">Status</TableHead>
                <TableHead className="font-semibold text-slate-700 text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-12 text-slate-500">
                    <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p>Nenhum documento encontrado.</p>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  let diffDays = 0
                  let expDateObj = new Date()

                  if (doc.expiration_date) {
                    const [year, month, day] = doc.expiration_date.split('-')
                    expDateObj = new Date(Number(year), Number(month) - 1, Number(day))
                    const today = new Date()
                    today.setHours(0, 0, 0, 0)
                    const diffTime = expDateObj.getTime() - today.getTime()
                    diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24))
                  }

                  let status = 'Válido'
                  let badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  let slaColor = 'text-emerald-600 font-medium'
                  let slaText = `${diffDays} dias`

                  if (diffDays < 0) {
                    status = 'Vencido'
                    badgeColor = 'bg-rose-100 text-rose-800 border-rose-200'
                    slaColor = 'text-rose-600 font-bold'
                  } else if (diffDays <= (doc.alert_lead_days || 30)) {
                    status = 'A Vencer'
                    badgeColor = 'bg-amber-100 text-amber-800 border-amber-200'
                    slaColor = 'text-amber-600 font-semibold'
                  }

                  const plant = plants.find((p) => p.id === doc.plant_id)

                  const fileUrls: string[] = []
                  if (doc.file_url) fileUrls.push(doc.file_url)
                  if (doc.file_urls && Array.isArray(doc.file_urls)) {
                    doc.file_urls.forEach((url: string) => {
                      if (!fileUrls.includes(url)) fileUrls.push(url)
                    })
                  }

                  return (
                    <TableRow key={doc.id} className="hover:bg-slate-50/50 transition-colors group">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center border border-indigo-100/50 shrink-0">
                            <FileText className="h-5 w-5 text-indigo-500" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900">{doc.name}</p>
                            <p className="text-xs text-slate-500">{doc.document_type}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-slate-600">{plant?.name || 'Geral'}</TableCell>
                      <TableCell className="text-slate-600">{doc.frequency || '-'}</TableCell>
                      <TableCell className="text-slate-600 font-medium">
                        {doc.expiration_date ? expDateObj.toLocaleDateString('pt-BR') : '-'}
                      </TableCell>
                      <TableCell>
                        <span className={slaColor}>{slaText}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={badgeColor}>
                          {status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          {fileUrls.length === 1 ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              className="text-slate-500 hover:text-brand-vividBlue hover:bg-blue-50"
                              onClick={() => window.open(fileUrls[0], '_blank')}
                              title="Baixar arquivo"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                          ) : fileUrls.length > 1 ? (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="text-slate-500 hover:text-brand-vividBlue hover:bg-blue-50"
                                  title="Baixar arquivos"
                                >
                                  <FileDown className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {fileUrls.map((url, i) => (
                                  <DropdownMenuItem
                                    key={i}
                                    onClick={() => window.open(url, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Arquivo {i + 1}
                                  </DropdownMenuItem>
                                ))}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          ) : null}

                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                            onClick={() => handleDelete(doc.id)}
                            title="Excluir"
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
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Novo Documento</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nome do Documento *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Alvará de Funcionamento"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select
                  value={formData.document_type}
                  onValueChange={(val) => setFormData({ ...formData, document_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Alvará">Alvará</SelectItem>
                    <SelectItem value="Licença">Licença</SelectItem>
                    <SelectItem value="Certificado">Certificado</SelectItem>
                    <SelectItem value="PPCI">PPCI</SelectItem>
                    <SelectItem value="Outros">Outros</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Planta *</Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
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

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Periodicidade</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(val) => setFormData({ ...formData, frequency: val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                    <SelectItem value="Bianual">Bianual</SelectItem>
                    <SelectItem value="Única">Única</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Data de Vencimento *</Label>
                <Input
                  type="date"
                  value={formData.expiration_date}
                  onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Aviso Prévio (Dias)</Label>
              <Input
                type="number"
                value={formData.alert_lead_days}
                onChange={(e) =>
                  setFormData({ ...formData, alert_lead_days: Number(e.target.value) })
                }
              />
              <p className="text-xs text-slate-500">
                Quantos dias antes do vencimento o status mudará para "A Vencer"
              </p>
            </div>

            <div className="grid gap-2">
              <Label>Arquivo (PDF, Imagem)</Label>
              <Input
                type="file"
                accept=".pdf,image/*"
                onChange={handleFileUpload}
                disabled={uploading}
              />
              {uploading && (
                <p className="text-xs text-blue-600 animate-pulse">Enviando arquivo...</p>
              )}
              {formData.file_url && !uploading && (
                <p className="text-xs text-green-600 flex items-center gap-1 font-medium">
                  <FileText className="h-3 w-3" /> Arquivo anexado com sucesso
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 text-white"
              disabled={uploading}
            >
              Salvar Documento
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
