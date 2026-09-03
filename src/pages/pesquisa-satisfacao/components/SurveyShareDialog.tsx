import { useState, useMemo, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { SatisfactionSurvey } from '@/types/satisfaction-surveys'
import { Copy, Check, QrCode, ExternalLink, Download, Tablet, Building2, Globe } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'

// Utilitário para gerar slug amigável da planta
export function getPlantSlug(plant: { name: string; code?: string | null }): string {
  if (plant.code && plant.code.trim()) {
    return plant.code.trim().toLowerCase()
  }
  return plant.name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

interface PlantOption {
  id: string
  name: string
  code?: string | null
  client_id?: string
}

interface SurveyShareDialogProps {
  survey: SatisfactionSurvey | null
  open: boolean
  onOpenChange: (open: boolean) => void
  plants?: PlantOption[]
}

export function SurveyShareDialog({
  survey,
  open,
  onOpenChange,
  plants: externalPlants,
}: SurveyShareDialogProps) {
  const [copiedKey, setCopiedKey] = useState<string | null>(null)
  const [clientPlants, setClientPlants] = useState<PlantOption[]>([])
  // 'default' = link padrão (sem parâmetro) ou id de uma planta específica
  const [selectedTarget, setSelectedTarget] = useState<string>('default')

  // Carregar plantas do cliente caso não tenham sido passadas externamente
  useEffect(() => {
    if (!open || !survey) return

    if (externalPlants && externalPlants.length > 0) {
      setClientPlants(externalPlants)
      return
    }

    const fetchPlants = async () => {
      let q = supabase.from('plants').select('id, name, code, client_id').order('name')
      if (survey.client_id) {
        q = q.eq('client_id', survey.client_id)
      }
      const { data } = await q
      if (data) {
        setClientPlants(data)
      }
    }

    fetchPlants()
  }, [open, survey, externalPlants])

  // Resetar target ao abrir ou ao trocar de survey
  useEffect(() => {
    if (open && survey) {
      // Se a pesquisa já estiver vinculada a uma planta específica, podemos sugerir ela ou manter padrão
      if (survey.plant_id) {
        setSelectedTarget(survey.plant_id)
      } else {
        setSelectedTarget('default')
      }
    }
  }, [open, survey])

  const currentPlant = useMemo(() => {
    if (selectedTarget === 'default') return null
    return clientPlants.find((p) => p.id === selectedTarget) || null
  }, [selectedTarget, clientPlants])

  const publicUrl = useMemo(() => {
    if (!survey) return ''
    const origin = window.location.origin
    const baseUrl = `${origin}/p/${survey.id}`

    if (selectedTarget === 'default' || !currentPlant) {
      return baseUrl
    }

    const slug = getPlantSlug(currentPlant)
    return `${baseUrl}?planta=${encodeURIComponent(slug)}`
  }, [survey, selectedTarget, currentPlant])

  // Gerador de QR Code
  const qrCodeImageUrl = useMemo(() => {
    if (!publicUrl) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      publicUrl,
    )}&margin=10&format=png`
  }, [publicUrl])

  const handleCopy = (url: string, key: string) => {
    if (!url) return
    navigator.clipboard.writeText(url)
    setCopiedKey(key)
    toast.success('Link copiado para a área de transferência!')
    setTimeout(() => setCopiedKey(null), 2000)
  }

  const handleDownloadQR = () => {
    if (!qrCodeImageUrl || !survey) return
    const plantSuffix = currentPlant ? `-${getPlantSlug(currentPlant)}` : '-padrao'
    const link = document.createElement('a')
    link.href = qrCodeImageUrl
    link.download = `qrcode-pesquisa-${survey.title.toLowerCase().replace(/\s+/g, '-')}${plantSuffix}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Iniciando download do QR Code.')
  }

  if (!survey) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <QrCode className="h-5 w-5" />
            <DialogTitle>Disponibilizar Pesquisa</DialogTitle>
          </div>
          <DialogDescription>
            Gere links e QR Codes identificados por planta para totens, tablets e cartazes
            impressos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cartão de Detalhes da Pesquisa */}
          <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">{survey.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                {survey.survey_type}
              </span>
              {survey.plants?.name ? (
                <span className="flex items-center gap-1">
                  • <Building2 className="h-3 w-3" /> Planta padrão: {survey.plants.name}
                </span>
              ) : (
                <span className="flex items-center gap-1">
                  • <Globe className="h-3 w-3" /> Pesquisa Global (Todas as plantas)
                </span>
              )}
              {survey.location_name && <span>• {survey.location_name}</span>}
            </div>
          </div>

          {/* Seleção de Destino / Planta */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Selecione o Link / QR Code por Planta
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto p-1 border rounded-lg bg-slate-50/50 dark:bg-slate-900/50">
              {/* Opção Padrão (Sem Planta) */}
              <button
                type="button"
                onClick={() => setSelectedTarget('default')}
                className={`text-left p-2.5 rounded-md border text-xs transition-colors flex items-center justify-between ${
                  selectedTarget === 'default'
                    ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 font-semibold text-blue-900 dark:text-blue-100 shadow-sm'
                    : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-foreground'
                }`}
              >
                <div className="min-w-0 pr-1">
                  <div className="flex items-center gap-1.5">
                    <Globe className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
                    <span className="truncate">Padrão (Sem Planta)</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    {survey.plants?.name ? `Usa planta ${survey.plants.name}` : 'Sem identificação'}
                  </p>
                </div>
                {selectedTarget === 'default' && (
                  <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                )}
              </button>

              {/* Opções para cada Planta do cliente */}
              {clientPlants.map((plant) => {
                const isSelected = selectedTarget === plant.id
                const slug = getPlantSlug(plant)
                return (
                  <button
                    key={plant.id}
                    type="button"
                    onClick={() => setSelectedTarget(plant.id)}
                    className={`text-left p-2.5 rounded-md border text-xs transition-colors flex items-center justify-between ${
                      isSelected
                        ? 'bg-blue-50 dark:bg-blue-950/80 border-blue-500 font-semibold text-blue-900 dark:text-blue-100 shadow-sm'
                        : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700/50 text-foreground'
                    }`}
                  >
                    <div className="min-w-0 pr-1">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5 text-slate-500 shrink-0" />
                        <span className="truncate">{plant.name}</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground font-mono mt-0.5">
                        ?planta={slug}
                      </p>
                    </div>
                    {isSelected && <Check className="h-3.5 w-3.5 text-blue-600 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 border rounded-xl shadow-inner">
            <div className="relative p-2 bg-white rounded-lg border shadow-sm">
              <img
                src={qrCodeImageUrl}
                alt="QR Code da Pesquisa"
                className="w-44 h-44 object-contain"
                loading="lazy"
              />
            </div>
            <div className="text-center mt-2.5 space-y-0.5">
              <p className="text-xs font-semibold text-foreground flex items-center justify-center gap-1.5">
                <Tablet className="h-3.5 w-3.5 text-blue-500" />
                {currentPlant ? (
                  <span>
                    QR Code vinculado à planta: <strong>{currentPlant.name}</strong>
                  </span>
                ) : (
                  <span>QR Code padrão (sem identificação de planta)</span>
                )}
              </p>
              <p className="text-[11px] text-muted-foreground">
                As respostas registradas neste QR serão atribuídas a esta planta no dashboard.
              </p>
            </div>
          </div>

          {/* Link Copiável */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Link de Acesso Público
              </label>
              {currentPlant && (
                <span className="text-[11px] font-mono text-blue-600 dark:text-blue-400">
                  ?planta={getPlantSlug(currentPlant)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Input
                readOnly
                value={publicUrl}
                className="font-mono text-xs bg-slate-50 dark:bg-slate-900"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={() => handleCopy(publicUrl, 'main')}
                className="shrink-0"
                title="Copiar link"
              >
                {copiedKey === 'main' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-1.5 text-xs"
            >
              <Download className="h-4 w-4" />
              Baixar QR Code {currentPlant ? `(${currentPlant.code || 'Planta'})` : ''}
            </Button>
            <Button
              type="button"
              variant="default"
              size="sm"
              asChild
              className="w-full flex items-center justify-center gap-1.5 text-xs bg-brand-deepBlue hover:bg-brand-vividBlue"
            >
              <a href={publicUrl} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Testar Formulário
              </a>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
