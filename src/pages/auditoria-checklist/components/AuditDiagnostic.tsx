import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import { toast } from 'sonner'
import {
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  RefreshCw,
  Stethoscope,
  Clock,
  FileWarning,
} from 'lucide-react'
import {
  getAuditDiagnostic,
  triggerRecurringAudits,
  type DiagnosticResult,
} from '@/services/audit-diagnostic'

interface AuditDiagnosticProps {
  auditId: string
}

export function AuditDiagnostic({ auditId }: AuditDiagnosticProps) {
  const [diagnostic, setDiagnostic] = useState<DiagnosticResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [triggering, setTriggering] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  const runDiagnostic = useCallback(async () => {
    setLoading(true)
    try {
      const result = await getAuditDiagnostic(auditId)
      setDiagnostic(result)
    } catch (err: any) {
      toast.error(err.message || 'Erro ao executar diagnóstico')
    } finally {
      setLoading(false)
    }
  }, [auditId])

  const handleTriggerRecurring = useCallback(async () => {
    setTriggering(true)
    try {
      const result = await triggerRecurringAudits()
      if (result.success) {
        toast.success(result.message)
        await runDiagnostic()
      } else {
        toast.error(result.message)
      }
    } finally {
      setTriggering(false)
    }
  }, [runDiagnostic])

  const StatusIcon = ({ ok }: { ok: boolean }) =>
    ok ? (
      <CheckCircle2 className="w-5 h-5 text-green-500" />
    ) : (
      <XCircle className="w-5 h-5 text-red-500" />
    )

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Stethoscope className="w-5 h-5 text-muted-foreground" />
                <div>
                  <CardTitle className="text-base">Diagnóstico de Tarefas</CardTitle>
                  <CardDescription className="text-xs">
                    Verifica pré-requisitos para criação automática de tarefas
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {diagnostic && (
                  <Badge variant={diagnostic.allPrerequisitesMet ? 'default' : 'destructive'}>
                    {diagnostic.allPrerequisitesMet ? 'Tudo OK' : 'Pendências'}
                  </Badge>
                )}
                <ChevronDown
                  className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <CardContent className="space-y-4 pt-0">
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={runDiagnostic} disabled={loading}>
                {loading ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Stethoscope className="w-4 h-4 mr-2" />
                )}
                Executar Diagnóstico
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={handleTriggerRecurring}
                disabled={triggering}
              >
                {triggering ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Disparar Processamento de Recorrências
              </Button>
            </div>

            {diagnostic && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <StatusIcon ok={diagnostic.isActive} />
                    <div>
                      <p className="text-sm font-medium">Status da Auditoria</p>
                      <p className="text-xs text-muted-foreground">{diagnostic.auditStatus}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <StatusIcon ok={diagnostic.hasTaskType} />
                    <div>
                      <p className="text-sm font-medium">Tipo de Tarefa "Auditoria"</p>
                      <p className="text-xs text-muted-foreground">
                        {diagnostic.taskTypeName || 'Não encontrado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <StatusIcon ok={diagnostic.hasNonTerminalStatus} />
                    <div>
                      <p className="text-sm font-medium">Status Não-Terminal</p>
                      <p className="text-xs text-muted-foreground">
                        {diagnostic.taskStatusName || 'Não encontrado'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg border">
                    <StatusIcon ok={diagnostic.hasAssignments} />
                    <div>
                      <p className="text-sm font-medium">Atribuições</p>
                      <p className="text-xs text-muted-foreground">
                        {diagnostic.assignmentsCount} atribuição(ões)
                      </p>
                    </div>
                  </div>
                </div>

                {diagnostic.pendingExecutionsWithoutTask.length > 0 && (
                  <Alert variant="destructive">
                    <FileWarning className="w-4 h-4" />
                    <AlertTitle>
                      {diagnostic.pendingExecutionsWithoutTask.length} Execução(ões) sem Tarefa
                    </AlertTitle>
                    <AlertDescription>
                      <p className="mb-2">
                        Existem execuções pendentes sem tarefa associada. Execute o backfill ou
                        dispare o processamento de recorrências.
                      </p>
                      <ul className="text-xs space-y-1">
                        {diagnostic.pendingExecutionsWithoutTask.map((exec) => (
                          <li key={exec.id} className="flex items-center gap-2">
                            <Clock className="w-3 h-3" />
                            <span>
                              ID: {exec.id.slice(0, 8)}... | Status: {exec.status} | Criada em:{' '}
                              {new Date(exec.created_at).toLocaleString('pt-BR')}
                            </span>
                          </li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                {!diagnostic.allPrerequisitesMet && (
                  <Alert>
                    <AlertTriangle className="w-4 h-4" />
                    <AlertTitle>Pré-requisitos Incompletos</AlertTitle>
                    <AlertDescription>
                      A criação automática de tarefas não funcionará até que todos os pré-requisitos
                      sejam atendidos.
                      {!diagnostic.hasTaskType &&
                        ' Cadastre um tipo de tarefa com nome contendo "Auditoria".'}
                      {!diagnostic.hasNonTerminalStatus &&
                        ' Cadastre pelo menos um status de tarefa não-terminal.'}
                      {!diagnostic.isActive &&
                        ' Publique a auditoria para que o status seja "Ativo".'}
                      {!diagnostic.hasAssignments &&
                        ' Adicione pelo menos uma atribuição (planta + responsável).'}
                    </AlertDescription>
                  </Alert>
                )}

                {diagnostic.recentLogs.length > 0 && (
                  <div className="rounded-lg border p-3">
                    <p className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      Logs Recentes
                    </p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {diagnostic.recentLogs.map((log) => (
                        <div
                          key={log.id}
                          className="flex items-start gap-2 text-xs p-2 rounded bg-muted/30"
                        >
                          <Badge
                            variant={
                              log.action_type === 'task_creation_failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="text-[10px] shrink-0"
                          >
                            {log.action_type}
                          </Badge>
                          <span className="text-muted-foreground">{log.details}</span>
                          <span className="text-muted-foreground/60 shrink-0 ml-auto">
                            {new Date(log.created_at).toLocaleString('pt-BR')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {diagnostic.allPrerequisitesMet &&
                  diagnostic.pendingExecutionsWithoutTask.length === 0 && (
                    <Alert>
                      <CheckCircle2 className="w-4 h-4 text-green-500" />
                      <AlertTitle>Tudo Funcionando Corretamente</AlertTitle>
                      <AlertDescription>
                        Todos os pré-requisitos foram atendidos e não há execuções sem tarefa.
                      </AlertDescription>
                    </Alert>
                  )}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
