import { useState, useEffect, useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, Truck, Target, TrendingDown, TrendingUp, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { format, subDays } from 'date-fns'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'

export default function DashboardGestor() {
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [selectedPlants, setSelectedPlants] = useState<string[]>([])
  const [activeTab, setActiveTab] = useState<'colaboradores' | 'equipamentos' | 'metas'>(
    'colaboradores',
  )
  const { plants, contracted, locations, goals } = useMasterData()
  const [logs, setLogs] = useState<any[]>([])

  useEffect(() => {
    const fetchLogs = async () => {
      if (plants.length === 0) return
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .gte('date', dateFrom)
        .lte('date', dateTo)
      setLogs(data || [])
    }
    fetchLogs()
  }, [dateFrom, dateTo, plants])

  const togglePlant = (id: string) => {
    setSelectedPlants((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }

  const metrics = useMemo(() => {
    const days = Math.max(
      1,
      (new Date(dateTo).getTime() - new Date(dateFrom).getTime()) / (1000 * 60 * 60 * 24),
    )
    const validPlants = selectedPlants.length > 0 ? selectedPlants : plants.map((p) => p.id)

    const filteredLogs = logs.filter((l) => validPlants.includes(l.plant_id))
    const staffLogs = filteredLogs.filter((l) => l.type === 'staff')
    const equipLogs = filteredLogs.filter((l) => l.type === 'equipment')

    const contractedStaff = contracted
      .filter((c) => c.type === 'colaborador' && validPlants.includes(c.plant_id))
      .reduce((a, b) => a + b.quantity, 0)
    const contractedEquip = contracted
      .filter((c) => c.type === 'equipamento' && validPlants.includes(c.plant_id))
      .reduce((a, b) => a + b.quantity, 0)

    const staffLancado = Math.round(staffLogs.length / days)
    const staffPresente = Math.round(staffLogs.filter((l) => l.status).length / days)
    const staffAusente = Math.max(0, staffLancado - staffPresente)
    const staffAbs =
      contractedStaff > 0
        ? Math.max(0, ((contractedStaff - staffPresente) / contractedStaff) * 100)
        : 0

    const equipLancado = Math.round(equipLogs.length / days)
    const equipPresente = Math.round(equipLogs.filter((l) => l.status).length / days)
    const equipAbs =
      contractedEquip > 0
        ? Math.max(0, ((contractedEquip - equipPresente) / contractedEquip) * 100)
        : 0

    return {
      staff: {
        lancado: staffLancado,
        contratado: contractedStaff,
        presente: staffPresente,
        ausente: staffAusente,
        absenteismo: staffAbs,
      },
      equip: {
        lancado: equipLancado,
        contratado: contractedEquip,
        presente: equipPresente,
        ausente: Math.max(0, equipLancado - equipPresente),
        absenteismo: equipAbs,
      },
    }
  }, [logs, contracted, dateFrom, dateTo, selectedPlants, plants])

  const activeMetrics = activeTab === 'colaboradores' ? metrics.staff : metrics.equip

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-12">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-brand-blue">Dashboard do Gestor</h2>
        <p className="text-muted-foreground mt-1">Visão geral do efetivo por período.</p>
      </div>

      <Card className="shadow-sm border-brand-light">
        <CardContent className="p-4 flex flex-col md:flex-row gap-6 items-start md:items-center">
          <div className="flex gap-2 items-center shrink-0">
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">De</label>
              <Input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[140px] h-9"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted-foreground">Até</label>
              <Input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[140px] h-9"
              />
            </div>
          </div>
          <div className="flex-1 min-w-0 w-full">
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Plantas</label>
            <div className="flex flex-wrap gap-2">
              <Badge
                variant={selectedPlants.length === 0 ? 'default' : 'outline'}
                className="cursor-pointer"
                onClick={() => setSelectedPlants([])}
              >
                Todas as plantas
              </Badge>
              {plants.map((p) => (
                <Badge
                  key={p.id}
                  variant={selectedPlants.includes(p.id) ? 'default' : 'outline'}
                  className="cursor-pointer"
                  onClick={() => togglePlant(p.id)}
                >
                  {p.name}
                </Badge>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <ToggleGroup
          type="single"
          value={activeTab}
          onValueChange={(v) => v && setActiveTab(v as any)}
          className="bg-white border rounded-lg p-1"
        >
          <ToggleGroupItem
            value="colaboradores"
            className="data-[state=on]:bg-green-600 data-[state=on]:text-white px-6"
          >
            <Users className="h-4 w-4 mr-2" /> Colaboradores
          </ToggleGroupItem>
          <ToggleGroupItem
            value="equipamentos"
            className="data-[state=on]:bg-brand-blue data-[state=on]:text-white px-6"
          >
            <Truck className="h-4 w-4 mr-2" /> Equipamentos
          </ToggleGroupItem>
          <ToggleGroupItem
            value="metas"
            className="data-[state=on]:bg-brand-graphite data-[state=on]:text-white px-6"
          >
            <Target className="h-4 w-4 mr-2" /> Book de Metas
          </ToggleGroupItem>
        </ToggleGroup>
      </div>

      {activeTab !== 'metas' ? (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 animate-fade-in">
          <Card className="shadow-sm">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-muted-foreground">Lançado</p>
                <p className="text-2xl font-bold mt-1">{activeMetrics.lancado}</p>
              </div>
              <div className="bg-muted p-2 rounded-full">
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-orange-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-orange-600">Contratado/dia</p>
                <p className="text-2xl font-bold mt-1 text-orange-700">
                  {activeMetrics.contratado}
                </p>
              </div>
              <div className="bg-orange-100 p-2 rounded-full">
                <Search className="h-4 w-4 text-orange-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-green-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-green-600">Presentes</p>
                <p className="text-2xl font-bold mt-1 text-green-700">{activeMetrics.presente}</p>
              </div>
              <div className="bg-green-100 p-2 rounded-full">
                <TrendingUp className="h-4 w-4 text-green-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-red-200">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-red-600">Ausentes</p>
                <p className="text-2xl font-bold mt-1 text-red-700">{activeMetrics.ausente}</p>
              </div>
              <div className="bg-red-100 p-2 rounded-full">
                <TrendingDown className="h-4 w-4 text-red-600" />
              </div>
            </CardContent>
          </Card>
          <Card className="shadow-sm border-brand-blue">
            <CardContent className="p-4 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-brand-blue">Absenteísmo</p>
                <p className="text-2xl font-bold mt-1 text-brand-blue">
                  {activeMetrics.absenteismo.toFixed(1)}%
                </p>
              </div>
              <div className="bg-brand-blue/10 p-2 rounded-full">
                <Target className="h-4 w-4 text-brand-blue" />
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card className="shadow-sm border-brand-light animate-fade-in">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Target className="h-5 w-5 text-brand-blue" /> Atingimento de Metas (Simulado)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded-lg bg-green-50/50">
                <span className="font-medium text-sm">Absenteísmo (Meta &lt; 4%)</span>
                <span className="text-green-600 font-bold text-sm">
                  100% Atingimento (Atual: {metrics.staff.absenteismo.toFixed(1)}%)
                </span>
              </div>
              <div className="flex justify-between items-center p-3 border rounded-lg">
                <span className="font-medium text-sm">Disponibilidade de Equipamentos</span>
                <span className="text-brand-graphite font-bold text-sm">
                  {metrics.equip.contratado > 0
                    ? ((metrics.equip.presente / metrics.equip.contratado) * 100).toFixed(1)
                    : 0}
                  %
                </span>
              </div>
              {goals
                .filter((g) => g.is_active)
                .map((g) => (
                  <div
                    key={g.id}
                    className="flex justify-between items-center p-3 border rounded-lg"
                  >
                    <span className="font-medium text-sm">{g.name}</span>
                    <span className="text-muted-foreground text-sm italic">
                      Aguardando fechamento do mês
                    </span>
                  </div>
                ))}
              <div className="flex justify-between items-center p-3 bg-brand-blue/5 rounded-lg border border-brand-blue/20 mt-4">
                <span className="font-bold text-brand-blue">Nota Geral (Média)</span>
                <span className="text-xl font-bold text-brand-blue">87.5%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {activeTab !== 'metas' && (
        <Card className="shadow-sm mt-6">
          <CardHeader>
            <CardTitle className="text-lg">Por Local</CardTitle>
          </CardHeader>
          <CardContent>
            {locations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {locations
                  .filter((l) => selectedPlants.length === 0 || selectedPlants.includes(l.plant_id))
                  .map((loc) => (
                    <div
                      key={loc.id}
                      className="p-4 border rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <p className="font-semibold text-brand-graphite">{loc.name}</p>
                      <p className="text-xs text-muted-foreground mb-3">
                        {plants.find((p) => p.id === loc.plant_id)?.name}
                      </p>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Presentes:</span>
                        <span className="font-medium">
                          {(activeTab === 'colaboradores'
                            ? metrics.staff.presente
                            : metrics.equip.presente) || '0'}
                        </span>
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                Sem dados de locais para o período selecionado.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
