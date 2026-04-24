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
import { FileText } from 'lucide-react'

export default function HistoricoAcidentes() {
  const { activeClient, activePlant } = useAppStore()
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!activeClient) return
      let query = supabase
        .from('accidents')
        .select('*, plants(name)')
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
                    <TableHead>Departamento</TableHead>
                    <TableHead>Local</TableHead>
                    <TableHead>Gravidade</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        {format(new Date(item.event_date), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>{item.plants?.name || 'N/A'}</TableCell>
                      <TableCell>{item.department}</TableCell>
                      <TableCell>{item.location}</TableCell>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
