import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import { useToast } from '@/hooks/use-toast'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { format } from 'date-fns'

export default function Lancamentos() {
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [plantId, setPlantId] = useState<string>('')
  const [activeTab, setActiveTab] = useState('staff')
  const [presences, setPresences] = useState<Record<string, boolean>>({})
  const [isSaving, setIsSaving] = useState(false)
  const { toast } = useToast()
  const { plants, employees, equipment, functions, locations } = useMasterData()
  const { profile } = useAppStore()

  useEffect(() => {
    if (!plantId || !profile) return
    const fetchLogs = async () => {
      const { data } = await supabase
        .from('daily_logs')
        .select('*')
        .eq('date', date)
        .eq('plant_id', plantId)
        .eq('type', activeTab)

      const p: Record<string, boolean> = {}
      if (data)
        data.forEach((d) => {
          p[d.reference_id] = d.status
        })
      setPresences(p)
    }
    fetchLogs()
  }, [date, plantId, activeTab, profile])

  const handleSave = async () => {
    if (!profile || !plantId) return
    setIsSaving(true)
    const list =
      activeTab === 'staff'
        ? employees.filter((e) => e.plant_id === plantId)
        : equipment.filter((e) => e.plant_id === plantId)

    const payload = list.map((item) => ({
      client_id: profile.client_id,
      plant_id: plantId,
      date,
      type: activeTab,
      reference_id: item.id,
      status: presences[item.id] ?? false,
    }))

    if (payload.length > 0) {
      const { error } = await supabase
        .from('daily_logs')
        .upsert(payload, { onConflict: 'date,type,reference_id' })
      if (!error) toast({ title: 'Lançamentos salvos com sucesso' })
      else toast({ variant: 'destructive', title: 'Erro ao salvar lançamentos' })
    }
    setIsSaving(false)
  }

  const listToRender =
    activeTab === 'staff'
      ? employees.filter((e) => e.plant_id === plantId)
      : equipment.filter((e) => e.plant_id === plantId)

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-12 animate-fade-in">
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">Lançamentos Diários</h2>
        <p className="text-muted-foreground mt-1">Registre a presença operacional da planta.</p>
      </div>

      <Card className="shadow-sm border-brand-light">
        <CardContent className="p-4 flex flex-col sm:flex-row gap-4">
          <div className="space-y-1">
            <Label htmlFor="date">Data Referência</Label>
            <Input
              type="date"
              id="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-1 flex-1 max-w-[300px]">
            <Label>Planta</Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger className="bg-white">
                <SelectValue placeholder="Selecione a planta" />
              </SelectTrigger>
              <SelectContent>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {plantId && (
        <div className="space-y-4">
          <ToggleGroup
            type="single"
            value={activeTab}
            onValueChange={(v) => v && setActiveTab(v)}
            className="justify-start"
          >
            <ToggleGroupItem
              value="staff"
              className="data-[state=on]:bg-brand-blue data-[state=on]:text-white"
            >
              Colaboradores
            </ToggleGroupItem>
            <ToggleGroupItem
              value="equipment"
              className="data-[state=on]:bg-brand-blue data-[state=on]:text-white"
            >
              Equipamentos
            </ToggleGroupItem>
          </ToggleGroup>

          <Card className="shadow-sm border-brand-light overflow-hidden">
            <CardContent className="p-0">
              <div className="divide-y max-h-[500px] overflow-y-auto">
                {listToRender.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">
                    Nenhum registro encontrado para esta planta.
                  </div>
                ) : (
                  listToRender.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between p-4 hover:bg-muted/30 transition-colors"
                    >
                      <div>
                        <p className="font-medium text-brand-graphite">{item.name}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {activeTab === 'staff'
                            ? functions.find((f) => f.id === item.function_id)?.name
                            : item.type}
                          {activeTab === 'staff' &&
                            item.location_id &&
                            ` • ${locations.find((l) => l.id === item.location_id)?.name}`}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-sm font-medium ${presences[item.id] ? 'text-green-600' : 'text-red-500'}`}
                        >
                          {presences[item.id]
                            ? activeTab === 'staff'
                              ? 'Presente'
                              : 'Disponível'
                            : activeTab === 'staff'
                              ? 'Ausente'
                              : 'Indisponível'}
                        </span>
                        <Switch
                          checked={presences[item.id] || false}
                          onCheckedChange={(v) =>
                            setPresences((prev) => ({ ...prev, [item.id]: v }))
                          }
                          className="data-[state=checked]:bg-green-600"
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
              {listToRender.length > 0 && (
                <div className="p-4 bg-muted/30 border-t flex justify-end">
                  <Button onClick={handleSave} disabled={isSaving} className="min-w-[150px]">
                    {isSaving ? 'Salvando...' : 'Salvar Lançamentos'}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
