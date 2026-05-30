import React, { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Plus,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Download,
  Trash2,
  Edit,
  Calendar,
  Info,
} from 'lucide-react'
import { differenceInDays, parseISO, format } from 'date-fns'

import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
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
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { cn } from '@/lib/utils'

export default function Documentos() {
  const { profile, selectedMasterClient, selectedPlant } = useAppStore()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<any[]>([])
  const [plants, setPlants] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)
  const [openDialog, setOpenDialog] = useState(false)

  const [file, setFile] = useState<File | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const [formData, setFormData] = useState({
    plant_id: '',
    name: '',
    document_type: '',
    expiration_date: '',
    alert_lead_days: '30',
    file_url: '',
  })

  const clientId = profile?.role === 'Master' ? selectedMasterClient : profile?.client_id

  useEffect(() => {
    if (!clientId || clientId === 'all') return

    const fetchPlants = async () => {
      let q = supabase.from('plants').select('id, name').eq('client_id', clientId)
      if (profile?.role !== 'Master' && profile?.role !== 'Administrador') {
        if (profile?.authorized_plants && profile.authorized_plants.length > 0) {
          q = q.in('id', profile.authorized_plants)
        } else {
          setPlants([])
          return
        }
      }
      const { data } = await q
      if (data) setPlants(data)
    }

    fetchPlants()
  }, [clientId, profile])

  const fetchDocuments = async () => {
    if (!clientId || clientId === 'all') {
      setDocuments([])
      return
    }

    let q = supabase
      .from('sector_documents')
      .select('*, plants(name)')
      .eq('client_id', clientId)
      .order('expiration_date', { ascending: true })

    if (selectedPlant !== 'all') {
      q = q.eq('plant_id', selectedPlant)
    } else if (profile?.role !== 'Master' && profile?.role !== 'Administrador') {
      if (profile?.authorized_plants && profile.authorized_plants.length > 0) {
        q = q.in('plant_id', profile.authorized_plants)
      } else {
        setDocuments([])
        return
      }
    }

    const { data, error } = await q
    if (data && !error) setDocuments(data)
  }

  useEffect(() => {
    fetchDocuments()
  }, [clientId, selectedPlant, profile])

  const getStatus = (doc: any) => {
    const daysRemaining = differenceInDays(parseISO(doc.expiration_date), new Date())

    if (daysRemaining < 0) {
      return {
        status: 'expired',
        label: `Vencido há ${Math.abs(daysRemaining)} dias`,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: XCircle,
      }
    } else if (daysRemaining <= doc.alert_lead_days) {
      return {
        status: 'warning',
        label: `Expira em ${daysRemaining} dias`,
        color: 'bg-amber-100 text-amber-800 border-amber-300',
        icon: AlertTriangle,
      }
    } else {
      return {
        status: 'regular',
        label: 'No prazo',
        color: 'bg-green-100 text-green-800 border-green-300',
        icon: CheckCircle,
      }
    }
  }

  const metrics = useMemo(() => {
    let onTime = 0,
      warning = 0,
      expired = 0
    documents.forEach((doc) => {
      const status = getStatus(doc).status
      if (status === 'expired') expired++
      else if (status === 'warning') warning++
      else onTime++
    })
    return { total: documents.length, onTime, warning, expired }
  }, [documents])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!clientId || clientId === 'all') return

    if (!formData.plant_id) {
      toast({
        title: 'Atenção',
        description: 'Por favor, selecione a planta.',
        variant: 'destructive',
      })
      return
    }

    setLoading(true)
    try {
      let fileUrl = formData.file_url

      if (file) {
        const timestamp = new Date().getTime()
        const ext = file.name.split('.').pop()
        const filename = `${timestamp}_doc.${ext}`
        const filePath = `${clientId}/${formData.plant_id}/${filename}`

        const { error: uploadError } = await supabase.storage
          .from('sector-documents')
          .upload(filePath, file)
        if (uploadError) throw uploadError

        const { data } = supabase.storage.from('sector-documents').getPublicUrl(filePath)
        fileUrl = data.publicUrl
      }

      if (editingId) {
        const { error } = await supabase
          .from('sector_documents')
          .update({
            plant_id: formData.plant_id,
            name: formData.name,
            document_type: formData.document_type,
            expiration_date: formData.expiration_date,
            alert_lead_days: parseInt(formData.alert_lead_days),
            file_url: fileUrl,
          })
          .eq('id', editingId)

        if (error) throw error
        toast({ title: 'Documento atualizado com sucesso' })
      } else {
        const { error } = await supabase.from('sector_documents').insert({
          client_id: clientId,
          plant_id: formData.plant_id,
          name: formData.name,
          document_type: formData.document_type,
          expiration_date: formData.expiration_date,
          alert_lead_days: parseInt(formData.alert_lead_days),
          file_url: fileUrl,
        })

        if (error) throw error
        toast({ title: 'Documento adicionado com sucesso' })
      }

      setOpenDialog(false)
      fetchDocuments()
      resetForm()
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('sector_documents').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Documento deletado' })
      fetchDocuments()
    }
  }

  const handleEdit = (doc: any) => {
    setFormData({
      plant_id: doc.plant_id,
      name: doc.name,
      document_type: doc.document_type,
      expiration_date: doc.expiration_date,
      alert_lead_days: doc.alert_lead_days.toString(),
      file_url: doc.file_url || '',
    })
    setEditingId(doc.id)
    setFile(null)
    setOpenDialog(true)
  }

  const resetForm = () => {
    setFormData({
      plant_id: '',
      name: '',
      document_type: '',
      expiration_date: '',
      alert_lead_days: '30',
      file_url: '',
    })
    setEditingId(null)
    setFile(null)
  }

  if (clientId === 'all') {
    return (
      <div className="p-6">
        <div className="text-center p-12 bg-slate-50 rounded-lg border border-slate-200">
          <Info className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-slate-700">Selecione um cliente</h2>
          <p className="text-slate-500 mt-2">
            Para acessar a gestão de documentos, selecione um cliente específico no topo da página.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Gestão de Documentos</h1>
          <p className="text-sm text-slate-500">
            Acompanhamento e controle de SLAs de documentos legais
          </p>
        </div>

        <Dialog
          open={openDialog}
          onOpenChange={(open) => {
            setOpenDialog(open)
            if (!open) resetForm()
          }}
        >
          <DialogTrigger asChild>
            <Button className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white shadow-md">
              <Plus className="w-4 h-4 mr-2" />
              Novo Documento
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>{editingId ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>
                  Planta <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
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
                  <Label>
                    Nome do Documento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: AVCB Prédio A"
                  />
                </div>
                <div className="space-y-2">
                  <Label>
                    Tipo <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    required
                    value={formData.document_type}
                    onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                    placeholder="Ex: AVCB, Alvará"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Data de Vencimento <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="date"
                    required
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Avisar antes de (dias)</Label>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={formData.alert_lead_days}
                    onChange={(e) => setFormData({ ...formData, alert_lead_days: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>
                  Anexo (PDF, Imagens) {!editingId && <span className="text-red-500">*</span>}
                </Label>
                <Input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                  required={!editingId && !formData.file_url}
                />
                {editingId && formData.file_url && !file && (
                  <p className="text-xs text-slate-500 mt-1">
                    Documento atual já anexado. Faça o upload de um novo arquivo apenas se desejar
                    substituí-lo.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpenDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Salvando...' : 'Salvar Documento'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Total</p>
              <p className="text-2xl font-bold text-slate-800">{metrics.total}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">No Prazo</p>
              <p className="text-2xl font-bold text-green-600">{metrics.onTime}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Atenção</p>
              <p className="text-2xl font-bold text-amber-600">{metrics.warning}</p>
            </div>
            <div className="bg-amber-100 p-3 rounded-full">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Vencidos</p>
              <p className="text-2xl font-bold text-red-600">{metrics.expired}</p>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <XCircle className="w-5 h-5 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg flex items-center gap-2">
            <Calendar className="w-5 h-5 text-slate-500" />
            Vencimentos e SLAs
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documents.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <FileText className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p>Nenhum documento encontrado.</p>
              <p className="text-sm">Clique em "Novo Documento" para adicionar.</p>
            </div>
          ) : (
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status (SLA)</TableHead>
                    <TableHead className="text-center">Arquivo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {documents.map((doc) => {
                    const status = getStatus(doc)
                    return (
                      <TableRow key={doc.id}>
                        <TableCell className="font-medium text-slate-700">{doc.name}</TableCell>
                        <TableCell className="text-slate-600">{doc.document_type}</TableCell>
                        <TableCell className="text-slate-600">{doc.plants?.name}</TableCell>
                        <TableCell className="text-slate-600">
                          {format(parseISO(doc.expiration_date), 'dd/MM/yyyy')}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'whitespace-nowrap px-2 py-0.5 font-medium border',
                              status.color,
                            )}
                          >
                            <status.icon className="w-3.5 h-3.5 mr-1.5" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          {doc.file_url ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              asChild
                              className="text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            >
                              <a href={doc.file_url} target="_blank" rel="noopener noreferrer">
                                <Download className="w-4 h-4 mr-1.5" />
                                Baixar
                              </a>
                            </Button>
                          ) : (
                            <span className="text-slate-400 text-sm">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(doc)}
                            className="text-slate-500 hover:text-brand-vividBlue"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-slate-500 hover:text-red-500"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Excluir documento?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta ação não pode ser desfeita. O documento "{doc.name}" será
                                  permanentemente removido.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDelete(doc.id)}
                                  className="bg-red-500 hover:bg-red-600 text-white"
                                >
                                  Excluir
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
