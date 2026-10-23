import { useState, useEffect, useRef } from 'react'
import { Minus, Send, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'

const MASCOTE_URL =
  'https://wmohkugddlxspjckbgae.supabase.co/storage/v1/object/public/documents/facilita/mascote.jpg'

interface Msg {
  role: string
  content: string
  status?: string
  sources?: { type: string; ref: string }[]
}

export default function FacilitaWidget() {
  const { profile, selectedMasterClient } = useAppStore()
  const { toast } = useToast()

  // minimizado = boneco no canto; maximizado = janela de chat
  const [open, setOpen] = useState(false)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Msg[]>([])
  const [question, setQuestion] = useState('')
  const [sending, setSending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  const [nudge, setNudge] = useState(true)

  const clientId = profile?.role === 'Master' ? selectedMasterClient : profile?.client_id

  // balão de convite some depois de 12s
  useEffect(() => {
    if (!open) {
      const t = setTimeout(() => setNudge(false), 12000)
      return () => clearTimeout(t)
    }
  }, [open])

  // autoscroll
  useEffect(() => {
    bodyRef.current?.scrollTo({ top: bodyRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages])

  const startConversation = async () => {
    if (conversationId) return conversationId
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
      return null
    }
    setConversationId(data.id)
    setMessages([
      {
        role: 'assistant',
        content:
          'Olá! Sou a **Facilita** 👋\n\nTire dúvidas sobre os POPs da empresa, os módulos do Aurea e a gestão de Facilities — custos, processos, rotinas.\n\nComo posso ajudar?',
        status: 'sent',
        sources: [],
      },
    ])
    return data.id
  }

  const toggle = async () => {
    if (!open) {
      await startConversation()
      setOpen(true)
      setNudge(false)
    } else {
      setOpen(false)
    }
  }

  const sendQuestion = async () => {
    const q = question.trim()
    if (!q || sending) return
    const convId = await startConversation()
    if (!convId) return
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
        body: { conversation_id: convId, question: q },
      })
      if (error) throw error
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

  // polling das respostas (callback do Maestro grava no banco)
  useEffect(() => {
    if (!open || !conversationId) return
    const hasProcessing = messages.some((m) => m.role === 'assistant' && m.status === 'processing')
    if (!hasProcessing) return
    const t = setInterval(async () => {
      const { data } = await supabase
        .from('facilita_messages')
        .select('role, content, sources, status, created_at')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
      if (data) setMessages(data)
    }, 2500)
    return () => clearInterval(t)
  }, [open, conversationId, messages])

  // ===== minimizado: boneco + balão de convite =====
  if (!open) {
    return (
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2 print:hidden">
        {nudge && (
          <div className="bg-white border border-border shadow-lg rounded-2xl rounded-br-sm px-4 py-3 max-w-[240px] text-sm text-foreground animate-fade-in">
            Olá! Sou a <strong>Facilita</strong> — pode me perguntar sobre POPs, módulos do Aurea e
            Facilities 👋
          </div>
        )}
        <button
          onClick={toggle}
          className="group relative h-16 w-16 rounded-full overflow-hidden border-2 border-brand-vividBlue shadow-lg hover:scale-105 transition-transform"
          title="Abrir o Facilita"
        >
          <img src={MASCOTE_URL} alt="Facilita" className="h-full w-full object-cover" />
          <span className="absolute bottom-0 right-0 h-4 w-4 rounded-full bg-green-500 border-2 border-white" />
        </button>
      </div>
    )
  }

  // ===== maximizado: janela de chat =====
  return (
    <div className="fixed bottom-6 right-6 z-50 print:hidden">
      <div className="w-[380px] max-w-[calc(100vw-3rem)] h-[560px] max-h-[calc(100vh-6rem)] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* header */}
        <div className="flex items-center gap-3 bg-brand-vividBlue text-white px-4 py-3">
          <img
            src={MASCOTE_URL}
            alt="Facilita"
            className="h-10 w-10 rounded-full border-2 border-white/60 object-cover"
          />
          <div className="flex-1">
            <div className="font-semibold leading-tight">Facilita</div>
            <div className="text-xs opacity-90 flex items-center gap-1">
              <span className="h-1.5 w-1.5 rounded-full bg-green-400 inline-block" />
              Online — tira-dúvidas de Facilities
            </div>
          </div>
          <button
            onClick={toggle}
            className="p-1.5 rounded-lg hover:bg-white/20 transition-colors"
            title="Minimizar"
          >
            <Minus className="h-4 w-4" />
          </button>
        </div>

        {/* mensagens */}
        <div ref={bodyRef} className="flex-1 overflow-y-auto space-y-3 p-4">
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div
                className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
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
                          <span
                            key={j}
                            className="text-[10px] bg-background border border-border rounded px-1.5 py-0.5"
                          >
                            {s.type === 'pop'
                              ? `📄 ${s.ref}`
                              : s.type === 'budget'
                                ? `💰 ${s.ref}`
                                : s.type === 'aurea'
                                  ? `🧩 ${s.ref}`
                                  : `💡 ${s.ref}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* input */}
        <div className="flex gap-2 p-3 border-t border-border">
          <input
            className="flex-1 bg-background border border-input rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-vividBlue/40"
            placeholder="Pergunte sobre POPs, módulos, custos…"
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
          <button
            onClick={sendQuestion}
            disabled={sending || !question.trim()}
            className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white rounded-lg px-3 transition-colors disabled:opacity-50"
            title="Enviar"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
