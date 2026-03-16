import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Building2, Users, Wrench, Target } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function DashboardFilters({
  plants,
  selectedPlants,
  setSelectedPlants,
  dateFrom,
  setDateFrom,
  dateTo,
  setDateTo,
  referenceMonth,
  setReferenceMonth,
  activeTab,
  setActiveTab,
  brandSecondary,
}: any) {
  const toggleAllPlants = () => {
    setSelectedPlants(selectedPlants.length === plants.length ? [] : plants.map((p: any) => p.id))
  }
  const togglePlant = (id: string) => {
    setSelectedPlants((prev: string[]) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id],
    )
  }

  const tabs = [
    { id: 'colaboradores', icon: Users, label: 'Colaboradores' },
    { id: 'equipamentos', icon: Wrench, label: 'Equipamentos' },
    { id: 'metas', icon: Target, label: 'Metas' },
  ]

  return (
    <>
      <Card className="shadow-subtle border-border bg-card">
        <CardHeader className="py-3 px-4 lg:px-6 bg-muted/30 border-b border-border">
          <CardTitle className="text-xs lg:text-sm font-semibold flex items-center gap-2 text-foreground/90">
            <Building2 className="h-4 w-4 text-muted-foreground" /> Seleção de Plantas
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 lg:px-6">
          <div className="flex flex-wrap items-center gap-4 lg:gap-6">
            <div className="flex items-center space-x-2 bg-background border border-border px-3 py-1.5 rounded-md shadow-sm">
              <Checkbox
                id="all-plants"
                checked={selectedPlants.length > 0 && selectedPlants.length === plants.length}
                onCheckedChange={toggleAllPlants}
              />
              <label
                htmlFor="all-plants"
                className="text-xs lg:text-sm font-medium leading-none cursor-pointer"
              >
                Todas as plantas
              </label>
            </div>
            {plants.map((p: any) => (
              <div key={p.id} className="flex items-center space-x-2">
                <Checkbox
                  id={`plant-${p.id}`}
                  checked={selectedPlants.includes(p.id)}
                  onCheckedChange={() => togglePlant(p.id)}
                />
                <label
                  htmlFor={`plant-${p.id}`}
                  className="text-xs lg:text-sm text-muted-foreground cursor-pointer hover:text-foreground"
                >
                  {p.name}
                </label>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-subtle border-border overflow-hidden rounded-xl bg-card">
        <CardContent className="p-0 flex flex-col xl:flex-row divide-y border-border xl:divide-y-0 xl:divide-x">
          <div className="flex gap-4 items-center p-3 lg:p-4 xl:px-6 bg-muted/20">
            <div className="space-y-1.5">
              <Label className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
                De
              </Label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[130px] lg:w-[140px] h-8 lg:h-9 text-xs lg:text-sm bg-background"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
                Até
              </Label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[130px] lg:w-[140px] h-8 lg:h-9 text-xs lg:text-sm bg-background"
              />
            </div>
            {activeTab === 'metas' && (
              <div className="space-y-1.5 ml-2 lg:ml-4 border-l border-border pl-4">
                <Label className="text-[10px] lg:text-xs text-muted-foreground uppercase tracking-wider">
                  Mês Ref.
                </Label>
                <Input
                  type="month"
                  value={referenceMonth}
                  onChange={(e) => setReferenceMonth(e.target.value)}
                  className="w-[140px] lg:w-[150px] h-8 lg:h-9 text-xs lg:text-sm bg-background"
                />
              </div>
            )}
          </div>
          <div className="flex-1 flex gap-2 p-3 lg:p-4 xl:px-6 bg-muted/20 justify-start xl:justify-end items-center overflow-x-auto no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                className={cn(
                  'flex items-center gap-1.5 lg:gap-2 px-3 py-1.5 lg:px-4 lg:py-2 rounded-lg text-xs lg:text-sm font-medium transition-all border whitespace-nowrap',
                  activeTab === t.id
                    ? 'text-white border-transparent shadow-sm'
                    : 'bg-background text-muted-foreground border-border hover:bg-muted',
                )}
                style={activeTab === t.id ? { backgroundColor: brandSecondary } : {}}
              >
                <t.icon className="h-3.5 w-3.5 lg:h-4 lg:w-4" /> {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  )
}
