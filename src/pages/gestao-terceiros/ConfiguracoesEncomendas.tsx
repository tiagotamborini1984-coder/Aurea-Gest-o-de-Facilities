import { useState, useEffect } from 'react'
import { useAppStore } from '@/store/AppContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { Settings, Loader2 } from 'lucide-react'

export default function ConfiguracoesEncomendas() {
  const { activeClient, updateClient } = useAppStore()
  const { toast } = useToast()
  const [alertDays, setAlertDays] = useState(3)
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    if (activeClient) {
      setAlertDays(activeClient.packageAlertDays ?? 3)
    }
  }, [activeClient])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient) return
    if (alertDays <= 0) {
      toast({
        title: 'Valor inválido',
        description: 'Os dias de alerta devem ser maiores que zero.',
        variant: 'destructive',
      })
      return
    }
    setIsSubmitting(true)
    const success = await updateClient(activeClient.id, { packageAlertDays: alertDays })
    if (success) {
      toast({
        title: 'Configurações atualizadas',
        description: 'Os dias de alerta foram salvos com sucesso.',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
    } else {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar as configurações.',
        variant: 'destructive',
      })
    }
    setIsSubmitting(false)
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex items-center gap-3">
        <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm">
          <Settings className="h-6 w-6 text-brand-deepBlue" />
        </div>
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Configurações de Encomendas
          </h2>
          <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
            Gerencie os parâmetros e limites de tempo para retiradas.
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="bg-slate-50/50 border-b border-gray-200">
          <CardTitle className="text-lg text-slate-800">Alerta de Retirada (Lead Time)</CardTitle>
          <CardDescription className="text-slate-600">
            Defina o número de dias que uma encomenda pode aguardar na recepção antes de ser
            sinalizada como em atraso.
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSave} className="space-y-4 max-w-sm">
            <div className="space-y-2">
              <Label className="text-slate-700">Dias para Alerta de Retirada</Label>
              <Input
                type="number"
                min="1"
                value={alertDays}
                onChange={(e) => setAlertDays(Number(e.target.value))}
                required
                className="border-gray-300 text-slate-800"
              />
            </div>
            <Button type="submit" variant="tech" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null} Salvar
              Configuração
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
