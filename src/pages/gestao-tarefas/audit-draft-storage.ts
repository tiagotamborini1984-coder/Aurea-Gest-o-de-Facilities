/**
 * Rascunho de auditoria — Gestão de Tarefas.
 *
 * O usuário preenche a auditoria, sai da aba para buscar as fotos e, quando o
 * navegador descarta/recarrega a aba (economia de memória, mobile), o estado em
 * memória do formulário morre. Este módulo persiste o rascunho em localStorage
 * conforme o usuário digita (por tarefa), e o TaskDetailsSheet o restaura ao
 * reabrir a tarefa.
 *
 * Chave por tarefa: `aurea_audit_draft:<task_id>`. O rascunho é limpo quando a
 * auditoria é enviada (Finalizado) ou quando não há mais nenhum campo preenchido.
 */

const PREFIX = 'aurea_audit_draft:'

export type AuditDraft = {
  /** Página atual do wizard (0 = tela de data/participantes; -1 = fechado). */
  wizardStep: number
  /** Respostas por action_id (score, observations, evidence_url, ...). */
  answers: Record<string, any>
  /** Data de realização digitada na tela inicial do wizard. */
  realizationDate: string
  /** Participantes (texto livre) digitados na tela inicial do wizard. */
  participants: string
  /** Rascunho do comentário da timeline (rodapé do sheet). */
  comment: string
  /** Timestamp do último save (informativo). */
  savedAt: number
}

function safeParse(raw: string | null): Record<string, any> | null {
  if (!raw) return null
  try {
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null
    return parsed
  } catch {
    return null
  }
}

/** Indica se o rascunho tem algum conteúdo que valha a pena restaurar. */
export function hasDraftContent(draft: Record<string, any> | null | undefined): boolean {
  if (!draft) return false
  const answers = draft.answers
  const hasAnswers =
    !!answers &&
    typeof answers === 'object' &&
    Object.values(answers).some(
      (a: any) => a && typeof a === 'object' && (a.score || a.observations || a.evidence_url),
    )
  return Boolean(
    (typeof draft.wizardStep === 'number' && draft.wizardStep >= 0) ||
    hasAnswers ||
    draft.realizationDate ||
    draft.participants ||
    draft.comment,
  )
}

export function loadAuditDraft(taskId: string | number | undefined | null): AuditDraft | null {
  if (!taskId || typeof window === 'undefined' || !window.localStorage) return null
  try {
    const raw = window.localStorage.getItem(`${PREFIX}${taskId}`)
    const draft = safeParse(raw)
    if (!draft || !hasDraftContent(draft)) {
      if (raw) clearAuditDraft(taskId)
      return null
    }
    return {
      wizardStep:
        typeof draft.wizardStep === 'number' && Number.isFinite(draft.wizardStep)
          ? draft.wizardStep
          : -1,
      answers: draft.answers && typeof draft.answers === 'object' ? draft.answers : {},
      realizationDate: typeof draft.realizationDate === 'string' ? draft.realizationDate : '',
      participants: typeof draft.participants === 'string' ? draft.participants : '',
      comment: typeof draft.comment === 'string' ? draft.comment : '',
      savedAt: typeof draft.savedAt === 'number' ? draft.savedAt : 0,
    }
  } catch {
    return null
  }
}

export function saveAuditDraft(
  taskId: string | number | undefined | null,
  draft: Omit<AuditDraft, 'savedAt'>,
): void {
  if (!taskId || typeof window === 'undefined' || !window.localStorage) return
  try {
    const payload: AuditDraft = { ...draft, savedAt: Date.now() }
    if (!hasDraftContent(payload)) {
      clearAuditDraft(taskId)
      return
    }
    window.localStorage.setItem(`${PREFIX}${taskId}`, JSON.stringify(payload))
  } catch {
    // localStorage indisponível/cheio: rascunho vira best-effort, nunca quebra a tela.
  }
}

export function clearAuditDraft(taskId: string | number | undefined | null): void {
  if (!taskId || typeof window === 'undefined' || !window.localStorage) return
  try {
    window.localStorage.removeItem(`${PREFIX}${taskId}`)
  } catch {
    // ignore
  }
}
