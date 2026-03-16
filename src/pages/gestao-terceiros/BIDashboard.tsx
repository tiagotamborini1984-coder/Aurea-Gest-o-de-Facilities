import { useState } from 'react'
import { useMasterData } from '@/hooks/use-master-data'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Loader2, Settings2, Columns3 } from 'lucide-react'
import { useBIDashboard } from './hooks/useBIDashboard'
import { DraggableWidget } from './components/DraggableWidget'
import {
  ChartPlants,
  ChartLocalAbs,
  ChartEqDisp,
  ChartComparativeAbs,
  ChartGoals,
} from './components/BICharts'
import { RankingList } from './components/BIRankings'
import { BIFilters } from './components/BIFilters'

const initialWidgets = [
  {
    id: 'chart-plants',
    title: 'Presença vs Absenteísmo (Planta)',
    size: 'col-span-1 lg:col-span-2 xl:col-span-1',
  },
  {
    id: 'chart-local-abs',
    title: 'Absenteísmo por Local',
    size: 'col-span-1 lg:col-span-2 xl:col-span-1',
  },
  {
    id: 'chart-eq-disp',
    title: 'Disponibilidade de Equipamentos',
    size: 'col-span-1 lg:col-span-2 xl:col-span-1',
  },
  {
    id: 'chart-comp-abs',
    title: 'Comparativo de Absenteísmo',
    size: 'col-span-1 lg:col-span-2 xl:col-span-2',
  },
  {
    id: 'chart-goals',
    title: 'Metas vs Realizado (Atingimento %)',
    size: 'col-span-1 lg:col-span-2 xl:col-span-1',
  },
  { id: 'rank-plants', title: 'Ranking Plantas (Absenteísmo)', size: 'col-span-1' },
  { id: 'rank-employees', title: 'Ranking Colaboradores (Faltas)', size: 'col-span-1' },
  { id: 'rank-equipments', title: 'Ranking Equipamentos (Indisponibilidade)', size: 'col-span-1' },
]

export default function BIDashboard() {
  const { plants, contracted, employees, equipment, locations, goals } = useMasterData()
  const biData = useBIDashboard(plants, contracted, employees, equipment, locations, goals)
  const [widgets, setWidgets] = useState(initialWidgets.map((w) => ({ ...w, visible: true })))

  const toggleWidget = (id: string) =>
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  const handleReorder = (sourceId: string, targetId: string) => {
    setWidgets((prev) => {
      const arr = [...prev]
      const sIdx = arr.findIndex((w) => w.id === sourceId)
      const tIdx = arr.findIndex((w) => w.id === targetId)
      if (sIdx < 0 || tIdx < 0) return arr
      const [item] = arr.splice(sIdx, 1)
      arr.splice(tIdx, 0, item)
      return arr
    })
  }

  if (biData.loading)
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'chart-plants':
        return <ChartPlants data={biData.pData || []} colors={biData.colors} />
      case 'chart-local-abs':
        return <ChartLocalAbs data={biData.lData || []} colors={biData.colors} />
      case 'chart-eq-disp':
        return <ChartEqDisp data={biData.eData || []} colors={biData.colors} />
      case 'chart-comp-abs': {
        const compLocs = (locations || []).filter(
          (l) => l?.id && (biData.compSelectedLocs || []).includes(l.id),
        )
        return (
          <div className="flex flex-col h-full">
            <div className="flex justify-end mb-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 text-xs">
                    <Columns3 className="h-3 w-3 mr-2" /> Locais
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 max-h-64 overflow-y-auto">
                  {(locations || [])
                    .filter(
                      (l) => l?.plant_id && (biData.activePlantIds || []).includes(l.plant_id),
                    )
                    .map((loc) => (
                      <DropdownMenuCheckboxItem
                        key={loc.id}
                        checked={(biData.compSelectedLocs || []).includes(loc.id)}
                        onCheckedChange={(c) =>
                          biData.setCompSelectedLocs((prev) =>
                            c
                              ? [...(prev || []), loc.id]
                              : (prev || []).filter((id) => id !== loc.id),
                          )
                        }
                      >
                        {loc.name || 'Sem nome'}
                      </DropdownMenuCheckboxItem>
                    ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
            <ChartComparativeAbs
              data={biData.cData || []}
              locations={compLocs}
              colors={biData.colors}
            />
          </div>
        )
      }
      case 'chart-goals':
        return <ChartGoals data={biData.gData || []} colors={biData.colors} />
      case 'rank-plants':
        return (
          <RankingList items={biData.rankPlants || []} valueSuffix="%" colors={biData.colors} />
        )
      case 'rank-employees':
        return (
          <RankingList items={biData.rankEmp || []} valueSuffix=" faltas" colors={biData.colors} />
        )
      case 'rank-equipments':
        return (
          <RankingList
            items={biData.rankEq || []}
            valueSuffix=" instâncias"
            colors={biData.colors}
          />
        )
      default:
        return null
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">BI Dashboard</h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Análise gráfica interativa com filtros avançados e personalização.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <BIFilters
            dateRange={biData.dateRange}
            setDateRange={biData.setDateRange}
            selectedPlantId={biData.selectedPlantId}
            setSelectedPlantId={biData.setSelectedPlantId}
            authorizedPlants={biData.authPlants || []}
            colors={biData.colors}
            setColors={biData.setColors}
          />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="h-10 shadow-sm bg-card">
                <Settings2 className="h-4 w-4 mr-2" /> Painéis
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64">
              <DropdownMenuLabel>Painéis Visíveis</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {widgets.map((w) => (
                <DropdownMenuCheckboxItem
                  key={w.id}
                  checked={w.visible}
                  onCheckedChange={() => toggleWidget(w.id)}
                >
                  {w.title}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {widgets
          .filter((w) => w.visible)
          .map((w) => (
            <div key={w.id} className={w.size}>
              <DraggableWidget id={w.id} title={w.title} onReorder={handleReorder}>
                {renderWidgetContent(w.id)}
              </DraggableWidget>
            </div>
          ))}
      </div>
    </div>
  )
}
