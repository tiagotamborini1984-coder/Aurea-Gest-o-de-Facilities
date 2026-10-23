import { useState, useMemo, useEffect } from 'react'
import {
  Plus,
  Search,
  Trash2,
  RefreshCw,
  FileText,
  Bot,
  MessageSquarePlus,
  Send,
  Loader2,
} from 'lucide-react'
import { useCrud } from '@/hooks/use-crud'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { FileUpload } from '@/components/FileUpload'
import { supabase } from '@/lib/supabase/client'

const STATUS_META: Record<string, { label: string; color: string }> = {
  draft: { label: 'Rascunho — revise os dados', color: 'bg-amber-500' },
  extracting: { label: 'Lendo documento…', color: 'bg-blue-500' },
  pending: { label: 'Na fila', color: 'bg-slate-500' },
  analyzing: { label: 'Lendo documento…', color: 'bg-blue-500' },
  indexed: { label: 'Na base do Facilita', color: 'bg-green-500' },
  failed: { label: 'Falhou', color: 'bg-red-500' },
}

export default function FacilitaDocs() {
  const { profile, selectedMasterClient } = useAppStore()
  const { data: docs, loading, remove, fetchAll } = useCrud<any>('facilita_documents')
  const { toast } = useToast()

  const [searchTerm, setSearchTerm] = useState('')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultForm = {
    title: '',
    description: '',
    category: 'POP',
    revision: '',
    file_urls: [] as string[],
  }
  const [formData, setFormData] = useState(defaultForm)
  // rascunho em extração automática (anexou arquivo → Facilita extrai os dados)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [draftExtracting, setDraftExtracting] = useState(false)
  const [extractFailed, setExtractFailed] = useState(false)

  // ===== Chat =====
  const [chatOpen, setChatOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)

  const clientId = profile?.role === 'Master' ? selectedMasterClient : profile?.client_id

  // polling dos status enquanto houver docs em análise
  useEffect(() => {
    const hasPending = (docs || []).some(
      (d: any) => d.status === 'pending' || d.status === 'analyzing',
    )
    if (!hasPending) return
    const t = setInterval(() => {
      fetchAll()
    }, 8000)
    return () => clearInterval(t)
  }, [docs, fetchAll])

  const filteredDocs = useMemo(() => {
    return (docs || []).filter((doc: any) => {
      const matchesSearch =
        (doc.title || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (doc.category || '').toLowerCase().includes(searchTerm.toLowerCase())
      return matchesSearch
    })
  }, [docs, searchTerm])

  // ===== Fluxo de rascunho: anexou arquivo → cria rascunho → Facilita extrai os dados =====
  const handleFilesAttached = async (urls: string[]) => {
    setFormData((prev) => ({ ...prev, file_urls: urls }))
    if (urls.length === 0) return
    if (draftId) return // rascunho já existe (arquivos adicionais)

    // Master com "todos os clients" não tem client para vincular o POP
    if (profile?.role === 'Master' && selectedMasterClient === 'all') {
      toast({
        title: 'Selecione um cliente primeiro',
        description: 'Escolha no topo qual cliente receberá este documento antes de anexar.',
        variant: 'destructive',
      })
      return
    }

    setIsSubmitting(true)
    setDraftExtracting(true)
    setExtractFailed(false)
    try {
      // cria rascunho com título provisório
      const { data, error } = await supabase
        .from('facilita_documents')
        .insert({
          title: 'Lendo documento…',
          file_urls: urls,
          client_id: clientId,
          created_by: (profile as any)?.id,
          status: 'extracting',
          status_message: 'Facilita está lendo o documento e extraindo os dados.',
        })
        .select('id')
        .single()
      if (error) throw error
      const newId = data.id
      setDraftId(newId)

      // pede extração ao Maestro
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')
      const { error: fnErr } = await supabase.functions.invoke('facilities-copilot', {
        body: { document_id: newId },
      })
      if (fnErr) throw fnErr
    } catch (e: any) {
      setExtractFailed(true)
      toast({
        title: 'Extração automática indisponível',
        description: 'Preencha os dados manualmente e confirme.',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // polling: quando o callback gravar os dados extraídos, preenche o form
  useEffect(() => {
    if (!draftId || !draftExtracting) return
    const t = setInterval(async () => {
      const { data } = await supabase
        .from('facilita_documents')
        .select('title, description, category, revision, status, status_message')
        .eq('id', draftId)
        .single()
      if (data && data.status !== 'extracting') {
        setDraftExtracting(false)
        if (data.status === 'draft') {
          setFormData((prev) => ({
            ...prev,
            title: data.title || prev.title,
            description: data.description || prev.description,
            category: data.category || prev.category,
            revision: data.revision || prev.revision,
          }))
          toast({ title: 'Dados extraídos — revise e confirme' })
        } else if (data.status === 'failed') {
          setExtractFailed(true)
          toast({
            title: 'Não consegui extrair os dados',
            description: 'Preencha manualmente e confirme.',
            variant: 'destructive',
          })
        }
      }
    }, 2500)
    return () => clearInterval(t)
  }, [draftId, draftExtracting])

  // confirma o rascunho → entra na fila de indexação
  const confirmDraft = async () => {
    if (!draftId) return
    if (!formData.title.trim()) {
      toast({ title: 'Preencha o título antes de confirmar', variant: 'destructive' })
      return
    }
    setIsSubmitting(true)
    try {
      const { error } = await supabase
        .from('facilita_documents')
        .update({
          title: formData.title,
          description: formData.description,
          category: formData.category,
          revision: formData.revision,
          file_urls: formData.file_urls,
          status: 'pending',
          status_message: 'Na fila para leitura pelo Facilita.',
        })
        .eq('id', draftId)
      if (error) throw error
      toast({ title: 'Documento na fila — o Facilita vai ler e indexar em instantes' })
      setIsDialogOpen(false)
      setFormData(defaultForm)
      setDraftId(null)
      setDraftExtracting(false)
      setExtractFailed(false)
      fetchAll()
    } catch (error: any) {
      toast({
        title: 'Erro ao confirmar documento',
        description: error.message || 'Ocorreu um erro inesperado',
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  // descarta o rascunho (cancelar ou fechar dialog)
  const discardDraft = async () => {
    if (!draftId) {
      setIsDialogOpen(false)
      return
    }
    await supabase.from('facilita_documents').delete().eq('id', draftId)
    setIsDialogOpen(false)
    setFormData(defaultForm)
    setDraftId(null)
    setDraftExtracting(false)
    setExtractFailed(false)
    fetchAll()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este documento da base do Facilita?')) return
    const { success, error } = await remove(id)
    if (success) toast({ title: 'Documento removido da base' })
    else toast({ title: 'Erro ao remover', description: error?.message, variant: 'destructive' })
  }

  const reindex = async (doc: any) => {
    const { error } = await supabase
      .from('facilita_documents')
      .update({ status: 'pending', status_message: 'Na fila para nova leitura.' })
      .eq('id', doc.id)
    if (!error) toast({ title: 'Documento na fila para nova leitura' })
  }

  // ===== Chat =====
  const openChat = async () => {
    setChatOpen(true)
    if (conversationId) return
    const { data, error } = await supabase
      .from('facilita_conversations')
      .insert({
        client_id: clientId,
        user_id: (profile as any)?.id,
        title: 'Conversa com o Facilita',
      })
      .select('id')
      .single()
    if (error) {
      toast({
        title: 'Erro ao iniciar conversa',
        description: error.message,
        variant: 'destructive',
      })
      return
    }
    setConversationId(data.id)
    setMessages([
      {
        role: 'assistant',
        content:
          'Olá! Sou o **Facilita** 👋\n\nTire dúvidas sobre os POPs da empresa, os módulos do Aurea e a gestão de Facilities em geral — custos, processos, rotinas.\n\nComo posso ajudar?',
        sources: [],
        status: 'sent',
      },
    ])
  }

  const sendQuestion = async () => {
    const q = question.trim()
    if (!q || !conversationId || sending) return
    setSending(true)
    setQuestion('')
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: q, status: 'sent' },
      { role: 'assistant', content: '', status: 'processing' },
    ])

    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Sessão expirada. Faça login novamente.')

      const { error } = await supabase.functions.invoke('facilities-copilot', {
        body: { conversation_id: conversationId, question: q },
      })
      if (error) throw error
      // a resposta chega via callback do Maestro — polling busca a mensagem 'sent'
    } catch (e: any) {
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1 && m.role === 'assistant'
            ? { ...m, status: 'failed', content: 'Não consegui enviar agora. Tente novamente.' }
            : m,
        ),
      )
      toast({
        title: 'Erro ao perguntar ao Facilita',
        description: e.message,
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  // polling das respostas
  useEffect(() => {
    if (!chatOpen || !conversationId) return
    const hasProcessing = messages.some((m) => m.role === 'assistant' && m.status === 'processing')
    if (!hasProcessing) return
    const t = setInterval(async () => {
      const { data } = await supabase
        .from('facilita_messages')
        .select('role, content, sources, status, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (data) {
        setMessages((prev) =>
          JSON.stringify(prev) === JSON.stringify(data) ? prev : (data as any),
        )
      }
    }, 2000)
    return () => clearInterval(t)
  }, [chatOpen, conversationId, messages])

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Facilita</h1>
          <p className="text-muted-foreground mt-1">
            Robô tira-dúvidas de Facilities — base de POPs, módulos do Aurea e gestão de Facilities
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={openChat}
            className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white shadow-md"
          >
            <MessageSquarePlus className="h-5 w-5 mr-2" />
            Conversar com o Facilita
          </Button>
          <Button
            onClick={() => setIsDialogOpen(true)}
            variant="outline"
            className="border-brand-vividBlue text-brand-vividBlue hover:bg-brand-vividBlue/10"
          >
            <Plus className="h-5 w-5 mr-2" />
            Novo Documento
          </Button>
        </div>
      </div>

      {/* busca */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-xl shadow-sm border border-border">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos na base do Facilita..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 bg-background border-input"
          />
        </div>
      </div>

      {/* tabela */}
      <div className="bg-card rounded-xl shadow-sm border border-border overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Categoria</TableHead>
              <TableHead>Revisão</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Anexos</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  Nenhum documento na base. Clique em "Novo Documento" para subir os POPs.
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map((doc: any) => {
                const status = STATUS_META[doc.status] || STATUS_META.pending
                return (
                  <TableRow key={doc.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="font-medium">{doc.title}</div>
                      {doc.description && (
                        <div className="text-xs text-muted-foreground line-clamp-1">
                          {doc.description}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>{doc.category || 'POP'}</TableCell>
                    <TableCell>{doc.revision || '—'}</TableCell>
                    <TableCell>
                      <Badge className={`${status.color} text-white border-none shadow-sm`}>
                        {status.label}
                      </Badge>
                      {doc.status_message && (
                        <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                          {doc.status_message}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {(doc.file_urls || []).length > 0 ? (
                        <a
                          href={doc.file_urls[0]}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm text-brand-vividBlue hover:underline"
                        >
                          <FileText className="h-4 w-4" />
                          {(doc.file_urls || []).length} arquivo(s)
                        </a>
                      ) : (
                        '—'
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Reler e reindexar"
                          onClick={() => reindex(doc)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          title="Remover da base"
                          onClick={() => handleDelete(doc.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* dialog novo documento */}
      <Dialog
        open={isDialogOpen}
        onOpenChange={(open) => {
          if (!open) discardDraft()
          else setIsDialogOpen(true)
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo documento na base do Facilita</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              confirmDraft()
            }}
            className="space-y-4"
          >
            {draftExtracting && (
              <div className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-3 text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Facilita está lendo o documento e extraindo título, categoria, revisão e descrição…
              </div>
            )}
            {extractFailed && !draftExtracting && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg p-3 text-sm">
                ⚠️ Não consegui extrair os dados automaticamente — preencha manualmente.
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="title">Título *</Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Anexe o arquivo — o Facilita extrai os dados"
                disabled={draftExtracting}
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="category">Categoria</Label>
                <Input
                  id="category"
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="POP, Instrução de Trabalho, Manual…"
                  disabled={draftExtracting}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="revision">Revisão</Label>
                <Input
                  id="revision"
                  value={formData.revision}
                  onChange={(e) => setFormData({ ...formData, revision: e.target.value })}
                  placeholder="Ex.: rev. 3"
                  disabled={draftExtracting}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Input
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Sobre o que é o documento (opcional)"
                disabled={draftExtracting}
              />
            </div>
            <div className="space-y-2">
              <Label>Arquivos *</Label>
              <FileUpload
                existingUrls={formData.file_urls}
                onUploadComplete={handleFilesAttached}
              />
            </div>
            <div className="flex justify-end gap-2 pt-6 border-t border-border mt-6">
              <Button
                type="button"
                variant="outline"
                onClick={discardDraft}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || draftExtracting || !draftId || !formData.title.trim()}
                className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
              >
                {draftExtracting
                  ? 'Extraindo dados…'
                  : isSubmitting
                    ? 'Salvando...'
                    : 'Confirmar e indexar'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* dialog chat */}
      <Dialog open={chatOpen} onOpenChange={setChatOpen}>
        <DialogContent className="max-w-2xl h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-brand-vividBlue" />
              Facilita — Tira-dúvidas de Facilities
            </DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto space-y-4 pr-2" id="facilita-chat-body">
            {messages.map((m, i) => (
              <div
                key={i}
                className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm whitespace-pre-wrap ${
                    m.role === 'user'
                      ? 'bg-brand-vividBlue text-white rounded-br-sm'
                      : m.status === 'processing'
                        ? 'bg-muted text-muted-foreground'
                        : m.status === 'failed'
                          ? 'bg-red-50 text-red-700 border border-red-200'
                          : 'bg-muted'
                  }`}
                >
                  {m.status === 'processing' ? (
                    <span className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Facilita está pensando…
                    </span>
                  ) : (
                    <>
                      {m.content}
                      {m.role === 'assistant' && m.sources && m.sources.length > 0 && (
                        <div className="mt-2 pt-2 border-t border-border/60 flex flex-wrap gap-1">
                          {m.sources.map((s: any, j: number) => (
                            <Badge key={j} variant="outline" className="text-[10px]">
                              {s.type === 'pop'
                                ? `📄 ${s.ref}`
                                : s.type === 'budget'
                                  ? `💰 ${s.ref}`
                                  : s.type === 'aurea'
                                    ? `🧩 ${s.ref}`
                                    : `💡 ${s.ref}`}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-2 pt-4 border-t border-border">
            <Input
              placeholder="Pergunte sobre POPs, módulos do Aurea, custos…"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  sendQuestion()
                }
              }}
              disabled={sending}
            />
            <Button
              onClick={sendQuestion}
              disabled={sending || !question.trim()}
              className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
