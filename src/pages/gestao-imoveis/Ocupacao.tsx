import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { addDays, format, startOfToday } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Button } from '@/components/ui/button'
import { Plus } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
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
  const [booking, setBooking] = useState({
    property_id: '',
    room_id: '',
    guest_id: '',
    check_in: '',
    check_out: '',
  })

  const days = Array.from({ length: 14 }).map((_, i) => addDays(startOfToday(), i))

  useEffect(() => {
    if (activeClient) loadData()
  }, [activeClient])

  async function loadData() {
    const [pRes, rRes, gRes] = await Promise.all([
      supabase.from('properties').select('*, property_rooms(*)').eq('client_id', activeClient?.id),
      supabase.from('property_reservations').select('*').eq('client_id', activeClient?.id),
      supabase.from('property_guests').select('*').eq('client_id', activeClient?.id),
    ])
    if (pRes.data) setProperties(pRes.data)
    if (rRes.data) setReservations(rRes.data)
    if (gRes.data) setGuests(gRes.data)
  }

  function getStatus(roomId: string, date: Date) {
    const res = reservations.find(
      (r) =>
        r.room_id === roomId &&
        new Date(r.check_in_date).setHours(0, 0, 0, 0) <= date.getTime() &&
        new Date(r.check_out_date).setHours(0, 0, 0, 0) >= date.getTime(),
    )
    return res ? 'reserved' : 'free'
  }

  async function handleBook(e: React.FormEvent) {
    e.preventDefault()
    if (!activeClient) return
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

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fazer Reserva</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleBook} className="space-y-4">
            <div className="space-y-2">
              <Label>Imóvel</Label>
              <Select onValueChange={(v) => setBooking({ ...booking, property_id: v })}>
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
                <Select onValueChange={(v) => setBooking({ ...booking, room_id: v })}>
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
              <Select onValueChange={(v) => setBooking({ ...booking, guest_id: v })}>
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-in</Label>
                <Input
                  type="date"
                  required
                  onChange={(e) => setBooking({ ...booking, check_in: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Check-out</Label>
                <Input
                  type="date"
                  required
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

      <div className="overflow-x-auto border rounded-xl bg-white shadow-sm">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-slate-50/80">
              <th className="p-4 text-left font-semibold text-slate-700 min-w-[220px]">
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
            {properties.map((p) =>
              p.property_rooms?.map((r: any) => (
                <tr
                  key={r.id}
                  className="border-b last:border-0 hover:bg-slate-50 transition-colors"
                >
                  <td className="p-4">
                    <div className="font-semibold text-slate-800">{p.name}</div>
                    <div className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                      <span className="w-2 h-2 rounded-full bg-blue-500"></span> {r.name}
                    </div>
                  </td>
                  {days.map((d) => {
                    const status = getStatus(r.id, d)
                    return (
                      <td
                        key={d.toISOString()}
                        className="p-1 border-l border-slate-200 text-center"
                      >
                        <div
                          className={`h-10 w-full rounded-md transition-all duration-200 ${status === 'reserved' ? 'bg-primary shadow-sm cursor-pointer hover:bg-primary/90' : 'bg-slate-100 hover:bg-slate-200 cursor-pointer'}`}
                          onClick={() => {
                            if (status === 'free') {
                              setBooking({
                                ...booking,
                                property_id: p.id,
                                room_id: r.id,
                                check_in: format(d, 'yyyy-MM-dd'),
                              })
                              setOpen(true)
                            }
                          }}
                          title={status === 'reserved' ? 'Ocupado' : 'Clique para reservar'}
                        />
                      </td>
                    )
                  })}
                </tr>
              )),
            )}
            {properties.length === 0 && (
              <tr>
                <td colSpan={15} className="p-12 text-center text-slate-500">
                  Nenhum imóvel ou quarto cadastrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
