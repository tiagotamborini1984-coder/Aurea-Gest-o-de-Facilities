import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { cn } from '@/lib/utils'

/**
 * Barra de rolagem horizontal CONGELADA no rodapé da área visível do navegador
 * (position: fixed, renderizada em portal no document.body) para tabelas largas.
 *
 * Problema que resolve: em tabelas mais largas que a área visível, a barra de
 * rolagem horizontal nativa fica no PÉ da tabela — que costuma estar abaixo da
 * dobra. O usuário precisava rolar a página inteira para baixo antes de
 * conseguir rolar a tabela para os lados (ex.: para alcançar o botão "Aprovar"
 * na coluna de Ações). Uma versão anterior usava position: sticky dentro do
 * contêiner de rolagem vertical da página, o que na prática só deixava a barra
 * visível quando o usuário JÁ tinha rolado até perto do fim — o oposto do
 * desejado.
 *
 * Como funciona:
 * - A barra vive num portal em document.body com position: fixed; bottom: 0:
 *   fica congelada no rodapé do VIEWPORT, visível imediatamente ao abrir a
 *   tela e em qualquer posição da rolagem vertical, enquanto a tabela larga
 *   estiver montada;
 * - Largura e posição horizontal espelham o retângulo visível do contêiner de
 *   rolagem da tabela (getBoundingClientRect), então ela acompanha sidebar
 *   colapsada, redimensionamento de janela etc.;
 * - É sempre visível (thumb custom desenhado, não depende de scrollbar nativa,
 *   que em macOS some quando não se está rolando);
 * - Sincronizada nos dois sentidos: arrastar o thumb rola a tabela; rolar a
 *   tabela (shift+roda, scrollbar nativa, touch) move o thumb;
 * - Clique na trilha posiciona o thumb; teclado (setas / Home / End) também
 *   funciona (role="scrollbar");
 * - Onde o componente é montado (embaixo da tabela) fica um espaçador de mesma
 *   altura enquanto a barra existe, para a última linha não ficar
 *   permanentemente coberta pela barra fixa.
 *
 * Uso (o contêiner de rolagem horizontal é o PAI direto do <table>, ou seja o
 * wrapper overflow-auto do componente Table do shadcn):
 *
 *   const tableRef = useRef<HTMLTableElement>(null)
 *   <Table ref={tableRef}>...</Table>
 *   <StickyHorizontalScrollbar tableRef={tableRef} />
 *
 * Quando a tabela não transborda horizontalmente, nem a barra nem o espaçador
 * são renderizados (sem espaço extra, sem mudança de layout).
 */

interface StickyHorizontalScrollbarProps {
  /** Ref do elemento <table>; a rolagem sincronizada é o pai direto dele. */
  tableRef: React.RefObject<HTMLTableElement | null>
  className?: string
}

const clamp = (v: number, min: number, max: number) => Math.min(Math.max(v, min), max)

interface BarMetrics {
  overflow: boolean
  ratio: number
  progress: number
  /** left do contêiner de rolagem no viewport (px) */
  left: number
  /** largura visível do contêiner de rolagem (px) */
  width: number
}

