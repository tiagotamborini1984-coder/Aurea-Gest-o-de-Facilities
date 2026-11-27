import { useMemo } from 'react'
import { createPortal } from 'react-dom'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Loader2, Printer } from 'lucide-react'
import { format } from 'date-fns'
import { cn } from '@/lib/utils'
import type { OcsObservacao } from './OcsObservacoes'
import type { OcsAcao } from './ocs-actions'
import type { ChecklistAnswer } from './ocs-checklist'

type Usuario = { id: string; name: string }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  observacao: OcsObservacao | null
  acoes: OcsAcao[]
  loading: boolean
  plantas: any[]
  usuarios: Usuario[]
}

function respostaClass(resposta: string) {
  return resposta === 'Conforme'
    ? 'text-green-700 font-semibold'
    : resposta === 'Não Conforme'
      ? 'text-red-700 font-semibold'
      : 'text-gray-500'
}

function Cabecalho({ observacao, plantas }: { observacao: OcsObservacao; plantas: any[] }) {
  return (
    <div className="border-b-2 border-black pb-3 mb-4">
      <p className="text-xs uppercase tracking-wide">Cartão de Observação de Segurança</p>
      <h1 className="text-2xl font-bold">
        {observacao.number_label || `OCS #${observacao.number}`}
      </h1>
      {observacao.plant_id && plantas.length > 0 && (
        <p className="text-[11px] text-gray-700">
          Unidade: {plantas.find((p: any) => p.id === observacao.plant_id)?.name || '—'}
        </p>
      )}
    </div>
  )
}

function DadosGerais({
  observacao,
  plantas,
  usuarios,
}: {
  observacao: OcsObservacao
  plantas: any[]
  usuarios: Usuario[]
}) {
  const usuarioNome = (id: string | null) =>
    id ? usuarios.find((u) => u.id === id)?.name || '—' : '—'
  return (
    <div className="grid grid-cols-3 gap-x-6 gap-y-1 mb-4">
      <p>
        <strong>Data:</strong>{' '}
        {observacao.data_observacao
          ? format(new Date(`${observacao.data_observacao}T12:00:00`), 'dd/MM/yyyy')
          : '—'}
      </p>
      <p>
        <strong>Turno:</strong> {observacao.turno || '—'}
      </p>
      <p>
        <strong>Local:</strong> {observacao.local || '—'}
      </p>
      <p>
        <strong>Unidade:</strong>{' '}
        {plantas.find((p: any) => p.id === observacao.plant_id)?.name || '—'}
      </p>
      <p>
        <strong>Observador:</strong> {usuarioNome(observacao.observador)}
      </p>
      <p>
        <strong>Observado:</strong> {observacao.observado_name || '—'}
      </p>
      <p className="col-span-3">
        <strong>Atividade:</strong> {observacao.atividade || '—'}
      </p>
    </div>
  )
}

