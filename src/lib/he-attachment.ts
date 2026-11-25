/**
 * Anexo de solicitação de Horas Extras — Supabase Storage (bucket PRIVADO).
 *
 * Bucket: "he-solicitacoes-attachments" (criado na migração 20261123160000, sem acesso anônimo).
 * Caminho: {client_id}/{solicitacao_id}/{timestamp}-{nome-do-arquivo}
 * Acesso: apenas por Signed URL de curta duração, concedida a usuários autenticados
 * que podem ver a solicitação (mesma empresa/tenant — ver policies de storage na migração).
 *
 * Formatos aceitos: PDF, e-mail (.eml/.msg), JPEG e PNG — máximo 10 MB.
 */

import { supabase } from '@/lib/supabase/client'

export const HE_ATTACHMENT_BUCKET = 'he-solicitacoes-attachments'

/** Tamanho máximo do anexo (10 MB) */
export const HE_ATTACHMENT_MAX_SIZE = 10 * 1024 * 1024

/** Aceitos no <input type="file">: PDF, .eml, .msg, JPEG e PNG */
export const HE_ATTACHMENT_ACCEPT = '.pdf,.eml,.msg,.jpeg,.jpg,.png'

export const HE_ATTACHMENT_LABEL =
  'Formatos aceitos: PDF, e-mail (.eml/.msg), JPEG e PNG. Tamanho máximo: 10 MB.'

const HE_ATTACHMENT_EXTENSIONS = ['pdf', 'eml', 'msg', 'jpeg', 'jpg', 'png']

export interface HeAttachmentMeta {
  bucket: string
  path: string
  name: string
  size: number
  contentType: string | null
}

/** Valida extensão e tamanho do arquivo; devolve mensagem de erro amigável ou null. */
export function validateHeAttachment(file: File): string | null {
  const ext = (file.name.split('.').pop() || '').toLowerCase()
  if (!HE_ATTACHMENT_EXTENSIONS.includes(ext)) {
    return 'Formato não suportado. Aceitos: PDF, e-mail (.eml/.msg), JPEG e PNG.'
  }
  if (file.size > HE_ATTACHMENT_MAX_SIZE) {
    return 'Arquivo muito grande. O tamanho máximo permitido é 10 MB.'
  }
  return null
}

/**
 * Envia o arquivo ao bucket privado: `{client_id}/{solicitacao_id}/{timestamp}-{nome}`.
 * `upsert: false` evita sobrescrever anexo em caso de colisão de caminho.
 */
export async function uploadHeAttachment(
  clientId: string,
  solicitacaoId: string,
  file: File,
): Promise<HeAttachmentMeta> {
  const validationError = validateHeAttachment(file)
  if (validationError) throw new Error(validationError)

  const safeName = file.name.replace(/[^\w.\-() ]+/g, '_').slice(-120) || 'anexo'
  const path = `${clientId}/${solicitacaoId}/${Date.now()}-${safeName}`

  const { error } = await supabase.storage.from(HE_ATTACHMENT_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type || undefined,
  })

  if (error) {
    if (file.size > HE_ATTACHMENT_MAX_SIZE || /exceeded|too large|payload/i.test(error.message)) {
      throw new Error('Arquivo muito grande. O tamanho máximo permitido é 10 MB.')
    }
    throw new Error('Não foi possível enviar o anexo: ' + error.message)
  }

  return {
    bucket: HE_ATTACHMENT_BUCKET,
    path,
    name: file.name,
    size: file.size,
    contentType: file.type || null,
  }
}

/** Monta o objeto de colunas de anexo para gravar/atualizar na linha da solicitação. */
export function heAttachmentColumns(meta: HeAttachmentMeta) {
  return {
    attachment_bucket: meta.bucket,
    attachment_path: meta.path,
    attachment_name: meta.name,
    attachment_size: meta.size,
    attachment_content_type: meta.contentType,
  }
}
