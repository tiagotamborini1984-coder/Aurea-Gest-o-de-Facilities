import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useParams, useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { ClipboardList, Plus, Trash2, Edit2, ChevronLeft, Save, AlertCircle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'

export default function AuditoriaConfig() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { activeClient } = useAppStore()
  const { toast } = useToast()

  const [audits, setAudits] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  const [isEditing, setIsEditing] = useState(false)
  const [currentAudit, setCurrentAudit] = useState<any>(null)
  const [actions, setActions] = useState<any[]>([])

  const [actionDialog, setActionDialog] = useState(false)
  const [editingAction, setEditingAction] = useState<any>(null)

  useEffect(() => {
    if (activeClient) {
      if (id) {
        fetchAuditDetails(id)
      } else {
        fetchAudits()
        setIsEditing(false)
        setCurrentAudit(null)
      }
    }
  }, [activeClient, id])

  const fetchAudits = async () => {
    setIsLoading(true)
    const { data } = await supabase
      .from('audits')
      .select('*')
      .eq('client_id', activeClient?.id)
      .order('created_at', { ascending: false })

    if (data) setAudits(data)
    setIsLoading(false)
  }

  const fetchAuditDetails = async (auditId: string) => {
    setIsLoading(true)
    if (auditId === 'nova') {
      setCurrentAudit({
        title: '',
        type: 'Geral',
        frequency: 'Única',
        start_date: new Date().toISOString().split('T')[0],
        status: 'Rascunho',
      })
      setActions([])
      setIsEditing(true)
    } else {
      const { data: audit } = await supabase.from('audits').select('*').eq('id', auditId).single()
      if (audit) {
        setCurrentAudit(audit)
        const { data: actData } = await supabase
          .from('audit_actions')
          .select('*')
          .eq('audit_id', auditId)
          .order('order_index')
        setActions(actData || [])
        setIsEditing(true)
      }
    }
    setIsLoading(false)
  }

  const handleSaveAudit = async (asDraft: boolean) => {
    if (!currentAudit.title || !currentAudit.start_date) {
      toast({ title: 'Preencha título e data de início.', variant: 'destructive' })
      return
    }

    if (actions.length === 0 && !asDraft) {
      toast({ title: 'Auditorias ativas precisam ter ações no checklist.', variant: 'destructive' })
      return
    }

    setIsSaving(true)
    try {
      const auditPayload = {
        id: currentAudit.id || undefined,
        client_id: activeClient?.id,
        title: currentAudit.title,
        type: currentAudit.type,
        frequency: currentAudit.frequency,
        start_date: currentAudit.start_date,
        status: asDraft ? 'Rascunho' : 'Ativo',
      }

      const { data: savedAudit, error: auditErr } = await supabase
        .from('audits')
        .upsert(auditPayload)
        .select()
        .single()

      if (auditErr) throw auditErr

      if (actions.length > 0) {
        const actionsPayload = actions.map((a, idx) => {
          const { id, created_at, ...rest } = a
          return {
            ...rest,
            audit_id: savedAudit.id,
            order_index: idx,
            // Strip temporary IDs entirely to let DB generate UUID, avoiding not-null errors
            id: id?.startsWith('temp-') ? undefined : id,
          }
        })

        const { error: actErr } = await supabase.from('audit_actions').upsert(actionsPayload)
        if (actErr) throw actErr
      }

      toast({ title: 'Template salvo com sucesso!' })
      navigate('/auditoria-checklist/configuracao')
    } catch (err: any) {
      toast({ title: 'Erro ao salvar', description: err.message, variant: 'destructive' })
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveAction = (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingAction.title) return

    if (editingAction.id) {
      setActions((prev) => prev.map((a) => (a.id === editingAction.id ? editingAction : a)))
    } else {
      setActions((prev) => [...prev, { ...editingAction, id: `temp-${crypto.randomUUID()}` }])
    }
    setActionDialog(false)
  }

  const handleDeleteAction = async (id: string) => {
    if (!id.startsWith('temp-')) {
      const { error } = await supabase.from('audit_actions').delete().eq('id', id)
      if (error) {
        toast({ title: 'Erro ao deletar', description: error.message, variant: 'destructive' })
        return
      }
    }
    setActions((prev) => prev.filter((a) => a.id !== id))
  }

  if (isEditing) {
    return (
      <div className="p-4 sm:p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate('/auditoria-checklist/configuracao')}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">
              {currentAudit?.id ? 'Editar Template' : 'Novo Template de Auditoria'}
            </h1>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-1 h-fit">
            <CardHeader className="bg-slate-50 border-b pb-4">
              <h3 className="font-semibold text-lg">Detalhes Gerais</h3>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Título da Auditoria</Label>
                <Input
                  value={currentAudit?.title || ''}
                  onChange={(e) => setCurrentAudit({ ...currentAudit, title: e.target.value })}
                  placeholder="Ex: Inspeção de Qualidade ISO"
                />
              </div>
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select
                  value={currentAudit?.type || 'Geral'}
                  onValueChange={(v) => setCurrentAudit({ ...currentAudit, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Geral">Geral</SelectItem>
                    <SelectItem value="Qualidade">Qualidade</SelectItem>
                    <SelectItem value="Segurança">Segurança (SSMA)</SelectItem>
                    <SelectItem value="Operacional">Operacional</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Frequência de Geração</Label>
                <Select
                  value={currentAudit?.frequency || 'Única'}
                  onValueChange={(v) => setCurrentAudit({ ...currentAudit, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Única">Única</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  value={currentAudit?.start_date || ''}
                  onChange={(e) => setCurrentAudit({ ...currentAudit, start_date: e.target.value })}
                />
              </div>

              <div className="pt-4 border-t flex flex-col gap-3">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleSaveAudit(true)}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Salvar como Rascunho'}
                </Button>
                <Button
                  variant="tech"
                  className="w-full"
                  onClick={() => handleSaveAudit(false)}
                  disabled={isSaving}
                >
                  {isSaving ? 'Salvando...' : 'Ativar Template'}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-2">
            <CardHeader className="bg-slate-50 border-b flex flex-row items-center justify-between pb-4">
              <h3 className="font-semibold text-lg">Itens do Checklist</h3>
              <Button
                size="sm"
                onClick={() => {
                  setEditingAction({
                    title: '',
                    evidence_required: false,
                    weight: 1,
                    comments_required: false,
                  })
                  setActionDialog(true)
                }}
              >
                <Plus className="w-4 h-4 mr-1" /> Adicionar Item
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {actions.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground flex flex-col items-center">
                  <AlertCircle className="w-10 h-10 mb-3 opacity-20" />
                  <p>O checklist está vazio.</p>
                  <p className="text-sm">Adicione ações que deverão ser verificadas.</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Pergunta / Ação</TableHead>
                      <TableHead className="w-24 text-center">Peso</TableHead>
                      <TableHead className="w-24 text-center">Evidência</TableHead>
                      <TableHead className="w-20 text-right"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {actions.map((act, index) => (
                      <TableRow key={act.id || index}>
                        <TableCell className="font-medium text-sm">{act.title}</TableCell>
                        <TableCell className="text-center">{act.weight}</TableCell>
                        <TableCell className="text-center">
                          {act.evidence_required ? (
                            <Badge variant="outline" className="bg-blue-50 text-blue-700">
                              Sim
                            </Badge>
                          ) : (
                            <span className="text-muted-foreground text-sm">Não</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => {
                                setEditingAction(act)
                                setActionDialog(true)
                              }}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-red-500 hover:bg-red-50 hover:text-red-700"
                              onClick={() => handleDeleteAction(act.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>

        <Dialog open={actionDialog} onOpenChange={setActionDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingAction?.id ? 'Editar Ação' : 'Nova Ação do Checklist'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSaveAction} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>O que deve ser verificado?</Label>
                <Input
                  required
                  value={editingAction?.title || ''}
                  onChange={(e) => setEditingAction({ ...editingAction, title: e.target.value })}
                  placeholder="Ex: O extintor está desobstruído?"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Peso (Relevância)</Label>
                  <Input
                    type="number"
                    min="1"
                    max="10"
                    required
                    value={editingAction?.weight || 1}
                    onChange={(e) =>
                      setEditingAction({ ...editingAction, weight: parseInt(e.target.value) })
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-3 pt-2">
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div>
                    <Label className="font-semibold text-sm">Exigir Evidência Fotográfica?</Label>
                    <p className="text-xs text-muted-foreground">
                      O auditor deverá anexar uma foto.
                    </p>
                  </div>
                  <Switch
                    checked={editingAction?.evidence_required || false}
                    onCheckedChange={(v) =>
                      setEditingAction({ ...editingAction, evidence_required: v })
                    }
                  />
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                  <div>
                    <Label className="font-semibold text-sm">Exigir Comentário?</Label>
                    <p className="text-xs text-muted-foreground">
                      O auditor deverá justificar a nota.
                    </p>
                  </div>
                  <Switch
                    checked={editingAction?.comments_required || false}
                    onCheckedChange={(v) =>
                      setEditingAction({ ...editingAction, comments_required: v })
                    }
                  />
                </div>
              </div>
              <DialogFooter className="mt-6">
                <Button type="button" variant="outline" onClick={() => setActionDialog(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Salvar Ação</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <ClipboardList className="h-8 w-8 text-brand-vividBlue" />
            Templates de Auditoria
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            Crie e gerencie os formulários padronizados para inspeções.
          </p>
        </div>
        <Button variant="tech" onClick={() => navigate('/auditoria-checklist/configuracao/nova')}>
          <Plus className="w-4 h-4 mr-2" /> Novo Template
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Data Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Carregando templates...
                  </TableCell>
                </TableRow>
              ) : audits.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    Nenhum template cadastrado.
                  </TableCell>
                </TableRow>
              ) : (
                audits.map((audit) => (
                  <TableRow key={audit.id} className="hover:bg-slate-50/50">
                    <TableCell className="font-medium">
                      {audit.title}{' '}
                      <span className="block text-xs text-muted-foreground font-normal">
                        {audit.type}
                      </span>
                    </TableCell>
                    <TableCell>{audit.frequency}</TableCell>
                    <TableCell>{new Date(audit.start_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          audit.status === 'Ativo'
                            ? 'bg-green-100 text-green-800 hover:bg-green-100'
                            : 'bg-slate-100 text-slate-800 hover:bg-slate-100'
                        }
                      >
                        {audit.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate(`/auditoria-checklist/configuracao/${audit.id}`)}
                      >
                        <Edit2 className="w-4 h-4 text-brand-deepBlue" />
                      </Button>
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
