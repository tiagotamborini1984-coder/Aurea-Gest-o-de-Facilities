import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { format } from 'date-fns'
import { Badge } from '@/components/ui/badge'
import {
  Printer,
  Calendar,
  MapPin,
  Building,
  AlertTriangle,
  Paperclip,
  CheckCircle,
  FileText,
  ExternalLink,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

export function AccidentReportModal({
  accidentId,
  open,
  onClose,
}: {
  accidentId: string | null
  open: boolean
  onClose: () => void
}) {
  const [accident, setAccident] = useState<any>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open && accidentId) {
      fetchData(accidentId)
    } else {
      setAccident(null)
      setTasks([])
    }
  }, [open, accidentId])

  const fetchData = async (id: string) => {
    setLoading(true)
    try {
      const { data: accData } = await supabase
        .from('accidents')
        .select('*, plants(name, code), companies(name)')
        .eq('id', id)
        .single()

      if (accData) setAccident(accData)

      // Fetch tasks (ações mitigadoras)
      const { data: tasksData } = await supabase
        .from('tasks')
        .select(
          '*, assignee:profiles!tasks_assignee_id_fkey(name), status:task_statuses(name, color)',
        )
        .eq('accident_id', id)
        .order('created_at', { ascending: true })

      if (tasksData) setTasks(tasksData)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handlePrint = () => {
    window.print()
  }

  return (
    <Sheet open={open} onOpenChange={(val) => !val && onClose()}>
      <SheetContent className="w-full sm:max-w-4xl overflow-y-auto print:fixed print:inset-0 print:bg-white print:z-[9999] print:block print:max-w-none print:w-full print:h-auto print:overflow-visible print:border-none print:shadow-none print:p-8">
        <SheetHeader className="print:hidden">
          <SheetTitle className="text-2xl flex justify-between items-center pr-6">
            Relatório de Evento
            <Button onClick={handlePrint} variant="outline" className="gap-2">
              <Printer className="w-4 h-4" /> Imprimir
            </Button>
          </SheetTitle>
        </SheetHeader>

        <div className="hidden print:block text-center mb-8 border-b pb-4">
          <h1 className="text-3xl font-bold uppercase tracking-wider text-gray-900">
            Relatório de Ocorrência
          </h1>
          <p className="text-gray-500 mt-2">Gerado em {format(new Date(), 'dd/MM/yyyy HH:mm')}</p>
        </div>

        {loading ? (
          <div className="py-20 text-center text-gray-500">Carregando dados do relatório...</div>
        ) : accident ? (
          <div className="space-y-10 mt-6 print:mt-0 print:space-y-8">
            {/* Detalhes do Evento */}
            <section>
              <h3 className="text-xl font-bold border-b-2 border-gray-200 pb-2 mb-6 flex items-center gap-2 text-gray-800 print:text-black">
                <AlertTriangle className="w-6 h-6 text-amber-500 print:text-black" />
                1. Informações do Evento
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-b print:pb-2">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                    <Calendar className="w-4 h-4" /> Data e Hora
                  </span>
                  <p className="font-semibold text-gray-900 text-lg">
                    {format(new Date(accident.event_date), 'dd/MM/yyyy HH:mm')}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-b print:pb-2">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                    <Building className="w-4 h-4" /> Planta / Unidade
                  </span>
                  <p className="font-semibold text-gray-900 text-lg">
                    {accident.plants?.name} ({accident.plants?.code})
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-b print:pb-2">
                  <span className="text-sm font-medium text-gray-500 flex items-center gap-1 mb-1">
                    <MapPin className="w-4 h-4" /> Local Exato
                  </span>
                  <p className="font-semibold text-gray-900 text-lg">{accident.location}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-b print:pb-2">
                  <span className="text-sm font-medium text-gray-500 mb-1 block">Departamento</span>
                  <p className="font-semibold text-gray-900 text-lg">{accident.department}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-b print:pb-2">
                  <span className="text-sm font-medium text-gray-500 mb-1 block">
                    Empresa Envolvida
                  </span>
                  <p className="font-semibold text-gray-900 text-lg">
                    {accident.companies?.name || 'N/A'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg print:bg-transparent print:p-0 print:border-b print:pb-2">
                  <span className="text-sm font-medium text-gray-500 mb-1 block">Gravidade</span>
                  <Badge
                    variant="outline"
                    className={`text-sm px-3 py-1 print:border-black print:text-black ${
                      accident.severity === 'Grave'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : accident.severity === 'Moderado'
                          ? 'bg-amber-50 text-amber-700 border-amber-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                    }`}
                  >
                    {accident.severity}
                  </Badge>
                </div>
              </div>

              <div className="mt-6">
                <span className="text-sm font-medium text-gray-700 block mb-2">
                  Descrição Detalhada do Evento
                </span>
                <div className="text-gray-800 whitespace-pre-wrap bg-gray-50 p-5 rounded-lg border print:bg-transparent print:border-gray-300">
                  {accident.description}
                </div>
              </div>
            </section>

            {/* Anexos do Acidente */}
            {accident.photos && accident.photos.length > 0 && (
              <section className="print:break-inside-avoid">
                <h3 className="text-xl font-bold border-b-2 border-gray-200 pb-2 mb-6 flex items-center gap-2 text-gray-800 print:text-black">
                  <Paperclip className="w-6 h-6 text-gray-500 print:text-black" />
                  2. Evidências / Anexos do Evento
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                  {accident.photos.map((p: any, i: number) => (
                    <div
                      key={i}
                      className="border rounded-lg p-3 flex flex-col items-center gap-3 bg-gray-50 print:bg-transparent print:border-gray-300"
                    >
                      {p.url?.includes('application/pdf') || p.url?.endsWith('.pdf') ? (
                        <FileText className="w-16 h-16 text-red-400" />
                      ) : (
                        <img
                          src={p.url}
                          alt={p.name}
                          className="w-full h-32 object-cover rounded-md border print:border-none"
                        />
                      )}
                      <span
                        className="text-sm font-medium text-center truncate w-full text-gray-700"
                        title={p.name}
                      >
                        {p.name}
                      </span>
                      <a
                        href={p.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-xs text-blue-600 hover:underline print:hidden font-medium bg-white px-3 py-1 rounded-full border shadow-sm"
                      >
                        Visualizar Arquivo
                      </a>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Ações Mitigadoras */}
            <section className="print:mt-8">
              <h3 className="text-xl font-bold border-b-2 border-gray-200 pb-2 mb-6 flex items-center gap-2 text-gray-800 print:text-black">
                <CheckCircle className="w-6 h-6 text-green-500 print:text-black" />
                3. Plano de Ação (Ações Mitigadoras/Corretivas)
              </h3>
              {tasks.length === 0 ? (
                <div className="bg-gray-50 p-6 rounded-lg border text-center text-gray-500 italic print:bg-transparent">
                  Nenhuma ação corretiva registrada para este evento até o momento.
                </div>
              ) : (
                <div className="space-y-6">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="border border-gray-200 rounded-xl overflow-hidden bg-white print:border-gray-400 print:break-inside-avoid shadow-sm"
                    >
                      <div className="bg-gray-50 border-b p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 print:bg-transparent print:border-gray-400">
                        <div>
                          <h4 className="font-bold text-lg text-gray-900">
                            {task.task_number} - {task.title}
                          </h4>
                          <p className="text-sm text-gray-600 mt-1">
                            <span className="font-medium">Responsável:</span>{' '}
                            {task.assignee?.name || 'Não atribuído'}
                          </p>
                        </div>
                        <Badge
                          className="px-3 py-1 text-sm font-semibold print:border print:border-black print:text-black"
                          style={{
                            backgroundColor: task.status?.color || '#ccc',
                            color: '#fff',
                          }}
                        >
                          {task.status?.name}
                        </Badge>
                      </div>

                      <div className="p-5">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mb-6 text-sm">
                          <div className="bg-gray-50/50 p-3 rounded-md print:bg-transparent print:p-0">
                            <span className="text-gray-500 font-medium block mb-1">
                              Data de Criação
                            </span>
                            <p className="font-semibold text-gray-900">
                              {format(new Date(task.created_at), 'dd/MM/yyyy')}
                            </p>
                          </div>
                          <div className="bg-gray-50/50 p-3 rounded-md print:bg-transparent print:p-0">
                            <span className="text-gray-500 font-medium block mb-1">
                              Prazo Estipulado
                            </span>
                            <p className="font-semibold text-gray-900">
                              {task.due_date
                                ? format(new Date(task.due_date), 'dd/MM/yyyy')
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="bg-gray-50/50 p-3 rounded-md print:bg-transparent print:p-0">
                            <span className="text-gray-500 font-medium block mb-1">
                              Data de Conclusão
                            </span>
                            <p className="font-semibold text-gray-900">
                              {task.closed_at
                                ? format(new Date(task.closed_at), 'dd/MM/yyyy')
                                : 'Ainda não concluída'}
                            </p>
                          </div>
                        </div>

                        <div className="text-sm">
                          <span className="text-gray-700 font-semibold block mb-2">
                            Descrição da Ação / Resolução:
                          </span>
                          <div className="mt-1 text-gray-800 whitespace-pre-wrap bg-gray-50 p-4 rounded-md border border-gray-100 print:bg-transparent print:border-gray-200">
                            {task.description}
                          </div>
                        </div>

                        {task.attachment_urls && task.attachment_urls.length > 0 && (
                          <div className="mt-6 pt-5 border-t border-gray-100 print:border-gray-200">
                            <span className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                              <Paperclip className="w-4 h-4" /> Evidências da Conclusão
                            </span>
                            <div className="flex flex-wrap gap-3">
                              {task.attachment_urls.map((att: any, i: number) => (
                                <a
                                  key={i}
                                  href={att.url || att}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-sm bg-white border border-gray-200 px-3 py-2 rounded-md flex items-center gap-2 hover:bg-gray-50 hover:border-gray-300 transition-colors shadow-sm font-medium print:hidden"
                                >
                                  <ExternalLink className="w-4 h-4 text-blue-500" /> Comprovante{' '}
                                  {i + 1}
                                </a>
                              ))}
                              <div className="hidden print:block text-sm text-gray-500 italic">
                                {task.attachment_urls.length} evidência(s) anexada(s) no sistema
                                digital.
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <div className="hidden print:block mt-16 pt-8 border-t border-gray-300 text-center text-sm text-gray-500">
              Fim do Relatório — Gerado via Aurea Facility Management
            </div>
          </div>
        ) : (
          <div className="py-20 text-center text-red-500 font-medium">
            Erro ao carregar os dados do relatório.
          </div>
        )}
      </SheetContent>
    </Sheet>
  )
}
