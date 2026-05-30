import { useState, useMemo } from 'react'
import { Plus, Download, Edit, Trash2, FileCheck, FileX, Percent } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { Button } from '@/components/ui/button'
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
import { useCrud } from '@/hooks/use-crud'
import { useAppStore } from '@/store/AppContext'
import { DocumentForm } from './components/DocumentForm'
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
import { useToast } from '@/hooks/use-toast'

export default function Documentos() {
  const { data: documents, loading, remove, fetchAll } = useCrud<any>('sector_documents')
  const { selectedPlant } = useAppStore()
  const { toast } = useToast()

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)
  const [deletingDoc, setDeletingDoc] = useState<any>(null)

  const filteredDocs = useMemo(() => {
    let docs = documents
    if (selectedPlant !== 'all') {
      docs = docs.filter((d: any) => d.plant_id === selectedPlant)
    }
    return docs
  }, [documents, selectedPlant])

  const stats = useMemo(() => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    let inCompliance = 0
    let expired = 0

    filteredDocs.forEach((doc: any) => {
      if (!doc.expiration_date) return
      const [year, month, day] = doc.expiration_date.split('-').map(Number)
      const expDate = new Date(year, month - 1, day)

      if (expDate >= today) {
        inCompliance++
      } else {
        expired++
      }
    })

    const total = inCompliance + expired
    const adherence = total > 0 ? (inCompliance / total) * 100 : 0

    return {
      inCompliance,
      expired,
      adherence: adherence.toFixed(1),
    }
  }, [filteredDocs])

  const getStatusInfo = (doc: any) => {
    if (!doc.expiration_date) return { label: 'Sem data', color: 'bg-gray-500' }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const [year, month, day] = doc.expiration_date.split('-').map(Number)
    const expDate = new Date(year, month - 1, day)

    const daysDiff = differenceInDays(expDate, today)

    if (daysDiff < 0) {
      return { label: 'Vencido', color: 'bg-red-500 hover:bg-red-600' }
    } else if (daysDiff <= (doc.alert_lead_days || 30)) {
      return { label: `Vence em ${daysDiff} dias`, color: 'bg-amber-500 hover:bg-amber-600' }
    } else {
      return { label: 'Em dia', color: 'bg-green-500 hover:bg-green-600' }
    }
  }

  const handleDelete = async () => {
    if (!deletingDoc) return
    const res = await remove(deletingDoc.id)
    if (res.success) {
      toast({ title: 'Documento excluído com sucesso.' })
    } else {
      toast({ title: 'Erro ao excluir documento.', variant: 'destructive' })
    }
    setDeletingDoc(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0F4C81]">Gestão de Documentos</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie os documentos e licenças da unidade.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDoc(null)
            setIsFormOpen(true)
          }}
          className="bg-[#2B95D6] hover:bg-[#2B95D6]/90"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Documento
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-t-4 border-t-green-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos em Dia
            </CardTitle>
            <FileCheck className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.inCompliance}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-red-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Documentos Vencidos
            </CardTitle>
            <FileX className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.expired}</div>
          </CardContent>
        </Card>
        <Card className="border-t-4 border-t-[#2B95D6] shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Aderência</CardTitle>
            <Percent className="h-4 w-4 text-[#2B95D6]" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-[#2B95D6]">{stats.adherence}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Documento</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status / SLA</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando documentos...
                  </TableCell>
                </TableRow>
              ) : filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc: any) => {
                  const status = getStatusInfo(doc)
                  return (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">{doc.name}</TableCell>
                      <TableCell>{doc.document_type}</TableCell>
                      <TableCell>
                        {doc.expiration_date
                          ? format(
                              new Date(
                                doc.expiration_date.split('-')[0],
                                doc.expiration_date.split('-')[1] - 1,
                                doc.expiration_date.split('-')[2],
                              ),
                              'dd/MM/yyyy',
                            )
                          : '-'}
                      </TableCell>
                      <TableCell>
                        <Badge className={`text-white ${status.color}`}>{status.label}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {doc.file_url && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => window.open(doc.file_url, '_blank')}
                              title="Download"
                            >
                              <Download className="h-4 w-4 text-[#2B95D6]" />
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              setEditingDoc(doc)
                              setIsFormOpen(true)
                            }}
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setDeletingDoc(doc)}
                            title="Excluir"
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
        </CardContent>
      </Card>

      <DocumentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        docToEdit={editingDoc}
        onSuccess={fetchAll}
      />

      <AlertDialog open={!!deletingDoc} onOpenChange={() => setDeletingDoc(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Documento</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o documento "{deletingDoc?.name}"? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
