import { useState, useEffect, useCallback, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Plus,
  Trash2,
  GitFork,
  ArrowLeft,
  Save,
  LayoutTemplate,
  Edit2,
  Download,
} from 'lucide-react'
import { getFlowcharts, saveFlowchart, deleteFlowchart } from '@/services/fluxograma'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

interface FlowNode {
  id: string
  label: string
  type: string
  next: string[]
}

interface Point {
  x: number
  y: number
}

interface Edge {
  id: string
  x1: number
  y1: number
  x2: number
  y2: number
}

export default function OrgFluxogramas() {
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [flowcharts, setFlowcharts] = useState<any[]>([])
  const [activeFlow, setActiveFlow] = useState<any | null>(null)
  const [nodes, setNodes] = useState<FlowNode[]>([])
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)

  const containerRef = useRef<HTMLDivElement>(null)
  const nodeRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const [edges, setEdges] = useState<Edge[]>([])
  const [levels, setLevels] = useState<FlowNode[][]>([])

  const loadData = async () => {
    if (!activeClient) return
    try {
      const data = await getFlowcharts(activeClient.id)
      setFlowcharts(data)
    } catch (e: any) {
      toast({ title: 'Erro ao carregar', description: e.message, variant: 'destructive' })
    }
  }

  useEffect(() => {
    loadData()
  }, [activeClient])

  const calculateLayout = useCallback(() => {
    if (nodes.length === 0) {
      setLevels([])
      return
    }

    const depths: Record<string, number> = {}
    const incoming: Record<string, number> = {}

    nodes.forEach((n) => (incoming[n.id] = 0))
    nodes.forEach((n) => {
      n.next.forEach((nxt) => {
        if (incoming[nxt] !== undefined) incoming[nxt]++
      })
    })

    const roots = nodes.filter((n) => incoming[n.id] === 0)
    if (roots.length === 0) roots.push(nodes[0])

    const calc = (id: string, depth: number, visited: Set<string>) => {
      if (visited.has(id)) return
      if ((depths[id] || -1) < depth) depths[id] = depth

      const node = nodes.find((n) => n.id === id)
      if (node) {
        const newVisited = new Set(visited)
        newVisited.add(id)
        node.next.forEach((nxt) => calc(nxt, depth + 1, newVisited))
      }
    }

    roots.forEach((r) => calc(r.id, 0, new Set()))

    nodes.forEach((n) => {
      if (depths[n.id] === undefined) calc(n.id, 0, new Set())
    })

    const lvlMap: Record<number, FlowNode[]> = {}
    nodes.forEach((n) => {
      const d = depths[n.id] || 0
      if (!lvlMap[d]) lvlMap[d] = []
      lvlMap[d].push(n)
    })

    const maxD = Math.max(-1, ...Object.keys(lvlMap).map(Number))
    const result: FlowNode[][] = []
    for (let i = 0; i <= maxD; i++) {
      result.push(lvlMap[i] || [])
    }
    setLevels(result)
  }, [nodes])

  useEffect(() => {
    calculateLayout()
  }, [calculateLayout])

  const updateEdges = useCallback(() => {
    if (!containerRef.current) return
    const containerRect = containerRef.current.getBoundingClientRect()
    const newEdges: Edge[] = []

    nodes.forEach((node) => {
      const el1 = nodeRefs.current[node.id]
      if (!el1) return
      const rect1 = el1.getBoundingClientRect()

      const x1 = rect1.left + rect1.width / 2 - containerRect.left
      const y1 = rect1.bottom - containerRect.top

      node.next.forEach((nextId) => {
        const el2 = nodeRefs.current[nextId]
        if (!el2) return
        const rect2 = el2.getBoundingClientRect()

        const x2 = rect2.left + rect2.width / 2 - containerRect.left
        const y2 = rect2.top - containerRect.top

        newEdges.push({ id: `${node.id}-${nextId}`, x1, y1, x2, y2 })
      })
    })
    setEdges(newEdges)
  }, [nodes, levels])

  useEffect(() => {
    let frameId: number
    const update = () => {
      frameId = requestAnimationFrame(updateEdges)
    }
    update()
    window.addEventListener('resize', update)
    return () => {
      cancelAnimationFrame(frameId)
      window.removeEventListener('resize', update)
    }
  }, [updateEdges])

  const handleCreate = () => {
    setActiveFlow({ name: 'Novo Fluxograma', description: '', id: '' })
    setNodes([{ id: '1', label: 'Início', type: 'start', next: [] }])
    setSelectedNodeId('1')
  }

  const handleEdit = (flow: any) => {
    setActiveFlow(flow)
    setNodes(flow.flow_data?.nodes || [])
    setSelectedNodeId(null)
  }

  const addNode = () => {
    const newId = Math.random().toString(36).substr(2, 9)
    const newNode = { id: newId, label: 'Nova Etapa', type: 'process', next: [] }
    setNodes([...nodes, newNode])
    setSelectedNodeId(newId)
  }

  const updateNode = (id: string, field: string, value: any) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, [field]: value } : n)))
  }

  const removeNode = (id: string) => {
    setNodes(
      nodes
        .filter((n) => n.id !== id)
        .map((n) => ({
          ...n,
          next: n.next.filter((nxt) => nxt !== id),
        })),
    )
    if (selectedNodeId === id) setSelectedNodeId(null)
  }

  const handleSave = async () => {
    if (!activeClient || !activeFlow) return
    try {
      const payload = {
        id: activeFlow.id || undefined,
        client_id: activeClient.id,
        name: activeFlow.name,
        description: activeFlow.description,
        flow_data: { nodes, edges: [] },
      }
      const saved = await saveFlowchart(payload)
      toast({ title: 'Sucesso', description: 'Fluxograma salvo com sucesso.' })
      setActiveFlow(saved)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este fluxograma?')) return
    try {
      await deleteFlowchart(id)
      toast({ title: 'Sucesso', description: 'Fluxograma excluído.' })
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handlePrint = () => {
    window.print()
  }

  const selectedNode = nodes.find((n) => n.id === selectedNodeId)

  if (activeFlow) {
    return (
      <div className="p-6 max-w-[1600px] mx-auto space-y-6 h-[calc(100vh-100px)] flex flex-col print-hide-siblings">
        <style>{`
          @media print {
            @page { size: landscape; margin: 0; }
            body { margin: 0; padding: 0; background: white; }
            #root > * { display: none; }
            .print-canvas-wrapper {
              display: block !important;
              position: absolute;
              top: 0; left: 0; right: 0; bottom: 0;
              background: white;
              z-index: 99999;
              padding: 40px;
            }
            .print-hidden { display: none !important; }
            .print-visible { display: block !important; }
          }
        `}</style>

        <div className="flex justify-between items-center print-hidden shrink-0">
          <div>
            <Input
              className="text-2xl font-bold h-auto py-1 px-2 border-transparent hover:border-border w-[400px] bg-transparent"
              value={activeFlow.name}
              onChange={(e) => setActiveFlow({ ...activeFlow, name: e.target.value })}
              placeholder="Nome do Fluxograma"
            />
            <Input
              className="text-sm text-muted-foreground h-auto py-1 px-2 border-transparent hover:border-border w-[400px] bg-transparent mt-1"
              placeholder="Descrição do processo..."
              value={activeFlow.description || ''}
              onChange={(e) => setActiveFlow({ ...activeFlow, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveFlow(null)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
            </Button>
            <Button variant="secondary" className="text-white" onClick={handlePrint}>
              <Download className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" /> Salvar Processo
            </Button>
          </div>
        </div>

        <div className="flex-1 flex gap-6 overflow-hidden min-h-0 print-canvas-wrapper">
          <div className="print-visible hidden mb-8 text-center">
            <h1 className="text-3xl font-bold text-slate-900">{activeFlow.name}</h1>
            <p className="text-slate-600 mt-2">{activeFlow.description}</p>
          </div>

          <div
            className="flex-1 relative bg-slate-50/50 dark:bg-slate-900/20 border rounded-xl overflow-auto print:border-none print:overflow-visible"
            ref={containerRef}
            onClick={(e) => {
              if (e.target === containerRef.current) setSelectedNodeId(null)
            }}
          >
            <svg
              className="absolute top-0 left-0 w-full h-full pointer-events-none z-0"
              style={{ minHeight: '100%' }}
            >
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#94a3b8" />
                </marker>
              </defs>
              {edges.map((edge) => {
                const dy = edge.y2 - edge.y1
                const cy = dy > 0 ? edge.y1 + dy / 2 : edge.y1 + 40
                const d = `M ${edge.x1} ${edge.y1} C ${edge.x1} ${cy}, ${edge.x2} ${cy}, ${edge.x2} ${edge.y2}`
                return (
                  <path
                    key={edge.id}
                    d={d}
                    fill="none"
                    stroke="#94a3b8"
                    strokeWidth="2"
                    markerEnd="url(#arrowhead)"
                    className="transition-all duration-300"
                  />
                )
              })}
            </svg>

            <div className="py-16 px-8 min-w-max min-h-full flex flex-col items-center justify-start relative z-10 gap-24">
              {levels.map((level, lvlIdx) => (
                <div
                  key={lvlIdx}
                  className="flex flex-row items-center justify-center gap-16 w-full"
                >
                  {level.map((node) => {
                    const isSelected = node.id === selectedNodeId
                    let shapeClass = ''
                    let innerClass = ''
                    let colorClass = ''

                    if (node.type === 'start') {
                      shapeClass = 'rounded-full px-6 py-3 min-w-[140px] h-[60px]'
                      colorClass =
                        'bg-emerald-100 border-emerald-500 text-emerald-900 dark:bg-emerald-900/40 dark:border-emerald-500 dark:text-emerald-100'
                    } else if (node.type === 'end') {
                      shapeClass = 'rounded-full px-6 py-3 min-w-[140px] h-[60px] border-[3px]'
                      colorClass =
                        'bg-rose-100 border-rose-500 text-rose-900 dark:bg-rose-900/40 dark:border-rose-500 dark:text-rose-100'
                    } else if (node.type === 'decision') {
                      shapeClass = 'w-24 h-24 rotate-45'
                      innerClass =
                        '-rotate-45 max-w-[80px] text-center text-xs break-words leading-tight'
                      colorClass =
                        'bg-amber-100 border-amber-500 text-amber-900 dark:bg-amber-900/40 dark:border-amber-500 dark:text-amber-100'
                    } else {
                      shapeClass = 'rounded-lg px-4 py-3 min-w-[160px] h-[70px]'
                      colorClass =
                        'bg-blue-100 border-blue-500 text-blue-900 dark:bg-blue-900/40 dark:border-blue-500 dark:text-blue-100'
                    }

                    return (
                      <div
                        key={node.id}
                        ref={(el) => (nodeRefs.current[node.id] = el)}
                        onClick={(e) => {
                          e.stopPropagation()
                          setSelectedNodeId(node.id)
                        }}
                        className={cn(
                          'relative border-2 flex items-center justify-center shadow-sm cursor-pointer transition-all hover:shadow-md hover:-translate-y-0.5',
                          shapeClass,
                          colorClass,
                          isSelected &&
                            'ring-4 ring-brand-vividBlue/50 ring-offset-2 dark:ring-offset-slate-900 shadow-lg scale-105',
                        )}
                      >
                        <div className={cn('font-semibold text-sm text-center', innerClass)}>
                          {node.label}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
              {nodes.length === 0 && (
                <div className="text-muted-foreground text-center py-20">
                  Nenhuma etapa criada. Use o painel lateral para adicionar.
                </div>
              )}
            </div>
          </div>

          <div className="w-80 bg-background border rounded-xl flex flex-col print-hidden shrink-0 overflow-hidden shadow-sm">
            <div className="p-4 border-b bg-slate-50 dark:bg-slate-900/50 flex justify-between items-center">
              <h3 className="font-semibold flex items-center gap-2">
                <Edit2 className="h-4 w-4" /> Propriedades
              </h3>
              <Button size="sm" variant="outline" onClick={addNode}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <ScrollArea className="flex-1 p-4">
              {selectedNode ? (
                <div className="space-y-6 animate-fade-in">
                  <div className="space-y-2">
                    <Label>Rótulo da Etapa</Label>
                    <Input
                      value={selectedNode.label}
                      onChange={(e) => updateNode(selectedNode.id, 'label', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Tipo de Etapa</Label>
                    <Select
                      value={selectedNode.type}
                      onValueChange={(v) => updateNode(selectedNode.id, 'type', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="start">Início</SelectItem>
                        <SelectItem value="process">Processo</SelectItem>
                        <SelectItem value="decision">Decisão</SelectItem>
                        <SelectItem value="end">Fim</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedNode.type !== 'end' && (
                    <div className="space-y-3">
                      <Label>Próximas Etapas (Conexões)</Label>
                      <div className="border rounded-md p-3 space-y-3 bg-slate-50/50 dark:bg-slate-900/50">
                        {nodes
                          .filter((n) => n.id !== selectedNode.id)
                          .map((n) => (
                            <div key={n.id} className="flex items-start space-x-3">
                              <Checkbox
                                id={`link-${n.id}`}
                                checked={selectedNode.next.includes(n.id)}
                                onCheckedChange={(checked) => {
                                  const next = checked
                                    ? [...selectedNode.next, n.id]
                                    : selectedNode.next.filter((id) => id !== n.id)
                                  updateNode(selectedNode.id, 'next', next)
                                }}
                              />
                              <div className="grid gap-1.5 leading-none">
                                <label
                                  htmlFor={`link-${n.id}`}
                                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                >
                                  {n.label}
                                </label>
                                <p className="text-[11px] text-muted-foreground uppercase tracking-wider">
                                  {n.type === 'decision'
                                    ? 'Decisão'
                                    : n.type === 'start'
                                      ? 'Início'
                                      : n.type === 'end'
                                        ? 'Fim'
                                        : 'Processo'}
                                </p>
                              </div>
                            </div>
                          ))}
                        {nodes.length <= 1 && (
                          <p className="text-xs text-muted-foreground text-center py-2">
                            Crie mais etapas para conectar.
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="pt-6 border-t">
                    <Button
                      variant="destructive"
                      className="w-full"
                      onClick={() => removeNode(selectedNode.id)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" /> Excluir Etapa
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground space-y-4 py-20 px-4">
                  <GitFork className="h-12 w-12 opacity-20" />
                  <p>Selecione uma etapa no diagrama para editar suas propriedades.</p>
                  <Button variant="outline" onClick={addNode}>
                    Adicionar Primeira Etapa
                  </Button>
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <GitFork className="h-6 w-6 text-brand-vividBlue" /> Fluxogramas de Processos
          </h1>
          <p className="text-muted-foreground">
            Mapeie e organize as etapas dos seus fluxos de trabalho.
          </p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" /> Novo Fluxograma
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
        {flowcharts.map((flow) => (
          <Card
            key={flow.id}
            className="hover:shadow-md transition-shadow hover:border-brand-vividBlue/50 group cursor-pointer"
            onClick={() => handleEdit(flow)}
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <LayoutTemplate className="h-8 w-8 text-brand-vividBlue/70 bg-brand-vividBlue/10 p-1.5 rounded-md" />
                <div
                  className="flex opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button variant="ghost" size="icon" onClick={() => handleEdit(flow)}>
                    <Edit2 className="h-4 w-4 text-blue-500" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(flow.id)}>
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </div>
              <CardTitle className="mt-4">{flow.name}</CardTitle>
              <CardDescription>{flow.description || 'Sem descrição'}</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm font-medium text-slate-500 bg-slate-100 dark:bg-slate-800 py-1.5 px-3 rounded-md inline-block">
                {flow.flow_data?.nodes?.length || 0} Etapas Mapeadas
              </p>
            </CardContent>
          </Card>
        ))}
        {flowcharts.length === 0 && (
          <div className="col-span-full py-12 text-center border-2 border-dashed rounded-xl">
            <GitFork className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-foreground">Nenhum fluxograma criado</h3>
            <p className="text-muted-foreground mb-4">
              Comece mapeando o seu primeiro processo operacional.
            </p>
            <Button onClick={handleCreate} variant="secondary">
              Criar Primeiro Fluxograma
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
