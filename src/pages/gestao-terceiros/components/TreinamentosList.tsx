import { EmployeeWithTrainings } from '../hooks/use-treinamentos'
import { Card, CardContent } from '@/components/ui/card'
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion'
import { Badge } from '@/components/ui/badge'
import { FileText, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { format, parseISO, isValid } from 'date-fns'

export function TreinamentosList({
  data,
  loading,
}: {
  data: EmployeeWithTrainings[]
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="flex justify-center p-8 text-muted-foreground animate-pulse">
        Carregando treinamentos...
      </div>
    )
  }

  if (data.length === 0) {
    return (
      <div className="flex justify-center p-8 bg-card rounded-xl border border-border text-muted-foreground shadow-sm">
        Nenhum colaborador encontrado para os filtros selecionados.
      </div>
    )
  }

  // Group by Company
  const grouped = data.reduce(
    (acc, emp) => {
      if (!acc[emp.company_name]) acc[emp.company_name] = []
      acc[emp.company_name].push(emp)
      return acc
    },
    {} as Record<string, EmployeeWithTrainings[]>,
  )

  return (
    <div className="space-y-4 animate-in fade-in duration-500">
      {Object.entries(grouped).map(([company, employees]) => (
        <Card key={company} className="overflow-hidden shadow-sm">
          <div className="bg-muted/50 px-5 py-3 border-b border-border">
            <h3 className="font-semibold text-sm uppercase tracking-wide text-muted-foreground">
              {company}
            </h3>
          </div>
          <CardContent className="p-0">
            <Accordion type="multiple" className="w-full">
              {employees.map((emp) => (
                <AccordionItem key={emp.id} value={emp.id} className="border-b last:border-0 px-5">
                  <AccordionTrigger className="hover:no-underline py-3.5">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="flex flex-col items-start gap-0.5">
                        <span className="font-medium text-sm text-foreground">{emp.name}</span>
                        <span className="text-xs text-muted-foreground">{emp.function_name}</span>
                      </div>
                      <div>
                        {emp.status === 'valid' && (
                          <Badge
                            variant="outline"
                            className="bg-green-500/10 text-green-600 border-green-500/20 font-medium"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Regular
                          </Badge>
                        )}
                        {emp.status === 'pending' && (
                          <Badge
                            variant="outline"
                            className="bg-yellow-500/10 text-yellow-600 border-yellow-500/20 font-medium"
                          >
                            <AlertTriangle className="w-3.5 h-3.5 mr-1" /> Pendente
                          </Badge>
                        )}
                        {emp.status === 'expired' && (
                          <Badge
                            variant="outline"
                            className="bg-red-500/10 text-red-600 border-red-500/20 font-medium"
                          >
                            <XCircle className="w-3.5 h-3.5 mr-1" /> Vencido
                          </Badge>
                        )}
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    {emp.trainings.length > 0 ? (
                      <div className="grid grid-cols-1 gap-2 pt-2">
                        {emp.trainings.map((t) => (
                          <div
                            key={t.id}
                            className="flex flex-col sm:flex-row items-start sm:items-center justify-between bg-muted/30 p-3 rounded-lg border border-border/50 text-sm hover:bg-muted/50 transition-colors gap-3 sm:gap-4"
                          >
                            <div className="flex flex-col gap-1 flex-1 min-w-0 w-full pr-0 sm:pr-4">
                              <div className="font-medium flex flex-wrap items-start sm:items-center gap-2 text-foreground">
                                <span className="break-words" title={t.name}>
                                  {t.name}
                                </span>
                                {t.is_required && (
                                  <Badge className="bg-slate-600 text-white hover:bg-slate-700 border-none text-[10px] h-4.5 px-1.5 font-medium shrink-0 whitespace-nowrap mt-0.5 sm:mt-0">
                                    Obrigatório
                                  </Badge>
                                )}
                              </div>
                              {t.completion_date ? (
                                <span className="text-xs text-muted-foreground flex flex-wrap items-center gap-1.5">
                                  Realizado em:{' '}
                                  {isValid(parseISO(t.completion_date))
                                    ? format(parseISO(t.completion_date), 'dd/MM/yyyy')
                                    : 'Data inválida'}
                                  {t.expiration_date && isValid(parseISO(t.expiration_date)) && (
                                    <>
                                      <span className="hidden sm:inline-block w-1 h-1 rounded-full bg-muted-foreground/30" />
                                      <span className="sm:hidden">|</span>
                                      Vence em: {format(parseISO(t.expiration_date), 'dd/MM/yyyy')}
                                    </>
                                  )}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground italic">
                                  Não realizado
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end shrink-0 border-t sm:border-0 border-border/50 pt-2 sm:pt-0 mt-1 sm:mt-0">
                              {t.status === 'valid' && (
                                <span className="text-green-600 font-semibold text-xs tracking-wide uppercase">
                                  Válido
                                </span>
                              )}
                              {t.status === 'pending' && (
                                <span className="text-yellow-600 font-semibold text-xs tracking-wide uppercase">
                                  Pendente
                                </span>
                              )}
                              {t.status === 'expired' && (
                                <span className="text-red-600 font-semibold text-xs tracking-wide uppercase">
                                  Vencido
                                </span>
                              )}

                              {t.document_url && (
                                <a
                                  href={t.document_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="flex items-center gap-1.5 text-xs text-brand-vividBlue hover:text-brand-deepBlue hover:underline bg-brand-deepBlue/5 hover:bg-brand-deepBlue/10 px-2.5 py-1.5 rounded-md transition-colors font-medium"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <FileText className="w-3.5 h-3.5" /> Ver Anexo
                                </a>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground pt-2 pl-2">
                        Nenhum treinamento registrado ou obrigatório para esta função.
                      </p>
                    )}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
