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
    <Card className="w-48 p-4 text-center z-10 shadow-md border-border bg-card hover:border-brand-vividBlue transition-colors duration-300">
      <Avatar className="h-16 w-16 mx-auto mb-3 border-2 border-brand-vividBlue/20">
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
        <p className="text-[10px] text-blue-500 truncate mt-1 bg-blue-50 py-0.5 rounded-full">
          {node.org_units.name}
        </p>
      )}
    </Card>
    {node.children?.length > 0 && (
      <div className="org-tree-children">
        {node.children.map((child: any) => (
          <div key={child.id} className="org-tree-child">
            <OrgNode node={child} />
          </div>
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

      <div className="w-full bg-slate-50/50 dark:bg-slate-900/50 rounded-xl border border-border p-8 overflow-x-auto min-h-[500px] flex justify-center shadow-inner">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground animate-pulse">Desenhando organograma...</p>
          </div>
        ) : rootNodes.length > 0 ? (
          <div className="pt-4 pb-12 flex gap-12">
            {rootNodes.map((root) => (
              <OrgNode key={root.id} node={root} />
            ))}
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
