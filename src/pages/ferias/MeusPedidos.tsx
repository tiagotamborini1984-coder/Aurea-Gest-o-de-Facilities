import { useState, useEffect, useCallback } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Check, X, FileText, AlertCircle, RefreshCw, Plane } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { toast } from 'sonner'
import { getVacations, approveVacation, rejectVacation, type Vacation } from '@/services/vacations'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Pendente',
  approved: 'Aprovado',
  completed: 'Concluído',
  rejected: 'Recusado',
}
const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  completed: 'bg-blue-100 text-blue-800',
  rejected: 'bg-red-100 text-red-800',
}

export default function MeusPedidosFerias() {
  const { activeClient, profile } = useAppStore()
  const { user } = useAuth()
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [collaboratorId, setCollaboratorId] = useState<string | null>(null)
  const [collabLoading, setCollabLoading] = useState(true)

  const isAdmin = profile?.role === 'Master' || profile?.role === 'Administrador'

  const loadPlants = useCallback(async () => {
    if (!activeClient) return
    const { data } = await supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .order('name')
    if (data) setPlants(data)
  }, [activeClient])

  useEffect(() => {
    loadPlants()
  }, [loadPlants])

  useEffect(() => {
    if (!activeClient || !profile || isAdmin) {
      setCollaboratorId(null)
      setCollabLoading(false)
      return
    }
    setCollabLoading(true)
    supabase
      .from('org_collaborators')
      .select('id')
      .eq('client_id', activeClient.id)
      .ilike('email', profile.email)
      .maybeSingle()
      .then(({ data }) => {
        setCollaboratorId(data?.id || null)
        setCollabLoading(false)
      })
  }, [activeClient, profile, isAdmin])

  const loadVacations = useCallback(async () => {
    if (!activeClient) {
      setLoading(false)
      return
    }
    if (!isAdmin && collabLoading) return
    if (!isAdmin && !collaboratorId) {
      setVacations([])
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const plantFilter = selectedPlant !== 'all' ? selectedPlant : undefined
      let data: Vacation[]
      if (isAdmin) {
        const all = await getVacations(activeClient.id, plantFilter)
        data = all.filter((v) => v.status === 'scheduled')
      } else {
        data = await getVacations(activeClient.id, plantFilter, collaboratorId!)
      }
      setVacations(data)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar pedidos')
    } finally {
      setLoading(false)
    }
  }, [activeClient, isAdmin, collaboratorId, collabLoading, selectedPlant])

  useEffect(() => {
    loadVacations()
  }, [loadVacations])

  const handleApprove = async (id: string) => {
    if (!user) return
    try {
      await approveVacation(id, user.id)
      toast.success('Férias aprovadas!')
      loadVacations()
    } catch (e: any) {
      toast.error('Erro ao aprovar: ' + e.message)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectVacation(id)
      toast.success('Férias recusadas.')
      loadVacations()
    } catch (e: any) {
      toast.error('Erro ao recusar: ' + e.message)
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <Plane className="h-7 w-7 text-brand-vividBlue" />
            Meus Pedidos de Férias
          </h1>
          <p className="text-slate-500 mt-1">
            {isAdmin
              ? 'Solicitações pendentes de aprovação'
              : 'Acompanhe o status das suas solicitações'}
          </p>
        </div>
        <div className="space-y-2">
          <span className="text-xs text-gray-500">Planta</span>
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Planta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {!isAdmin && !collabLoading && !collaboratorId && (
        <Card>
          <CardContent className="p-6 text-center text-slate-500">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-slate-400" />
            Você não está vinculado a um colaborador. Entre em contato com o administrador.
          </CardContent>
        </Card>
      )}

      {loading && (
        <Card>
          <CardContent className="p-6 space-y-3">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-10 w-10 mx-auto mb-2 text-red-500" />
            <p className="text-red-600 mb-3">{error}</p>
            <Button variant="outline" onClick={loadVacations}>
              <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (isAdmin || collaboratorId) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-500" />
              {isAdmin
                ? `Pendentes (${vacations.length})`
                : `Minhas Solicitações (${vacations.length})`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {vacations.length === 0 ? (
              <div className="text-center text-slate-400 py-8">Nenhum pedido encontrado</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Início</TableHead>
                    <TableHead>Fim</TableHead>
                    {isAdmin ? (
                      <TableHead>Solicitado em</TableHead>
                    ) : (
                      <>
                        <TableHead>Status</TableHead>
                        <TableHead>Aprovação</TableHead>
                      </>
                    )}
                    {isAdmin && <TableHead className="text-right">Ações</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {vacations.map((v) => (
                    <TableRow key={v.id}>
                      <TableCell className="font-medium">
                        {v.org_collaborators?.name || 'N/A'}
                      </TableCell>
                      <TableCell>{format(parseISO(v.start_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{format(parseISO(v.end_date), 'dd/MM/yyyy')}</TableCell>
                      {isAdmin ? (
                        <TableCell>{format(parseISO(v.created_at), 'dd/MM/yyyy')}</TableCell>
                      ) : (
                        <>
                          <TableCell>
                            <Badge className={STATUS_COLORS[v.status]} variant="outline">
                              {STATUS_LABELS[v.status] || v.status}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-slate-500">
                            {v.status === 'approved' && v.updated_at
                              ? `${format(parseISO(v.updated_at), 'dd/MM/yyyy')}${v.profiles?.name ? ` por ${v.profiles.name}` : ''}`
                              : '-'}
                          </TableCell>
                        </>
                      )}
                      {isAdmin && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => handleReject(v.id)}>
                              <X className="h-4 w-4" />
                            </Button>
                            <Button size="sm" onClick={() => handleApprove(v.id)}>
                              <Check className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
