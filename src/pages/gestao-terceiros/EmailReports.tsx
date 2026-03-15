import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Mail } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

export default function EmailReports() {
  const { toast } = useToast()

  const handleSave = () => toast({ title: 'Configurações de email salvas com sucesso.' })

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Relatórios por E-mail</h2>
        <p className="text-muted-foreground mt-1">
          Configure os agendamentos automáticos de envio de dados.
        </p>
      </div>

      <Card className="shadow-sm border-brand-light">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-blue" />
            <CardTitle>Relatório Diário Operacional</CardTitle>
          </div>
          <CardDescription>
            Enviado todos os dias (segunda a sábado) às 12:00 para Gestores e Administradores.
            Contém o resumo de efetivo lançado na manhã.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <span className="font-medium text-sm">Ativar envio automático</span>
          <Switch
            defaultChecked
            onCheckedChange={handleSave}
            className="data-[state=checked]:bg-brand-blue"
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm border-brand-light">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-blue" />
            <CardTitle>Relatório Mensal Consolidado</CardTitle>
          </div>
          <CardDescription>
            Enviado no primeiro dia útil do mês. Contém o fechamento do Absenteísmo, Metas e
            Disponibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <span className="font-medium text-sm">Ativar envio automático</span>
          <Switch
            defaultChecked
            onCheckedChange={handleSave}
            className="data-[state=checked]:bg-brand-blue"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={() => toast({ title: 'E-mail de teste enviado para sua caixa de entrada.' })}
        >
          Enviar E-mail de Teste Agora
        </Button>
      </div>
    </div>
  )
}
