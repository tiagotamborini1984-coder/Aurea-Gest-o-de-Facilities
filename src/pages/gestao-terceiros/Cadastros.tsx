import { useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Wrench, Users, Plus } from 'lucide-react'
import { useMasterData } from '@/hooks/use-master-data'
import { useAppStore } from '@/store/AppContext'

export default function Cadastros() {
  const { type } = useParams()
  const { contracted, plants, equipment, functions, locations } = useMasterData()
  const { activeClient } = useAppStore()

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedType, setSelectedType] = useState<string>('all')

  const brandPrimary = activeClient?.primaryColor || 'hsl(var(--primary))'

  const filteredData = contracted.filter((c) => {
    if (selectedPlant !== 'all' && c.plant_id !== selectedPlant) return false
    if (selectedType !== 'all' && c.type !== selectedType) return false
    return true
  })

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-slate-800">Quadro Contratado</h2>
          <p className="text-muted-foreground text-sm mt-1">
            Quantidade contratada por função/equipamento, local e planta
          </p>
        </div>
        <Button
          className="shadow-sm gap-2"
          style={{ backgroundColor: brandPrimary, color: '#fff' }}
        >
          <Plus className="h-4 w-4" /> Novo Registro
        </Button>
      </div>

      <div className="flex gap-4 mb-6">
        <Select value={selectedPlant} onValueChange={setSelectedPlant}>
          <SelectTrigger className="w-[220px] bg-white border-slate-200">
            <SelectValue placeholder="Todas as plantas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as plantas</SelectItem>
            {plants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-[200px] bg-white border-slate-200">
            <SelectValue placeholder="Todos" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="colaborador">Colaborador</SelectItem>
            <SelectItem value="equipamento">Equipamento</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card className="border-slate-200 shadow-sm overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50/80 border-b border-slate-200">
            <TableRow className="hover:bg-transparent">
              <TableHead className="font-semibold text-slate-600">Tipo</TableHead>
              <TableHead className="font-semibold text-slate-600">Planta</TableHead>
              <TableHead className="font-semibold text-slate-600">Local / Equipamento</TableHead>
              <TableHead className="font-semibold text-slate-600">Função / Tipo Equip.</TableHead>
              <TableHead className="font-semibold text-center text-slate-600">
                Qtd. Contratada
              </TableHead>
              <TableHead className="font-semibold text-right pr-6 text-slate-600">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((c) => {
              const plantName = plants.find((p) => p.id === c.plant_id)?.name
              const locName = locations.find((l) => l.id === c.location_id)?.name
              const eqName = equipment.find((e) => e.id === c.equipment_id)?.name
              const funcName = functions.find((f) => f.id === c.function_id)?.name
              const eqType = equipment.find((e) => e.id === c.equipment_id)?.type

              const isEq = c.type === 'equipamento'

              return (
                <TableRow key={c.id} className="hover:bg-slate-50/50 transition-colors">
                  <TableCell className="py-3">
                    <Badge
                      variant="outline"
                      className={`gap-1.5 font-bold border-0 px-2.5 py-1 ${isEq ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}
                    >
                      {isEq ? <Wrench className="w-3 h-3" /> : <Users className="w-3 h-3" />}
                      <span className="capitalize">{c.type}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="font-semibold text-slate-700">{plantName}</TableCell>
                  <TableCell className="text-slate-600 uppercase text-xs font-semibold">
                    {isEq ? eqName : locName}
                  </TableCell>
                  <TableCell className="text-slate-600 uppercase text-xs font-semibold">
                    {isEq ? eqType : funcName}
                  </TableCell>
                  <TableCell className="text-center">
                    <span className="inline-flex items-center justify-center min-w-[32px] h-8 rounded-full bg-amber-100 text-amber-800 font-bold text-sm px-2.5 shadow-sm">
                      {c.quantity}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="flex items-center justify-end gap-3">
                      <button className="text-slate-400 hover:text-slate-700 transition-colors p-1">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button className="text-slate-400 hover:text-red-600 transition-colors p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              )
            })}
            {filteredData.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="h-32 text-center text-slate-500">
                  Nenhum registro encontrado.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
