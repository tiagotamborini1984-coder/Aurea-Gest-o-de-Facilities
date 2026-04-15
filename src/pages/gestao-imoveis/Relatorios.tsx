import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { FileText, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function RelatoriosImoveis() {
  const [reservations, setReservations] = useState<any[]>([])
  const { activeClient } = useAppStore()

  useEffect(() => {
    if (activeClient) loadData()
  }, [activeClient])

  async function loadData() {
    const { data } = await supabase
      .from('property_reservations')
      .select(
        '*, properties(name), property_rooms(name), property_guests(name, property_cost_centers(name))',
      )
      .eq('client_id', activeClient?.id)
      .order('check_in_date', { ascending: false })

    if (data) setReservations(data)
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold flex items-center gap-3 text-slate-800">
          <FileText className="h-8 w-8 text-primary" /> Relatório Financeiro
        </h1>
        <Button variant="outline" className="shadow-sm">
          <Download className="mr-2 h-4 w-4" /> Exportar CSV
        </Button>
      </div>

      <Card className="shadow-sm border-0 ring-1 ring-slate-200">
        <CardHeader className="bg-slate-50 border-b">
          <CardTitle className="text-lg text-slate-700">Histórico de Reservas e Ocupação</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50/50">
                  <TableHead className="font-semibold">Imóvel</TableHead>
                  <TableHead className="font-semibold">Quarto</TableHead>
                  <TableHead className="font-semibold">Hóspede</TableHead>
                  <TableHead className="font-semibold">Centro de Custo</TableHead>
                  <TableHead className="font-semibold">Período</TableHead>
                  <TableHead className="text-right font-semibold">Valor Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations.map((r) => (
                  <TableRow key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <TableCell className="font-medium text-slate-800">
                      {r.properties?.name}
                    </TableCell>
                    <TableCell className="text-slate-600">{r.property_rooms?.name}</TableCell>
                    <TableCell className="text-slate-600">{r.property_guests?.name}</TableCell>
                    <TableCell>
                      <span className="text-slate-600 bg-slate-100 px-2 py-1 rounded-md text-xs">
                        {r.property_guests?.property_cost_centers?.name || 'Geral'}
                      </span>
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {format(new Date(r.check_in_date), 'dd/MM/yy')} até{' '}
                      {format(new Date(r.check_out_date), 'dd/MM/yy')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-emerald-600">
                      R${' '}
                      {Number(r.total_amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                  </TableRow>
                ))}
                {reservations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-12 text-slate-500">
                      Nenhuma reserva encontrada no período selecionado.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
