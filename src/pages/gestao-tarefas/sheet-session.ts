/**
 * Estado de sessão da subjanela de detalhes (Gestão de Tarefas) + telemetria
 * de fechamento fantasma.
 *
 * Duas chaves em sessionStorage:
 *  - `aurea_gestao_tarefas:open_task`  — id da tarefa com detalhes abertos.
 *  - `aurea_gestao_tarefas:open_audit` — qual passo do wizard de auditoria
 *    estava aberto dentro dos detalhes (JSON { taskId, wizardStep }).
 *
 * Regra central (v0.0.1888): as chaves SÓ são limpas em fechamento LEGÍTIMO
 * (botão X, Esc, clique fora real, envio/exclusão da auditoria). Fechamento
 * sem interação recente do usuário é tratado como fantasma (retorno de
 * Alt+Tab / restauração de foco do navegador): as chaves permanecem para o
 * restaurador do PainelChamados reabrir tarefa + wizard exatamente como
 * estavam.
 *
 * Telemetria: cada fechamento (e cada reabertura automática) registra um
 * evento estruturado em console.error e num anel de 30 eventos em
 * localStorage (`aurea_diag:task_sheet_close`), consultável pela próxima
 * rodada se o sintoma persistir.
 */

const OPEN_TASK_KEY = 'aurea_gestao_tarefas:open_task'
const OPEN_AUDIT_KEY = 'aurea_gestao_tarefas:open_audit'
const DIAG_KEY = 'aurea_diag:task_sheet_close'

/** Fechamento cujo último pointerdown/keydown foi há mais que isto é fantasma. */
export const GHOST_CLOSE_MS = 1500

// ---- Rastreio de interação real do usuário -------------------------------

let lastUserInteractionAt = 0
let interactionListenerInstalled = false

function installInteractionListener(): void {
  if (interactionListenerInstalled || typeof window === 'undefined') return
  interactionListenerInstalled = true
  const mark = () => {
    lastUserInteractionAt = Date.now()
  }
  // Captura: marca antes de qualquer handler que possa parar a propagação.
  window.addEventListener('pointerdown', mark, true)
  window.addEventListener('keydown', mark, true)
}

/** ms desde a última interação real (pointerdown/keydown); null se nenhuma. */
export function msSinceLastUserInteraction(): number | null {
  installInteractionListener()
  if (!lastUserInteractionAt) return null
  return Date.now() - lastUserInteractionAt
}

/** Indica se o fechamento atual parece ter vindo de interação do usuário. */
export function closeLooksLegit(): boolean {
  const since = msSinceLastUserInteraction()
  return since !== null && since < GHOST_CLOSE_MS
}

// ---- Chaves de sessão -----------------------------------------------------

export function saveOpenTaskId(taskId: string | number): void {
  try {
    window.sessionStorage.setItem(OPEN_TASK_KEY, String(taskId))
  } catch {
    // sessionStorage indisponível: sem persistência, sem quebra.
  }
}

export function getOpenTaskId(): string | null {
  try {
    return window.sessionStorage.getItem(OPEN_TASK_KEY)
  } catch {
    return null
  }
}

export function saveOpenAuditStep(taskId: string | number, wizardStep: number): void {
  try {
    window.sessionStorage.setItem(
      OPEN_AUDIT_KEY,
      JSON.stringify({ taskId: String(taskId), wizardStep }),
    )
  } catch {
    // ignore
  }
}

/** Passo do wizard salvo para ESTA tarefa; null se não houver (ou for de outra). */
export function getOpenAuditStep(taskId: string | number | undefined | null): number | null {
  if (!taskId) return null
  try {
    const raw = window.sessionStorage.getItem(OPEN_AUDIT_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && parsed.taskId === String(taskId)) {
      const step = parsed.wizardStep
      if (typeof step === 'number' && Number.isFinite(step) && step >= 0) return step
    }
    return null
  } catch {
    return null
  }
}

/** Remove o passo salvo apenas se for da tarefa indicada. */
export function clearOpenAuditIfTask(taskId: string | number | undefined | null): void {
  if (!taskId) return
  try {
    if (getOpenAuditStep(taskId) !== null) {
      window.sessionStorage.removeItem(OPEN_AUDIT_KEY)
    }
  } catch {
    // ignore
  }
}

/** Fecha a sessão por completo (fechamento legítimo / consumo do fluxo). */
export function clearOpenTaskSession(): void {
  try {
    window.sessionStorage.removeItem(OPEN_TASK_KEY)
    window.sessionStorage.removeItem(OPEN_AUDIT_KEY)
  } catch {
    // ignore
  }
}

// ---- Telemetria de fechamento ---------------------------------------------

export type SheetCloseDiag = {
  /** Onde o fechamento foi observado (onOpenChange, pointerdown_outside, ...). */
  trigger: string
  /** O que foi feito (ignored_ghost_close, closed_legit, dismiss_allowed, auto_restore...). */
  action: string
  /** ms desde a última interação real; null se nunca houve. */
  sinceInteractionMs?: number | null
  taskId?: string | number | null
  wizardStep?: number | null
  documentHidden?: boolean
  isTrusted?: boolean | null
  at?: string
}

const DIAG_RING_SIZE = 30

/** Registra o evento em console.error (estruturado) e no anel em localStorage. */
export function logSheetCloseDiag(entry: SheetCloseDiag): void {
  const record: SheetCloseDiag = { ...entry, at: new Date().toISOString() }
  try {
    // console.error para destacar na aba de console (não chega aos logs do
    // servidor — o anel em localStorage abaixo é a fonte consultável).
    console.error('[aurea-diag][task-sheet-close]', JSON.stringify(record))
  } catch {
    // ignore
  }
  try {
    const raw = window.localStorage.getItem(DIAG_KEY)
    const list = raw ? JSON.parse(raw) : []
    if (Array.isArray(list)) {
      list.push(record)
      window.localStorage.setItem(DIAG_KEY, JSON.stringify(list.slice(-DIAG_RING_SIZE)))
    }
  } catch {
    // localStorage indisponível: telemetria best-effort, nunca quebra a tela.
  }
}

/** Lê o anel de eventos (para diagnóstico em rodadas futuras). */
export function readSheetCloseDiag(): SheetCloseDiag[] {
  try {
    const raw = window.localStorage.getItem(DIAG_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}
