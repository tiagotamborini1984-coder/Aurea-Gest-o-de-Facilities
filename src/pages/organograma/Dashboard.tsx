import { useState, useEffect, useRef } from 'react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getOrgCollaborators, getOrgUnits } from '@/services/organograma'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Network, Download, Loader2, ZoomIn, ZoomOut, Maximize } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

const OrgNode = ({ node }: { node: any }) => (
  <div className="org-tree-node">
    <Card className="w-56 p-4 text-center z-10 shadow-sm border-border bg-card hover:border-brand-vividBlue hover:shadow-md transition-all duration-300 relative group">
      <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-transparent group-hover:border-brand-vividBlue/20 transition-colors bg-muted">
        <AvatarImage
          src={
            node.photo_url ||
            `https://img.usecurling.com/ppl/thumbnail?seed=${encodeURIComponent(node.name)}`
          }
          crossOrigin="anonymous"
        />
        <AvatarFallback>{node.name.charAt(0)}</AvatarFallback>
      </Avatar>
      <h4 className="font-semibold text-sm text-foreground truncate" title={node.name}>
        {node.name}
      </h4>
      <p
        className="text-xs text-muted-foreground truncate font-medium mt-1"
        title={node.org_functions?.name}
      >
        {node.org_functions?.name || 'Sem função'}
      </p>
      {node.org_units?.name && (
        <div className="mt-2 w-full px-2">
          <div className="text-[10px] text-blue-600 dark:text-blue-400 font-medium truncate bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/50 max-w-full inline-block">
            {node.org_units.name}
          </div>
        </div>
      )}
    </Card>
    {node.children?.length > 0 && (
      <div className="org-tree-group">
        {node.children.map((child: any) => (
          <OrgNode key={child.id} node={child} />
        ))}
      </div>
    )}
  </div>
)

