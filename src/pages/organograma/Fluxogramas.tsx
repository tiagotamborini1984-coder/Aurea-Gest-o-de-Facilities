import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
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
  ArrowRight,
  Save,
  LayoutTemplate,
  Edit2,
  Download,
} from 'lucide-react'
import { getFlowcharts, saveFlowchart, deleteFlowchart } from '@/services/fluxograma'
import { useAppStore } from '@/store/AppContext'
import { useToast } from '@/hooks/use-toast'

interface FlowNode {
  id: string
  label: string
  type: string
  next: string[]
}

export default function OrgFluxogramas() {
  const { activeClient } = useAppStore()
  const { toast } = useToast()
  const [flowcharts, setFlowcharts] = useState<any[]>([])
  const [activeFlow, setActiveFlow] = useState<any | null>(null)
  const [nodes, setNodes] = useState<FlowNode[]>([])

  const loadData = async () => {
    if (!activeClient) return
    const data = await getFlowcharts(activeClient.id)
    setFlowcharts(data)
  }

  useEffect(() => {
    loadData()
  }, [activeClient])

  const handleCreate = () => {
    setActiveFlow({ name: 'Novo Fluxograma', description: '', id: '' })
    setNodes([{ id: '1', label: 'Início', type: 'start', next: [] }])
  }

  const handleEdit = (flow: any) => {
    setActiveFlow(flow)
    setNodes(flow.flow_data?.nodes || [])
  }

  const addNode = () => {
    const newId = (nodes.length + 1).toString()
    setNodes([...nodes, { id: newId, label: `Etapa ${newId}`, type: 'process', next: [] }])
  }

  const updateNode = (id: string, field: string, value: any) => {
    setNodes(nodes.map((n) => (n.id === id ? { ...n, [field]: value } : n)))
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
      await saveFlowchart(payload)
      toast({ title: 'Sucesso', description: 'Fluxograma salvo.' })
      setActiveFlow(null)
      loadData()
    } catch (e: any) {
      toast({ title: 'Erro', description: e.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir?')) return
    await deleteFlowchart(id)
    loadData()
  }

  const handleExportPDF = () => {
    if (!activeFlow) return
    const iframe = document.createElement('iframe')
    iframe.style.display = 'none'
    document.body.appendChild(iframe)

    const pri = iframe.contentWindow
    if (!pri) return

    const nodesHtml = nodes
      .map((node) => {
        const isStart = node.type === 'start'
        const isEnd = node.type === 'end'
        const isDecision = node.type === 'decision'

        let borderColor = '#cbd5e1'
        let bgColor = '#f8fafc'

        if (isStart) {
          borderColor = '#4ade80'
          bgColor = '#f0fdf4'
        } else if (isEnd) {
          borderColor = '#f87171'
          bgColor = '#fef2f2'
        } else if (isDecision) {
          borderColor = '#fb923c'
          bgColor = '#fff7ed'
        }

        return `
        <div style="border: 2px solid ${borderColor}; background-color: ${bgColor}; padding: 16px; margin: 10px; border-radius: 8px; width: 300px; text-align: center; font-family: sans-serif; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); page-break-inside: avoid;">
          <div style="font-weight: bold; font-size: 16px; color: #0f172a;">${node.label}</div>
          <div style="font-size: 12px; color: #64748b; margin-top: 4px; text-transform: uppercase;">${
            node.type === 'start'
              ? 'Início'
              : node.type === 'end'
                ? 'Fim'
                : node.type === 'decision'
                  ? 'Decisão'
                  : 'Processo'
          }</div>
          ${
            !isEnd
              ? `
            <div style="margin-top: 12px; font-size: 12px; color: #475569; border-top: 1px solid #e2e8f0; padding-top: 8px;">
              Próximos Passos (ID): ${node.next.join(', ') || '-'}
            </div>
          `
              : ''
          }
        </div>
        ${!isEnd ? `<div style="font-size: 24px; color: #94a3b8; text-align: center; margin: 4px 0; page-break-inside: avoid;">↓</div>` : ''}
      `
      })
      .join('')

    pri.document.open()
    pri.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${activeFlow.name || 'Fluxograma'}</title>
          <style>
            @page { margin: 20mm; }
            body { font-family: system-ui, -apple-system, sans-serif; display: flex; flex-direction: column; align-items: center; color: #0f172a; }
            .header { text-align: center; margin-bottom: 30px; }
            .title { font-size: 24px; font-weight: bold; margin-bottom: 8px; }
            .desc { font-size: 14px; color: #64748b; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="title">${activeFlow.name || 'Fluxograma'}</div>
            <div class="desc">${activeFlow.description || ''}</div>
          </div>
          <div style="display: flex; flex-direction: column; align-items: center;">
            ${nodesHtml}
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `)
    pri.document.close()

    setTimeout(() => {
      document.body.removeChild(iframe)
    }, 2000)
  }

  if (activeFlow) {
    return (
      <div className="p-6 max-w-5xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <Input
              className="text-2xl font-bold h-auto py-1 px-2 border-transparent hover:border-border w-96 bg-transparent"
              value={activeFlow.name}
              onChange={(e) => setActiveFlow({ ...activeFlow, name: e.target.value })}
            />
            <Input
              className="text-sm text-muted-foreground h-auto py-1 px-2 border-transparent hover:border-border w-96 bg-transparent"
              placeholder="Descrição do processo..."
              value={activeFlow.description || ''}
              onChange={(e) => setActiveFlow({ ...activeFlow, description: e.target.value })}
            />
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setActiveFlow(null)}>
              Voltar
            </Button>
            <Button variant="secondary" onClick={handleExportPDF}>
              <Download className="h-4 w-4 mr-2" /> Exportar PDF
            </Button>
            <Button onClick={handleSave}>
              <Save className="h-4 w-4 mr-2" /> Salvar Processo
            </Button>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-8 border min-h-[500px] flex flex-col items-center">
          {nodes.map((node, i) => (
            <div key={node.id} className="flex flex-col items-center animate-fade-in-up">
              <Card
                className={`w-80 shadow-md ${node.type === 'decision' ? 'border-orange-400 bg-orange-50/30' : node.type === 'start' ? 'border-green-400 bg-green-50/30' : node.type === 'end' ? 'border-red-400 bg-red-50/30' : ''}`}
              >
                <CardContent className="p-4 space-y-3">
                  <div className="flex justify-between gap-2">
                    <Input
                      value={node.label}
                      onChange={(e) => updateNode(node.id, 'label', e.target.value)}
                      className="font-medium bg-background"
                    />
                    <Select value={node.type} onValueChange={(v) => updateNode(node.id, 'type', v)}>
                      <SelectTrigger className="w-32 bg-background">
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
                  {node.type !== 'end' && (
                    <div className="pt-2 border-t border-border/50">
                      <label className="text-xs text-muted-foreground block mb-1">
                        Próximo Passo (ID):
                      </label>
                      <Input
                        placeholder="Ex: 2, 3"
                        value={node.next.join(', ')}
                        onChange={(e) =>
                          updateNode(
                            node.id,
                            'next',
                            e.target.value
                              .split(',')
                              .map((s) => s.trim())
                              .filter(Boolean),
                          )
                        }
                        className="h-8 text-xs bg-background"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
              {node.type !== 'end' && (
                <ArrowRight className="h-8 w-8 text-slate-300 my-2 rotate-90" />
              )}
            </div>
          ))}
          <Button
            variant="outline"
            className="mt-4 border-dashed border-2 hover:border-brand-vividBlue"
            onClick={addNode}
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Etapa
          </Button>
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
            className="hover:shadow-md transition-shadow hover:border-brand-vividBlue/50 group"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <LayoutTemplate className="h-8 w-8 text-brand-vividBlue/70 bg-brand-vividBlue/10 p-1.5 rounded-md" />
                <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
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
