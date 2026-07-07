import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
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
import { format } from 'date-fns'
import { FileText, Paperclip, Edit, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { useNavigate } from 'react-router-dom'
import { useToast } from '@/components/ui/use-toast'
import { AccidentReportModal } from './components/AccidentReportModal'

export default function HistoricoAcidentes() {
  const { activeClient, activePlant, profile } = useAppStore()
  const [reportAccidentId, setReportAccidentId] = useState<string | null>(null)
  const [deleteAccidentId, setDeleteAccidentId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()
  const { toast } = useToast()

  useEffect(() => {
    async function fetchData() {
      if (!activeClient) return
      let query = supabase
        .from('accidents')
        .select('*, plants(name), companies(name)')
        .eq('client_id', activeClient.id)
        .order('event_date', { ascending: false })
      if (activePlant && activePlant !== 'all') {
        query = query.eq('plant_id', activePlant)
      }
      const { data: acc } = await query
      if (acc) setData(acc)
      setLoading(false)
    }
    fetchData()
  }, [activeClient, activePlant])

  const canEdit = (item: any) => {
    if (!profile) return false
    return (
      profile.role === 'Administrador' ||
      profile.role === 'Master' ||
      profile.role === 'Gestor' ||
      item.created_by === profile.id
    )
  }

  const canDelete = () => {
    if (!profile) return false
    return profile.role === 'Administrador' || profile.role === 'Master'
  }

  const handleDeleteConfirm = async () => {
    if (!deleteAccidentId) return
    setDeleting(true)
    const { error } = await supabase.from('accidents').delete().eq('id', deleteAccidentId)
    if (error) {
      toast({
        title: 'Erro',
        description: 'Erro ao excluir o registro. Por favor, tente novamente.',
        variant: 'destructive',
      })
    } else {
      toast({
        title: 'Sucesso',
        description: 'Registro de acidente excluído com sucesso.',
      })
      setData(data.filter((item) => item.id !== deleteAccidentId))
    }
    setDeleting(false)
    setDeleteAccidentId(null)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Histórico de Acidentes
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Lista completa de eventos registrados na plataforma.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg flex items-center gap-2">
            <FileText className="w-5 h-5 text-gray-500" />
            Registros
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-sm text-gray-500">Carregando dados...</div>
          ) : data.length === 0 ? (
            <div className="py-8 text-center text-sm text-gray-500">
              Nenhum acidente registrado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Departamento</TableHead>
                    <TableHead>Gravidade</TableHead>
                    <TableHead>Anexos</TableHead>
                    <TableHead className="w-[80px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {format(new Date(item.event_date), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{item.plants?.name || 'N/A'}</TableCell>
                      <TableCell>{item.companies?.name || 'N/A'}</TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={
                            item.severity === 'Grave'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : item.severity === 'Moderado'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                          }
                        >
                          {item.severity}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {item.photos && Array.isArray(item.photos) && item.photos.length > 0 ? (
                          <Badge
                            variant="outline"
                            className="flex items-center gap-1 w-fit bg-blue-50 text-blue-700 border-blue-200"
                          >
                            <Paperclip className="w-3 h-3" />
                            {item.photos.length} {item.photos.length === 1 ? 'anexo' : 'anexos'}
                          </Badge>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 justify-end">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setReportAccidentId(item.id)}
                            title="Gerar Relatório"
                          >
                            <FileText className="w-4 h-4 text-blue-600" />
                          </Button>
                          {canEdit(item) && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => navigate(`/gestao-acidentes/registro/${item.id}`)}
                              title="Editar"
                            >
                              <Edit className="w-4 h-4 text-gray-500" />
                            </Button>
                          )}
                          {canDelete() && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeleteAccidentId(item.id)}
                              title="Excluir"
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <AccidentReportModal
        accidentId={reportAccidentId}
        open={!!reportAccidentId}
        onClose={() => setReportAccidentId(null)}
      />

      <AlertDialog
        open={!!deleteAccidentId}
        onOpenChange={(open) => {
          if (!open) setDeleteAccidentId(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este registro de acidente? Esta ação não pode ser
              desfeita e removerá todas as tarefas associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