export default function OrgDashboard() {
  const { activeClient } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()

  const [collaborators, setCollaborators] = useState<any[]>([])
  const [units, setUnits] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState('all')
  const [selectedUnit, setSelectedUnit] = useState('all')

  const [loading, setLoading] = useState(true)
  const [exporting, setExporting] = useState(false)
  const [zoom, setZoom] = useState(1)

  const scrollRef = useRef<HTMLDivElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [startX, setStartX] = useState(0)
  const [startY, setStartY] = useState(0)
  const [scrollLeft, setScrollLeft] = useState(0)
  const [scrollTop, setScrollTop] = useState(0)

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollRef.current) return
    setIsDragging(true)
    setStartX(e.pageX - scrollRef.current.offsetLeft)
    setStartY(e.pageY - scrollRef.current.offsetTop)
    setScrollLeft(scrollRef.current.scrollLeft)
    setScrollTop(scrollRef.current.scrollTop)
  }

  const handleMouseLeave = () => setIsDragging(false)
  const handleMouseUp = () => setIsDragging(false)

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollRef.current) return
    e.preventDefault()
    const x = e.pageX - scrollRef.current.offsetLeft
    const y = e.pageY - scrollRef.current.offsetTop
    const walkX = (x - startX) * 1.5
    const walkY = (y - startY) * 1.5
    scrollRef.current.scrollLeft = scrollLeft - walkX
    scrollRef.current.scrollTop = scrollTop - walkY
  }

  useEffect(() => {
    if (!activeClient) return
    const loadUnits = async () => {
      try {
        const data = await getOrgUnits(activeClient.id)
        setUnits(data || [])
      } catch (e) {
        console.error(e)
      }
    }
    loadUnits()
  }, [activeClient])

  useEffect(() => {
    if (!activeClient) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await getOrgCollaborators(activeClient.id, selectedPlant)
        setCollaborators(data || [])
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeClient, selectedPlant])

  const filteredCollaborators =
    selectedUnit === 'all' ? collaborators : collaborators.filter((c) => c.unit_id === selectedUnit)

  const buildTree = (nodes: any[], parentId: string | null = null): any[] => {
    return nodes
      .filter((n) => n.manager_id === parentId)
      .map((n) => ({ ...n, children: buildTree(nodes, n.id) }))
  }

  const rootNodes = filteredCollaborators
    .filter((c) => !c.manager_id || !filteredCollaborators.some((fc) => fc.id === c.manager_id))
    .map((r) => ({ ...r, children: buildTree(filteredCollaborators, r.id) }))

  const handleZoomIn = () => setZoom((z) => Math.min(z + 0.1, 2))
  const handleZoomOut = () => setZoom((z) => Math.max(z - 0.1, 0.3))
  const handleZoomReset = () => setZoom(1)

  useEffect(() => {
    if (!loading && rootNodes.length > 0 && scrollRef.current) {
      const timer = setTimeout(() => {
        if (scrollRef.current) {
          const { scrollWidth, clientWidth } = scrollRef.current
          scrollRef.current.scrollLeft = (scrollWidth - clientWidth) / 2
          scrollRef.current.scrollTop = 0
        }
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [loading, selectedPlant, selectedUnit])

  const handleExportPNG = async () => {
    const element = document.getElementById('org-chart-container')
    if (!element) return

    setExporting(true)
    const originalZoom = zoom
    setZoom(1) // Reset zoom temporariamente para capturar sem distorção

    // Aguardar o re-render com zoom 1
    await new Promise((res) => setTimeout(res, 300))

    try {
      if (!(window as any).html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement('script')
          script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'
          script.onload = resolve
          script.onerror = reject
          document.head.appendChild(script)
        })
      }

      await new Promise((res) => setTimeout(res, 300))

      const isDark = document.documentElement.classList.contains('dark')
      const canvas = await (window as any).html2canvas(element, {
        backgroundColor: isDark ? '#0f172a' : '#ffffff',
        useCORS: true,
        scale: 2,
        logging: false,
        onclone: (clonedDoc: Document) => {
          // Remove as classes de truncate para que o texto quebre linhas na exportação
          // Evitando corte de texto em nomes e cargos
          const nodes = clonedDoc.querySelectorAll('.truncate')
          nodes.forEach((node: any) => {
            node.classList.remove('truncate')
            node.style.whiteSpace = 'normal'
            node.style.wordBreak = 'break-word'
          })
        },
      })

      const dataUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `organograma-${activeClient?.name?.replace(/\s+/g, '-').toLowerCase() || 'empresa'}.png`
      link.href = dataUrl
      link.click()

      toast({
        title: 'Exportação concluída',
        description: 'O organograma foi baixado com sucesso.',
      })
    } catch (error) {
      console.error('Failed to export PNG', error)
      toast({
        title: 'Erro ao exportar',
        description: 'Não foi possível gerar a imagem do organograma.',
        variant: 'destructive',
      })
    } finally {
      setZoom(originalZoom)
      setExporting(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto overflow-hidden">
      <style>{`
        .org-tree {
          display: flex;
          justify-content: center;
          align-items: flex-start;
          flex-wrap: nowrap;
          gap: 2rem;
        }
        .org-tree-group {
          padding-top: 24px;
          position: relative;
          display: flex;
          justify-content: center;
        }
        .org-tree-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 24px 12px 0 12px;
          flex-shrink: 0;
        }
        .org-tree-node::before, .org-tree-node::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 3px solid hsl(var(--primary));
          width: 50%;
          height: 24px;
        }
        .org-tree-node::after {
          right: auto;
          left: 50%;
          border-left: 3px solid hsl(var(--primary));
        }
        .org-tree-node:only-child::after, .org-tree-node:only-child::before {
          display: none;
        }
        .org-tree-node:only-child {
          padding-top: 0;
        }
        .org-tree-node:first-child::before, .org-tree-node:last-child::after {
          border: 0 none;
        }
        .org-tree-node:last-child::before {
          border-right: 3px solid hsl(var(--primary));
          border-radius: 0 6px 0 0;
        }
        .org-tree-node:first-child::after {
          border-radius: 6px 0 0 0;
        }
        .org-tree-group::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 3px solid hsl(var(--primary));
          width: 0;
          height: 24px;
          transform: translateX(-50%);
        }
        .org-tree > .org-tree-node::before,
        .org-tree > .org-tree-node::after {
          display: none;
        }
        .org-tree > .org-tree-node {
          padding-top: 0;
        }
      `}</style>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Network className="h-6 w-6 text-brand-vividBlue" /> Painel do Organograma
          </h1>
          <p className="text-muted-foreground">Visualize a hierarquia da sua empresa.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center gap-2 bg-background border border-border rounded-md p-1 shadow-sm">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomOut}
              disabled={zoom <= 0.3}
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-xs font-medium w-10 text-center">{Math.round(zoom * 100)}%</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomIn}
              disabled={zoom >= 2}
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={handleZoomReset}
              title="Resetar Zoom"
            >
              <Maximize className="h-4 w-4" />
            </Button>
          </div>

          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-full sm:w-40">
              <SelectValue placeholder="Filtrar Planta" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Plantas</SelectItem>
              {plants.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedUnit} onValueChange={setSelectedUnit}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="Filtrar Setor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Setores</SelectItem>
              {units.map((u) => (
                <SelectItem key={u.id} value={u.id}>
                  {u.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            onClick={handleExportPNG}
            disabled={loading || rootNodes.length === 0 || exporting}
            className="gap-2"
          >
            {exporting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Download className="h-4 w-4" />
            )}
            <span className="hidden sm:inline">Exportar PNG</span>
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        className={cn(
          'w-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-border overflow-auto h-[650px] shadow-inner relative',
          isDragging ? 'cursor-grabbing select-none' : 'cursor-grab',
        )}
      >
        {loading ? (
          <div className="flex items-center justify-center h-full w-full absolute inset-0">
            <p className="text-muted-foreground animate-pulse">Desenhando organograma...</p>
          </div>
        ) : rootNodes.length > 0 ? (
          <div style={{ zoom: zoom as any }} className="min-w-max min-h-max p-8">
            <div
              id="org-chart-container"
              className="w-max min-w-full min-h-full flex justify-center items-start bg-transparent"
            >
              <div className="org-tree mx-auto">
                {rootNodes.map((root) => (
                  <OrgNode key={root.id} node={root} />
                ))}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-center max-w-sm mx-auto">
            <Network className="h-12 w-12 text-muted-foreground/30 mb-4" />
            <p className="text-muted-foreground text-lg">
              Nenhum colaborador encontrado para esta visualização.
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Cadastre colaboradores e defina suas subordinações no menu de Cadastros.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
