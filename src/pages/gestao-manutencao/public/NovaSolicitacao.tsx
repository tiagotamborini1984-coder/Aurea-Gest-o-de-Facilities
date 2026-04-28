import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Wrench, CheckCircle2, UploadCloud, MapPin, Tag, X } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

export default function NovaSolicitacaoPublica() {
  const { slug } = useParams()
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)

  const [options, setOptions] = useState<any>({
    client: null,
    plants: [],
    areas: [],
    sublocations: [],
    assets: [],
  })

  const [form, setForm] = useState({
    plant_id: '',
    area_id: '',
    sublocation_id: '',
    asset_id: '',
    requester_name: '',
    requester_email: '',
    description: '',
  })

  const [files, setFiles] = useState<File[]>([])

  useEffect(() => {
    loadOptions()
  }, [slug])

  const loadOptions = async () => {
    if (!slug) return
    const { data, error } = await supabase.rpc('get_maintenance_public_options', { p_slug: slug })
    if (error || !data) {
      toast.error('Erro ao carregar dados ou empresa não encontrada.')
      setLoading(false)
      return
    }
    setOptions(data)
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.plant_id || !form.requester_name || !form.description) {
      toast.error('Preencha todos os campos obrigatórios')
      return
    }

    setSubmitting(true)
    try {
      let uploadedPhotos: string[] = []
      for (const file of files) {
        const fileName = `${Date.now()}_${file.name.replace(/\s+/g, '_')}`
        const { data } = await supabase.storage
          .from('maintenance_attachments')
          .upload(fileName, file)
        if (data) {
          const { data: urlData } = supabase.storage
            .from('maintenance_attachments')
            .getPublicUrl(data.path)
          uploadedPhotos.push(urlData.publicUrl)
        }
      }

      const { data, error } = await supabase.rpc('submit_maintenance_ticket', {
        p_client_id: options.client.id,
        p_plant_id: form.plant_id,
        p_area_id: form.area_id || null,
        p_sublocation_id: form.sublocation_id || null,
        p_asset_id: form.asset_id || null,
        p_requester_name: form.requester_name,
        p_requester_email: form.requester_email || null,
        p_description: form.description,
        p_photos: uploadedPhotos,
      })

      if (error) throw error

      setSuccess(data.ticket_number)
      toast.success('Chamado aberto com sucesso!')
    } catch (err: any) {
      toast.error(err.message || 'Erro ao enviar solicitação.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading)
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>
  if (!options.client)
    return (
      <div className="min-h-screen flex items-center justify-center text-red-500">
        Página não encontrada ou inativa.
      </div>
    )

  const filteredAreas = options.areas.filter((a: any) => a.plant_id === form.plant_id)
  const filteredSublocations = options.sublocations.filter((s: any) => s.area_id === form.area_id)
  const filteredAssets = options.assets.filter(
    (a: any) =>
      (!form.plant_id || a.plant_id === form.plant_id) &&
      (!form.area_id || a.area_id === form.area_id),
  )

  if (success) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center shadow-xl animate-fade-in-up">
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
              <CheckCircle2 className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Chamado Aberto!</h2>
            <p className="text-gray-500">Sua solicitação foi registrada com sucesso.</p>
            <div className="bg-gray-100 p-4 rounded-lg font-mono text-xl font-semibold mt-4">
              {success}
            </div>
            <Button
              className="mt-8 w-full"
              onClick={() => {
                setSuccess(null)
                setForm({ ...form, description: '' })
                setFiles([])
              }}
            >
              Abrir Novo Chamado
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
        style={
          options.client.primary_color ? { borderBottomColor: options.client.primary_color } : {}
        }
      >
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {options.client.logo_url ? (
              <img src={options.client.logo_url} alt="Logo" className="h-10 w-auto" />
            ) : (
              <Wrench className="h-8 w-8 text-blue-600" />
            )}
            <div>
              <h1 className="font-bold text-lg leading-tight">{options.client.name}</h1>
              <p className="text-xs text-gray-500">Portal de Manutenção</p>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-3xl w-full mx-auto p-4 py-8 animate-fade-in-up">
        <Card className="shadow-lg border-0 overflow-hidden">
          <div
            className="h-2 w-full bg-blue-600"
            style={
              options.client.primary_color ? { backgroundColor: options.client.primary_color } : {}
            }
          ></div>
          <CardHeader className="bg-white pb-4">
            <CardTitle className="text-2xl">Nova Solicitação</CardTitle>
            <CardDescription>
              Descreva o problema encontrado para que nossa equipe de manutenção possa agir
              rapidamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="bg-gray-50/50 pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-blue-500" /> Localização
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Planta <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={form.plant_id}
                      onValueChange={(v) =>
                        setForm({
                          ...form,
                          plant_id: v,
                          area_id: '',
                          sublocation_id: '',
                          asset_id: '',
                        })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione a Planta" />
                      </SelectTrigger>
                      <SelectContent>
                        {options.plants.map((p: any) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Área</Label>
                    <Select
                      value={form.area_id}
                      disabled={!form.plant_id}
                      onValueChange={(v) =>
                        setForm({ ...form, area_id: v, sublocation_id: '', asset_id: '' })
                      }
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione a Área (Opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAreas.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Sub-local (Sala)</Label>
                    <Select
                      value={form.sublocation_id}
                      disabled={!form.area_id}
                      onValueChange={(v) => setForm({ ...form, sublocation_id: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione (Opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredSublocations.map((s: any) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Equipamento / Ativo</Label>
                    <Select
                      value={form.asset_id}
                      disabled={!form.plant_id}
                      onValueChange={(v) => setForm({ ...form, asset_id: v })}
                    >
                      <SelectTrigger className="bg-white">
                        <SelectValue placeholder="Selecione o Ativo (Opcional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {filteredAssets.map((a: any) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Tag className="h-4 w-4 text-blue-500" /> Detalhes do Chamado
                </h3>
                <div className="space-y-2">
                  <Label>
                    Descrição do Problema <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    rows={4}
                    className="bg-white resize-none"
                    placeholder="Descreva com detalhes o que está acontecendo..."
                    value={form.description}
                    onChange={(e) => setForm({ ...form, description: e.target.value })}
                  />
                </div>
                <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-gray-50/50 hover:bg-gray-50 transition-colors relative cursor-pointer">
                  <input
                    type="file"
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) =>
                      e.target.files &&
                      setFiles((prev) => [...prev, ...Array.from(e.target.files!)])
                    }
                  />
                  <UploadCloud className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-600">
                    Clique para anexar fotos/documentos
                  </p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG ou PDF</p>
                </div>
                {files.length > 0 && (
                  <div className="space-y-2 mt-3">
                    {files.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => setFiles(files.filter((_, i) => i !== idx))}
                        >
                          <X className="h-4 w-4 text-red-500" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="bg-white p-5 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>
                      Seu Nome <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      className="bg-white"
                      value={form.requester_name}
                      onChange={(e) => setForm({ ...form, requester_name: e.target.value })}
                      placeholder="Como podemos chamá-lo?"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Seu E-mail</Label>
                    <Input
                      className="bg-white"
                      type="email"
                      value={form.requester_email}
                      onChange={(e) => setForm({ ...form, requester_email: e.target.value })}
                      placeholder="Para receber atualizações (opcional)"
                    />
                  </div>
                </div>
              </div>

              <Button
                size="lg"
                className="w-full text-base h-12 shadow-lg"
                disabled={submitting}
                style={
                  options.client.primary_color
                    ? { backgroundColor: options.client.primary_color }
                    : {}
                }
              >
                {submitting ? 'Enviando...' : 'Abrir Chamado'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
