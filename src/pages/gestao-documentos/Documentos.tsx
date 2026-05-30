import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { differenceInDays, startOfDay } from 'date-fns'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { toast } from 'sonner'
import { FileText, Plus, CheckCircle, AlertCircle, AlertTriangle } from 'lucide-react'
import { DocumentForm } from './components/DocumentForm'
import { DocumentActions } from './components/DocumentActions'

const parseDateLocal = (dateStr: string) => {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const [y, m, d] = dateStr.split('T')[0].split('-')
  return `${d}/${m}/${y}`
}

export default function Documentos() {
  const { activeClient } = useAppStore()
  const [documents, setDocuments] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)

  const fetchData = async () => {
    if (!activeClient) return
    setLoading(true)
    try {
      const [docsRes, plantsRes] = await Promise.all([
        supabase
          .from('sector_documents')
          .select('*, plants(name)')
          .eq('client_id', activeClient.id)
          .order('expiration_date', { ascending: true }),
        supabase.from('plants').select('id, name').eq('client_id', activeClient.id),
      ])
      if (docsRes.error) throw docsRes.error
      setDocuments(docsRes.data || [])
      if (plantsRes.data) setPlants(plantsRes.data)
    } catch (err: any) {
      toast.error('Erro ao carregar documentos: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [activeClient])

  const handleEdit = (doc: any) => {
    setEditingDoc(doc)
    setIsFormOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja excluir este documento?')) return
    try {
      const { error } = await supabase.from('sector_documents').delete().eq('id', id)
      if (error) throw error
      toast.success('Documento excluído com sucesso')
      fetchData()
    } catch (err: any) {
      toast.error('Erro ao excluir: ' + err.message)
    }
  }

  const today = startOfDay(new Date())
  const validDocs = documents.filter(
    (d) => differenceInDays(parseDateLocal(d.expiration_date), today) >= 0,
  )
  const expiredDocs = documents.filter(
    (d) => differenceInDays(parseDateLocal(d.expiration_date), today) < 0,
  )
  const adherence =
    documents.length > 0 ? Math.round((validDocs.length / documents.length) * 100) : 0

  const getStatusSla = (doc: any) => {
    const expDate = parseDateLocal(doc.expiration_date)
    const daysRemaining = differenceInDays(expDate, today)

    if (daysRemaining < 0) {
      const absDays = Math.abs(daysRemaining)
      return {
        text: `Vencido há ${absDays} dia${absDays > 1 ? 's' : ''}`,
        color: 'bg-red-100 text-red-800 border-red-300',
        icon: AlertCircle,
      }
    } else if (daysRemaining <= doc.alert_lead_days) {
      return {
        text:
          daysRemaining === 0
            ? 'Vence hoje'
            : `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} para vencer`,
        color: 'bg-yellow-100 text-yellow-800 border-yellow-300',
        icon: AlertTriangle,
      }
    }
    return {
      text: `${daysRemaining} dia${daysRemaining > 1 ? 's' : ''} para vencer`,
      color: 'bg-green-100 text-green-800 border-green-300',
      icon: CheckCircle,
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in-up duration-300">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <div className="bg-brand-vividBlue/10 p-2 rounded-lg">
              <FileText className="h-6 w-6 text-brand-vividBlue" />
            </div>
            Gestão de Documentos
          </h1>
          <p className="text-slate-500 mt-1">
            Visualize e gerencie os documentos e suas validades de forma centralizada.
          </p>
        </div>
        <Button
          onClick={() => {
            setEditingDoc(null)
            setIsFormOpen(true)
          }}
        >
          <Plus className="h-4 w-4 mr-2" /> Novo Documento
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="border-l-4 border-l-green-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium uppercase tracking-wider">
              Documentos em Dia
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{validDocs.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium uppercase tracking-wider">
              Documentos Vencidos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-slate-800">{expiredDocs.length}</div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-brand-vividBlue shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-500 font-medium uppercase tracking-wider">
              Aderência de Documentação
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-brand-vividBlue">{adherence}%</div>
          </CardContent>
        </Card>
      </div>

      <Card className="shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>Status / SLA</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : documents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-slate-500">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              documents.map((doc) => {
                const status = getStatusSla(doc)
                const Icon = status.icon
                return (
                  <TableRow key={doc.id} className="hover:bg-slate-50 transition-colors">
                    <TableCell className="font-medium text-slate-800">{doc.name}</TableCell>
                    <TableCell className="text-slate-600">{doc.document_type}</TableCell>
                    <TableCell className="text-slate-600">{doc.plants?.name || 'N/A'}</TableCell>
                    <TableCell className="text-slate-600">
                      {formatDate(doc.expiration_date)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={`${status.color} flex items-center w-fit gap-1.5 font-medium px-2.5 py-1`}
                      >
                        <Icon className="h-3.5 w-3.5" /> {status.text}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DocumentActions
                        doc={doc}
                        onEdit={() => handleEdit(doc)}
                        onDelete={() => handleDelete(doc.id)}
                      />
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </Card>

      <DocumentForm
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        doc={editingDoc}
        plants={plants}
        onSave={fetchData}
      />
    </div>
  )
}
