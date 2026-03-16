import { useState } from 'react'
import { useMasterData } from '@/hooks/use-master-data'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Loader2, Settings2, X, Calendar as CalendarIcon } from 'lucide-react'
import { useBIDashboard } from './hooks/useBIDashboard'
import { DraggableWidget } from './components/DraggableWidget'
import { ChartPlants, ChartTrend } from './components/BICharts'
import { RankingList } from './components/BIRankings'

const initialWidgets = [
  {
    id: 'chart-plants',
    title: 'Taxa Presença vs Absenteísmo por Planta',
    size: 'col-span-1 lg:col-span-2 xl:col-span-1',
  },
  {
    id: 'chart-trend',
    title: 'Tendência de Disponibilidade - Equipamentos',
    size: 'col-span-1 lg:col-span-2 xl:col-span-1',
  },
  { id: 'rank-plants', title: 'Ranking de Plantas (Absenteísmo)', size: 'col-span-1' },
  { id: 'rank-employees', title: 'Ranking de Colaboradores (Faltas)', size: 'col-span-1' },
  {
    id: 'rank-equipments',
    title: 'Ranking de Equipamentos (Indisponibilidade)',
    size: 'col-span-1',
  },
]

export default function BIDashboard() {
  const { plants, contracted, employees, equipment } = useMasterData()
  const biData = useBIDashboard(plants, contracted, employees, equipment)

  const [widgets, setWidgets] = useState(initialWidgets.map((w) => ({ ...w, visible: true })))

  const toggleWidget = (id: string) => {
    setWidgets((prev) => prev.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)))
  }

  const handleReorder = (sourceId: string, targetId: string) => {
    setWidgets((prev) => {
      const arr = [...prev]
      const sIdx = arr.findIndex((w) => w.id === sourceId)
      const tIdx = arr.findIndex((w) => w.id === targetId)
      const [item] = arr.splice(sIdx, 1)
      arr.splice(tIdx, 0, item)
      return arr
    })
  }

  if (biData.loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-brand-blue" />
      </div>
    )
  }

  const renderWidgetContent = (id: string) => {
    switch (id) {
      case 'chart-plants':
        return (
          <ChartPlants
            data={biData.pData}
            onPlantClick={biData.setSelectedPlantId}
            selectedPlantId={biData.selectedPlantId}
          />
        )
      case 'chart-trend':
        return <ChartTrend data={biData.tData} />
      case 'rank-plants':
        return <RankingList items={biData.rankPlants} valueSuffix="%" />
      case 'rank-employees':
        return <RankingList items={biData.rankEmp} valueSuffix=" faltas" />
      case 'rank-equipments':
        return <RankingList items={biData.rankEq} valueSuffix=" instâncias" />
      default:
        return null
    }
  }

  return (
    <div className="max-w-[1600px] mx-auto space-y-6 pb-12 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold tracking-tight text-foreground">BI Dashboard</h2>
            {biData.selectedPlantId && (
              <Badge
                variant="secondary"
                className="cursor-pointer bg-primary/10 hover:bg-primary/20 text-primary border-primary/20"
                onClick={() => biData.setSelectedPlantId(null)}
              >
                Filtro: {plants.find((p) => p.id === biData.selectedPlantId)?.name}
                <X className="ml-1.5 h-3 w-3" />
              </Badge>
            )}
          </div>
          <p className="text-muted-foreground mt-1 text-sm">
            Análise gráfica interativa (arraste os painéis para reordenar).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 bg-white p-2 rounded-xl border border-border shadow-sm">
          <div className="flex items-center gap-2 relative">
            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              className="h-9 w-[140px] pl-9 text-xs bg-muted/20"
              value={biData.dateFrom}
              onChange={(e) => biData.setDateFrom(e.target.value)}
            />
          </div>
          <span className="text-muted-foreground text-sm font-medium">até</span>
          <div className="flex items-center gap-2 relative">
            <CalendarIcon className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              className="h-9 w-[140px] pl-9 text-xs bg-muted/20"
              value={biData.dateTo}
              onChange={(e) => biData.setDateTo(e.target.value)}
            />
          </div>

          <div className="w-[1px] h-6 bg-border mx-1" />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-9">
                <Settings2 className="h-4 w-4 mr-2" /> Personalizar
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
