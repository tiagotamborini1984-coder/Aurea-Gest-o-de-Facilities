import { useState, useEffect, useMemo } from 'react'
import { format, startOfWeek, addDays, subDays, isBefore, isSameDay, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
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
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Loader2, Trash2, Plus } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { cn } from '@/lib/utils'

export function PlanejamentoTab() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()

  const [plantId, setPlantId] = useState('')
  const [serviceType, setServiceType] = useState('cleaning')
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }))
  const [extraSlots, setExtraSlots] = useState<string[]>([])

  const [areas, setAreas] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [modalData, setModalData] = useState<any>({
    date: '',
    time: '',
    area_id: '',
    description: '',
    id: null,
  })
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (plants.length > 0 && !plantId) setPlantId(plants[0].id)
  }, [plants, plantId])

  const fetchWeekData = async () => {
    if (!profile || !plantId) return
    setLoading(true)
    const [areasRes, schedRes] = await Promise.all([
      supabase
        .from('cleaning_gardening_areas')
        .select('*')
        .eq('plant_id', plantId)
        .eq('type', serviceType),
      supabase
        .from('cleaning_gardening_schedules')
        .select('*, areas:area_id(name, type)')
        .eq('plant_id', plantId)
        .gte('activity_date', format(weekStart, 'yyyy-MM-dd'))
        .lte('activity_date', format(addDays(weekStart, 6), 'yyyy-MM-dd')),
    ])
    setAreas(areasRes.data || [])
    setSchedules((schedRes.data || []).filter((s: any) => s.areas?.type === serviceType))
    setLoading(false)
  }

  useEffect(() => {
    fetchWeekData()
  }, [plantId, serviceType, weekStart, profile])

  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart],
  )
  const allSlots = useMemo(() => {
    const base = Array.from({ length: 13 }, (_, i) => `${(i + 6).toString().padStart(2, '0')}:00`)
    return Array.from(new Set([...base, ...extraSlots])).sort()
  }, [extraSlots])

  const handleSave = async () => {
    if (!modalData.area_id || !modalData.description) return
    setIsSaving(true)
    try {
      const payload = {
        client_id: profile!.client_id,
        plant_id: plantId,
        area_id: modalData.area_id,
        activity_date: modalData.date,
        start_time: `${modalData.time}:00`,
        description: modalData.description,
      }
      if (modalData.id) {
        const { error } = await supabase
          .from('cleaning_gardening_schedules')
          .update(payload)
          .eq('id', modalData.id)
        if (error) throw error
      } else {
        const { error } = await supabase.from('cleaning_gardening_schedules').insert(payload)
        if (error) throw error
      }
      toast({ title: 'Salvo com sucesso' })
      setModalOpen(false)
      fetchWeekData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsSaving(true)
    const { error } = await supabase
      .from('cleaning_gardening_schedules')
      .delete()
      .eq('id', modalData.id)
    if (!error) {
      toast({ title: 'Excluído com sucesso' })
      setModalOpen(false)
      fetchWeekData()
    }
    setIsSaving(false)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger className="w-[180px] bg-slate-50">
              <SelectValue placeholder="Planta" />
            </SelectTrigger>
            <SelectContent>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex bg-slate-100 p-1 rounded-md">
            <Button
              variant={serviceType === 'cleaning' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setServiceType('cleaning')}
              className="h-8"
            >
              Limpeza
            </Button>
            <Button
              variant={serviceType === 'gardening' ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setServiceType('gardening')}
              className="h-8"
            >
              Jardinagem
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(subDays(weekStart, 7))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm font-semibold text-slate-700 min-w-[130px] text-center">
            {format(weekStart, 'dd/MM')} a {format(addDays(weekStart, 6), 'dd/MM')}
          </span>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addDays(weekStart, 7))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm overflow-x-auto">
        <Table className="min-w-[800px]">
          <TableHeader className="bg-slate-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="w-[80px] text-center font-semibold">Horário</TableHead>
              {days.map((d) => (
                <TableHead
                  key={d.toISOString()}
                  className="text-center font-semibold border-l border-gray-200"
                >
                  {format(d, 'EEEE', { locale: ptBR })}
                  <br />
                  <span className="text-xs text-muted-foreground font-normal">
                    {format(d, 'dd/MM')}
                  </span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-12">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : (
              allSlots.map((time) => (
                <TableRow key={time}>
                  <TableCell className="font-medium text-xs text-slate-500 text-center relative group p-0">
                    <span className="py-2 inline-block">{time}</span>
                    {time.endsWith(':00') && (
                      <button
                        onClick={() => {
                          const newTime = time.replace(':00', ':30')
                          if (!extraSlots.includes(newTime)) setExtraSlots([...extraSlots, newTime])
                        }}
                        className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-brand-deepBlue text-white rounded p-0.5"
                        title="Adicionar meia hora"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    )}
                  </TableCell>
                  {days.map((d) => {
                    const cDate = format(d, 'yyyy-MM-dd')
                    const cScheds = schedules.filter(
                      (s) => s.activity_date === cDate && s.start_time.startsWith(time),
                    )
                    const locked = isSameDay(d, new Date()) || isBefore(d, startOfDay(new Date()))

                    return (
                      <TableCell
                        key={d.toISOString()}
                        className={cn(
                          'border-l border-gray-100 align-top p-1.5 h-16 min-w-[120px]',
                          locked ? 'bg-slate-50/70' : 'hover:bg-slate-50 cursor-pointer',
                        )}
                        onClick={(e) => {
                          if (e.target === e.currentTarget && !locked) {
                            setModalData({
                              date: cDate,
                              time,
                              area_id: '',
                              description: '',
                              id: null,
                            })
                            setModalOpen(true)
                          } else if (locked && e.target === e.currentTarget)
                            toast({
                              title: 'Bloqueado',
                              description: 'Não é possível alterar registros desta data.',
                            })
                        }}
                      >
                        <div className="space-y-1">
                          {cScheds.map((cs) => (
                            <div
                              key={cs.id}
                              onClick={() => {
                                if (locked)
                                  return toast({
                                    title: 'Visualização Apenas',
                                    description: 'Agendamento bloqueado para edições.',
                                  })
                                setModalData({
                                  date: cDate,
                                  time,
                                  area_id: cs.area_id,
                                  description: cs.description,
                                  id: cs.id,
                                })
                                setModalOpen(true)
                              }}
                              className="text-[10px] p-1.5 bg-brand-deepBlue/10 border border-brand-deepBlue/20 text-brand-deepBlue rounded shadow-sm hover:shadow cursor-pointer"
                            >
                              <p className="font-bold truncate">{cs.areas?.name}</p>
                              <p className="truncate opacity-80">{cs.description}</p>
                            </div>
                          ))}
                        </div>
                      </TableCell>
                    )
                  })}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{modalData.id ? 'Editar Atividade' : 'Agendar Atividade'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Data</Label>
                <Input
                  value={modalData.date.split('-').reverse().join('/')}
                  disabled
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label>Horário</Label>
                <Input value={modalData.time} disabled className="bg-slate-50" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Área *</Label>
              <Select
                value={modalData.area_id}
                onValueChange={(v) => setModalData({ ...modalData, area_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {areas.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhuma área cadastrada
                    </SelectItem>
                  )}
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Descrição da Atividade *</Label>
              <Input
                value={modalData.description}
                onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                placeholder="Ex: Poda de grama, Limpeza de janelas..."
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center w-full sm:justify-between">
            {modalData.id ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" /> Excluir
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button
                variant="tech"
                onClick={handleSave}
                disabled={isSaving || !modalData.area_id || !modalData.description}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
