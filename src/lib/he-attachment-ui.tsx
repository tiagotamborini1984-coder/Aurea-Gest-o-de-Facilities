import { useState } from 'react'
import { FileText, Loader2, Download } from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '@/lib/supabase/client'
import { HE_ATTACHMENT_BUCKET } from '@/lib/he-attachment'

/**
 * URL assinada do bucket privado. `download: fileName` força Content-Disposition attachment.
 */
async function getSignedUrl(
  path: string,
  opts: { download?: string | boolean; expiresIn: number },
): Promise<string> {
  const { data, error } = await supabase.storage
    .from(HE_ATTACHMENT_BUCKET)
    .createSignedUrl(path, opts.expiresIn, { download: opts.download })

  if (error || !data?.signedUrl) {
    throw new Error(
      'Não foi possível acessar o anexo: ' + (error?.message || 'URL assinada não gerada'),
    )
  }
  return data.signedUrl
}

/** Abre o anexo em nova aba (visualização inline — PDF/JPEG/PNG; .eml/.msg podem baixar). */
export async function openHeAttachment(path: string): Promise<void> {
  const signedUrl = await getSignedUrl(path, { download: false, expiresIn: 300 })
  window.open(signedUrl, '_blank', 'noopener,noreferrer')
}

/** Baixa o anexo via Blob local (funciona para qualquer tipo, inclusive .eml/.msg). */
export async function downloadHeAttachment(path: string, fileName: string): Promise<void> {
  const signedUrl = await getSignedUrl(path, { download: fileName, expiresIn: 300 })
  const res = await fetch(signedUrl)
  if (!res.ok) throw new Error(`Falha ao baixar o anexo (HTTP ${res.status}).`)
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Rótulo legível do tamanho do anexo. */
export function formatAttachmentSize(size: number | null | undefined): string {
  if (!size) return ''
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(0)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

/** Ícone padrão de anexo (usado na lista e nos diálogos). */
export function AttachmentIcon({ className = 'h-4 w-4' }: { className?: string }) {
  return <FileText className={className} />
}

/** Campos mínimos da solicitação de HE para montar o link do anexo. */
interface HeAttachmentLinkSolicitacao {
  attachment_path?: string | null
  attachment_name?: string | null
  attachment_size?: number | null
}

/**
 * Link do anexo (usado no diálogo de decisão do gestor): abre o arquivo em nova aba
 * ao clicar, com botão separado para baixar. Erros são reportados via toast.
 */
export function HeAttachmentLink({ solicitacao }: { solicitacao: HeAttachmentLinkSolicitacao }) {
  const [busy, setBusy] = useState(false)
  const name = solicitacao.attachment_name || 'anexo'

  const handle = async (mode: 'open' | 'download') => {
    if (!solicitacao.attachment_path || busy) return
    setBusy(true)
    try {
      if (mode === 'open') await openHeAttachment(solicitacao.attachment_path)
      else await downloadHeAttachment(solicitacao.attachment_path, name)
    } catch (err: any) {
      console.error('Erro ao acessar o anexo da HE:', err)
      toast.error(err?.message || 'Não foi possível acessar o anexo da solicitação.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <span className="inline-flex items-center gap-1 flex-wrap">
      <button
        type="button"
        disabled={busy}
        title={`Abrir anexo: ${name}${
          solicitacao.attachment_size
            ? ` (${formatAttachmentSize(solicitacao.attachment_size)})`
            : ''
        }`}
        aria-label={`Abrir anexo ${name}`}
        className="inline-flex items-center gap-1 text-xs font-medium text-brand-vividBlue underline-offset-2 hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-vividBlue disabled:opacity-60"
        onClick={() => handle('open')}
      >
        {busy ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <AttachmentIcon className="h-3.5 w-3.5" />
        )}
        <span className="max-w-[220px] truncate">{name}</span>
      </button>
      <button
        type="button"
        disabled={busy}
        title={`Baixar anexo: ${name}`}
        aria-label={`Baixar anexo ${name}`}
        className="inline-flex items-center text-slate-400 hover:text-brand-vividBlue focus-visible:outline focus-visible:outline-2 focus-visible:outline-brand-vividBlue disabled:opacity-60"
        onClick={() => handle('download')}
      >
        <Download className="h-3.5 w-3.5" />
      </button>
    </span>
  )
}

/**
 * Remove o objeto do bucket privado (best-effort, nunca bloqueia o fluxo).
 * Usado quando a solicitação é excluída ou o anexo é substituído.
 */
export async function removeHeAttachmentObject(
  bucket: string | null,
  path: string | null,
): Promise<void> {
  if (!bucket || !path) return
  try {
    await supabase.storage.from(bucket).remove([path])
  } catch (err) {
    console.warn('Não foi possível remover o objeto do anexo de HE:', err)
  }
}
