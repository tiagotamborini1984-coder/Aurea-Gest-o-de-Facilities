import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Clock, UserCheck, Building2, MapPin, Search } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

interface EmployeeOption {
  id: string
  name: string
  company_id: string
  company_name: string
  plant_id: string
  client_id: string
  status: string
}

interface PlantOption {
  id: string
  name: string
  code?: string
}

interface SolicitacaoHeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  plants: PlantOption[]
  onSubmit: (data: {
    employee_id: string
    employee_name: string
    company_id: string | null
    company_name: string
    plant_id: string
    date: string
    hours: number
    reason: string
  }) => Promise<void>
}

export function SolicitacaoHeDialog({
  open,
  onOpenChange,
  employees,
  plants,
  onSubmit,
}: SolicitacaoHeDialogProps) {
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [searchEmployeeText, setSearchEmployeeText] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [hours, setHours] = useState('2.0')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Colaborador atualmente selecionado
  const selectedEmployee = useMemo(() => {
    return employees.find((e) => e.id === selectedEmployeeId) || null
  }, [employees, selectedEmployeeId])

  // Planta vinculada ao colaborador
  const employeePlant = useMemo(() => {
    if (!selectedEmployee) return null
    return plants.find((p) => p.id === selectedEmployee.plant_id) || null
  }, [selectedEmployee, plants])

  // Lista de colaboradores filtrada pelo campo de busca
  const filteredEmployees = useMemo(() => {
    if (!searchEmployeeText.trim()) return employees.slice(0, 100)
    const term = searchEmployeeText.toLowerCase()
    return employees
      .filter(
        (e) => e.name.toLowerCase().includes(term) || e.company_name?.toLowerCase().includes(term),
      )
      .slice(0, 100)
  }, [employees, searchEmployeeText])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEmployee) {
      toast.error('Selecione o colaborador terceiro.')
      return
    }

    const numHours = parseFloat(hours.replace(',', '.'))
    if (isNaN(numHours) || numHours <= 0 || numHours > 24) {
      toast.error('Informe uma quantidade de horas válida (entre 0.1 e 24h).')
      return
    }

    if (!date) {
      toast.error('Informe a data da hora extra.')
      return
    }

    setIsSubmitting(true)
    try {
      await onSubmit({
        employee_id: selectedEmployee.id,
        employee_name: selectedEmployee.name,
        company_id: selectedEmployee.company_id || null,
        company_name: selectedEmployee.company_name || 'Terceiro',
        plant_id: selectedEmployee.plant_id,
        date,
        hours: numHours,
        reason: reason.trim(),
      })

      // Reset
      setSelectedEmployeeId('')
      setSearchEmployeeText('')
      setHours('2.0')
      setReason('')
      onOpenChange(false)
    } catch (err) {
      // Toast já tratado no pai
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-slate-900">
              <Clock className="h-5 w-5 text-brand-vividBlue" />
              Solicitação de Horas Extras
            </DialogTitle>
            <DialogDescription>
              Registre uma solicitação de HE para um colaborador terceiro. A solicitação nascerá
              como <strong>Pendente</strong> e aguardará aprovação do Gestor/Administrador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            {/* Seletor de Colaborador com busca */}
            <div className="space-y-2">
              <Label htmlFor="searchEmp">Colaborador Terceiro</Label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-slate-400" />
                <Input
                  id="searchEmp"
                  placeholder="Filtrar por nome ou empresa..."
                  className="pl-9"
                  value={searchEmployeeText}
                  onChange={(e) => setSearchEmployeeText(e.target.value)}
                />
              </div>

              <Select value={selectedEmployeeId} onValueChange={setSelectedEmployeeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o colaborador terceiro..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500 text-center">
                      Nenhum colaborador terceiro encontrado.
                    </div>
                  ) : (
                    filteredEmployees.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        <span className="font-medium">{e.name}</span> —{' '}
                        <span className="text-slate-500 text-xs">{e.company_name}</span>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Informações automáticas da empresa e planta */}
            {selectedEmployee && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-brand-vividBlue" />
                  <span>
                    <strong>Colaborador:</strong> {selectedEmployee.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    <strong>Empresa Contratada:</strong> {selectedEmployee.company_name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    <strong>Planta / Unidade:</strong>{' '}
                    {employeePlant?.name || 'Vinculada ao cadastro'}
                  </span>
                </div>
              </div>
            )}

            {/* Data e Horas em grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="heDate">Data da Hora Extra</Label>
                <Input
                  id="heDate"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="heHours">Quantidade de Horas</Label>
                <Input
                  id="heHours"
                  type="number"
                  step="0.5"
                  min="0.1"
                  max="24"
                  placeholder="Ex: 2.0"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Justificativa / Motivo */}
            <div className="space-y-2">
              <Label htmlFor="heReason">Justificativa / Motivo da HE (Opcional)</Label>
              <Textarea
                id="heReason"
                rows={3}
                placeholder="Ex: Cobertura de plantão, evento de fim de semana, manutenção emergencial..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white"
              disabled={isSubmitting || !selectedEmployeeId}
            >
              {isSubmitting ? 'Registrando...' : 'Registrar Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
