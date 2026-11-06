import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useHasAccess } from '@/hooks/use-has-access'
import { useToast } from '@/hooks/use-toast'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Loader2, Sparkles, ShieldCheck, ShieldOff, Save } from 'lucide-react'

type Mode = 'auto' | 'manual' | 'off'

const OPCOES: Array<{
  id: Mode
  titulo: string
  desc: string
  icon: any
  cor: string
}> = [
  {
    id: 'auto',
    titulo: 'Automática',
    desc: 'Confere assim que a lista é anexada. O cadastro só é salvo com a lista validada.',
    icon: Sparkles,
    cor: 'border-blue-500 bg-blue-50',
  },
  {
    id: 'manual',
    titulo: 'Manual',
    desc: 'Não confere sozinha. O usuário pede a conferência no botão "Conferir com IA" quando quiser.',
    icon: ShieldCheck,
    cor: 'border-amber-500 bg-amber-50',
  },
  {
    id: 'off',
    titulo: 'Desligada',
    desc: 'Não confere e não exige validação. O anexo é apenas um arquivo.',
    icon: ShieldOff,
    cor: 'border-slate-400 bg-slate-50',
  },
]

export default function ConfiguracoesTreinamentos() {
  const { activeClient, profile, selectedMasterClient } = useAppStore()
  const hasAccess = useHasAccess('Gestão de Terceiros:Treinamentos')
  const { toast } = useToast()
  const [mode, setMode] = useState<Mode>('auto')
  const [original, setOriginal] = useState<Mode>('auto')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const clientId =
    profile?.role === 'Master' && selectedMasterClient !== 'all'
      ? selectedMasterClient
      : activeClient?.id || profile?.client_id

  useEffect(() => {
    let alive = true
    async function load() {
      if (!clientId) {
        setLoading(false)
        return
      }
      setLoading(true)
      const { data } = await supabase.rpc('training_verification_config', { p_client_id: clientId })
      if (alive && data) {
        const d = data as any
        const m: Mode = d.enabled === false ? 'off' : d.mode === 'manual' ? 'manual' : 'auto'
        setMode(m)
        setOriginal(m)
      }
      if (alive) setLoading(false)
    }
    load()
    return () => {
      alive = false
    }
  }, [clientId])

  const salvar = async () => {
    if (!clientId) return
    setSaving(true)
    const { error } = await supabase
      .from('clients')
      .update({ settings: { training_verification: { enabled: mode !== 'off', mode } } })
      .eq('id', clientId)
    setSaving(false)
    if (error) {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' })
      return
    }
    setOriginal(mode)
    toast({
      title: 'Configuração salva',
      description:
        mode === 'auto'
          ? 'As listas voltaram a ser conferidas automaticamente.'
          : mode === 'manual'
            ? 'Conferência em modo manual: o usuário decide quando pedir.'
            : 'Conferência desligada: o anexo não é mais analisado.',
    })
  }

  if (!hasAccess) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Sem acesso a esta configuração.</p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Conferência de Listas de Presença</h1>
        <p className="text-sm text-gray-500 mt-1">
          Define o que acontece quando um colaborador anexa a lista de presença de um treinamento
          {activeClient?.name ? ` em ${activeClient.name}` : ''}.
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3 border-b">
          <CardTitle className="text-base">Modo de conferência</CardTitle>
        </CardHeader>
        <CardContent className="pt-5">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            </div>
          ) : (
            <div className="space-y-3">
              {OPCOES.map((op) => {
                const Icon = op.icon
                const ativo = mode === op.id
                return (
                  <button
                    key={op.id}
                    type="button"
                    onClick={() => setMode(op.id)}
                    className={`w-full text-left flex items-start gap-3 p-4 rounded-lg border-2 transition-colors ${
                      ativo ? op.cor : 'border-slate-200 bg-white hover:border-slate-300'
                    }`}
                  >
                    <Icon
                      className={`h-5 w-5 mt-0.5 shrink-0 ${
                        ativo ? 'text-blue-700' : 'text-slate-400'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{op.titulo}</p>
                      <p className="text-xs text-slate-600 mt-0.5">{op.desc}</p>
                    </div>
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center gap-3 mt-6 pt-4 border-t">
            <Button onClick={salvar} disabled={saving || loading || mode === original}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar
            </Button>
            {mode !== original && (
              <span className="text-xs text-amber-600">Alteração não salva</span>
            )}
          </div>
        </CardContent>
      </Card>

      <p className="text-xs text-gray-500">
        A configuração vale para todos os usuários deste cliente. Em <b>Automática</b>, o cadastro
        do colaborador só é salvo depois que a IA validar a lista. Em <b>Manual</b> e{' '}
        <b>Desligada</b>, o anexo não bloqueia o salvamento.
      </p>
    </div>
  )
}
