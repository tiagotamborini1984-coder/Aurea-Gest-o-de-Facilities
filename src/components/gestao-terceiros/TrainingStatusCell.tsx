import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { CheckCircle, XCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TrainingDetail {
  training_id: string
  training_name: string
  status: 'Concluído' | 'Pendente' | 'Vencido'
  completion_date?: string
  document_url?: string
}

interface TrainingStatusCellProps {
  employeeName: string
  statusData: {
    status: 'Concluído' | 'Pendente' | 'Vencido' | 'N/A'
    details: TrainingDetail[]
  }
}

export function TrainingStatusCell({ employeeName, statusData }: TrainingStatusCellProps) {
  const [modalOpen, setModalOpen] = useState(false)

  if (!statusData || statusData.status === 'N/A') {
    return <span className="text-gray-400 text-sm font-medium">N/A</span>
  }

  let color = 'bg-gray-100 text-gray-800 border-gray-200'
  let Icon = Clock

  if (statusData.status === 'Concluído') {
    color = 'bg-green-100 text-green-800 border-green-200'
    Icon = CheckCircle
  } else if (statusData.status === 'Vencido') {
    color = 'bg-red-100 text-red-800 border-red-200'
    Icon = XCircle
  } else if (statusData.status === 'Pendente') {
    color = 'bg-amber-100 text-amber-800 border-amber-200'
    Icon = Clock
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setModalOpen(true)}
        className={cn(
          'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border transition-colors hover:opacity-80',
          color,
        )}
      >
        <Icon className="w-3.5 h-3.5" />
        {statusData.status}
      </button>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle>Treinamentos - {employeeName}</DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-3">
            {statusData.details && statusData.details.length > 0 ? (
              statusData.details.map((detail, idx) => (
                <div
                  key={idx}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 border rounded-lg gap-4 bg-gray-50/50 dark:bg-slate-800/50"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                      {detail.training_name || 'Treinamento não identificado'}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Conclusão:{' '}
                      {detail.completion_date
                        ? new Date(detail.completion_date).toLocaleDateString('pt-BR', {
                            timeZone: 'UTC',
                          })
                        : 'Não realizado'}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium',
                        detail.status === 'Concluído'
                          ? 'bg-green-100 text-green-800'
                          : detail.status === 'Vencido'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-amber-100 text-amber-800',
                      )}
                    >
                      {detail.status}
                    </span>

                    {detail.document_url && (
                      <Button variant="outline" size="sm" asChild className="h-7 text-xs">
                        <a href={detail.document_url} target="_blank" rel="noreferrer">
                          Certificado
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500">
                  Nenhum treinamento exigido para a função atual.
                </p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
