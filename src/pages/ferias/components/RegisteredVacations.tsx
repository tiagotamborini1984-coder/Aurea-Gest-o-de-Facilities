import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Users, ChevronLeft, ChevronRight, AlertCircle } from 'lucide-react'
import { getVacations, type Vacation } from '@/services/vacations'
import { format, parseISO } from 'date-fns'
import { cn } from '@/lib/utils'

const STATUS_LABELS: Record<string, string> = {
  scheduled: 'Pendente',
  approved: 'Aprovado',
  completed: 'Concluído',
  rejected: 'Recusado',
}

const STATUS_CLASSES: Record<string, string> = {
  scheduled: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  approved: 'bg-green-100 text-green-800 border-green-300',
  completed: 'bg-blue-100 text-blue-800 border-blue-300',
  rejected: 'bg-red-100 text-red-800 border-red-300',
}

const ITEMS_PER_PAGE = 10

interface RegisteredVacationsProps {
  clientId: string
  plantId: string
}

export function RegisteredVacations({ clientId, plantId }: RegisteredVacationsProps) {
  const [vacations, setVacations] = useState<Vacation[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [currentPage, setCurrentPage] = useState(1)

  const loadVacations = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await getVacations(clientId, plantId)
      setVacations(data)
    } catch (e: any) {
      setError(e.message || 'Erro ao carregar férias registradas')
    } finally {
      setLoading(false)
    }
  }, [clientId, plantId])

  useEffect(() => {
    loadVacations()
  }, [loadVacations])

  useEffect(() => {
    setCurrentPage(1)
  }, [plantId, clientId])

  const totalPages = Math.ceil(vacations.length / ITEMS_PER_PAGE)
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE
  const paginated = vacations.slice(startIndex, startIndex + ITEMS_PER_PAGE)

  return (
    <Card className="shadow-sm">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="h-5 w-5 text-gray-500" />
          Férias Registradas
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : error ? (
          <div className="flex items-center justify-center gap-2 py-8 text-red-500">
            <AlertCircle className="h-5 w-5" />
            <span>Erro ao carregar férias registradas</span>
          </div>
        ) : vacations.length === 0 ? (
          <div className="text-center text-gray-400 py-8">Nenhum período de férias registrado</div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-slate-50">
                    <th className="p-3 text-left font-semibold text-slate-700">Colaborador</th>
                    <th className="p-3 text-left font-semibold text-slate-700">Período</th>
                    <th className="p-3 text-center font-semibold text-slate-700">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((v) => (
                    <tr key={v.id} className="border-b last:border-0 hover:bg-slate-50">
                      <td className="p-3 font-medium text-slate-700">
                        {v.org_collaborators?.name || 'N/A'}
                      </td>
                      <td className="p-3 text-slate-600">
                        {format(parseISO(v.start_date), 'dd/MM/yyyy')} -{' '}
                        {format(parseISO(v.end_date), 'dd/MM/yyyy')}
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={cn(
                            'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium',
                            STATUS_CLASSES[v.status] || 'bg-gray-100 text-gray-800 border-gray-300',
                          )}
                        >
                          {STATUS_LABELS[v.status] || v.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4 border-t">
                <span className="text-sm text-gray-500">
                  {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, vacations.length)} de{' '}
                  {vacations.length}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Anterior
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Próximo
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
