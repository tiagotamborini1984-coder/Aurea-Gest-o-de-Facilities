import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Mail, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/lib/supabase/client'

export default function EmailReports() {
  const { toast } = useToast()
  const [testing, setTesting] = useState(false)

  const handleSave = () => toast({ title: 'Configurações de email salvas com sucesso.' })

  const sendTestEmail = async () => {
    setTesting(true)
    try {
      const { error } = await supabase.functions.invoke('email-reports', {
        body: { reportType: 'Test' },
      })
      if (error) throw error
      toast({ title: 'E-mail de teste enviado para sua caixa de entrada.' })
    } catch (e: any) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar e-mail de teste',
        description: e.message,
      })
    } finally {
      setTesting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Relatórios por E-mail</h2>
        <p className="text-muted-foreground mt-1">
          Configure os agendamentos automáticos de envio de dados.
        </p>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-deepBlue" />
            <CardTitle className="text-slate-800">Relatório Diário Operacional</CardTitle>
          </div>
          <CardDescription className="text-slate-600">
            Enviado todos os dias (segunda a sábado) às 12:00 para Gestores e Administradores.
            Contém o resumo de efetivo lançado na manhã.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <span className="font-medium text-sm text-slate-800">Ativar envio automático</span>
          <Switch
            defaultChecked
            onCheckedChange={handleSave}
            className="data-[state=checked]:bg-brand-deepBlue"
          />
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5 text-brand-deepBlue" />
            <CardTitle className="text-slate-800">Relatório Mensal Consolidado</CardTitle>
          </div>
          <CardDescription className="text-slate-600">
            Enviado no primeiro dia útil do mês. Contém o fechamento do Absenteísmo, Metas e
            Disponibilidade.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between pt-2">
          <span className="font-medium text-sm text-slate-800">Ativar envio automático</span>
          <Switch
            defaultChecked
            onCheckedChange={handleSave}
            className="data-[state=checked]:bg-brand-deepBlue"
          />
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button
          onClick={sendTestEmail}
          disabled={testing}
          variant="outline"
          className="border-brand-deepBlue text-brand-deepBlue hover:bg-brand-deepBlue/5"
        >
          {testing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
          Enviar E-mail de Teste Agora
        </Button>
      </div>
    </div>
  )
}
