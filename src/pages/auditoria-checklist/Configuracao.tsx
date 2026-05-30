import { useState, useEffect } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { useToast } from '@/components/ui/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash2, Edit2, ChevronLeft, Save } from 'lucide-react'

export default function AuditoriaConfig() {
  const { id } = useParams()
  if (!id) return <AuditoriaList />
  return <AuditoriaForm id={id === 'nova' ? undefined : id} />
}

function AuditoriaList() {
  const { user } = useAuth()
  const [audits, setAudits] = useState<any[]>([])

  useEffect(() => {
    loadAudits()
  }, [user])

  const loadAudits = async () => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()
    if (!profile?.client_id) return
    const { data } = await supabase
      .from('audits')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('created_at', { ascending: false })
    setAudits(data || [])
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold tracking-tight">Configuração de Auditorias</h1>
        <Button asChild>
          <Link to="/auditoria-checklist/configuracao/nova">
            <Plus className="mr-2 h-4 w-4" /> Nova Auditoria
          </Link>
        </Button>
      </div>
      <Card>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Título</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Frequência</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {audits.map((a) => (
              <TableRow key={a.id}>
                <TableCell className="font-medium">{a.title}</TableCell>
                <TableCell>{a.type}</TableCell>
                <TableCell>{a.frequency}</TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="icon" asChild>
                    <Link to={`/auditoria-checklist/configuracao/${a.id}`}>
                      <Edit2 className="h-4 w-4" />
                    </Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {audits.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground py-8">
                  Nenhuma auditoria configurada.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}

function AuditoriaForm({ id }: { id?: string }) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [audit, setAudit] = useState({
    title: '',
    type: 'Geral',
    frequency: 'Única',
    start_date: '',
  })
  const [settings, setSettings] = useState([
    { score: 1, description: 'Muito Ruim', trigger_task: true },
    { score: 2, description: 'Ruim', trigger_task: true },
    { score: 3, description: 'Regular', trigger_task: false },
    { score: 4, description: 'Bom', trigger_task: false },
    { score: 5, description: 'Excelente', trigger_task: false },
  ])
  const [actions, setActions] = useState([{ title: '', weight: 1, evidence_required: false }])

  useEffect(() => {
    if (id) loadAudit()
  }, [id])

  const loadAudit = async () => {
    const { data: aud } = await supabase.from('audits').select('*').eq('id', id).single()
    if (aud) {
      setAudit({
        title: aud.title,
        type: aud.type,
        frequency: aud.frequency,
        start_date: aud.start_date,
      })
      if (aud.scoring_settings) setSettings(aud.scoring_settings as any)

      const { data: acts } = await supabase
        .from('audit_actions')
        .select('*')
        .eq('audit_id', aud.id)
        .order('order_index')
      if (acts && acts.length > 0) setActions(acts)
    }
  }

  const handleSave = async () => {
    if (!audit.title || !audit.start_date)
      return toast({
        title: 'Erro',
        description: 'Preencha os campos obrigatórios',
        variant: 'destructive',
      })

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id')
      .eq('id', user?.id)
      .single()
    if (!profile?.client_id) return

    let auditId = id

    if (id) {
      await supabase
        .from('audits')
        .update({ ...audit, scoring_settings: settings })
        .eq('id', id)
    } else {
      const { data, error } = await supabase
        .from('audits')
        .insert({
          client_id: profile.client_id,
          ...audit,
          scoring_settings: settings,
        })
        .select()
        .single()
      if (error) return toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      auditId = data.id
    }

    if (auditId) {
      await supabase.from('audit_actions').delete().eq('audit_id', auditId)
      const actsToInsert = actions.map((a, idx) => ({
        audit_id: auditId,
        title: a.title,
        weight: a.weight,
        evidence_required: a.evidence_required,
        order_index: idx,
      }))
      await supabase.from('audit_actions').insert(actsToInsert)
      toast({ title: 'Sucesso', description: 'Auditoria salva com sucesso' })
      navigate('/auditoria-checklist/configuracao')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
      <div className="flex items-center gap-4">
        <Button
          variant="outline"
          size="icon"
          onClick={() => navigate('/auditoria-checklist/configuracao')}
        >
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">
          {id ? 'Editar Auditoria' : 'Nova Auditoria'}
        </h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Dados Gerais</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Título</Label>
            <Input
              value={audit.title}
              onChange={(e) => setAudit({ ...audit, title: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Data de Início</Label>
            <Input
              type="date"
              value={audit.start_date}
              onChange={(e) => setAudit({ ...audit, start_date: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={audit.type} onValueChange={(v) => setAudit({ ...audit, type: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Geral">Geral</SelectItem>
                <SelectItem value="Qualidade">Qualidade</SelectItem>
                <SelectItem value="Segurança">Segurança</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Frequência</Label>
            <Select
              value={audit.frequency}
              onValueChange={(v) => setAudit({ ...audit, frequency: v })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Única">Única</SelectItem>
                <SelectItem value="Semanal">Semanal</SelectItem>
                <SelectItem value="Mensal">Mensal</SelectItem>
                <SelectItem value="Anual">Anual</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Escala de Avaliação e Ações Corretivas</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure as notas e ative a geração automática de tarefas para correções de
            não-conformidades.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {settings.map((s, idx) => (
            <div
              key={idx}
              className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-4 border rounded-lg bg-card transition-colors hover:border-primary/50"
            >
              <div className="w-20 space-y-1">
                <Label>Nota</Label>
                <Input value={s.score} disabled className="font-semibold text-center bg-muted/50" />
              </div>
              <div className="flex-1 space-y-1 w-full">
                <Label>Descrição</Label>
                <Input
                  value={s.description}
                  onChange={(e) => {
                    const ns = [...settings]
                    ns[idx].description = e.target.value
                    setSettings(ns)
                  }}
                />
              </div>
              <div className="flex items-center gap-2 sm:mt-6">
                <Switch
                  checked={s.trigger_task}
                  onCheckedChange={(v) => {
                    const ns = [...settings]
                    ns[idx].trigger_task = v
                    setSettings(ns)
                  }}
                />
                <Label className="whitespace-nowrap font-medium text-orange-600 dark:text-orange-400">
                  Gera Ação Corretiva
                </Label>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Itens de Auditoria</CardTitle>
          <Button
            variant="outline"
            size="sm"
            onClick={() =>
              setActions([...actions, { title: '', weight: 1, evidence_required: false }])
            }
          >
            <Plus className="mr-2 h-4 w-4" /> Adicionar Item
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {actions.map((a, idx) => (
            <div
              key={idx}
              className="flex items-end gap-4 p-4 border rounded-lg hover:border-primary/50 transition-colors"
            >
              <div className="flex-1 space-y-1">
                <Label>Item a avaliar</Label>
                <Input
                  value={a.title}
                  onChange={(e) => {
                    const na = [...actions]
                    na[idx].title = e.target.value
                    setActions(na)
                  }}
                  placeholder="Ex: Limpeza e organização do ambiente"
                />
              </div>
              <div className="w-24 space-y-1">
                <Label>Peso</Label>
                <Input
                  type="number"
                  value={a.weight}
                  onChange={(e) => {
                    const na = [...actions]
                    na[idx].weight = Number(e.target.value)
                    setActions(na)
                  }}
                />
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setActions(actions.filter((_, i) => i !== idx))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="flex justify-end pt-4">
        <Button onClick={handleSave} className="w-full sm:w-auto px-8">
          <Save className="mr-2 h-4 w-4" /> Salvar Configuração
        </Button>
      </div>
    </div>
  )
}
