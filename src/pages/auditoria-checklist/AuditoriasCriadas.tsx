import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useToast } from '@/components/ui/use-toast'

export default function AuditoriasCriadas() {
  const [audits, setAudits] = useState<any[]>([])
  const { toast } = useToast()

  useEffect(() => {
    loadAudits()
  }, [])

  const loadAudits = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (!user) return
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user.id)
      .single()
    if (profile?.client_id) {
      const { data } = await supabase
        .from('audits')
        .select('*')
        .eq('client_id', profile.client_id)
        .order('created_at', { ascending: false })
      setAudits(data || [])
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir esta auditoria?')) return
    const { error } = await supabase.from('audits').delete().eq('id', id)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      toast({ title: 'Sucesso', description: 'Auditoria excluída.' })
      loadAudits()
    }
  }

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Auditorias Configuradas</h1>
        <Link to="/auditoria-checklist/configuracao">
          <Button>
            <Plus className="w-4 h-4 mr-2" /> Nova Auditoria
          </Button>
        </Link>
      </div>

      <div className="border rounded-md bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead>Início</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.map((audit) => (
              <TableRow key={audit.id}>
                <TableCell className="font-medium">{audit.title}</TableCell>
                <TableCell>{audit.type}</TableCell>
                <TableCell>{audit.frequency}</TableCell>
                <TableCell>{new Date(audit.start_date).toLocaleDateString()}</TableCell>
                <TableCell className="flex gap-2">
                  <Link to={`/auditoria-checklist/configuracao/${audit.id}`}>
                    <Button variant="ghost" size="icon">
                      <Edit className="w-4 h-4" />
                    </Button>
                  </Link>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(audit.id)}>
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {audits.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma auditoria encontrada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
