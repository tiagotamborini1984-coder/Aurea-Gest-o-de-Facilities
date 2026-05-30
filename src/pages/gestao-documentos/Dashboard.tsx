import { useState, useEffect, useMemo } from 'react'
import { FileText, Search, Download, Trash2, Edit2, Plus, FileQuestion } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { DocumentModal } from './DocumentModal'
import { SectorDocument, getDocumentStatus } from './utils'

export default function DashboardDocumentos() {
  const { activeClient, selectedPlant } = useAppStore()
  const [documents, setDocuments] = useState<SectorDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')

  const [modalOpen, setModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<SectorDocument | null>(null)
  const [deleteDoc, setDeleteDoc] = useState<SectorDocument | null>(null)

  const fetchDocuments = async () => {
    if (!activeClient || !selectedPlant) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('sector_documents')
        .select('*')
        .eq('client_id', activeClient.id)
        .eq('plant_id', selectedPlant)
        .order('expiration_date', { ascending: true })

      if (error) throw error
      setDocuments(data || [])
    } catch (err) {
      console.error(err)
      toast.error('Erro ao buscar documentos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocuments()
  }, [activeClient, selectedPlant])

  const stats = useMemo(() => {
    const s = { total: documents.length, vencidos: 0, atencao: 0, emDia: 0 }
    documents.forEach((doc) => {
      const st = getDocumentStatus(doc)
      if (st.id === 'vencido') s.vencidos++
      if (st.id === 'atencao') s.atencao++
      if (st.id === 'em-dia') s.emDia++
    })
    return s
  }, [documents])

  const filteredDocs = documents.filter((d) => {
    const matchName = d.name.toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || d.document_type === typeFilter
    return matchName && matchType
  })

  const uniqueTypes = Array.from(new Set(documents.map((d) => d.document_type))).sort()

  const handleDelete = async () => {
    if (!deleteDoc) return
    try {
      const { error } = await supabase.from('sector_documents').delete().eq('id', deleteDoc.id)
      if (error) throw error

      if (deleteDoc.file_url) {
        await supabase.storage.from('documents').remove([deleteDoc.file_url])
      }

      toast.success('Documento excluído com sucesso')
      setDeleteDoc(null)
      fetchDocuments()
    } catch (err) {
      toast.error('Erro ao excluir documento')
    }
  }

  const handleDownload = async (path: string | null) => {
    if (!path) return
    try {
      const { data, error } = await supabase.storage.from('documents').createSignedUrl(path, 60)
      if (error) throw error
      window.open(data.signedUrl, '_blank')
    } catch (err) {
      toast.error('Erro ao abrir documento')
    }
  }

  return (
    <div className="flex flex-col gap-6 p-6 h-full max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-vividBlue" />
            Gestão de Documentos
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Organize e monitore o vencimento dos documentos do setor.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDoc(null)
            setModalOpen(true)
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" /> Novo Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Total de Documentos</CardTitle>
            <FileText className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Vencidos</CardTitle>
            <div className="h-2 w-2 rounded-full bg-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.vencidos}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Atenção</CardTitle>
            <div className="h-2 w-2 rounded-full bg-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{stats.atencao}</div>
          </CardContent>
        </Card>
        <Card className="shadow-sm border-gray-100 dark:border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-gray-500">Em Dia</CardTitle>
            <div className="h-2 w-2 rounded-full bg-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.emDia}</div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Buscar por nome..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="w-full sm:w-[200px]">
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Tipo de documento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              {uniqueTypes.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="shadow-sm border-gray-100 dark:border-gray-800 flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center text-gray-500">
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-32 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500">
                      <FileQuestion className="h-8 w-8 mb-2 opacity-50" />
                      <p>Nenhum documento encontrado.</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => {
                  const status = getDocumentStatus(doc)
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium text-gray-900 dark:text-gray-100">
                        {doc.name}
                      </TableCell>
                      <TableCell className="text-gray-500">{doc.document_type}</TableCell>
                      <TableCell className="text-gray-500 whitespace-nowrap">
                        {format(new Date(doc.expiration_date + 'T00:00:00'), 'dd/MM/yyyy', {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          className={`${status.color} border-0 flex items-center gap-1.5 w-fit`}
                        >
                          <status.icon className="h-3 w-3" />
                          {status.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            disabled={!doc.file_url}
                            onClick={() => handleDownload(doc.file_url)}
                            title="Baixar arquivo"
                            className="h-8 w-8"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDoc(doc)
                              setModalOpen(true)
                            }}
                            title="Editar"
                            className="h-8 w-8"
                          >
                            <Edit2 className="h-4 w-4 text-blue-600" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeleteDoc(doc)}
                            title="Excluir"
                            className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
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
      </Card>

      <DocumentModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        document={editingDoc}
        onSaved={fetchDocuments}
      />

      <AlertDialog open={!!deleteDoc} onOpenChange={() => setDeleteDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento "{deleteDoc?.name}"? Esta ação não pode ser
              desfeita e removerá o arquivo associado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
