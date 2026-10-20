import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card'
import { ArrowLeft, Tag, Plus, ShieldAlert } from 'lucide-react'
import { AuditCategoryManagerDialog } from './components/AuditCategoryManagerDialog'

export default function AuditoriaCategorias() {
  const navigate = useNavigate()
  const { profile, activeClient } = useAppStore()
  const [dialogOpen, setDialogOpen] = useState(false)

  const effectiveClientId = activeClient?.id || profile?.client_id
  const isAdminOrMaster = profile?.role === 'Master' || profile?.role === 'Administrador'

  if (!isAdminOrMaster) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Card className="border-destructive/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-destructive">
              <ShieldAlert className="w-5 h-5" />
              <CardTitle>Acesso Restrito</CardTitle>
            </div>
            <CardDescription>
              O cadastro e manutenção de categorias de auditoria é restrito aos perfis Administrador
              e Master.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate('/auditoria-checklist/criadas')}>
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/criadas')}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
              <Tag className="w-6 h-6 text-primary" /> Categorias de Auditoria
            </h1>
            <p className="text-muted-foreground text-sm">
              Gerencie as categorias personalizadas para agrupar as perguntas e enriquecer os
              relatórios.
            </p>
          </div>
        </div>

        <Button onClick={() => setDialogOpen(true)}>
          <Plus className="w-4 h-4 mr-2" /> Gerenciar Categorias
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Categorização Livre das Perguntas</CardTitle>
          <CardDescription>
            Aqui você define livremente as categorias da sua operação (ex.: "DO - Documental", "LOJA
            - Salão", "Higiene e Limpeza", "Estrutura Predial").
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground leading-relaxed">
            Cada pergunta cadastrada em um modelo de auditoria pode ser associada a uma categoria
            criada por você. Nos relatórios de auditoria, você terá um gráfico visual com o
            percentual de conformidade e o total de pontos perdidos por categoria.
          </p>

          <div className="pt-2">
            <Button variant="outline" onClick={() => setDialogOpen(true)} className="gap-2">
              <Tag className="w-4 h-4" /> Abrir Painel de Categorias
            </Button>
          </div>
        </CardContent>
      </Card>

      <AuditCategoryManagerDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        clientId={effectiveClientId}
      />
    </div>
  )
}
