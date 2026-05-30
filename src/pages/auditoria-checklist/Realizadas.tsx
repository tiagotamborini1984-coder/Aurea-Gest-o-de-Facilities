import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Card, CardContent } from '@/components/ui/card'
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
import { Loader2, ClipboardCheck, Search } from 'lucide-react'

export default function AuditoriaRealizadas() {
  const { activeClient } = useAppStore()
  const [loading, setLoading] = useState(true)
  const [executions, setExecutions] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState<string>('all')

  useEffect(() => {
    if (!activeClient) return
    fetchPlants()
  }, [activeClient])

  useEffect(() => {
    if (!activeClient) return
    fetchExecutions()
  }, [activeClient, selectedPlant])

  const fetchPlants = async () => {
    const { data } = await supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient!.id)
      .order('name')
    if (data) setPlants(data)
  }

  const fetchExecutions = async () => {
    setLoading(true)
    let query = supabase
      .from('audit_executions')
      .select(`
        id,
        realization_date,
        final_score,
        max_score,
        audits ( title ),
        plants ( name ),
        profiles ( name )
      `)
      .eq('status', 'Finalizado')
      .order('realization_date', { ascending: false })

    if (selectedPlant !== 'all') {
      query = query.eq('plant_id', selectedPlant)
    }

    const { data } = await query
    if (data) {
      setExecutions(data)
    }
    setLoading(false)
  }

  const parseDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      const [year, month, day] = dateStr.split('T')[0].split('-')
      return `${day}/${month}/${year}`
    } catch (e) {
      return dateStr
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-8 w-8 text-brand-vividBlue" />
            Auditorias Realizadas
          </h1>
          <p className="text-gray-500 mt-1">Histórico de auditorias concluídas</p>
        </div>

        <div className="w-full md:w-72">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="bg-white border-gray-200">
              <div className="flex items-center gap-2">
                <Search className="h-4 w-4 text-gray-400" />
                <span className="flex-1 text-left">
                  <SelectValue placeholder="Filtrar por Planta" />
                </span>
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((plant) => (
                <SelectItem key={plant.id} value={plant.id}>
                  {plant.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
            </div>
          ) : executions.length === 0 ? (
            <div className="text-center py-20 text-gray-500 bg-gray-50/50">
              <ClipboardCheck className="h-12 w-12 mx-auto text-gray-300 mb-3" />
              <p className="text-lg font-medium text-gray-900">
                Nenhuma auditoria realizada encontrada
              </p>
              <p className="text-sm mt-1">
                Não há registros finalizados para os filtros selecionados.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-gray-50/80">
                  <TableRow>
                    <TableHead className="w-[300px]">Auditoria</TableHead>
                    <TableHead>Planta</TableHead>
                    <TableHead>Data de Realização</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Pontuação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {executions.map((exec) => {
                    const scoreRatio =
                      exec.final_score !== null && exec.max_score !== null && exec.max_score > 0
                        ? exec.final_score / exec.max_score
                        : 0

                    return (
                      <TableRow key={exec.id} className="hover:bg-gray-50/50 transition-colors">
                        <TableCell className="font-medium text-gray-900">
                          {exec.audits?.title}
                        </TableCell>
                        <TableCell className="text-gray-600">{exec.plants?.name}</TableCell>
                        <TableCell className="text-gray-600">
                          {parseDate(exec.realization_date)}
                        </TableCell>
                        <TableCell className="text-gray-600">
                          {exec.profiles?.name || 'Não atribuído'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="inline-flex items-center justify-end font-semibold">
                            {exec.final_score !== null && exec.max_score !== null ? (
                              <span
                                className={
                                  scoreRatio >= 0.8
                                    ? 'text-green-600'
                                    : scoreRatio >= 0.6
                                      ? 'text-yellow-600'
                                      : 'text-red-600'
                                }
                              >
                                {Number(exec.final_score).toFixed(1)} /{' '}
                                {Number(exec.max_score).toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
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
    </div>
  )
}
