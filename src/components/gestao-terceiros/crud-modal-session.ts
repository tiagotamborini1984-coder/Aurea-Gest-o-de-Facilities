import { useEffect, useRef } from 'react'

/**
 * Estado de sessão da janela de cadastro (CrudGeneric) — mesmo espírito do
 * `sheet-session.ts` do PainelChamados, sem tocá-lo.
 *
 * Duas peças:
 *  1. Utilitários de sessionStorage: rascunho do formulário + classificação
 *     legítimo/fantasma do fechamento + telemetria de diagnóstico.
 *  2. Hook `useCrudModalSession` com o wiring completo (efeitos, refs,
 *     restauração), para o CrudGeneric crescer o mínimo.
 *
 * Regra central (v0.0.1893): o rascunho SÓ é limpo em fechamento LEGÍTIMO
 * (clique fora real, Cancelar/X, ESC, envio bem-sucedido). Fechamento sem
 * interação recente do usuário é fantasma (retorno de Alt+Tab — o navegador
 * devolve o foco ao botão "Novo registro", fora do modal, e o Radix fecha a
 * janela como "clique fora"): o rascunho permanece e a janela reabre sozinha
 * no mesmo estado no retorno de foco/visibilidade (ou na remontagem da tela).
 *
 * Telemetria: cada fechamento/reabertura registra um evento estruturado em
 * console.error e num anel de 30 eventos em localStorage
 * (`aurea_diag:crud_modal_close`), consultável pela próxima rodada se o
 * sintoma persistir.
 */

const DRAFT_KEY_PREFIX = 'aurea_crud_modal:draft:'
const DIAG_KEY = 'aurea_diag:crud_modal_close'

/** Fechamento cujo último pointerdown/keydown foi há mais que isto é fantasma. */
export const GHOST_CLOSE_MS = 1500

// ---- Rastreio de interação real do usuário -------------------------------

let lastUserInteractionAt = 0
let lastFocusReturnAt = 0
let interactionListenerInstalled = false

function installInteractionListener(): void {
  if (interactionListenerInstalled || typeof window === 'undefined') return
  interactionListenerInstalled = true
  const mark = () => {
    lastUserInteractionAt = Date.now()
  }
  const markFocusReturn = () => {
    lastFocusReturnAt = Date.now()
  }
  const markVisibility = () => {
    if (!document.hidden) lastFocusReturnAt = Date.now()
  }
  // Captura: marca antes de qualquer handler que possa parar a propagação.
  window.addEventListener('pointerdown', mark, true)
  window.addEventListener('keydown', mark, true)
  // Retorno de foco/visibilidade da aba (Alt+Tab, volta de outro sistema):
  // interação anterior a este instante não conta como "recente" — o usuário
  // pode ter digitado até 1s antes de sair e o fechamento ao voltar segue
  // sendo fantasma (mesma semântica do sheet-session do PainelChamados).
  window.addEventListener('focus', markFocusReturn)
  document.addEventListener('visibilitychange', markVisibility)
}

// Instala CEDO (na importação do módulo, antes de qualquer fechamento): o
// timestamp do retorno de foco precisa existir ANTES do fechamento fantasma
// acontecer.
try {
  installInteractionListener()
} catch {
  // ambiente sem window: sem rastreio, sem quebra.
}

/** ms desde a última interação real (pointerdown/keydown); null se nenhuma. */
export function msSinceLastUserInteraction(): number | null {
  installInteractionListener()
  if (!lastUserInteractionAt) return null
  return Date.now() - lastUserInteractionAt
}

/**
 * Indica se o fechamento atual parece ter vindo de interação do usuário.
 *
 * Legítimo só quando a ÚLTIMA interação é recente E aconteceu DEPOIS do último
 * retorno de foco da aba: se o usuário digitou e saiu da janela, a interação
 * ficou para trás do retorno — fechar logo ao voltar é fantasma, mesmo com a
 * interação a menos de GHOST_CLOSE_MS.
 */
export function closeLooksLegit(): boolean {
  const since = msSinceLastUserInteraction()
  if (since === null || since >= GHOST_CLOSE_MS) return false
  if (lastFocusReturnAt > 0 && lastUserInteractionAt <= lastFocusReturnAt) return false
  return true
}

// ---- Rascunho em sessionStorage -------------------------------------------

export type CrudModalDraft = {
  form: any
  editing: boolean
  editingId?: string | number | null
}

export function saveOpenModalDraft(crudId: string, draft: CrudModalDraft): void {
  try {
    window.sessionStorage.setItem(DRAFT_KEY_PREFIX + crudId, JSON.stringify(draft))
  } catch {
    // sessionStorage indisponível (ou valor não serializável): sem
    // persistência, sem quebra — a janela funciona como antes.
  }
}

export function getOpenModalDraft(crudId: string): CrudModalDraft | null {
  try {
    const raw = window.sessionStorage.getItem(DRAFT_KEY_PREFIX + crudId)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (parsed && typeof parsed === 'object' && parsed.form) return parsed as CrudModalDraft
    return null
  } catch {
    return null
  }
}

/** Remove o rascunho — APENAS fechamento legítimo / consumo do fluxo. */
export function clearOpenModalDraft(crudId: string): void {
  try {
    window.sessionStorage.removeItem(DRAFT_KEY_PREFIX + crudId)
  } catch {
    // ignore
  }
}

// ---- Telemetria de fechamento ---------------------------------------------

