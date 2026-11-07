import { useState, useMemo, useEffect } from 'react'
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
import { Clock, UserCheck, Building2, MapPin, Search, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { resolveActiveEmployees } from '@/lib/employee-vigencia'

interface EmployeeOption {
  id: string
  name: string
  company_id?: string | null
  company_name?: string | null
  plant_id: string
  client_id?: string
  status?: string | null
  registration_number?: string | null
  reference_month?: string | null
  created_at?: string | null
}

interface PlantOption {
  id: string
  name: string
  code?: string
}

export interface CostCenterOption {
  id: string
  name: string
  code?: string | null
}

interface SolicitacaoHeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  plants: PlantOption[]
  costCenters: CostCenterOption[]
  onSubmit: (data: {
    employee_id: string
    employee_name: string
    company_id: string | null
    company_name: string
    plant_id: string
    cost_center_id: string
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
  costCenters,
  onSubmit,
}: SolicitacaoHeDialogProps) {
  const [selectedPlantId, setSelectedPlantId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [selectedCostCenterId, setSelectedCostCenterId] = useState('')
  const [searchEmployeeText, setSearchEmployeeText] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [hours, setHours] = useState('2')
  const [reason, setReason] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Deduplicação defensiva: garante que cada pessoa apareça uma única vez
  const uniqueEmployees = useMemo(() => {
    return resolveActiveEmployees(employees as any[])
  }, [employees])

  // Colaborador atualmente selecionado
  const selectedEmployee = useMemo(() => {
    return uniqueEmployees.find((e) => e.id === selectedEmployeeId) || null
  }, [uniqueEmployees, selectedEmployeeId])

  // Planta selecionada filtra/limita os colaboradores oferecidos pela lista
  const plantScopedEmployees = useMemo(() => {
    if (!selectedPlantId) return uniqueEmployees
    return uniqueEmployees.filter((e) => e.plant_id === selectedPlantId)
  }, [uniqueEmployees, selectedPlantId])

  // Ao selecionar a planta, pré-seleciona um centro de custo do mesmo cliente? (não: CC é escolha do usuário).
  // Ao selecionar o colaborador, mantém a planta escolhida (pode ter sido trocada antes).

  // Lista de colaboradores filtrada pelo campo de busca (limitada pela planta quando houver)
  const filteredEmployees = useMemo(() => {
    const base = plantScopedEmployees
    if (!searchEmployeeText.trim()) return base.slice(0, 100)
    const term = searchEmployeeText.toLowerCase()
    return base
      .filter(
        (e) => e.name.toLowerCase().includes(term) || e.company_name?.toLowerCase().includes(term),
      )
      .slice(0, 100)
  }, [plantScopedEmployees, searchEmployeeText])

  // Se o colaborador selecionado não pertence mais à planta escolhida, limpa a seleção
  useEffect(() => {
    if (
      selectedEmployeeId &&
      selectedPlantId &&
      !plantScopedEmployees.some((e) => e.id === selectedEmployeeId)
    ) {
      setSelectedEmployeeId('')
    }
  }, [plantScopedEmployees, selectedEmployeeId, selectedPlantId])

  const resetForm = () => {
    setSelectedPlantId('')
    setSelectedEmployeeId('')
    setSelectedCostCenterId('')
    setSearchEmployeeText('')
    setHours('2')
    setReason('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPlantId) {
      toast.error('Selecione a planta / unidade da solicitação.')
      return
    }

    if (!selectedEmployee) {
      toast.error('Selecione o colaborador terceiro.')
      return
    }

    if (!selectedCostCenterId) {
      toast.error('O Centro de Custo pagador é obrigatório. Selecione um centro de custo.')
      return
    }

    const trimmedHours = (hours || '').toString().trim()
    if (!trimmedHours) {
      toast.error('Informe a quantidade de horas extras (ex.: 2 ou 1,5).')
      return
    }

    // Aceita formato com vírgula ou ponto (ex: 2, 1,5, 2.5)
    const normalizedHoursStr = trimmedHours.replace(',', '.')
    const numHours = parseFloat(normalizedHoursStr)

    if (isNaN(numHours)) {
      toast.error('Quantidade de horas inválida. Digite um número positivo como 2 ou 1,5.')
      return
    }

    if (numHours <= 0) {
      toast.error('A quantidade de horas deve ser maior que zero (ex.: 0,5, 1 ou 2).')
      return
    }

    if (numHours > 24) {
      toast.error('A quantidade de horas diárias não pode ultrapassar 24h.')
      return
    }

    // Arredonda para 2 casas decimais (compatível com numeric(5,2) do banco)
    const sanitizedHours = Math.round(numHours * 100) / 100

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
        plant_id: selectedPlantId,
        cost_center_id: selectedCostCenterId,
        date,
        hours: sanitizedHours,
        reason: reason.trim(),
      })

      // Reset
      resetForm()
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
            {/* Seletor de Planta em Lista Suspensa — posicionado ANTES do colaborador */}
            <div className="space-y-2">
              <Label htmlFor="hePlant" className="flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-brand-vividBlue" />
                <span>Planta / Unidade</span>
              </Label>
              <Select value={selectedPlantId} onValueChange={setSelectedPlantId}>
                <SelectTrigger id="hePlant">
                  <SelectValue placeholder="Selecione a planta autorizada..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {plants.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500 text-center">
                      Nenhuma planta autorizada disponível.
                    </div>
                  ) : (
                    plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name} {p.code ? `(${p.code})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Selecione primeiro a planta — a lista de colaboradores abaixo será limitada a ela.
              </p>
            </div>

            {/* Seletor de Colaborador com busca — limitado pela planta selecionada */}
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
                  <SelectValue
                    placeholder={
                      selectedPlantId
                        ? 'Selecione o colaborador da planta...'
                        : 'Selecione a planta para listar os colaboradores...'
                    }
                  />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredEmployees.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500 text-center">
                      {selectedPlantId
                        ? 'Nenhum colaborador terceiro desta planta encontrado.'
                        : 'Selecione a planta / unidade primeiro.'}
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
              <p className="text-[11px] text-slate-500">
                A planta do colaborador fica pré-selecionada acima e pode ser trocada conforme a
                unidade do serviço.
              </p>
            </div>

            {/* Centro de Custo pagador — campo obrigatório */}
            <div className="space-y-2">
              <Label htmlFor="heCostCenter" className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-brand-vividBlue" />
                <span>
                  Centro de Custo pagador <span className="text-rose-600">*</span>
                </span>
              </Label>
              <Select value={selectedCostCenterId} onValueChange={setSelectedCostCenterId}>
                <SelectTrigger id="heCostCenter">
                  <SelectValue placeholder="Selecione o centro de custo que pagará a HE..." />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {costCenters.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500 text-center">
                      Nenhum centro de custo cadastrado para este cliente
                      (módulo&nbsp;Gestão&nbsp;Budget).
                    </div>
                  ) : (
                    costCenters.map((cc) => (
                      <SelectItem key={cc.id} value={cc.id}>
                        {cc.name} {cc.code ? `(${cc.code})` : ''}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-slate-500">
                Obrigatório: identifica qual centro de custo absorverá o custo das horas extras.
              </p>
            </div>

            {/* Informações da empresa do colaborador */}
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
                    <strong>Empresa Contratada:</strong>{' '}
                    {selectedEmployee.company_name || 'Não informada'}
                  </span>
                </div>
                {selectedPlantId && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      <strong>Planta Selecionada:</strong>{' '}
                      {plants.find((p) => p.id === selectedPlantId)?.name || selectedPlantId}
                    </span>
                  </div>
                )}
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
                  type="text"
                  inputMode="decimal"
                  placeholder="Ex: 2 ou 1,5"
                  value={hours}
                  onChange={(e) => setHours(e.target.value)}
                  required
                />
                <span className="text-[11px] text-slate-500">
                  Aceita números inteiros ou fracionados com vírgula ou ponto (ex.: 2, 1,5, 2.5).
                </span>
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
