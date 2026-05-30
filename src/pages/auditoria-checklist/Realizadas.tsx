import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Eye, Search, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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

export default function AuditoriaRealizadas() {
  const [audits, setAudits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [userRole, setUserRole] = useState<string | null>(null)

  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const { toast } = useToast()

  useEffect(() => {
    fetchUserRole()
    fetchAudits()
  }, [])

  const fetchUserRole = async () => {
    const { data } = await supabase.rpc('get_user_role')
    setUserRole(data)
  }

  const fetchAudits = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('audit_executions')
        .select(`
          id,
          status,
          realization_date,
          final_score,
          max_score,
          audits (
            title,
            type
          ),
          plants (
            name
          ),
          profiles!audit_executions_assignee_id_fkey (
            name
          )
        `)
        .eq('status', 'Finalizado')
        .order('realization_date', { ascending: false })

      if (error) throw error

      setAudits(data || [])
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as auditorias realizadas.',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return

    try {
      setIsDeleting(true)
      const { error } = await supabase.from('audit_executions').delete().eq('id', deleteId)

      if (error) throw error

      toast({
        title: 'Sucesso',
        description: 'Auditoria excluída com sucesso.',
      })

      setAudits((prev) => prev.filter((a) => a.id !== deleteId))
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro ao excluir a auditoria.',
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
      setDeleteId(null)
    }
  }

  const filteredAudits = audits.filter((audit) => {
    const searchLower = searchTerm.toLowerCase()
    return (
      audit.audits?.title?.toLowerCase().includes(searchLower) ||
      audit.plants?.name?.toLowerCase().includes(searchLower) ||
      audit.profiles?.name?.toLowerCase().includes(searchLower)
    )
  })

  const canDelete = userRole === 'Master' || userRole === 'Administrador'

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Auditorias Realizadas</h2>
          <p className="text-muted-foreground">Histórico de todas as auditorias finalizadas</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Listagem</CardTitle>
            <div className="relative w-72">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título, planta ou auditor..."
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-8 text-center text-muted-foreground">Carregando auditorias...</div>
          ) : filteredAudits.length === 0 ? (
            <div className="py-8 text-center text-muted-foreground">
              Nenhuma auditoria realizada encontrada.
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Auditor</TableHead>
                    <TableHead>Data de Realização</TableHead>
                    <TableHead>Pontuação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAudits.map((audit) => {
                    const scorePercentage =
                      audit.max_score > 0 ? (audit.final_score / audit.max_score) * 100 : 0

                    return (
                      <TableRow key={audit.id}>
                        <TableCell className="font-medium">{audit.audits?.title}</TableCell>
                        <TableCell>{audit.plants?.name}</TableCell>
                        <TableCell>{audit.profiles?.name}</TableCell>
                        <TableCell>
                          {audit.realization_date
                            ? format(
                                new Date(audit.realization_date + 'T00:00:00Z'),
                                'dd/MM/yyyy',
                                { locale: ptBR },
                              )
                            : '-'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              scorePercentage >= 80
                                ? 'default'
                                : scorePercentage >= 50
                                  ? 'secondary'
                                  : 'destructive'
                            }
                          >
                            {audit.final_score} / {audit.max_score} ({scorePercentage.toFixed(1)}%)
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="icon" asChild>
                              <Link to={`/auditoria-checklist/detalhes/${audit.id}`}>
                                <Eye className="h-4 w-4" />
                                <span className="sr-only">Ver detalhes</span>
                              </Link>
                            </Button>
                            {canDelete && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => setDeleteId(audit.id)}
                                className="text-red-500 hover:text-red-600 hover:bg-red-50"
                              >
                                <Trash2 className="h-4 w-4" />
                                <span className="sr-only">Excluir</span>
                              </Button>
                            )}
                          </div>
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

      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Auditoria</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja realmente excluir esta auditoria? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault()
                handleDelete()
              }}
              disabled={isDeleting}
              className="bg-red-500 text-white hover:bg-red-600"
            >
              {isDeleting ? 'Excluindo...' : 'Excluir'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
