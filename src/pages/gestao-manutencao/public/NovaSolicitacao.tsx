import { useState, useEffect, useMemo, type CSSProperties } from 'react'
import { getAccessibleColors } from '@/lib/contrast-utils'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import { useMaintenanceFormData } from '@/hooks/use-maintenance-form-data'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import {
  Wrench,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Camera,
  X,
  ImagePlus,
  MapPin,
  Building2,
  FileText,
  Mail,
  User,
  Layers,
} from 'lucide-react'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const isValidEmail = (email: string) => EMAIL_REGEX.test(email)
const ERROR_NO_CLIENT = 'Não foi possível identificar sua empresa. Entre em contato com o suporte.'

interface FormState {
  name: string
  email: string
  description: string
  plant_id: string
  area_id: string
  location_id: string
  sublocation_id: string
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  description: '',
  plant_id: '',
  area_id: '',
  location_id: '',
  sublocation_id: '',
}

const BackgroundElements = () => (
  <>
    <div
      className="absolute inset-0 bg-cover bg-center bg-no-repeat pointer-events-none scale-105"
      style={{
        backgroundImage:
          'url("https://img.usecurling.com/p/1920/1080?q=corn%20ethanol%20plant%20silo%20industrial&dpr=2")',
      }}
    />
    <div className="absolute inset-0 bg-gradient-to-br from-[#1f2937]/95 via-[#1f2937]/85 to-[#1e3a8a]/90 pointer-events-none" />
    <div className="absolute inset-0 bg-gradient-to-t from-[#1f2937]/95 via-transparent to-[#1f2937]/70 pointer-events-none" />
    <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/20 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute bottom-[-15%] right-[-10%] w-[500px] h-[500px] bg-[#1e3a8a]/10 rounded-full blur-[120px] pointer-events-none" />
    <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.05)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_60%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none opacity-40"></div>
  </>
)

