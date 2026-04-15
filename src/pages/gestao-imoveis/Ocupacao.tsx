import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import {
  format,
  startOfToday,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  parseISO,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Plus, Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function OcupacaoImoveis() {
  const [properties, setProperties] = useState<any[]>([])
  const [reservations, setReservations] = useState<any[]>([])
  const [guests, setGuests] = useState<any[]>([])
  const { activeClient } = useAppStore()

  const [open, setOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [selectedReservation, setSelectedReservation] = useState<any>(null)

  const [booking, setBooking] = useState({
    property_id: '',
    room_id: '',
    guest_id: '',
    check_in: '',
    check_out: '',
    voucher: '',
  })

  const [selectedMonth, setSelectedMonth] = useState(format(startOfToday(), 'yyyy-MM'))
  const [selectedCity, setSelectedCity] = useState('all')
  const [selectedProperty, setSelectedProperty] = useState('all')

  const monthStart = selectedMonth ? parseISO(`${selectedMonth}-01`) : startOfMonth(startOfToday())
  const days = eachDayOfInterval({ start: monthStart, end: endOfMonth(monthStart) })
  const cities = Array.from(new Set(properties.map((p) => p.city).filter(Boolean)))

  const filteredProperties = properties.filter((p) => {
    if (selectedCity !== 'all' && p.city !== selectedCity) return false
    if (selectedProperty !== 'all' && p.id !== selectedProperty) return false
    return true
  })

  useEffect(() => {
    if (activeClient) loadData()
  }, [activeClient])

  async function loadData() {
    const [pRes, rRes, gRes] = await Promise.all([
      supabase.from('properties').select('*, property_rooms(*)').eq('client_id', activeClient?.id),
      supabase
        .from('property_reservations')
        .select('*, property_guests(*)')
        .eq('client_id', activeClient?.id),
      supabase.from('property_guests').select('*').eq('client_id', activeClient?.id),
    ])
    if (pRes.data) setProperties(pRes.data)
    if (rRes.data) setReservations(rRes.data)
    if (gRes.data) setGuests(gRes.data)
  }

  function getReservationForDate(roomId: string, date: Date) {
    const dateStr = format(date, 'yyyy-MM-dd')
    return reservations.find(
      (r) =>
        r.room_id === roomId &&
        r.status !== 'Cancelada' &&
        r.check_in_date <= dateStr &&
        r.check_out_date >= dateStr,
    )
  }

  async function handleDeleteReservation() {
    if (!selectedReservation) return
    if (!window.confirm('Tem certeza que deseja excluir esta reserva?')) return

    const { error } = await supabase
      .from('property_reservations')
      .delete()
      .eq('id', selectedReservation.id)

    if (error) {
      toast.error('Erro ao excluir reserva')
    } else {
      toast.success('Reserva excluída com sucesso')
      setDetailsOpen(false)
      loadData()
    }
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!activeClient) return

    if (booking.check_out < booking.check_in) {
      toast.error('A data de check-out deve ser igual ou posterior à data de check-in.')
      return
    }

    const hasConflict = reservations.some((r) => {
      if (r.room_id !== booking.room_id) return false
      if (r.status === 'Cancelada') return false

      const rCheckIn = r.check_in_date
      const rCheckOut = r.check_out_date
      const bCheckIn = booking.check_in
      const bCheckOut = booking.check_out

      return bCheckIn <= rCheckOut && rCheckIn <= bCheckOut
    })

    if (hasConflict) {
      toast.error(
        'Não é possível realizar a reserva para esse período, pois o quarto já está ocupado.',
      )
      return
    }

    const property = properties.find((p) => p.id === booking.property_id)
    const dailyRate = property ? Number(property.daily_rate) : 0
    const startDate = new Date(booking.check_in)
    const endDate = new Date(booking.check_out)
    const duration = Math.max(
      1,
      Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 3600 * 24)),
    )
    const totalAmount = dailyRate * duration

    const { error } = await supabase.from('property_reservations').insert({
      client_id: activeClient.id,
      property_id: booking.property_id,
      room_id: booking.room_id,
      guest_id: booking.guest_id,
      check_in_date: booking.check_in,
      check_out_date: booking.check_out,
      voucher: booking.voucher,
      total_amount: totalAmount,
      status: 'Confirmada',
    })

    if (error) toast.error('Erro ao salvar reserva')
    else {
      toast.success('Reserva confirmada!')
      setOpen(false)
      loadData()
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-800">Mapa de Ocupação</h1>
        <Button onClick={() => setOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Nova Reserva
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-white p-4 rounded-xl border shadow-sm">
        <div className="space-y-2">
          <Label>Mês</Label>
          <Input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label>Cidade</Label>
          <Select value={selectedCity} onValueChange={setSelectedCity}>
            <SelectTrigger>
              <SelectValue placeholder="Todas as cidades" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as cidades</SelectItem>
              {cities.map((city) => (
                <SelectItem key={String(city)} value={String(city)}>
                  {String(city)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Imóvel</Label>
          <Select value={selectedProperty} onValueChange={setSelectedProperty}>
            <SelectTrigger>
              <SelectValue placeholder="Todos os imóveis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os imóveis</SelectItem>
              {properties
                .filter((p) => selectedCity === 'all' || p.city === selectedCity)
                .map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="overflow-x-auto border rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="p-4 text-left font-semibold text-slate-700 min-w-[220px] sticky left-0 bg-slate-50/80 z-10 shadow-[1px_0_0_0_#e2e8f0]">
                Imóvel / Quarto
              </th>
              {days.map((d) => (
                <th
                  key={d.toISOString()}
                  className="p-2 text-center font-medium min-w-[70px] border-l border-slate-200"
                >
                  <div className="text-xs text-slate-500 uppercase">
                    {format(d, 'EEE', { locale: ptBR })}
                  </div>
                  <div className="text-base font-bold text-slate-800">{format(d, 'dd')}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredProperties.map((p) =>
              p.property_rooms?.map((r: any) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors group"
                >
                  <td className="p-4 sticky left-0 bg-white z-10 shadow-[1px_0_0_0_#e2e8f0] group-hover:bg-slate-50 transition-colors">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> {r.name}
                    </div>
                  </td>
                  {days.map((d) => {
                    const reservation = getReservationForDate(r.id, d)
                    const isPast = d.getTime() < startOfToday().getTime()

                    return (
                      <td
                        key={d.toISOString()}
                        className="p-1 border-l border-slate-200 text-center"
                      >
                        <div
                          className={`h-10 w-full rounded-md transition-all duration-200 flex items-center justify-center text-[10px] font-bold ${
                            reservation
                              ? isPast
                                ? 'bg-emerald-500 text-white shadow-sm cursor-pointer hover:bg-emerald-600'
                                : 'bg-red-500 text-white shadow-sm cursor-pointer hover:bg-red-600'
                              : 'bg-slate-100 hover:bg-slate-200 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!reservation) {
                              setBooking({
                                ...booking,
                                property_id: p.id,
                                room_id: r.id,
                                check_in: format(d, 'yyyy-MM-dd'),
                                voucher: '',
                              })
                              setOpen(true)
                            } else {
                              setSelectedReservation(reservation)
                              setDetailsOpen(true)
                            }
                          }}
                          title={reservation ? 'Ocupado' : 'Clique para reservar'}
                        >
                          {reservation &&
                            (reservation.voucher || reservation.id.substring(0, 6).toUpperCase())}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )),
            )}
            {filteredProperties.length === 0 && (
              <tr>
                <td colSpan={days.length + 1} className="p-12 text-center text-slate-500">
                  Nenhum resultado encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Reserva</DialogTitle>
          </DialogHeader>
          {selectedReservation && (
            <div className="space-y-4">
              <div>
                <Label className="text-slate-500">Voucher</Label>
                <div className="font-medium text-lg">
                  {selectedReservation.voucher ||
                    selectedReservation.id.substring(0, 8).toUpperCase()}
                </div>
              </div>
              <div>
                <Label className="text-slate-500">Hóspede</Label>
                <div className="font-medium">
                  {selectedReservation.property_guests?.name || 'N/A'}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-slate-500">Check-in</Label>
                  <div className="font-medium">
                    {format(parseISO(selectedReservation.check_in_date), 'dd/MM/yyyy')}
                  </div>
                </div>
                <div>
                  <Label className="text-slate-500">Check-out</Label>
                  <div className="font-medium">
                    {format(parseISO(selectedReservation.check_out_date), 'dd/MM/yyyy')}
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-slate-500">Status</Label>
                <div className="font-medium">{selectedReservation.status}</div>
              </div>
              <div>
                <Label className="text-slate-500">Valor Total</Label>
                <div className="font-medium">
                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                    selectedReservation.total_amount,
                  )}
                </div>
              </div>
            </div>
          )}
          <DialogFooter className="mt-4 flex flex-row justify-between w-full">
            <Button type="button" variant="destructive" onClick={handleDeleteReservation}>
              <Trash2 className="mr-2 h-4 w-4" /> Excluir Reserva
            </Button>
            <Button type="button" variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fazer Reserva</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="space-y-2">
              <Label>Imóvel</Label>
              <Select
                value={booking.property_id}
                onValueChange={(v) => setBooking({ ...booking, property_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {booking.property_id && (
              <div className="space-y-2">
                <Label>Quarto</Label>
                <Select
                  value={booking.room_id}
                  onValueChange={(v) => setBooking({ ...booking, room_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    {properties
                      .find((p) => p.id === booking.property_id)
                      ?.property_rooms.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Hóspede</Label>
              <Select
                value={booking.guest_id}
                onValueChange={(v) => setBooking({ ...booking, guest_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {guests.map((g) => (
                    <SelectItem key={g.id} value={g.id}>
                      {g.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Voucher</Label>
              <Input
                required
                value={booking.voucher}
                onChange={(e) => setBooking({ ...booking, voucher: e.target.value })}
                placeholder="Número do voucher"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  required
                  value={booking.check_in}
                  onChange={(e) => setBooking({ ...booking, check_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  required
                  value={booking.check_out}
                  onChange={(e) => setBooking({ ...booking, check_out: e.target.value })}
                />
              </div>
            </div>
            <Button type="submit" className="w-full">
              Confirmar Reserva
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
