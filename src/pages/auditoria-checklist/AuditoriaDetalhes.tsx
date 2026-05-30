import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  Printer,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Calendar,
  MapPin,
  User,
  Users,
  FileSignature,
  ImageIcon,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Skeleton } from '@/components/ui/skeleton'
import { useToast } from '@/components/ui/use-toast'

export default function AuditoriaDetalhes() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!id) return

      try {
        const { data: execData, error } = await supabase
          .from('audit_executions')
          .select(`
            id,
            status,
            realization_date,
            participants,
            final_score,
            max_score,
            signatures,
            created_at,
            audit:audits(title, scoring_settings),
            plant:plants(name),
            assignee:profiles!audit_executions_assignee_id_fkey(name),
            answers:audit_execution_answers(
              score,
              observations,
              evidence_url,
              corrective_assignee:profiles!audit_execution_answers_corrective_assignee_id_fkey(name),
              action:audit_actions(title, weight, order_index)
            )
          `)
          .eq('id', id)
          .single()

        if (error) throw error
        setData(execData)
      } catch (err: any) {
        console.error('Error fetching audit details:', err)
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os detalhes da auditoria.',
          variant: 'destructive',
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [id, toast])

  if (loading) {
    return (
      <div className="container mx-auto p-6 max-w-5xl space-y-6">
        <Skeleton className="h-10 w-1/3" />
        <Skeleton className="h-40 w-full" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
          <Skeleton className="h-24" />
        </div>
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="container mx-auto p-6 flex flex-col items-center justify-center min-h-[50vh]">
        <h2 className="text-2xl font-bold mb-4">Auditoria não encontrada</h2>
        <Button onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    )
  }

  const percentage =
    data.max_score && data.max_score > 0
      ? Math.round(((data.final_score || 0) / data.max_score) * 100)
      : 0

  return (
    <div className="container mx-auto p-6 max-w-5xl print:p-0 print:m-0 print:max-w-none print:w-full print:bg-white print:text-black">
      {/* Header: hidden in print */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate(-1)} size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold text-primary">Detalhes da Auditoria</h1>
        </div>
        <Button onClick={() => window.print()} className="gap-2">
          <Printer className="w-4 h-4" />
          Imprimir Relatório
        </Button>
      </div>

      {/* Print-specific Report Header */}
      <div className="hidden print:block mb-8 border-b pb-4">
        <h1 className="text-3xl font-bold uppercase tracking-wider mb-2">Relatório de Auditoria</h1>
        <p className="text-sm text-gray-500">Gerado pelo Sistema Aurea</p>
      </div>

      {/* Main Info Card */}
      <Card className="mb-6 print:shadow-none print:border-2 print:border-gray-200 print-break-inside-avoid">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold print:text-xl">{data.audit?.title}</h2>
              <div className="flex items-center gap-2 mt-2 text-muted-foreground print:text-sm">
                <MapPin className="w-4 h-4" />
                <span>{data.plant?.name}</span>
              </div>
            </div>
            <Badge
              variant={data.status === 'Finalizado' ? 'default' : 'secondary'}
              className="text-sm print:border print:text-black print:bg-transparent"
            >
              {data.status}
            </Badge>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Calendar className="w-4 h-4" /> Data de Realização
              </span>
              <span className="font-medium">
                {data.realization_date
                  ? format(new Date(data.realization_date), 'dd/MM/yyyy', { locale: ptBR })
                  : '-'}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <Clock className="w-4 h-4" /> Criado em
              </span>
              <span className="font-medium">
                {format(new Date(data.created_at), 'dd/MM/yyyy HH:mm', { locale: ptBR })}
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <User className="w-4 h-4" /> Auditor
              </span>
              <span className="font-medium">{data.assignee?.name}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Score Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 print:gap-4 print-break-inside-avoid">
        <Card className="print:shadow-none print:border-2 print:border-gray-200">
          <CardHeader className="pb-2 print:pb-1 print:pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pontuação Alcançada
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pb-4">
            <div className="text-3xl font-bold text-primary print:text-black">
              {data.final_score || 0}
            </div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-2 print:border-gray-200">
          <CardHeader className="pb-2 print:pb-1 print:pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pontuação Máxima Possível
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pb-4">
            <div className="text-3xl font-bold">{data.max_score || 0}</div>
          </CardContent>
        </Card>

        <Card className="print:shadow-none print:border-2 print:border-gray-200">
          <CardHeader className="pb-2 print:pb-1 print:pt-4">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Aproveitamento
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pb-4">
            <div className="text-3xl font-bold">{percentage}%</div>
          </CardContent>
        </Card>
      </div>

      {/* Participants */}
      {data.participants && (
        <Card className="mb-6 print:shadow-none print:border-2 print:border-gray-200 print-break-inside-avoid">
          <CardHeader className="print:py-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Participantes
            </CardTitle>
          </CardHeader>
          <CardContent className="print:pb-3">
            <p className="text-sm whitespace-pre-wrap">{data.participants}</p>
          </CardContent>
        </Card>
      )}

      {/* Items Breakdown */}
      <div className="mt-8 mb-8 print:mt-4">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2 print:text-black">
          <CheckCircle2 className="w-5 h-5" />
          Detalhes dos Itens Avaliados
        </h2>

        <div className="space-y-4 print:space-y-2">
          {data.answers
            ?.sort((a: any, b: any) => (a.action?.order_index || 0) - (b.action?.order_index || 0))
            .map((answer: any, idx: number) => (
              <Card
                key={idx}
                className="print:shadow-none print-break-inside-avoid print:border-b-2 print:border-gray-200 print:rounded-none"
              >
                <CardContent className="p-4 print:p-2">
                  <div className="flex flex-col md:flex-row gap-4 justify-between">
                    <div className="flex-1">
                      <h3 className="font-semibold text-base mb-1 print:text-sm">
                        {idx + 1}. {answer.action?.title}
                      </h3>
                      {answer.observations && (
                        <div className="text-sm text-muted-foreground mt-2 bg-muted/50 p-3 rounded print:bg-transparent print:p-0 print:mt-1 print:text-gray-700">
                          <span className="font-semibold text-foreground print:text-black">
                            Observações:{' '}
                          </span>
                          {answer.observations}
                        </div>
                      )}
                      {answer.corrective_assignee?.name && (
                        <div className="text-sm mt-2 flex items-center gap-1 text-orange-600 print:text-black">
                          <span className="font-medium">Ação corretiva atribuída para:</span>{' '}
                          {answer.corrective_assignee.name}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-row md:flex-col gap-6 md:gap-2 items-center md:items-end min-w-[150px] print:flex-row print:items-start print:min-w-fit">
                      <div className="text-center md:text-right print:text-left">
                        <span className="text-xs text-muted-foreground block">Nota</span>
                        <span className="font-bold text-lg print:text-base">
                          {answer.score !== null ? answer.score : '-'}
                        </span>
                      </div>
                      <div className="text-center md:text-right print:text-left">
                        <span className="text-xs text-muted-foreground block">Peso</span>
                        <span className="font-medium print:text-sm">
                          {answer.action?.weight || 1}
                        </span>
                      </div>
                    </div>
                  </div>

                  {answer.evidence_url && (
                    <div className="mt-4 print:hidden">
                      <a
                        href={answer.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-sm text-primary hover:underline"
                      >
                        <ImageIcon className="w-4 h-4 mr-1" />
                        Ver Evidência Anexada
                      </a>
                    </div>
                  )}

                  {answer.evidence_url && (
                    <div className="mt-2 hidden print:block text-xs text-gray-500 italic">
                      * Evidência fotográfica anexada no sistema eletrônico.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}

          {(!data.answers || data.answers.length === 0) && (
            <div className="text-center py-8 text-muted-foreground border rounded-lg print:border-0">
              Nenhum item avaliado encontrado para esta auditoria.
            </div>
          )}
        </div>
      </div>

      {/* Signatures */}
      {data.signatures && Array.isArray(data.signatures) && data.signatures.length > 0 && (
        <Card className="mt-8 print:shadow-none print:border-none print-break-inside-avoid">
          <CardHeader className="print:px-0">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileSignature className="w-5 h-5" />
              Assinaturas
            </CardTitle>
          </CardHeader>
          <CardContent className="print:px-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 print:gap-4 print:grid-cols-3">
              {data.signatures.map((sig: any, idx: number) => (
                <div
                  key={idx}
                  className="flex flex-col items-center justify-center p-4 border rounded-lg print:border-0 print:p-2"
                >
                  {sig.image || sig.signature || sig.dataUrl ? (
                    <img
                      src={sig.image || sig.signature || sig.dataUrl}
                      alt={`Assinatura ${idx + 1}`}
                      className="max-h-24 object-contain mb-2 print:max-h-20"
                    />
                  ) : (
                    <div className="h-24 flex items-center justify-center text-muted-foreground italic print:h-16">
                      (Assinado eletronicamente)
                    </div>
                  )}
                  <Separator className="w-full max-w-[200px] mb-2 print:border-black" />
                  <span className="font-medium text-sm text-center">
                    {sig.name || 'Participante'}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Print Footer */}
      <div className="hidden print:block mt-12 pt-4 border-t text-center text-xs text-gray-500">
        Este documento é um registro oficial gerado digitalmente. Aurea Facility Management.
        <br />
        Gerado em: {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
      </div>
    </div>
  )
}