export default function NovaSolicitacaoPublica() {
  const { slug } = useParams()
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)
  const [client, setClient] = useState<any>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [errorModal, setErrorModal] = useState<string | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [files, setFiles] = useState<File[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})

  const { plants, getAreasForPlant, getLocationsForPlant, getSublocationsForLocation } =
    useMaintenanceFormData(clientId)

  const areas = useMemo(
    () => (form.plant_id ? getAreasForPlant(form.plant_id) : []),
    [form.plant_id, getAreasForPlant],
  )
  const locations = useMemo(
    () => (form.plant_id ? getLocationsForPlant(form.plant_id) : []),
    [form.plant_id, getLocationsForPlant],
  )
  const sublocations = useMemo(
    () => (form.location_id ? getSublocationsForLocation(form.location_id) : []),
    [form.location_id, getSublocationsForLocation],
  )

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }
    let mounted = true
    const fetchProfileAndClient = async () => {
      try {
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('client_id, name, email')
          .eq('id', user.id)
          .single()

        if (!mounted) return

        if (profileError || !profile || !profile.client_id) {
          setClientError(ERROR_NO_CLIENT)
          setLoading(false)
          return
        }

        setClientId(profile.client_id)
        setForm((prev) => ({
          ...prev,
          name: profile.name || prev.name,
          email: profile.email || user.email || prev.email,
        }))

        const { data: clientData } = await supabase
          .from('clients')
          .select('id, name, logo_url, primary_color, secondary_color')
          .eq('id', profile.client_id)
          .single()

        if (!mounted) return
        if (clientData) setClient(clientData)
        setLoading(false)
      } catch (e) {
        console.error(e)
        if (mounted) {
          setClientError(ERROR_NO_CLIENT)
          setLoading(false)
        }
      }
    }
    fetchProfileAndClient()
    return () => {
      mounted = false
    }
  }, [user?.id])

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(`/m/${slug}/entrar`, { replace: true })
    }
  }, [authLoading, user, slug, navigate])

  const accessibleColors = useMemo(
    () => getAccessibleColors(client?.primary_color || null, client?.secondary_color || null),
    [client],
  )
  const primaryColor = accessibleColors.primary

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = 'Nome é obrigatório'
    if (!form.email.trim()) e.email = 'E-mail é obrigatório'
    else if (!isValidEmail(form.email.trim())) e.email = 'Informe um e-mail válido'
    if (!form.plant_id) e.plant_id = 'Selecione uma planta'
    if (!form.area_id) e.area_id = 'Selecione uma área'
    if (!form.description.trim()) e.description = 'Descrição é obrigatória'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleFileSelect = (selectedFiles: FileList | null) => {
    if (!selectedFiles) return
    const imageFiles = Array.from(selectedFiles).filter((f) => f.type.startsWith('image/'))
    if (imageFiles.length !== selectedFiles.length) {
      toast.warning('Apenas arquivos de imagem são aceitos.')
    }
    setFiles((prev) => [...prev, ...imageFiles])
  }

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate() || !clientId) return
    setSubmitting(true)
    try {
      const photoUrls: string[] = []
      for (const file of files) {
        const safeName = file.name.replace(/[^a-zA-Z0-9.\- ]/g, '_')
        const fileName = `${Date.now()}_${safeName}`
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('maintenance_attachments')
          .upload(fileName, file)
        if (!uploadError && uploadData) {
          const { data: urlData } = supabase.storage
            .from('maintenance_attachments')
            .getPublicUrl(uploadData.path)
          photoUrls.push(urlData.publicUrl)
        }
      }

      const { data, error } = await supabase.rpc('submit_maintenance_ticket', {
        p_client_id: clientId,
        p_plant_id: form.plant_id,
        p_area_id: form.area_id,
        p_sublocation_id: form.sublocation_id || null,
        p_asset_id: null,
        p_requester_name: form.name.trim(),
        p_requester_email: form.email.trim(),
        p_description: form.description.trim(),
        p_photos: photoUrls,
        p_origin: 'public',
        p_requester_id: user?.id || null,
      } as any)

      if (error) throw error

      setSuccess(data?.ticket_number || 'Chamado registrado')
      setForm(EMPTY_FORM)
      setFiles([])
      setErrors({})
      toast.success('Chamado aberto com sucesso!')
    } catch (err: any) {
      setErrorModal(err.message || 'Erro ao enviar solicitação. Tente novamente.')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white relative overflow-hidden font-sans bg-[#1f2937]">
        <BackgroundElements />
        <div className="flex flex-col items-center gap-3 z-10">
          <Loader2 className="h-8 w-8 animate-spin" style={{ color: primaryColor }} />
          <p className="text-sm text-slate-200">Carregando formulário...</p>
        </div>
      </div>
    )
  }

  if (clientError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-slate-900 relative overflow-hidden font-sans bg-[#1f2937]">
        <BackgroundElements />
        <Card className="w-full max-w-md text-center shadow-2xl border-slate-200 bg-white/95 backdrop-blur-sm z-10">
          <CardContent className="pt-12 pb-8 space-y-4">
            <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-2">
              <AlertCircle className="h-8 w-8 text-red-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Atenção</h2>
            <p className="text-slate-500 text-sm">{clientError}</p>
            {user && (
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => navigate(`/m/${slug}/meus-chamados`)}
              >
                Ver meus chamados
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 text-slate-900 relative overflow-hidden font-sans bg-[#1f2937]">
        <BackgroundElements />
        <Card className="w-full max-w-md text-center shadow-2xl overflow-hidden animate-fade-in-up border-slate-200 bg-white/95 backdrop-blur-sm z-10">
          <div className="h-2 w-full" style={{ backgroundColor: primaryColor }} />
          <CardContent className="pt-10 pb-8 space-y-4">
            <div className="mx-auto w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-slate-900">Solicitação registrada!</h2>
            <p className="text-slate-500 text-sm leading-relaxed">
              Sua solicitação de manutenção foi registrada com sucesso e nossa equipe já foi
              notificada. Acompanhe pelo número abaixo.
            </p>
            <div className="bg-slate-100 p-4 rounded-lg">
              <p className="text-xs text-slate-500 mb-1">Número do chamado</p>
              <p className="font-mono text-xl font-bold text-slate-900">{success}</p>
            </div>
            <Button
              className="mt-6 w-full h-11"
              style={{ backgroundColor: primaryColor }}
              onClick={() => setSuccess(null)}
            >
              Abrir Nova Solicitação
            </Button>
            {user && (
              <Button
                variant="outline"
                className="w-full h-11"
                onClick={() => navigate(`/m/${slug}/meus-chamados`)}
              >
                Ver meus chamados
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col text-slate-900 relative overflow-hidden font-sans bg-[#1f2937]">
      <BackgroundElements />
      <header
        className="bg-white/95 backdrop-blur-sm border-b-2 shadow-sm sticky top-0 z-20 relative"
        style={{ borderBottomColor: primaryColor }}
      >
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
          {client?.logo_url ? (
            <img
              src={client.logo_url}
              alt={client.name}
              className="h-11 w-auto object-contain rounded"
            />
          ) : (
            <div
              className="h-11 w-11 rounded-xl flex items-center justify-center shadow-sm"
              style={{ backgroundColor: primaryColor }}
            >
              <Wrench className="h-5 w-5 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight text-slate-900 truncate">
              {client?.name || 'Portal de Manutenção'}
            </h1>
            <p className="text-xs text-slate-500">Portal de Manutenção</p>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto p-4 py-8 animate-fade-in-up z-10 relative">
        <div className="mb-6 text-center">
          <div
            className="inline-flex items-center justify-center w-14 h-14 rounded-2xl mb-3 shadow-sm"
            style={{ backgroundColor: `${primaryColor}30` }}
          >
            <Wrench className="h-7 w-7" style={{ color: primaryColor }} />
          </div>
          <h2 className="text-2xl font-bold text-white">Nova Solicitação</h2>
          <p className="text-sm text-slate-200 mt-1 max-w-md mx-auto">
            Descreva o problema encontrado para que nossa equipe de manutenção possa agir
            rapidamente.
          </p>
        </div>

        <Card className="shadow-2xl border-slate-200 bg-white/95 backdrop-blur-sm overflow-hidden">
          <div className="h-1.5 w-full" style={{ backgroundColor: primaryColor }} />
          <CardContent className="p-6 sm:p-8 space-y-5">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-semibold text-slate-900">
                  <User className="inline-block h-3.5 w-3.5 mr-1" />
                  Nome <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="name"
                  className="bg-white text-slate-900 border-slate-300 h-11 placeholder:text-slate-400"
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value })
                    if (errors.name) setErrors({ ...errors, name: '' })
                  }}
                  placeholder="Como podemos chamá-lo?"
                  maxLength={200}
                  readOnly={!!user}
                  disabled={!!user}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-semibold text-slate-900">
                  <Mail className="inline-block h-3.5 w-3.5 mr-1" />
                  E-mail <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  className="bg-white text-slate-900 border-slate-300 h-11 placeholder:text-slate-400"
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                  placeholder="seu.email@exemplo.com"
                  maxLength={200}
                  readOnly={!!user}
                  disabled={!!user}
                />
                {errors.email && <p className="text-xs text-red-500 mt-1">{errors.email}</p>}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">
                    <Building2 className="inline-block h-3.5 w-3.5 mr-1" />
                    Planta <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.plant_id}
                    onValueChange={(v) => {
                      setForm({
                        ...form,
                        plant_id: v,
                        area_id: '',
                        location_id: '',
                        sublocation_id: '',
                      })
                      if (errors.plant_id) setErrors({ ...errors, plant_id: '' })
                    }}
                    disabled={!plants || plants.length === 0}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 h-11">
                      <SelectValue
                        placeholder={plants?.length ? 'Selecione...' : 'Nenhuma planta disponível'}
                      />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {plants.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.plant_id && (
                    <p className="text-xs text-red-500 mt-1">{errors.plant_id}</p>
                  )}
                  {plants?.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">Nenhuma planta disponível.</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">
                    <MapPin className="inline-block h-3.5 w-3.5 mr-1" />
                    Área <span className="text-red-500">*</span>
                  </Label>
                  <Select
                    value={form.area_id}
                    onValueChange={(v) => {
                      setForm({ ...form, area_id: v })
                      if (errors.area_id) setErrors({ ...errors, area_id: '' })
                    }}
                    disabled={!form.plant_id}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 h-11">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {areas.map((a) => (
                        <SelectItem key={a.id} value={a.id}>
                          {a.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.area_id && <p className="text-xs text-red-500 mt-1">{errors.area_id}</p>}
                  {form.plant_id && areas.length === 0 && (
                    <p className="text-xs text-amber-600 mt-1">
                      Nenhuma área cadastrada para esta planta.
                    </p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">
                    <MapPin className="inline-block h-3.5 w-3.5 mr-1" />
                    Localização (opcional)
                  </Label>
                  <Select
                    value={form.location_id}
                    onValueChange={(v) => {
                      setForm({ ...form, location_id: v, sublocation_id: '' })
                    }}
                    disabled={!form.plant_id || locations.length === 0}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 h-11">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {locations.map((l) => (
                        <SelectItem key={l.id} value={l.id}>
                          {l.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-semibold text-slate-900">
                    <Layers className="inline-block h-3.5 w-3.5 mr-1" />
                    Sublocal (opcional)
                  </Label>
                  <Select
                    value={form.sublocation_id}
                    onValueChange={(v) => {
                      setForm({ ...form, sublocation_id: v })
                    }}
                    disabled={!form.location_id || sublocations.length === 0}
                  >
                    <SelectTrigger className="bg-white text-slate-900 border-slate-300 h-11">
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-white border-slate-200">
                      {sublocations.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-semibold text-slate-900">
                  <FileText className="inline-block h-3.5 w-3.5 mr-1" />
                  Descrição do Problema <span className="text-red-500">*</span>
                </Label>
                <Textarea
                  id="description"
                  rows={5}
                  className="bg-white text-slate-900 border-slate-300 resize-none placeholder:text-slate-400"
                  placeholder="Descreva com detalhes o que está acontecendo (ex: equipamento, local exato, quando começou, etc.)..."
                  value={form.description}
                  onChange={(e) => {
                    setForm({ ...form, description: e.target.value })
                    if (errors.description) setErrors({ ...errors, description: '' })
                  }}
                  maxLength={2000}
                />
                <div className="flex justify-between items-center">
                  {errors.description ? (
                    <p className="text-xs text-red-500">{errors.description}</p>
                  ) : (
                    <span />
                  )}
                  <span className="text-xs text-slate-400">{form.description.length}/2000</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold text-slate-900">
                  <Camera className="inline-block h-3.5 w-3.5 mr-1" />
                  Fotos (opcional)
                </Label>
                <div className="border-2 border-dashed border-slate-300 rounded-xl p-6 text-center hover:border-primary/50 hover:bg-slate-50 transition cursor-pointer relative group">
                  <input
                    type="file"
                    multiple
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    onChange={(e) => handleFileSelect(e.target.files)}
                  />
                  <div className="flex flex-col items-center gap-2">
                    <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center group-hover:bg-slate-200 transition">
                      <ImagePlus className="h-6 w-6 text-slate-500" />
                    </div>
                    <span className="text-sm text-slate-500">Clique para adicionar imagens</span>
                    <span className="text-xs text-slate-400">JPG, PNG, GIF</span>
                  </div>
                </div>
                {files.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {files.map((f, i) => (
                      <div
                        key={i}
                        className="relative group aspect-square rounded-lg overflow-hidden border border-slate-200 bg-slate-100"
                      >
                        <img
                          src={URL.createObjectURL(f)}
                          alt={f.name}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeFile(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition shadow-md hover:bg-red-600"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full text-base h-12 shadow-lg"
                disabled={submitting}
                style={{ backgroundColor: primaryColor }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enviando solicitação...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Solicitação
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-300 mt-6">
          Ao enviar, você concorda em fornecer informações verídicas para tratamento da sua
          solicitação.
        </p>
      </main>

      <Dialog open={!!errorModal} onOpenChange={(open) => !open && setErrorModal(null)}>
        <DialogContent className="bg-white border-slate-200 text-slate-900">
          <DialogHeader>
            <div className="mx-auto w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
              <AlertCircle className="h-7 w-7 text-red-600" />
            </div>
            <DialogTitle className="text-center text-slate-900">
              Erro ao Enviar Solicitação
            </DialogTitle>
            <DialogDescription className="text-center text-base pt-2 text-slate-500">
              {errorModal}
            </DialogDescription>
          </DialogHeader>
          <Button
            onClick={() => setErrorModal(null)}
            className="w-full"
            style={{ backgroundColor: primaryColor }}
          >
            Tentar Novamente
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
