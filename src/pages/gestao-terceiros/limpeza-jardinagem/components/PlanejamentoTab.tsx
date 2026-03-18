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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronLeft, ChevronRight, Loader2, Trash2, Plus, Printer, FileDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { cn } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'

const getStatusColor = (status: string) => {
  if (status === 'Realizado') return 'bg-[#dcfce7] border-[#86efac] text-[#166534]'
  if (status === 'Não Realizado') return 'bg-[#fee2e2] border-[#fca5a5] text-[#991b1b]'
  return 'bg-[#fef9c3] border-[#fde047] text-[#854d0e]'
}

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
    end_time: '',
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
    const combined = [...base, ...extraSlots].sort()
    return combined.map((time, idx) => {
      const occurrenceIndex = combined.slice(0, idx).filter((t) => t === time).length
      const totalOccurrences = combined.filter((t) => t === time).length
      return { time, occurrenceIndex, isLastOccurrence: occurrenceIndex === totalOccurrences - 1 }
    })
  }, [extraSlots])

  const calculateSpan = (start: string, end: string) => {
    if (!end) return 1
    const sTime = start.substring(0, 5)
    const eTime = end.substring(0, 5)
    const sIdx = allSlots.findIndex((s) => s.time === sTime)
    if (sIdx === -1) return 1
    let eIdx = allSlots.findIndex((s) => s.time === eTime)
    if (eIdx === -1) {
      eIdx = allSlots.findIndex((s) => s.time > eTime)
      if (eIdx === -1) eIdx = allSlots.length
    }
    return Math.max(1, eIdx - sIdx)
  }

  const handleSave = async () => {
    if (!modalData.area_id || !modalData.description || !modalData.end_time) return
    setIsSaving(true)
    try {
      const payload = {
        client_id: profile!.client_id,
        plant_id: plantId,
        area_id: modalData.area_id,
        activity_date: modalData.date,
        start_time: `${modalData.time}:00`,
        end_time: `${modalData.end_time}:00`,
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

  const handleDragStart = (e: React.DragEvent, schedId: string) => {
    e.dataTransfer.setData('text/plain', schedId)
    e.currentTarget.classList.add('opacity-50')
  }

  const handleDrop = async (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault()
    e.currentTarget.classList.remove('bg-brand-vividBlue/20')
    const schedId = e.dataTransfer.getData('text/plain')
    if (!schedId) return

    const sched = schedules.find((s) => s.id === schedId)
    if (!sched) return

    setIsSaving(true)
    try {
      let newEndStr = '00:00'
      if (sched.end_time) {
        const sDate = new Date(`1970-01-01T${sched.start_time}`)
        const eDate = new Date(`1970-01-01T${sched.end_time}`)
        const durationMs = eDate.getTime() - sDate.getTime()
        const newSDate = new Date(`1970-01-01T${time}:00`)
        const newEDate = new Date(newSDate.getTime() + durationMs)
        newEndStr = newEDate.toTimeString().substring(0, 5)
      } else {
        const newSDate = new Date(`1970-01-01T${time}:00`)
        newSDate.setHours(newSDate.getHours() + 1)
        newEndStr = newSDate.toTimeString().substring(0, 5)
      }

      const { error } = await supabase
        .from('cleaning_gardening_schedules')
        .update({ activity_date: date, start_time: `${time}:00`, end_time: `${newEndStr}:00` })
        .eq('id', schedId)

      if (error) throw error
      toast({ title: 'Atividade reagendada!' })
      fetchWeekData()
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro', description: err.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportCSV = () => {
    const data = schedules.map((s) => ({
      Data: s.activity_date.split('-').reverse().join('/'),
      Início: s.start_time.substring(0, 5),
      Fim: s.end_time ? s.end_time.substring(0, 5) : '-',
      Área: s.areas?.name || '-',
      Tipo: s.areas?.type === 'cleaning' ? 'Limpeza' : 'Jardinagem',
      Descrição: s.description,
      Status: s.status,
    }))
    exportToCSV(`planejamento_${format(weekStart, 'yyyy-MM-dd')}.csv`, data)
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-4 rounded-xl border-2 border-gray-200 shadow-sm print:hidden">
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger className="w-[200px] h-11 bg-slate-50 text-base font-semibold">
              <SelectValue placeholder="Planta" />
            </SelectTrigger>
            <SelectContent>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id} className="text-base">
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex bg-slate-100 p-1 rounded-lg">
            <Button
              variant={serviceType === 'cleaning' ? 'default' : 'ghost'}
              size="lg"
              onClick={() => setServiceType('cleaning')}
              className="font-bold"
            >
              Limpeza
            </Button>
            <Button
              variant={serviceType === 'gardening' ? 'default' : 'ghost'}
              size="lg"
              onClick={() => setServiceType('gardening')}
              className="font-bold"
            >
              Jardinagem
            </Button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(subDays(weekStart, 7))}
            >
              <ChevronLeft className="h-5 w-5" />
            </Button>
            <span className="text-lg font-bold text-slate-800 min-w-[150px] text-center bg-slate-50 border rounded-md flex items-center justify-center">
              {format(weekStart, 'dd/MM')} - {format(addDays(weekStart, 6), 'dd/MM')}
            </span>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setWeekStart(addDays(weekStart, 7))}
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          </div>
          <div className="flex gap-2 border-l pl-4 border-slate-300">
            <Button variant="outline" onClick={() => window.print()} className="gap-2">
              <Printer className="h-5 w-5" /> PDF
            </Button>
            <Button variant="outline" onClick={handleExportCSV} className="gap-2">
              <FileDown className="h-5 w-5" /> Excel
            </Button>
          </div>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-xl overflow-hidden shadow-md overflow-x-auto print:border-none print:shadow-none">
        <Table className="min-w-[1000px] border-collapse">
          <TableHeader>
            <TableRow>
              <TableHead className="w-[100px] text-center font-extrabold text-base text-slate-900 border-r-2 border-gray-300 bg-slate-200 uppercase tracking-wide">
                Horário
              </TableHead>
              {days.map((d) => (
                <TableHead
                  key={d.toISOString()}
                  className="text-center font-extrabold text-base text-slate-900 border-x border-gray-300 bg-slate-200"
                >
                  {format(d, 'EEEE', { locale: ptBR })}
                  <br />
                  <span className="text-sm text-slate-600 font-semibold">{format(d, 'dd/MM')}</span>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-20">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : (
              allSlots.map((slot, rowIdx) => {
                const time = slot.time
                return (
                  <TableRow
                    key={`${time}-${slot.occurrenceIndex}`}
                    className={cn(
                      'group transition-colors border-b-2 border-gray-300',
                      rowIdx % 2 === 1 ? 'bg-slate-100' : 'bg-white',
                    )}
                  >
                    <TableCell className="font-extrabold text-base text-slate-700 text-center relative p-0 border-r-2 border-gray-300">
                      <span className="py-6 inline-block">{time}</span>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 bg-brand-deepBlue text-white rounded p-1 transition-opacity shadow-sm print:hidden">
                            <Plus className="h-4 w-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" className="w-64">
                          {time.endsWith(':00') && (
                            <DropdownMenuItem
                              onClick={() => {
                                const newTime = time.replace(':00', ':30')
                                if (!extraSlots.includes(newTime))
                                  setExtraSlots([...extraSlots, newTime])
                              }}
                            >
                              Adicionar intervalo de 30 min
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onClick={() => setExtraSlots([...extraSlots, time])}>
                            Duplicar horário
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    {days.map((d, colIdx) => {
                      const cDate = format(d, 'yyyy-MM-dd')
                      const cScheds = schedules.filter(
                        (s) => s.activity_date === cDate && s.start_time.startsWith(time),
                      )

                      const displayScheds = slot.isLastOccurrence
                        ? cScheds.slice(slot.occurrenceIndex)
                        : cScheds.slice(slot.occurrenceIndex, slot.occurrenceIndex + 1)

                      const locked = isSameDay(d, new Date()) || isBefore(d, startOfDay(new Date()))

                      return (
                        <TableCell
                          key={d.toISOString()}
                          className={cn(
                            'border-l-2 border-gray-300 p-0 align-top transition-colors relative min-w-[150px]',
                            colIdx % 2 === 1 && !locked && 'bg-slate-50/50',
                            locked
                              ? 'bg-slate-200/60 cursor-not-allowed'
                              : 'hover:bg-brand-vividBlue/5 cursor-pointer',
                          )}
                          onDragOver={(e) => e.preventDefault()}
                          onDragEnter={(e) => {
                            e.preventDefault()
                            if (!locked) e.currentTarget.classList.add('bg-brand-vividBlue/20')
                          }}
                          onDragLeave={(e) =>
                            e.currentTarget.classList.remove('bg-brand-vividBlue/20')
                          }
                          onDrop={(e) => {
                            if (!locked) handleDrop(e, cDate, time)
                          }}
                          onClick={(e) => {
                            if ((e.target as HTMLElement).dataset.slot === 'true') {
                              if (locked)
                                return toast({
                                  title: 'Visualização',
                                  description: 'Data bloqueada.',
                                })
                              const end = new Date(`1970-01-01T${time}:00`)
                              end.setHours(end.getHours() + 1)
                              setModalData({
                                date: cDate,
                                time,
                                end_time: end.toTimeString().substring(0, 5),
                                area_id: '',
                                description: '',
                                id: null,
                              })
                              setModalOpen(true)
                            }
                          }}
                        >
                          <div
                            data-slot="true"
                            className="w-full h-full min-h-[6rem] p-1.5 relative"
                          >
                            {displayScheds.map((cs, csIdx) => {
                              const span = calculateSpan(cs.start_time, cs.end_time)
                              return (
                                <div
                                  key={cs.id}
                                  draggable={!locked}
                                  onDragStart={(e) => handleDragStart(e, cs.id)}
                                  onDragEnd={(e) => e.currentTarget.classList.remove('opacity-50')}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    if (locked)
                                      return toast({
                                        title: 'Visualização',
                                        description: 'Data bloqueada.',
                                      })
                                    setModalData({
                                      date: cDate,
                                      time: cs.start_time.substring(0, 5),
                                      end_time: cs.end_time ? cs.end_time.substring(0, 5) : '',
                                      area_id: cs.area_id,
                                      description: cs.description,
                                      id: cs.id,
                                    })
                                    setModalOpen(true)
                                  }}
                                  title={`${cs.description}\nStatus: ${cs.status}`}
                                  style={{
                                    height: `calc(${span * 100}% + ${span > 1 ? (span - 1) * 2 : 0}px)`,
                                    top: `${csIdx * 6}px`,
                                    left: `${csIdx * 6 + 6}px`,
                                    right: '6px',
                                    zIndex: 10 + csIdx,
                                  }}
                                  className={cn(
                                    'absolute p-3 border-2 rounded-lg shadow-sm hover:shadow-lg cursor-grab active:cursor-grabbing transition-all overflow-hidden flex flex-col',
                                    getStatusColor(cs.status),
                                  )}
                                >
                                  <p className="font-extrabold text-sm truncate">
                                    {cs.areas?.name}
                                  </p>
                                  <p className="text-xs font-bold opacity-80 mt-0.5">
                                    {cs.start_time.substring(0, 5)} - {cs.end_time?.substring(0, 5)}
                                  </p>
                                  <p className="text-sm font-medium mt-1.5 leading-tight overflow-hidden text-ellipsis line-clamp-3">
                                    {cs.description}
                                  </p>
                                </div>
                              )
                            })}
                          </div>
                        </TableCell>
                      )
                    })}
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle className="text-2xl">
              {modalData.id ? 'Editar Atividade' : 'Agendar Atividade'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label className="text-base font-bold text-slate-700">Data</Label>
                <Input
                  value={modalData.date.split('-').reverse().join('/')}
                  disabled
                  className="bg-slate-100 text-base font-semibold"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-base font-bold text-slate-700">Horário Início</Label>
                <Input
                  value={modalData.time}
                  disabled
                  className="bg-slate-100 text-base font-semibold"
                />
              </div>
              <div className="space-y-2 flex-1">
                <Label className="text-base font-bold text-slate-700">Horário Fim *</Label>
                <Input
                  type="time"
                  className="text-base font-semibold bg-white"
                  value={modalData.end_time}
                  onChange={(e) => setModalData({ ...modalData, end_time: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold text-slate-700">Área / Local *</Label>
              <Select
                value={modalData.area_id}
                onValueChange={(v) => setModalData({ ...modalData, area_id: v })}
              >
                <SelectTrigger className="h-12 text-base bg-white">
                  <SelectValue placeholder="Selecione a área..." />
                </SelectTrigger>
                <SelectContent>
                  {areas.length === 0 && (
                    <SelectItem value="none" disabled>
                      Nenhuma área cadastrada
                    </SelectItem>
                  )}
                  {areas.map((a) => (
                    <SelectItem key={a.id} value={a.id} className="text-base">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-base font-bold text-slate-700">Descrição da Atividade *</Label>
              <Input
                className="h-12 text-base bg-white"
                value={modalData.description}
                onChange={(e) => setModalData({ ...modalData, description: e.target.value })}
                placeholder="Ex: Poda de grama, Limpeza pesada..."
              />
            </div>
          </div>
          <DialogFooter className="flex justify-between items-center w-full">
            {modalData.id ? (
              <Button
                variant="ghost"
                onClick={handleDelete}
                disabled={isSaving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50 font-bold text-base"
              >
                <Trash2 className="h-5 w-5 mr-2" /> Excluir
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => setModalOpen(false)}
                className="font-bold text-base h-11 px-6"
              >
                Cancelar
              </Button>
              <Button
                variant="tech"
                onClick={handleSave}
                className="font-bold text-base h-11 px-8"
                disabled={
                  isSaving ||
                  !modalData.area_id ||
                  !modalData.description ||
                  !modalData.end_time ||
                  modalData.end_time <= modalData.time
                }
              >
                {isSaving && <Loader2 className="h-5 w-5 mr-2 animate-spin" />} Salvar
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
