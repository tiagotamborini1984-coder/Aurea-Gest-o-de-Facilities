import { useEffect } from 'react'

/**
 * Guarda GLOBAL de retorno de foco da janela.
 *
 * Problema relatado em todos os módulos: ao dar Alt+Tab para outro sistema e
 * voltar (não importa quanto tempo fora), todas as subjanelas Radix abertas
 * (Dialog, Select, Popover, DropdownMenu, Sheet, AlertDialog) se fecham e os
 * painéis de filtro somem — o que o usuário descreve como "perder os filtros".
 *
 * Causa raiz: todo overlay Radix usa DismissableLayer, que escuta `focusin`
 * no document e fecha a camada quando o foco cai FORA dela. Ao voltar para a
 * janela, o navegador dispara eventos `focusin` de restauração de foco que não
 * vêm de interação do usuário — o alvo costuma ser document.body (foco
 * fantasma, fora de qualquer camada) ou o elemento restaurado fora da camada
 * aberta — e TODAS as subjanelas fecham de uma vez. Não é o clique do
 * usuário: é o retorno de foco em si.
 *
 * Correção: na fase de CAPTURA do document, suprimir esses `focusin`
 * fantasminhas antes que cheguem ao listener de dismiss do Radix (que escuta
 * na fase de bolha), em duas janelas:
 *  - até 2s após o RETORNO do foco, quando o alvo é body/documentElement
 *    (mesma semântica do guard por modal, useWindowFocusGuard);
 *  - nos primeiros 250ms após o retorno, qualquer alvo (tempestade de
 *    restauração de foco do navegador; nenhum clique humano acontece nesse
 *    intervalo, e dismissal por pointerdown não é afetado);
 *  - enquanto a janela segue desfocada (ex.: seletor de arquivos aberto por
 *    cima);
 *  - APÓS o retorno, enquanto o usuário não interagir (nenhum pointerdown/
 *    keydown desde a volta): o navegador pode devolver o foco ao ELEMENTO
 *    ATIVO (o trigger "Detalhes" do sheet, por exemplo) bem depois dos 250ms —
 *    Alt+Tab para outro sistema que rouba o foco do navegador faz o retorno
 *    restaurar o foco no trigger, fora da camada Radix aberta, e o sheet fecha
 *    sozinho. Sem interação humana nenhum focusin legítimo ocorre: suprimir
 *    até a primeira interação (pointerdown/keydown) é seguro — dismissal por
 *    pointerdown e navegação por teclado não dependem de focusin anterior.
 *
 * Os guards por modal (useWindowFocusGuard) e o salvamento por diferença dos
 * treinamentos continuam valendo sem alteração.
 */
const FOCUS_RETURN_TOLERANCE_MS = 2000
const RESTORE_STORM_MS = 250

export function WindowFocusReturnGuard() {
  useEffect(() => {
    // Timestamp do ÚLTIMO retorno de foco/visibilidade da janela.
    let focusReturnedAt = 0
    // Timestamp do último blur — se for mais recente que o retorno de foco,
    // a janela ainda está desfocada (ex.: seletor de arquivos aberto por cima).
    let blurAt = 0
    // Timestamp da ÚLTIMA interação real do usuário (pointerdown/keydown) —
    // um focusin sem interação anterior desde o retorno é fantasma.
    let userInteractedAt = 0

    const handleFocus = () => {
      focusReturnedAt = Date.now()
    }
    const handleBlur = () => {
      blurAt = Date.now()
    }
    const handleVisibility = () => {
      if (!document.hidden) focusReturnedAt = Date.now()
    }
    const handleUserInteraction = () => {
      userInteractedAt = Date.now()
    }

    const isGhost = (e: FocusEvent) => {
      const now = Date.now()
      const sinceReturn = focusReturnedAt > 0 ? now - focusReturnedAt : Infinity
      const recentFocusReturn = sinceReturn < FOCUS_RETURN_TOLERANCE_MS
      const windowStillBlurred = blurAt > focusReturnedAt
      if (!recentFocusReturn && !windowStillBlurred) return false

      const target = e.target as Node | null
      const isGhostBodyFocus = target === document.body || target === document.documentElement

      // Tempestade de restauração de foco nos primeiros milissegundos após o
      // retorno: o navegador devolve o foco ao elemento que estava ativo
      // (possivelmente fora da camada aberta) — não é interação do usuário.
      const isRestoreStorm = sinceReturn < RESTORE_STORM_MS

      // Restauração de foco tardia (janela que ficou >2s em outro sistema):
      // qualquer focusin antes da primeira interação do usuário é fantasma.
      const noUserInteractionSinceReturn =
        focusReturnedAt > 0 && userInteractedAt <= focusReturnedAt

      return isGhostBodyFocus || isRestoreStorm || noUserInteractionSinceReturn
    }

    const handleFocusIn = (e: FocusEvent) => {
      if (isGhost(e)) {
        // Foco fantasma do retorno da janela: impede que chegue aos listeners
        // de dismiss das camadas Radix (document, fase de bolha).
        e.stopPropagation()
      }
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    window.addEventListener('pointerdown', handleUserInteraction, true)
    window.addEventListener('keydown', handleUserInteraction, true)
    document.addEventListener('visibilitychange', handleVisibility)
    document.addEventListener('focusin', handleFocusIn, true)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      window.removeEventListener('pointerdown', handleUserInteraction, true)
      window.removeEventListener('keydown', handleUserInteraction, true)
      document.removeEventListener('visibilitychange', handleVisibility)
      document.removeEventListener('focusin', handleFocusIn, true)
    }
  }, [])

  return null
}
