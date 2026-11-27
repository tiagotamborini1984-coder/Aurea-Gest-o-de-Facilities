import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'
import { Loader2, Save } from 'lucide-react'
import { format } from 'date-fns'
import { OCS_CATEGORIAS, OCS_RESPOSTAS, OCS_TURNOS } from './ocs-checklist'
import type { ChecklistAnswer } from './ocs-checklist'

export type OcsObservacaoForForm = {
  id?: string
  plant_id?: string | null
  observador?: string | null
  observado_name?: string | null
  data_observacao?: string
  turno?: string | null
  local?: string | null
  atividade?: string | null
  respostas?: ChecklistAnswer[]
  status?: string
}

type Usuario = { id: string; name: string; authorized_plants?: string[] | null }

type Props = {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing: OcsObservacaoForForm | null
  plants: any[]
  usuarios: Usuario[]
  currentUserId?: string | null
  /** (respostas, campos, targetId) — targetId definido quando é edição */
  onSave: (respostas: ChecklistAnswer[], campos: any, targetId?: string) => Promise<void>
}

const RESPOSTA_CLASS: Record<ChecklistAnswer['resposta'], string> = {
  Conforme: 'bg-green-500 text-white hover:bg-green-600 border-green-500',
  'Não Conforme': 'bg-red-500 text-white hover:bg-red-600 border-red-500',
  'Não Aplica': 'bg-gray-500 text-white hover:bg-gray-600 border-gray-500',
}

const CHAVE_ITEM = (cat: string, i: number) => `${cat}::${i}`

