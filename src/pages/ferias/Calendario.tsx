import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useAuth } from '@/hooks/use-auth'
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  parseISO,
  isWithinInterval,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronLeft, ChevronRight, CalendarDays, Check, X, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'
import {
  getVacations,
  createVacation,
  approveVacation,
  rejectVacation,
  deleteVacation,
  type Vacation,
} from '@/services/vacations'
import { cn } from '@/lib/utils'

const STATUS_COLORS: Record<string, string> = {
  scheduled: 'bg-yellow-400',
  approved: 'bg-green-500',
  completed: 'bg-red-500',
  rejected: 'bg-gray-300',
}

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Agendado',
  approved: 'Aprovado',
  completed: 'Concluído',
  rejected: 'Rejeitado',
}

export default function FeriasCalendario() {
  const { activeClient, profile } = useAppStore()
  const { user } = useAuth()
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedVacation, setSelectedVacation] = useState<Vacation | null>(null)
  const [formData, setFormData] = useState({
    collaborator_id: '',
    start_date: '',
    end_date: '',
  })

  const isAdmin = profile?.role === 'Master' || profile?.role === 'Administrador'

  const loadPlants = useCallback(async () => {
    const { data } = await supabase.from('plants').select('id, name').order('name')
    if (data) setPlants(data)
  }, [])

  const loadCollaborators = useCallback(async () => {
    if (!activeClient) return
    let query = supabase
      .from('org_collaborators')
      .select('id, name, plant_id')
      .eq('client_id', activeClient.id)
      .neq('is_active', false)
      .order('name')
    if (selectedPlant !== 'all') {
      query = query.eq('plant_id', selectedPlant)
    }
    const { data } = await query
    if (data) setCollaborators(data)
  }, [activeClient, selectedPlant])

  const loadVacations = useCallback(async () => {
    if (!activeClient) return
    setLoading(true)
    try {
      const data = await getVacations(activeClient.id, selectedPlant)
      setVacations(data)
    } catch (e: any) {
      toast.error('Erro ao carregar férias: ' + e.message)
    } finally {
      setLoading(false)
    }
  }, [activeClient, selectedPlant])

  useEffect(() => {
    loadPlants()
  }, [loadPlants])

  useEffect(() => {
    loadVacations()
    loadCollaborators()
  }, [loadVacations, loadCollaborators])

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 0 })
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 0 })
    return eachDayOfInterval({ start, end })
  }, [currentMonth])

  const getVacationsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return vacations.filter((v) => {
      return v.start_date <= dateStr && v.end_date >= dateStr && v.status !== 'rejected'
    })
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient || !selectedPlant || selectedPlant === 'all') {
      toast.error('Selecione uma planta.')
      return
    }
    if (formData.end_date < formData.start_date) {
      toast.error('A data final deve ser posterior à data inicial.')
      return
    }
    try {
      await createVacation({
        client_id: activeClient.id,
        plant_id: selectedPlant,
        collaborator_id: formData.collaborator_id,
        start_date: formData.start_date,
        end_date: formData.end_date,
      })
      toast.success('Férias solicitadas com sucesso!')
      setDialogOpen(false)
      setFormData({ collaborator_id: '', start_date: '', end_date: '' })
      loadVacations()
    } catch (e: any) {
      toast.error('Erro ao solicitar férias: ' + e.message)
    }
  }

  const handleApprove = async (id: string) => {
    if (!user) return
    try {
      await approveVacation(id, user.id)
      toast.success('Férias aprovadas!')
      setDetailsOpen(false)
      loadVacations()
    } catch (e: any) {
      toast.error('Erro ao aprovar: ' + e.message)
    }
  }

  const handleReject = async (id: string) => {
    try {
      await rejectVacation(id)
      toast.success('Férias rejeitadas.')
      setDetailsOpen(false)
      loadVacations()
    } catch (e: any) {
      toast.error('Erro ao rejeitar: ' + e.message)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta solicitação de férias?')) return
    try {
      await deleteVacation(id)
      toast.success('Férias excluídas.')
      setDetailsOpen(false)
      loadVacations()
    } catch (e: any) {
      toast.error('Erro ao excluir: ' + e.message)
    }
  }

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <CalendarDays className="h-8 w-8 text-brand-vividBlue" />
            Calendário de Férias
          </h1>
          <p className="text-gray-500 mt-1">Visualize e gerencie as férias dos colaboradores</p>
        </div>
        <div className="flex gap-2 items-center flex-wrap">
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
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" /> Nova Solicitação
          </Button>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-lg font-semibold min-w-[180px] text-center capitalize">
            {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Button variant="ghost" size="sm" onClick={() => setCurrentMonth(new Date())}>
          Hoje
        </Button>
      </div>

      <div className="flex gap-4 flex-wrap text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-yellow-400" /> Agendado
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-green-500" /> Aprovado
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-red-500" /> Concluído
        </div>
      </div>

      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((d) => (
              <div key={d} className="text-center text-xs font-semibold text-gray-500 py-2">
                {d}
              </div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {monthDays.map((day) => {
              const inMonth = isSameMonth(day, currentMonth)
              const dayVacations = getVacationsForDate(day)
              const isToday = isSameDay(day, new Date())
              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    'min-h-[80px] border rounded-lg p-1 transition-colors',
                    inMonth ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100',
                    isToday && 'ring-2 ring-blue-400',
                  )}
                >
                  <div
                    className={cn(
                      'text-xs font-medium mb-1',
                      inMonth ? 'text-gray-700' : 'text-gray-400',
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="space-y-1">
                    {dayVacations.slice(0, 2).map((v) => (
                      <div
                        key={v.id}
                        className={cn(
                          'text-[10px] px-1.5 py-0.5 rounded text-white truncate cursor-pointer hover:opacity-80 transition-opacity',
                          STATUS_COLORS[v.status],
                        )}
                        onClick={() => {
                          setSelectedVacation(v)
                          setDetailsOpen(true)
                        }}
                      >
                        {v.org_collaborators?.name || 'N/A'}
                      </div>
                    ))}
                    {dayVacations.length > 2 && (
                      <div className="text-[10px] text-gray-500 px-1">
                        +{dayVacations.length - 2} mais
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Nova Solicitação de Férias</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-2">
              <Label>Colaborador</Label>
              <Select
                value={formData.collaborator_id}
                onValueChange={(v) => setFormData({ ...formData, collaborator_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {collaborators.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Data Início</Label>
                <Input
                  type="date"
                  required
                  value={formData.start_date}
                  onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Data Fim</Label>
                <Input
                  type="date"
                  required
                  value={formData.end_date}
                  onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Solicitar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes das Férias</DialogTitle>
          </DialogHeader>
          {selectedVacation && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500">Colaborador</Label>
                <div className="font-medium text-lg">
                  {selectedVacation.org_collaborators?.name || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Início</Label>
                  <div className="font-medium">
                    {format(parseISO(selectedVacation.start_date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Fim</Label>
                  <div className="font-medium">
                    {format(parseISO(selectedVacation.end_date), 'dd/MM/yyyy')}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-slate-500">Status</Label>
                <div className="flex items-center gap-2 mt-1">
                  <div
                    className={cn('w-3 h-3 rounded-full', STATUS_COLORS[selectedVacation.status])}
                  />
                  <span className="font-medium">{STATUS_LABELS[selectedVacation.status]}</span>
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="flex flex-row justify-between w-full">
            <Button
              type="button"
              variant="destructive"
              onClick={() => selectedVacation && handleDelete(selectedVacation.id)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Excluir
            </Button>
            <div className="flex gap-2">
              {isAdmin && selectedVacation?.status === 'scheduled' && (
                <>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => selectedVacation && handleReject(selectedVacation.id)}
                  >
                    <X className="mr-2 h-4 w-4" /> Rejeitar
                  </Button>
                  <Button
                    type="button"
                    onClick={() => selectedVacation && handleApprove(selectedVacation.id)}
                  >
                    <Check className="mr-2 h-4 w-4" /> Aprovar
                  </Button>
                </>
              )}
              <Button type="button" variant="ghost" onClick={() => setDetailsOpen(false)}>
                Fechar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