export function StickyHorizontalScrollbar({ tableRef, className }: StickyHorizontalScrollbarProps) {
  const barRef = useRef<HTMLDivElement>(null)
  const rafRef = useRef<number | null>(null)
  const [metrics, setMetrics] = useState<BarMetrics>({
    overflow: false,
    ratio: 1,
    progress: 0,
    left: 0,
    width: 0,
  })

  const getScroller = useCallback(() => tableRef.current?.parentElement ?? null, [tableRef])

  // Mede a tabela e o contêiner de rolagem e espelha a posição atual no thumb,
  // além do retângulo do contêiner no viewport (para a barra fixa se alinhar).
  const syncFromScroller = useCallback(() => {
    const scroller = getScroller()
    if (!scroller) return
    const rect = scroller.getBoundingClientRect()
    const overflow = scroller.scrollWidth - scroller.clientWidth > 1
    const ratio =
      scroller.scrollWidth > 0 ? clamp(scroller.clientWidth / scroller.scrollWidth, 0.05, 1) : 1
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    const progress = maxScroll > 0 ? clamp(scroller.scrollLeft / maxScroll, 0, 1) : 0
    setMetrics((prev) =>
      prev.overflow !== overflow ||
      Math.abs(prev.ratio - ratio) > 0.001 ||
      Math.abs(prev.progress - progress) > 0.001 ||
      Math.abs(prev.left - rect.left) > 0.5 ||
      Math.abs(prev.width - rect.width) > 0.5
        ? { overflow, ratio, progress, left: rect.left, width: rect.width }
        : prev,
    )
  }, [getScroller])

  // Medição a cada frame no máximo (scroll dispara em rajada).
  const scheduleSync = useCallback(() => {
    if (rafRef.current != null) return
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null
      syncFromScroller()
    })
  }, [syncFromScroller])

  // Sincronização contínua tabela -> barra:
  // - evento scroll do contêiner (rolagem direta na tabela);
  // - qualquer scroll na página (capture): rolagem vertical do documento /
  //   mudanças de layout não devem deixar a barra fixa desalinhada;
  // - ResizeObserver na tabela e no contêiner (colunas mudam, sidebar colapsa,
  //   filtros adicionam/removem a coluna Ações, dados carregam);
  // - resize da janela.
  useEffect(() => {
    const scroller = getScroller()
    if (!scroller) return

    syncFromScroller()
    scroller.addEventListener('scroll', scheduleSync, { passive: true })
    window.addEventListener('scroll', scheduleSync, { capture: true, passive: true })
    window.addEventListener('resize', scheduleSync)

    const ro = new ResizeObserver(() => scheduleSync())
    ro.observe(scroller)
    if (tableRef.current) ro.observe(tableRef.current)

    return () => {
      scroller.removeEventListener('scroll', scheduleSync)
      window.removeEventListener('scroll', scheduleSync, { capture: true } as EventListenerOptions)
      window.removeEventListener('resize', scheduleSync)
      ro.disconnect()
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [getScroller, syncFromScroller, scheduleSync, tableRef])

  // Arrastar o thumb -> rola a tabela. A posição do thumb é atualizada pelo
  // evento scroll do contêiner (a escrita em scrollLeft dispara o listener).
  const startThumbDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const scroller = getScroller()
    const bar = barRef.current
    if (!scroller || !bar) return
    e.preventDefault()
    e.stopPropagation()

    const startX = e.clientX
    const startScrollLeft = scroller.scrollLeft
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    const maxThumbTravel = bar.clientWidth * (1 - metrics.ratio)
    if (maxScroll <= 0 || maxThumbTravel <= 0) return

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX
      scroller.scrollLeft = clamp(
        startScrollLeft + (delta / maxThumbTravel) * maxScroll,
        0,
        maxScroll,
      )
    }
    const onUp = () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
  }

  // Clique na trilha (fora do thumb): posiciona o thumb sob o cursor.
  const handleTrackPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.target !== e.currentTarget) return // clicou no thumb — handler próprio trata
    const scroller = getScroller()
    const bar = barRef.current
    if (!scroller || !bar) return
    const rect = bar.getBoundingClientRect()
    const clickRatio = clamp((e.clientX - rect.left) / rect.width, 0, 1)
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    scroller.scrollLeft = clamp(
      clickRatio * scroller.scrollWidth - scroller.clientWidth / 2,
      0,
      maxScroll,
    )
  }

  // Acessibilidade: setas / Home / End rolam a tabela com a barra focada.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const scroller = getScroller()
    if (!scroller) return
    const step = 60
    const maxScroll = scroller.scrollWidth - scroller.clientWidth
    if (e.key === 'ArrowLeft') {
      scroller.scrollLeft = clamp(scroller.scrollLeft - step, 0, maxScroll)
    } else if (e.key === 'ArrowRight') {
      scroller.scrollLeft = clamp(scroller.scrollLeft + step, 0, maxScroll)
    } else if (e.key === 'Home') {
      scroller.scrollLeft = 0
    } else if (e.key === 'End') {
      scroller.scrollLeft = maxScroll
    } else {
      return
    }
    e.preventDefault()
  }

  // Sem transbordo horizontal não há nada a rolar: não renderiza barra nem
  // espaçador (sem espaço extra, sem mudança de layout).
  if (!metrics.overflow || metrics.width <= 0) return null

  const bar = (
    <div
      ref={barRef}
      role="scrollbar"
      aria-label="Barra de rolagem horizontal da tabela"
      aria-orientation="horizontal"
      aria-valuenow={Math.round(metrics.progress * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      tabIndex={0}
      onPointerDown={handleTrackPointerDown}
      onKeyDown={handleKeyDown}
      style={{
        position: 'fixed',
        left: metrics.left,
        width: metrics.width,
        bottom: 0,
      }}
      className={cn(
        'z-40 h-4 select-none border-t border-slate-200 bg-slate-100/95 backdrop-blur-sm cursor-pointer shadow-[0_-1px_3px_rgba(0,0,0,0.06)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-vividBlue/50',
        className,
      )}
    >
      <div
        onPointerDown={startThumbDrag}
        className="absolute top-0.5 bottom-0.5 rounded-full bg-slate-400 hover:bg-slate-500 active:bg-slate-500 cursor-grab active:cursor-grabbing shadow-sm"
        style={{
          width: `${metrics.ratio * 100}%`,
          left: `${metrics.progress * (1 - metrics.ratio) * 100}%`,
        }}
      />
    </div>
  )

  return (
    <>
      {createPortal(bar, document.body)}
      {/* Respiro no fluxo: enquanto a barra fixa existe, evita que a última
          linha fique permanentemente coberta por ela. */}
      <div aria-hidden="true" className="h-4" />
    </>
  )
}