export function OcsFormDialog({
  open,
  onOpenChange,
  editing,
  plants,
  usuarios,
  currentUserId,
  onSave,
}: Props) {
  const isEditing = !!editing?.id
  const [saving, setSaving] = useState(false)
  const [plantId, setPlantId] = useState('')
  const [observador, setObservador] = useState('')
  const [observadoName, setObservadoName] = useState('')
  const [dataObs, setDataObs] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [turno, setTurno] = useState('')
  const [local, setLocal] = useState('')
  const [atividade, setAtividade] = useState('')
  const [status, setStatus] = useState('Em elaboração')
  const [respostas, setRespostas] = useState<Record<string, ChecklistAnswer>>({})

  // Estado inicial em cada abertura (evita herdar dados do diálogo anterior)
  useEffect(() => {
    if (!open) return
    const r = editing?.respostas || []
    const map: Record<string, ChecklistAnswer> = {}
    r.forEach((a) => {
      const cat = OCS_CATEGORIAS.find((c) => c.categoria === a.categoria)
      if (!cat) return
      const idx = cat.itens.findIndex((it) => it === (a as any).item)
      if (idx >= 0) map[CHAVE_ITEM(a.categoria, idx)] = a
    })
    setRespostas(map)
    setPlantId(editing?.plant_id || '')
    setObservador(editing?.observador || currentUserId || '')
    setObservadoName(editing?.observado_name || '')
    setDataObs(editing?.data_observacao || format(new Date(), 'yyyy-MM-dd'))
    setTurno(editing?.turno || '')
    setLocal(editing?.local || '')
    setAtividade(editing?.atividade || '')
    setStatus(editing?.status || 'Em elaboração')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing, currentUserId])

  const totalItens = useMemo(() => OCS_CATEGORIAS.reduce((acc, c) => acc + c.itens.length, 0), [])

  // Observadores: somente os usuários cadastrados na planta selecionada
  // (authorized_plants vazio = usuário vale para todas as plantas do cliente).
  const usuariosDaPlanta = useMemo(() => {
    if (!plantId) return []
    return usuarios.filter(
      (u) => !u.authorized_plants?.length || u.authorized_plants.includes(plantId),
    )
  }, [usuarios, plantId])

  // Se a planta trocar e o observador atual não pertence à nova planta, limpa o
  // campo para não gravar um observador de outra unidade.
  useEffect(() => {
    if (!observador) return
    if (usuariosDaPlanta.some((u) => u.id === observador)) return
    setObservador('')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuariosDaPlanta])
  const respondidos = Object.keys(respostas).length
  const naoConformes = Object.values(respostas).filter((r) => r.resposta === 'Não Conforme').length

  const setResposta = (
    categoria: string,
    idx: number,
    item: string,
    resposta: ChecklistAnswer['resposta'],
  ) => {
    setRespostas((prev) => {
      const next = { ...prev }
      const key = CHAVE_ITEM(categoria, idx)
      if (next[key]?.resposta === resposta) {
        delete next[key]
      } else {
        next[key] = {
          categoria,
          subcategoria: item,
          resposta,
          observacao: next[key]?.observacao || '',
        }
      }
      return next
    })
  }

  const setObservacao = (categoria: string, idx: number, item: string, observacao: string) => {
    setRespostas((prev) => {
      const key = CHAVE_ITEM(categoria, idx)
      const atual = prev[key]
      return {
        ...prev,
        [key]: {
          categoria,
          subcategoria: item,
          resposta: atual?.resposta || 'Não Aplica',
          observacao,
        },
      }
    })
  }

  const submit = async () => {
    if (!dataObs) return
    setSaving(true)
    try {
      const respostasList = OCS_CATEGORIAS.flatMap((c) =>
        c.itens
          .map((item, idx) => respostas[CHAVE_ITEM(c.categoria, idx)])
          .filter((r): r is ChecklistAnswer => !!r),
      )
      await onSave(
        respostasList,
        {
          plant_id: plantId || null,
          observador: observador || null,
          observado_name: observadoName.trim() || null,
          data_observacao: dataObs,
          turno: turno || null,
          local: local.trim() || null,
          atividade: atividade.trim() || null,
          status,
        },
        editing?.id,
      )
      onOpenChange(false)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isEditing ? 'Editar Observação' : 'Nova Observação de Segurança'}
          </DialogTitle>
          <DialogDescription>
            Preencha o Cartão de Observação de Segurança (COC). Itens marcados como "Não Conforme"
            orientam as ações corretivas.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ocs-plant">Unidade</Label>
              <Select value={plantId} onValueChange={setPlantId}>
                <SelectTrigger id="ocs-plant">
                  <SelectValue placeholder="Selecione a unidade" />
                </SelectTrigger>
                <SelectContent>
                  {plants.map((p: any) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ocs-observador">Observador</Label>
              <Select value={observador} onValueChange={setObservador}>
                <SelectTrigger id="ocs-observador">
                  <SelectValue
                    placeholder={
                      plantId ? 'Selecione o observador' : 'Selecione a unidade primeiro'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {usuariosDaPlanta.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Somente usuários cadastrados na unidade selecionada.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ocs-observado">Observado</Label>
              <Input
                id="ocs-observado"
                value={observadoName}
                onChange={(e) => setObservadoName(e.target.value)}
                placeholder="Nome de quem foi observado"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ocs-data">Data da observação *</Label>
              <Input
                id="ocs-data"
                type="date"
                value={dataObs}
                onChange={(e) => setDataObs(e.target.value)}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="ocs-turno">Turno</Label>
              <Select value={turno} onValueChange={setTurno}>
                <SelectTrigger id="ocs-turno">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {OCS_TURNOS.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ocs-local">Local</Label>
              <Input
                id="ocs-local"
                value={local}
                onChange={(e) => setLocal(e.target.value)}
                placeholder="Ex.: Oficina, Área externa"
                autoComplete="off"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ocs-status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger id="ocs-status">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Em elaboração">Em elaboração</SelectItem>
                  <SelectItem value="Em andamento">Em andamento</SelectItem>
                  <SelectItem value="Concluída">Concluída</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ocs-atividade">Atividade observada</Label>
            <Textarea
              id="ocs-atividade"
              value={atividade}
              onChange={(e) => setAtividade(e.target.value)}
              placeholder="Descreva a atividade em execução no momento da observação"
              rows={2}
            />
          </div>

          <div className="pt-2 border-t">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold">Checklist do COC</h4>
              <span className="text-xs text-muted-foreground">
                {respondidos}/{totalItens} itens respondidos
                {naoConformes > 0 && (
                  <span className="text-red-600 dark:text-red-400 font-medium">
                    {' '}
                    · {naoConformes} não conforme{naoConformes > 1 ? 's' : ''}
                  </span>
                )}
              </span>
            </div>
            <div className="space-y-4">
              {OCS_CATEGORIAS.map((cat) => (
                <div key={cat.categoria} className="border rounded-lg p-3 space-y-2">
                  <h5 className="text-sm font-semibold text-brand-graphite">{cat.categoria}</h5>
                  {cat.itens.map((item, idx) => {
                    const key = CHAVE_ITEM(cat.categoria, idx)
                    const atual = respostas[key]
                    return (
                      <div key={key} className="space-y-1.5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <span className="text-sm text-foreground sm:pr-4">{item}</span>
                          <div className="flex gap-1.5 shrink-0">
                            {OCS_RESPOSTAS.map((r) => (
                              <Button
                                key={r}
                                type="button"
                                size="sm"
                                variant="outline"
                                aria-pressed={atual?.resposta === r}
                                aria-label={`${r}: ${item}`}
                                className={cn(
                                  'h-7 px-2 text-xs',
                                  atual?.resposta === r && RESPOSTA_CLASS[r],
                                )}
                                onClick={() => setResposta(cat.categoria, idx, item, r)}
                              >
                                {r === 'Não Conforme'
                                  ? 'N. Conforme'
                                  : r === 'Não Aplica'
                                    ? 'N. Aplica'
                                    : r}
                              </Button>
                            ))}
                          </div>
                        </div>
                        {atual && (
                          <Input
                            value={atual.observacao}
                            onChange={(e) =>
                              setObservacao(cat.categoria, idx, item, e.target.value)
                            }
                            placeholder="Observação (opcional)"
                            className="h-8 text-xs"
                            aria-label={`Observação do item: ${item}`}
                            autoComplete="off"
                          />
                        )}
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={saving || !dataObs}>
            {saving ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isEditing ? 'Salvar alterações' : 'Registrar observação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
