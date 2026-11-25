import { FileText } from 'lucide-react'
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
