import { useEffect, useRef } from 'react'

/**
 * Guarda de foco da janela para modais com anexo de arquivos.
 *
 * Quando o usuário abre o seletor de arquivos do sistema operacional ou dá
 * Alt+Tab com o modal aberto, o navegador dispara blur/focus e o Radix
 * interpreta o primeiro clique/pointerdown ao voltar como interação FORA do
 * modal, fechando-o — o usuário era expulso da edição e voltava para a
 * listagem.
 *
 * A versão anterior (v0.0.1867) media os 2s de tolerância a partir do BLUR;
 * se o usuário ficasse mais de 2s na outra janela (ex.: procurando o arquivo),
 * o guard já havia expirado ao voltar e o modal fechava do mesmo jeito. Aqui a
 * tolerância é medida a partir do RETORNO do foco (focus/visibilitychange),
 * cobrindo permanência longa na outra janela — e enquanto a janela segue
 * desfocada (seletor de arquivos aberto por cima), toda interação externa é
 * ignorada.
 *
 * Uso:
 *   const guardWindowDismiss = useWindowFocusGuard(isModalOpen, { isBusy })
 *   <DialogContent
 *     onPointerDownOutside={guardWindowDismiss}
 *     onInteractOutside={guardWindowDismiss}
 *     onFocusOutside={guardWindowDismiss}
 *   >
 */
export function useWindowFocusGuard(
  active: boolean,
  opts: { isBusy?: boolean } = {},
): (e: Event) => void {
  const isBusyRef = useRef(opts.isBusy ?? false)
  isBusyRef.current = opts.isBusy ?? false

  // Timestamp do ÚLTIMO retorno de foco/visibilidade da janela.
  const windowFocusReturnedAtRef = useRef<number>(0)
  // Timestamp do último blur — se for mais recente que o retorno de foco, a
  // janela ainda está desfocada (ex.: seletor de arquivos aberto por cima).
  const windowBlurAtRef = useRef<number>(0)

  useEffect(() => {
    if (!active) {
      windowFocusReturnedAtRef.current = 0
      windowBlurAtRef.current = 0
      return
    }

    const handleFocus = () => {
      windowFocusReturnedAtRef.current = Date.now()
    }
    const handleBlur = () => {
      windowBlurAtRef.current = Date.now()
    }
    const handleVisibility = () => {
      if (!document.hidden) windowFocusReturnedAtRef.current = Date.now()
    }

    window.addEventListener('focus', handleFocus)
    window.addEventListener('blur', handleBlur)
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      window.removeEventListener('focus', handleFocus)
      window.removeEventListener('blur', handleBlur)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [active])

  return (e: Event) => {
    const now = Date.now()
    // Dentro de 2s do retorno de foco: é o clique "fantasma" ao voltar de
    // outra janela — ignora, independentemente de QUANTO tempo passou lá fora.
    const recentFocusReturn =
      windowFocusReturnedAtRef.current > 0 && now - windowFocusReturnedAtRef.current < 2000
    // Janela ainda desfocada (seletor de arquivos aberto por cima): qualquer
    // interact-outside agora é parte do retorno do seletor — ignora.
    const windowStillBlurred = windowBlurAtRef.current > windowFocusReturnedAtRef.current
    if (recentFocusReturn || windowStillBlurred || isBusyRef.current) {
      e.preventDefault()
    }
  }
}
