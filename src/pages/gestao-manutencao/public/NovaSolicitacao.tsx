import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Wrench, CheckCircle2, AlertCircle, Loader2, Send } from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (email: string) => EMAIL_REGEX.test(email)

interface ClientData {
  id: string
  name: string
  logo_url: string | null
  primary_color: string | null
}

export default function NovaSolicitacaoPublica() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [client, setClient] = useState<ClientData | null>(null)
  const [plantId, setPlantId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', email: '', description: '' })

  const loadData = useCallback(async () => {
    if (!slug) {
      setLoading(false)
      return
    }

    const { data: clientData } = await supabase
      .from('clients')
      .select('id, name, logo_url, primary_color')
      .eq('url_slug', slug)
      .eq('status', 'Ativo')
      .maybeSingle()

    if (!clientData) {
      setLoading(false)
      return
    }
    setClient(clientData)

    const { data: plantData } = await supabase
      .from('plants')
      .select('id')
      .eq('client_id', clientData.id)
      .limit(1)

    if (plantData && plantData.length > 0) {
      setPlantId(plantData[0].id)
    }
    setLoading(false)
  }, [slug])

  useEffect(() => {
    loadData()
  }, [loadData])

  const isFormValid =
    form.name.trim().length > 0 &&
    isValidEmail(form.email.trim()) &&
    form.description.trim().length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!isFormValid || !client) return

    if (!plantId) {
      setErrorModal('Nenhuma planta cadastrada para esta empresa. Entre em contato com o suporte.')
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase.rpc('submit_maintenance_ticket', {
        p_client_id: client.id,
        p_plant_id: plantId,
        p_area_id: null,
        p_sublocation_id: null,
        p_asset_id: null,
        p_requester_name: form.name.trim(),
        p_requester_email: form.email.trim(),
        p_description: form.description.trim(),
        p_photos: [],
        p_origin: 'public',
      } as any)

      if (error) throw error

      setSuccess(data.ticket_number)
      setForm({ name: '', email: '', description: '' })
      toast.success('Sua solicitação foi enviada com sucesso!')
    } catch (err: any) {
      setErrorModal(err.message || 'Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  const primaryColor = client?.primary_color || '#2563eb'

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <Card className="w-full max-w-md text-center shadow-xl">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-6">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Empresa não encontrada</h2>
            <p className="text-gray-500">Verifique o link e tente novamente.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl animate-fade-in-up">
          <div className="h-2 w-full" style={{ backgroundColor: primaryColor }} />
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Solicitação enviada com sucesso!</h2>
            <p className="text-gray-500">
              Sua solicitação de manutenção foi registrada com sucesso.
            </p>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-xl font-semibold mt-4">
              {success}
            </div>
            <Button
              className="mt-8 w-full"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setSuccess(null)}
            >
              Abrir Nova Solicitação
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header
        className="bg-white border-b shadow-sm sticky top-0 z-10"
        style={{ borderBottomColor: primaryColor }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {client.logo_url ? (
            <img src={client.logo_url} alt="Logo" className="h-10 w-auto" />
          ) : (
            <div
              className="h-10 w-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: primaryColor }}
            >
              <Wrench className="h-5 w-5 text-white" />
            </div>
          )}
          <div>
            <h1 className="font-bold text-lg leading-tight text-gray-900">{client.name}</h1>
            <p className="text-xs text-gray-500">Portal de Manutenção</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 py-8 animate-fade-in-up">
        <Card className="shadow-lg border-0 overflow-hidden">
          <div className="h-2 w-full" style={{ backgroundColor: primaryColor }} />
          <CardHeader className="bg-white pb-4">
            <CardTitle className="text-2xl">Nova Solicitação</CardTitle>
            <CardDescription>
              Descreva o problema encontrado para que nossa equipe de manutenção possa agir
              rapidamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-gray-50/50 pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name">
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  className="bg-white"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Como podemos chamá-lo?"
                  maxLength={200}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-white"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="seu.email@exemplo.com"
                  maxLength={200}
                />
                {form.email.length > 0 && !isValidEmail(form.email) && (
                  <p className="text-xs text-red-500">Informe um e-mail válido.</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">
                  Descrição do Problema <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  className="bg-white resize-none"
                  placeholder="Descreva com detalhes o que está acontecendo..."
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  maxLength={2000}
                />
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-base h-12 shadow-lg"
                disabled={!isFormValid || submitting}
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>

      <Dialog open={!!errorModal} onOpenChange={(open) => !open && setErrorModal(null)}>
        <DialogContent>
          <DialogHeader>
            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <DialogTitle className="text-center">Erro ao Enviar Solicitação</DialogTitle>
            <DialogDescription className="text-center text-base">{errorModal}</DialogDescription>
          </DialogHeader>
          <Button onClick={() => setErrorModal(null)} className="w-full">
            Tentar Novamente
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
