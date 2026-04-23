import { useState, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getOrgCollaborators } from '@/services/organograma'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Network } from 'lucide-react'

const OrgNode = ({ node }: { node: any }) => (
  <div className="org-tree-node">
    <Card className="w-56 p-4 text-center z-10 shadow-sm border-border bg-card hover:border-brand-vividBlue hover:shadow-md transition-all duration-300 relative group">
      <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-transparent group-hover:border-brand-vividBlue/20 transition-colors">
        <AvatarImage
          src={node.photo_url || `https://img.usecurling.com/ppl/thumbnail?seed=${node.name}`}
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
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [selectedPlant, setSelectedPlant] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!activeClient) return
    const load = async () => {
      setLoading(true)
      try {
        const data = await getOrgCollaborators(activeClient.id, selectedPlant)
        setCollaborators(data)
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [activeClient, selectedPlant])

  const buildTree = (nodes: any[], parentId: string | null = null): any[] => {
    return nodes
      .filter((n) => n.manager_id === parentId)
      .map((n) => ({ ...n, children: buildTree(nodes, n.id) }))
  }

  const rootNodes = buildTree(collaborators, null)

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
          padding-top: 20px;
          position: relative;
          display: flex;
          justify-content: center;
        }
        .org-tree-node {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          padding: 20px 10px 0 10px;
          flex-shrink: 0;
        }
        /* Horizontal line on top of each child node */
        .org-tree-node::before, .org-tree-node::after {
          content: '';
          position: absolute;
          top: 0;
          right: 50%;
          border-top: 2px solid hsl(var(--border));
          width: 50%;
          height: 20px;
        }
        .org-tree-node::after {
          right: auto;
          left: 50%;
          border-left: 2px solid hsl(var(--border));
        }
        /* Remove connectors for single child */
        .org-tree-node:only-child::after, .org-tree-node:only-child::before {
          display: none;
        }
        .org-tree-node:only-child {
          padding-top: 0;
        }
        /* Remove left line from first child, right line from last child */
        .org-tree-node:first-child::before, .org-tree-node:last-child::after {
          border: 0 none;
        }
        /* Add curve to first and last child */
        .org-tree-node:last-child::before {
          border-right: 2px solid hsl(var(--border));
          border-radius: 0 6px 0 0;
        }
        .org-tree-node:first-child::after {
          border-radius: 6px 0 0 0;
        }
        /* Line coming down from parent card to the horizontal line */
        .org-tree-group::before {
          content: '';
          position: absolute;
          top: 0;
          left: 50%;
          border-left: 2px solid hsl(var(--border));
          width: 0;
          height: 20px;
          transform: translateX(-50%);
        }
        /* Hide top lines for root nodes */
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
        <div className="w-full sm:w-64">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por Planta" />
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
        </div>
      </div>

      <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-border p-8 overflow-x-auto min-h-[500px] flex justify-center shadow-inner relative">
        {loading ? (
          <div className="flex items-center justify-center h-full w-full absolute inset-0">
            <p className="text-muted-foreground animate-pulse">Desenhando organograma...</p>
          </div>
        ) : rootNodes.length > 0 ? (
          <div className="pt-4 pb-12 w-max min-w-full flex justify-center">
            <div className="org-tree">
              {rootNodes.map((root) => (
                <OrgNode key={root.id} node={root} />
              ))}
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
