import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { ShieldCheck, ShieldQuestion, ShieldX, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { HoverCard, HoverCardContent, HoverCardTrigger } from '@/components/ui/hover-card'
import { verifyTrainingPresence } from '@/lib/training-verification'

const CFG: Record<string, { label: string; icon: any; className: string }> = {
  verified: {
    label: 'IA: conferido',
    icon: ShieldCheck,
    className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  rejected: {
    label: 'IA: não conferido',
    icon: ShieldX,
    className: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  failed: {
    label: 'IA: indisponível',
    icon: ShieldQuestion,
    className: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  pending: {
    label: 'IA: aguardando',
    icon: ShieldQuestion,
    className: 'bg-slate-50 text-slate-600 border-slate-200',
  },
}

export function VerificationBadge({
  status,
  notes,
  signedName,
  recordId,
}: {
  status?: string | null
  notes?: string | null
  signedName?: string | null
  recordId?: string | null
}) {
  const [verifying, setVerifying] = useState(false)

  if (!status) return null
  const cfg = CFG[status]
  if (!cfg) return null
  const Icon = cfg.icon

  const handleReverify = async () => {
    if (!recordId || verifying) return
    setVerifying(true)
    await verifyTrainingPresence(recordId)
    setVerifying(false)
    window.location.reload()
  }

  const badge = (
    <Badge
      variant="outline"
      onClick={recordId ? handleReverify : undefined}
      className={cn(
        'text-[10px] px-1.5 h-4.5 gap-1 font-medium whitespace-nowrap',
        cfg.className,
        recordId && !verifying && 'cursor-pointer hover:opacity-80',
      )}
    >
      {verifying ? (
        <Loader2 className="w-3 h-3 shrink-0 animate-spin" />
      ) : (
        <Icon className="w-3 h-3 shrink-0" />
      )}
      {verifying ? 'IA: verificando…' : cfg.label}
    </Badge>
  )

  if (!notes && !signedName && !recordId) return badge

  return (
    <HoverCard>
      <HoverCardTrigger asChild>
        <div className="inline-flex cursor-default">{badge}</div>
      </HoverCardTrigger>
      <HoverCardContent className="w-72 text-xs">
        <p className="font-semibold mb-1">Conferência da lista de presença (IA)</p>
        {signedName && (
          <p className="mb-1">
            <span className="text-muted-foreground">Assinatura:</span> {signedName}
          </p>
        )}
        {notes && <p className="text-muted-foreground">{notes}</p>}
        {recordId && (
          <p className="mt-1 text-[10px] text-muted-foreground">
            Clique no selo para verificar novamente.
          </p>
        )}
      </HoverCardContent>
    </HoverCard>
  )
}
