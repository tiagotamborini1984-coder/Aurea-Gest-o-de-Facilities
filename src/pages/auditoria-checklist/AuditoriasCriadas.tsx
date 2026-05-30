import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Play } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function AuditoriasCriadas() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const { toast } = useToast()
  const [audits, setAudits] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchAudits = async () => {
      if (!user) return
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user.id)
        .single()
      if (profile?.client_id) {
        const { data } = await supabase
          .from('audits')
          .select('*, audit_assignments(count)')
          .eq('client_id', profile.client_id)
          .order('created_at', { ascending: false })
        if (data) setAudits(data)
      }
      setLoading(false)
    }
    fetchAudits()
  }, [user])

  const startManualExecution = async (audit: any) => {
    if (audit.status === 'Rascunho') {
      toast({
        title: 'Atenção',
        description: 'Não é possível executar um modelo em Rascunho. Edite e publique-o primeiro.',
        variant: 'destructive',
      })
      return
    }

    try {
      const { data: assignments } = await supabase
        .from('audit_assignments')
        .select('*')
        .eq('audit_id', audit.id)
        .limit(1)
      if (!assignments || assignments.length === 0) {
        toast({
          title: 'Atenção',
          description: 'Nenhuma atribuição configurada para esta auditoria.',
          variant: 'destructive',
        })
        return
      }

      const targetPlant = assignments[0].plant_id

      const { error } = await supabase
        .from('audit_executions')
        .insert({
          audit_id: audit.id,
          assignee_id: user?.id,
          plant_id: targetPlant,
          status: 'Pendente',
        })
        .select()
        .single()

      if (error) throw error

      toast({ title: 'Sucesso', description: 'Nova execução iniciada.' })
      navigate('/auditoria-checklist/realizadas')
    } catch (err: any) {
      toast({ title: 'Erro', description: err.message, variant: 'destructive' })
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Modelos de Auditoria</h1>
        <Button onClick={() => navigate('/auditoria-checklist/configuracao')}>
          <Plus className="w-4 h-4 mr-2" /> Novo Modelo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhum modelo encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-medium">{audit.title}</TableCell>
                    <TableCell>{audit.type}</TableCell>
                    <TableCell>{audit.frequency}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${audit.status === 'Rascunho' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {audit.status || 'Ativo'}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {audit.status !== 'Rascunho' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => startManualExecution(audit)}
                          >
                            <Play className="w-4 h-4 mr-1" /> Executar
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => navigate(`/auditoria-checklist/configuracao/${audit.id}`)}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
