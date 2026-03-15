import { Building2, Users, Layers, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAppStore } from '@/store/AppContext'
import { useState } from 'react'
import { AddClientDialog } from '@/components/AddClientDialog'
import { useToast } from '@/hooks/use-toast'

export default function Index() {
  const { clients, thirdParties } = useAppStore()
  const [isClientModalOpen, setIsClientModalOpen] = useState(false)
  const { toast } = useToast()

  const activeClients = clients.filter((c) => c.status === 'Ativo').length
  const totalThirdParties = thirdParties.length
  const activeModules = clients.reduce((acc, curr) => acc + curr.modules.length, 0)

  const handleGenerateReport = () => {
    toast({
      title: 'Gerando Relatório',
      description: 'O relatório consolidado será enviado para o seu e-mail em instantes.',
    })
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-[#0F4C81]">Visão Geral</h2>
          <p className="text-muted-foreground mt-1">
            Bem-vindo ao painel de administração Master Áurea.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" onClick={handleGenerateReport} className="hover:text-[#2B95D6]">
            Gerar Relatório
          </Button>
          <Button
            onClick={() => setIsClientModalOpen(true)}
            className="bg-[#2B95D6] hover:bg-[#2B95D6]/90 text-white shadow-md hover:scale-[1.02] transition-transform"
          >
            Cadastrar Nova Empresa
          </Button>
        </div>
      </div>

      <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-[#0F4C81]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de Empresas
            </CardTitle>
            <Building2 className="h-4 w-4 text-[#0F4C81]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{clients.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              <span className="text-green-500 font-medium">{activeClients} ativas</span> na
              plataforma
            </p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-[#2B95D6]">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Módulos Ativos
            </CardTitle>
            <Layers className="h-4 w-4 text-[#2B95D6]" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{activeModules}</div>
            <p className="text-xs text-muted-foreground mt-1">Distribuidos entre os clientes</p>
          </CardContent>
        </Card>
        <Card className="hover:shadow-md transition-shadow border-t-4 border-t-amber-500 sm:col-span-2 lg:col-span-1">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Terceiros Cadastrados
            </CardTitle>
            <Users className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{totalThirdParties}</div>
            <p className="text-xs text-muted-foreground mt-1">Prestadores de serviço mapeados</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Activity className="h-5 w-5 text-[#2B95D6]" /> Atividades Recentes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-5">
              {[
                {
                  time: 'Há 2 horas',
                  text: 'Nova empresa cadastrada: TechCorp S.A.',
                  type: 'company',
                },
                {
                  time: 'Há 5 horas',
                  text: 'Módulo "Limpeza" ativado para InnovateX',
                  type: 'module',
                },
                {
                  time: 'Ontem',
                  text: 'Terceiro "SecurGuard" atualizou documentação',
                  type: 'thirdparty',
                },
              ].map((activity, i) => (
                <div key={i} className="flex items-start gap-4">
                  <div className="mt-1 h-2 w-2 rounded-full bg-[#2B95D6]" />
                  <div className="space-y-1">
                    <p className="text-sm font-medium leading-none">{activity.text}</p>
                    <p className="text-xs text-muted-foreground">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm bg-gradient-to-br from-[#0F4C81] to-[#1a66a6] text-white border-none">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Status do Sistema</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Uso do Servidor</span>
                <span className="text-sm font-bold text-green-300">Normal</span>
              </div>
              <div className="h-2 bg-white/20 rounded-full overflow-hidden">
                <div className="h-full bg-green-400 w-[24%]" />
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm border border-white/20">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-white/80">Versão da Plataforma</span>
                <span className="text-sm font-bold">v2.4.1</span>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm font-medium text-white/80">Último Backup</span>
                <span className="text-sm">Hoje, 04:00 AM</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <AddClientDialog open={isClientModalOpen} onOpenChange={setIsClientModalOpen} />
    </div>
  )
}
