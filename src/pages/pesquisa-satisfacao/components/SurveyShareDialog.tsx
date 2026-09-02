import { useState, useMemo } from 'react'
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
import { Copy, Check, QrCode, ExternalLink, Download, Tablet } from 'lucide-react'
import { toast } from 'sonner'

interface SurveyShareDialogProps {
  survey: SatisfactionSurvey | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function SurveyShareDialog({ survey, open, onOpenChange }: SurveyShareDialogProps) {
  const [copied, setCopied] = useState(false)

  const publicUrl = useMemo(() => {
    if (!survey) return ''
    const origin = window.location.origin
    return `${origin}/p/${survey.id}`
  }, [survey])

  // Gerador de QR Code vetorial usando a API de QR padrão
  const qrCodeImageUrl = useMemo(() => {
    if (!publicUrl) return ''
    return `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(
      publicUrl,
    )}&margin=10&format=png`
  }, [publicUrl])

  const handleCopy = () => {
    if (!publicUrl) return
    navigator.clipboard.writeText(publicUrl)
    setCopied(true)
    toast.success('Link copiado para a área de transferência!')
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadQR = () => {
    if (!qrCodeImageUrl || !survey) return
    const link = document.createElement('a')
    link.href = qrCodeImageUrl
    link.download = `qrcode-pesquisa-${survey.title.toLowerCase().replace(/\s+/g, '-')}.png`
    link.target = '_blank'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    toast.success('Iniciando download do QR Code.')
  }

  if (!survey) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary">
            <QrCode className="h-5 w-5" />
            <DialogTitle>Disponibilizar Pesquisa</DialogTitle>
          </div>
          <DialogDescription>
            Use o QR Code ou link direto para totens, tablets e cartazes impressos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Cartão de Detalhes */}
          <div className="bg-slate-50 dark:bg-slate-900 border rounded-lg p-3 text-sm space-y-1">
            <p className="font-semibold text-foreground">{survey.title}</p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded font-medium">
                {survey.survey_type}
              </span>
              {survey.plants?.name && <span>• {survey.plants.name}</span>}
              {survey.location_name && <span>• {survey.location_name}</span>}
            </div>
          </div>

          {/* QR Code Preview */}
          <div className="flex flex-col items-center justify-center p-4 bg-white dark:bg-slate-950 border rounded-xl shadow-inner">
            <div className="relative p-2 bg-white rounded-lg border shadow-sm">
              <img
                src={qrCodeImageUrl}
                alt="QR Code da Pesquisa"
                className="w-48 h-48 object-contain"
                loading="lazy"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
              <Tablet className="h-3.5 w-3.5 text-blue-500" />
              Aponte a câmera do celular ou abra no tablet do totem
            </p>
          </div>

          {/* Link Copiável */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Link de Acesso Público
            </label>
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
                onClick={handleCopy}
                className="shrink-0"
                title="Copiar link"
              >
                {copied ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          {/* Ações */}
          <div className="grid grid-cols-2 gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadQR}
              className="w-full flex items-center justify-center gap-1.5 text-xs"
            >
              <Download className="h-4 w-4" />
              Baixar Imagem QR
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