export type CrudCloseDiag = {
  /** Onde o fechamento foi observado (on_open_change, focus_restore, ...). */
  trigger: string
  /** O que foi feito (ignored_ghost_close, closed_legit, auto_restore_modal...). */
  action: string
  /** ms desde a última interação real; null se nunca houve. */
  sinceInteractionMs?: number | null
  crudId?: string | null
  documentHidden?: boolean
  at?: string
}

const DIAG_RING_SIZE = 30

/** Registra o evento em console.error (estruturado) e no anel em localStorage. */
export function logCrudCloseDiag(entry: CrudCloseDiag): void {
  const record: CrudCloseDiag = {
    ...entry,
    sinceInteractionMs: msSinceLastUserInteraction(),
    at: new Date().toISOString(),
  }
  try {
    // console.error para destacar na aba de console; o anel em localStorage
    // abaixo é a fonte consultável em rodadas futuras.
    console.error('[aurea-diag][crud-modal-close]', JSON.stringify(record))
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
export function readCrudCloseDiag(): CrudCloseDiag[] {
  try {
    const raw = window.localStorage.getItem(DIAG_KEY)
    const list = raw ? JSON.parse(raw) : []
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

// ---- Hook com o wiring completo -------------------------------------------

export function useCrudModalSession(opts: {
  /** Identificador estável do CRUD (crudId || tableName || useId). */
  crudId: string
  isModalOpen: boolean
  form: any
  setForm: (updater: any) => void
  editingItem: any
  setEditingItem: (v: any) => void
  setFormErrors: (e: Record<string, boolean>) => void
  setIsModalOpen: (v: boolean) => void
  /** Lista atual — para reconstruir o item em edição na restauração. */
  data: any[]
}): {
  /** Abre a janela (reset apenas dos erros — o estado vem de openAdd/openEdit). */
  openModal: () => void
  /** Fechamento LEGÍTIMO (clique fora real, Cancelar/X, ESC, envio ok): limpa o rascunho. */
  closeLegit: () => void
  /** Fechamento FANTASMA (retorno de Alt+Tab sem interação): mantém o rascunho. */
  closeGhost: () => void
} {
  const {
    crudId,
    isModalOpen,
    form,
    setForm,
    editingItem,
    setEditingItem,
    setFormErrors,
    setIsModalOpen,
    data,
  } = opts

  const formRef = useRef<any>(form)
  useEffect(() => {
    formRef.current = form
  }, [form])
  const editingItemRef = useRef<any>(editingItem)
  useEffect(() => {
    editingItemRef.current = editingItem
  }, [editingItem])

  // Rascunho persiste a cada mudança do formulário enquanto a janela está
  // aberta; quem limpa é APENAS o fechamento legítimo (closeLegit).
  useEffect(() => {
    if (!isModalOpen) return
    saveOpenModalDraft(crudId, {
      form: formRef.current,
      editing: !!editingItemRef.current,
      editingId: editingItemRef.current?.id ?? null,
    })
  }, [form, isModalOpen, crudId])

  const openModal = () => {
    setFormErrors({})
    setIsModalOpen(true)
  }

  const restoreRef = useRef(() => {})

  // Fechamento legítimo (clique fora real, Cancelar/X, ESC, envio ok):
  // limpa o rascunho — próxima abertura começa vazia.
  const closeLegit = () => {
    logCrudCloseDiag({ trigger: 'on_open_change', action: 'closed_legit', crudId })
    clearOpenModalDraft(crudId)
    setIsModalOpen(false)
  }

  // Fechamento FANTASMA (retorno de Alt+Tab sem interação): mantém o rascunho
  // e deixa o restaurador reabrir. Se o Radix fechou AGORA (o evento focus do
  // retorno já passou), agenda o restaurador para o próximo tick — a janela
  // reabre sozinha no mesmo estado, sem nova interação do usuário.
  const closeGhost = () => {
    logCrudCloseDiag({ trigger: 'on_open_change', action: 'ignored_ghost_close', crudId })
    setTimeout(() => restoreRef.current(), 0)
  }

  // Redundância garantida contra o retorno do Alt+Tab: ao voltar o foco ou a
  // visibilidade da aba, se o rascunho existe e a janela NÃO está aberta,
  // reabre com o estado preservado. Na montagem (voltar para a tela,
  // recarregar a aba) também restaura — fechamento legítimo limpa o rascunho,
  // então não reabre rascunho de janela que o usuário fechou de propósito.
  const restoreOpenModal = () => {
    if (isModalOpen) return
    const draft = getOpenModalDraft(crudId)
    if (!draft) return
    if (draft.editing && draft.editingId) {
      // Edição: prefere o item fresco da lista (outras telas podem tê-lo
      // alterado); sem ele, volta ao snapshot do rascunho.
      const item =
        data.find((d: any) => String(d.id) === String(draft.editingId)) ??
        ({ id: draft.editingId, ...draft.form } as any)
      setForm(item)
      setEditingItem(item)
    } else {
      setForm(draft.form)
      setEditingItem(null)
    }
    setFormErrors({})
    setIsModalOpen(true)
    logCrudCloseDiag({ trigger: 'focus_restore', action: 'auto_restore_modal', crudId })
  }
  restoreRef.current = restoreOpenModal

  // Restauração 1: montagem do componente (voltar para a tela, recarregar a
  // aba). Roda uma vez; getOpenModalDraft/refs não precisam de deps.
  useEffect(() => {
    restoreRef.current()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [crudId])

  // Restauração 2: retorno de foco/visibilidade da aba (Alt+Tab).
  useEffect(() => {
    const handleFocus = () => restoreRef.current()
    const handleVisibility = () => {
      if (!document.hidden) restoreRef.current()
    }
    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibility)
    return () => {
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  return { openModal, closeLegit, closeGhost }
}
