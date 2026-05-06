import { useState } from 'react'
import { useMasterData } from '@/hooks/use-master-data'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { format } from 'date-fns'
import { Search } from 'lucide-react'
import { useTreinamentos } from './hooks/use-treinamentos'
import { TreinamentosList } from './components/TreinamentosList'
import { useAppStore } from '@/store/AppContext'

export default function Treinamentos() {
  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [referenceMonth, setReferenceMonth] = useState(format(new Date(), 'yyyy-MM'))
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'valid'>('all')
  const [search, setSearch] = useState('')
  const { profile } = useAppStore()
  const { plants } = useMasterData()

  const authorizedPlants =
    profile?.role === 'Master' || profile?.role === 'Administrador'
      ? plants
      : (plants || []).filter((p) => profile?.authorized_plants?.includes(p.id))

  const { data, loading } = useTreinamentos(
    selectedPlant === 'all' ? '' : selectedPlant,
    referenceMonth,
  )

  const filteredData = data.filter((emp) => {
    if (statusFilter === 'pending' && emp.status === 'valid') return false
    if (statusFilter === 'valid' && emp.status !== 'valid') return false

    if (search) {
      const s = search.toLowerCase()
      return emp.name.toLowerCase().includes(s) || emp.company_name.toLowerCase().includes(s)
    }
    return true
  })

  return (
    <div className="w-full max-w-[1600px] mx-auto space-y-4 lg:space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col gap-1 mb-2">
        <h2 className="text-2xl lg:text-3xl font-bold tracking-tight text-foreground">
          Controle de Treinamentos
        </h2>
        <p className="text-muted-foreground text-xs lg:text-sm">
          Acompanhamento de treinamentos obrigatórios e vencidos do quadro de terceiros
        </p>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filtros</CardTitle>
          <CardDescription>
            Refine a busca por planta, mês de referência e status do treinamento.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Mês de Referência
            </label>
            <Input
              type="month"
              value={referenceMonth}
              onChange={(e) => setReferenceMonth(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Planta
            </label>
            <Select value={selectedPlant} onValueChange={setSelectedPlant}>
              <SelectTrigger>
                <SelectValue placeholder="Todas as Plantas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as Plantas</SelectItem>
                {authorizedPlants?.map((plant: any) => (
                  <SelectItem key={plant.id} value={plant.id}>
                    {plant.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Status
            </label>
            <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes / Vencidos</SelectItem>
                <SelectItem value="valid">Realizados / Válidos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Buscar Colaborador/Empresa
            </label>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar nome..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <TreinamentosList data={filteredData} loading={loading} />
    </div>
  )
}