/** Conteúdo do cartão impresso (compartilhado pelo portal e pela pré-visualização). */
function CartaoOcs({
  observacao,
  acoes,
  plantas,
  usuarios,
}: {
  observacao: OcsObservacao
  acoes: OcsAcao[]
  plantas: any[]
  usuarios: Usuario[]
}) {
  const usuarioNome = (id: string | null) =>
    id ? usuarios.find((u) => u.id === id)?.name || '—' : '—'
  const respostas = useMemo(() => (observacao.respostas || []) as ChecklistAnswer[], [observacao])

  return (
    <div>
      <Cabecalho observacao={observacao} plantas={plantas} />
      <DadosGerais observacao={observacao} plantas={plantas} usuarios={usuarios} />

      <h2 className="text-base font-bold border-b border-black pb-1 mb-2">Checklist do COC</h2>
      <table className="w-full border-collapse mb-4">
        <thead>
          <tr className="border-b border-black text-left">
            <th className="py-1 pr-2 w-8">#</th>
            <th className="py-1 pr-2">Item</th>
            <th className="py-1 pr-2 w-28">Categoria</th>
            <th className="py-1 pr-2 w-28">Resposta</th>
          </tr>
        </thead>
        <tbody>
          {respostas.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-2 text-gray-500">
                Nenhum item respondido.
              </td>
            </tr>
          ) : (
            respostas.map((r, i) => (
              <tr key={`${r.categoria}-${i}`} className="border-b border-gray-300 align-top">
                <td className="py-1 pr-2">{i + 1}</td>
                <td className="py-1 pr-2">
                  {r.subcategoria}
                  {r.observacao && (
                    <span className="block text-[11px] text-gray-600">Obs.: {r.observacao}</span>
                  )}
                </td>
                <td className="py-1 pr-2">{r.categoria}</td>
                <td className={cn('py-1 pr-2', respostaClass(r.resposta))}>{r.resposta}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>

      <h2 className="text-base font-bold border-b border-black pb-1 mb-2">
        Ações ({acoes.length})
      </h2>
      {acoes.length === 0 ? (
        <p className="text-gray-500">Nenhuma ação gerada a partir desta OCS.</p>
      ) : (
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1 pr-2 w-8">#</th>
              <th className="py-1 pr-2">Descrição</th>
              <th className="py-1 pr-2 w-36">Responsável</th>
              <th className="py-1 pr-2 w-24">Prazo</th>
              <th className="py-1 pr-2 w-24">Status</th>
            </tr>
          </thead>
          <tbody>
            {acoes.map((a, i) => (
              <tr key={a.id} className="border-b border-gray-300 align-top">
                <td className="py-1 pr-2">{i + 1}</td>
                <td className="py-1 pr-2">{a.descricao}</td>
                <td className="py-1 pr-2">{usuarioNome(a.responsavel_id)}</td>
                <td className="py-1 pr-2">
                  {a.prazo ? format(new Date(`${a.prazo}T12:00:00`), 'dd/MM/yyyy') : '—'}
                </td>
                <td className="py-1 pr-2">{a.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <div className="mt-10 flex justify-between gap-12">
        <div className="flex-1 border-t border-black pt-1 text-[11px]">
          Assinatura do observador
        </div>
        <div className="flex-1 border-t border-black pt-1 text-[11px]">
          Assinatura do observado / líder
        </div>
      </div>
    </div>
  )
}

/**
 * Dialog de impressão do Cartão de Observação completo.
 * O cartão impresso é renderizado num portal (irmão de #root) e fica oculto na
 * tela; na impressão (body.ocs-printing) o main.css esconde o app e o dialog e
 * mostra SOMENTE o cartão.
 */
export function OcsPrintDialog({
  observacao,
  acoes,
  loading,
  plantas,
  usuarios,
  open,
  onOpenChange,
}: Props) {
  const usuarioNome = (id: string | null) =>
    id ? usuarios.find((u) => u.id === id)?.name || '—' : '—'

  const respostas = useMemo(() => (observacao?.respostas || []) as ChecklistAnswer[], [observacao])

  if (!observacao) return null

  return (
    <>
      {/* Bloco de impressão: portal no body, invisível na tela. */}
      {createPortal(
        <div className="ocs-print-root hidden p-6 text-[13px] leading-relaxed text-black">
          <CartaoOcs observacao={observacao} acoes={acoes} plantas={plantas} usuarios={usuarios} />
        </div>,
        document.body,
      )}

      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto print-hide">
          <DialogHeader>
            <DialogTitle>
              Imprimir {observacao.number_label || `OCS #${observacao.number}`}
            </DialogTitle>
            <DialogDescription>
              Pré-visualização do Cartão de Observação completo. Clique em "Imprimir" para abrir a
              janela de impressão do navegador.
            </DialogDescription>
          </DialogHeader>
          <div className="border rounded-lg p-4 bg-white text-[13px] text-black max-h-[55dvh] overflow-y-auto">
            <Cabecalho observacao={observacao} plantas={plantas} />
            <DadosGerais observacao={observacao} plantas={plantas} usuarios={usuarios} />
            <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">Checklist</h3>
            <ul className="space-y-1 mb-3">
              {respostas.length === 0 ? (
                <li className="text-gray-500 text-xs">Nenhum item respondido.</li>
              ) : (
                respostas.map((r, i) => (
                  <li key={`${r.categoria}-${i}`} className="text-xs flex gap-2">
                    <span className={cn('w-24 shrink-0', respostaClass(r.resposta))}>
                      {r.resposta}
                    </span>
                    <span>
                      {r.subcategoria} <span className="text-gray-500">({r.categoria})</span>
                      {r.observacao && (
                        <span className="block text-[10px] text-gray-600">
                          Obs.: {r.observacao}
                        </span>
                      )}
                    </span>
                  </li>
                ))
              )}
            </ul>
            <h3 className="text-sm font-bold border-b border-black pb-1 mb-2">
              Ações ({acoes.length})
            </h3>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : acoes.length === 0 ? (
              <p className="text-gray-500 text-xs">Nenhuma ação gerada.</p>
            ) : (
              <ul className="space-y-1">
                {acoes.map((a) => (
                  <li key={a.id} className="text-xs">
                    <span className="font-medium">{a.descricao}</span>
                    <span className="text-gray-500">
                      {' '}
                      — {usuarioNome(a.responsavel_id)}
                      {a.prazo
                        ? ` · prazo ${format(new Date(`${a.prazo}T12:00:00`), 'dd/MM/yyyy')}`
                        : ''}{' '}
                      · {a.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button
              onClick={() => {
                document.body.classList.add('ocs-printing')
                window.print()
                setTimeout(() => document.body.classList.remove('ocs-printing'), 500)
              }}
              disabled={loading}
            >
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
