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
import {
  Clock,
  UserCheck,
  Building2,
  MapPin,
  Search,
  Wallet,
  Mail,
  Paperclip,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { resolveActiveEmployees } from '@/lib/employee-vigencia'
import { maskCostCenterPagador, isValidCostCenterPagador } from './cost-center-mask'
import type { SolicitacaoHe } from './HorasExtrasTable'
import {
  HE_ATTACHMENT_ACCEPT,
  HE_ATTACHMENT_LABEL,
  validateHeAttachment,
} from '@/lib/he-attachment'
import { formatAttachmentSize } from '@/lib/he-attachment-ui'

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

interface CompanyOption {
  id: string
  name: string
  email?: string | null
}

interface SolicitacaoHeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employees: EmployeeOption[]
  plants: PlantOption[]
  /** Empresas parceiras do cliente (para pré-preencher o e-mail do destinatário) */
  companies?: CompanyOption[]
  /** Solicitação em edição (modo edição quando preenchido) */
  editingSolicitacao?: SolicitacaoHe | null
  /**
   * Ref controlada pelo pai: guarda o arquivo escolhido para o pai fazer o upload
   * após o INSERT da solicitação (evita duplicar o upload entre os dois diálogos).
   */
  selectedFileRef?: React.MutableRefObject<File | null>
  onSubmit: (data: {
    employee_id: string
    employee_name: string
    company_id: string | null
    company_name: string
    plant_id: string
    cost_center_text: string
    company_email: string | null
    date: string
    hours: number
    reason: string
    /** Arquivo escolhido (validado) — o upload em si acontece no componente pai, após o INSERT */
    attachment?: { name: string; size: number; type: string | null } | null
  }) => Promise<void>
}

/** Deriva um texto inicial para o centro de custo em edições de registros antigos (legado) */
function resolveCostCenterInitialText(solicitacao: SolicitacaoHe): string {
  const name = solicitacao.budget_cost_centers?.name || ''
  const code = solicitacao.budget_cost_centers?.code || ''
  const candidate = code || name
  return isValidCostCenterPagador(candidate) ? candidate.toUpperCase() : ''
}

export function SolicitacaoHeDialog({
  open,
  onOpenChange,
  employees,
  plants,
  companies = [],
  editingSolicitacao = null,
  selectedFileRef,
  onSubmit,
}: SolicitacaoHeDialogProps) {
  const [selectedPlantId, setSelectedPlantId] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [costCenterText, setCostCenterText] = useState('')
  const [companyEmail, setCompanyEmail] = useState('')
  const [searchEmployeeText, setSearchEmployeeText] = useState('')
  const [date, setDate] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [hours, setHours] = useState('2')
  const [reason, setReason] = useState('')
  const [attachment, setAttachment] = useState<File | null>(null)
  const [attachmentError, setAttachmentError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Modo edição quando uma solicitação é passada
  const isEditMode = !!editingSolicitacao

  // Centro de Custo pagador é OBRIGATÓRIO: feedback imediato enquanto digita
  const normalizedCostCenterPreview = costCenterText.trim().toUpperCase()
  const isCostCenterInvalid =
    normalizedCostCenterPreview.length > 0 && !isValidCostCenterPagador(normalizedCostCenterPreview)

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

  // Em modo edição, garante que a planta da solicitação esteja entre as opções
  const displayPlants = useMemo(() => {
    if (
      isEditMode &&
      editingSolicitacao &&
      !plants.some((p) => p.id === editingSolicitacao.plant_id)
    ) {
      return [
        ...plants,
        {
          id: editingSolicitacao.plant_id,
          name: editingSolicitacao.plants?.name || 'Planta da solicitação',
        },
      ]
    }
    return plants
  }, [plants, isEditMode, editingSolicitacao])

  // Ao abrir: preenche com os dados atuais (edição) ou reseta (nova solicitação)
  useEffect(() => {
    if (!open) return
    if (editingSolicitacao) {
      setSelectedPlantId(editingSolicitacao.plant_id)
      setSelectedEmployeeId(editingSolicitacao.employee_id)
      setCostCenterText(
        editingSolicitacao.cost_center_text || resolveCostCenterInitialText(editingSolicitacao),
      )
      setSearchEmployeeText('')
      setDate(editingSolicitacao.date)
      setHours(String(Number(editingSolicitacao.hours)).replace('.', ','))
      setReason(editingSolicitacao.reason || '')
      setCompanyEmail(editingSolicitacao.company_email || '')
      setAttachment(null)
      setAttachmentError(null)
    } else {
      resetForm()
      setDate(format(new Date(), 'yyyy-MM-dd'))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingSolicitacao])

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
    setCostCenterText('')
    setCompanyEmail('')
    setSearchEmployeeText('')
    setHours('2')
    setReason('')
    setAttachment(null)
    setAttachmentError(null)
  }

  // Pré-preenche o e-mail a partir do cadastro da Empresa Parceira do colaborador
  // (nova solicitação). Em edição, o valor salvo na solicitação tem prioridade.
  useEffect(() => {
    if (isEditMode) return
    const compId = selectedEmployee?.company_id
    const compName = selectedEmployee?.company_name
    const comp = companies.find(
      (c) => (compId && c.id === compId) || (!!compName && c.name === compName),
    )
    setCompanyEmail(comp?.email?.trim() || '')
  }, [selectedEmployee?.company_id, selectedEmployee?.company_name, companies, isEditMode])

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

    // Centro de Custo pagador: obrigatório e no formato 1111aaa (4 números + 3 letras)
    const normalizedCostCenter = costCenterText.trim().toUpperCase()
    if (!normalizedCostCenter) {
      toast.error('O Centro de Custo pagador é obrigatório. Digite o centro de custo.')
      return
    }
    if (!isValidCostCenterPagador(normalizedCostCenter)) {
      toast.error(
        'Centro de Custo pagador inválido. Use o formato 1111aaa: 4 números seguidos de 3 letras.',
      )
      return
    }

    const trimmedHours = (hours || '').toString().trim()
    if (!trimmedHours) {
      toast.error('Informe a quantidade de horas extras (ex.: 2 ou 1,5).')
      return
    }

    // E-mail do destinatário (opcional): pré-preenchido com o e-mail do cadastro
    // da empresa; se informado, valida formato simples.
    const normalizedCompanyEmail = companyEmail.trim()
    if (normalizedCompanyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedCompanyEmail)) {
      toast.error('E-mail da empresa inválido. Verifique o formato digitado.')
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
        cost_center_text: normalizedCostCenter,
        company_email: normalizedCompanyEmail || null,
        date,
        hours: sanitizedHours,
        reason: reason.trim(),
        attachment: attachment
          ? { name: attachment.name, size: attachment.size, type: attachment.type || null }
          : null,
      })

      // Reset
      resetForm()
      if (selectedFileRef) selectedFileRef.current = null
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
              {isEditMode ? 'Editar Solicitação de Horas Extras' : 'Solicitação de Horas Extras'}
            </DialogTitle>
            <DialogDescription>
              {isEditMode ? (
                <>
                  Altere os dados da solicitação de{' '}
                  <strong>{editingSolicitacao?.employee_name}</strong>. Ela continua com status{' '}
                  <strong>Pendente</strong> até a decisão do gestor.
                </>
              ) : (
                <>
                  Registre uma solicitação de HE para um colaborador terceiro. A solicitação nascerá
                  como <strong>Pendente</strong> e aguardará aprovação do Gestor/Administrador.
                </>
              )}
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
                  {displayPlants.length === 0 ? (
                    <div className="p-2 text-xs text-slate-500 text-center">
                      Nenhuma planta autorizada disponível.
                    </div>
                  ) : (
                    displayPlants.map((p) => (
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
                      selectedEmployeeId
                        ? employees.find((e) => e.id === selectedEmployeeId)?.name ||
                          editingSolicitacao?.employee_name
                        : selectedPlantId
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

            {/* Centro de Custo pagador — campo digitado no formato 1111aaa */}
            <div className="space-y-2">
              <Label htmlFor="heCostCenter" className="flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5 text-brand-vividBlue" />
                <span>
                  Centro de Custo pagador <span className="text-rose-600">*</span>
                </span>
              </Label>
              <Input
                id="heCostCenter"
                type="text"
                inputMode="text"
                maxLength={7}
                placeholder="1111aaa"
                value={costCenterText}
                onChange={(e) => setCostCenterText(maskCostCenterPagador(e.target.value))}
                autoComplete="off"
                required
                aria-invalid={isCostCenterInvalid}
                className={isCostCenterInvalid ? 'border-rose-400 focus-visible:ring-rose-300' : ''}
              />
              {isCostCenterInvalid ? (
                <p className="text-[11px] text-rose-600">
                  Formato inválido: use 4 números seguidos de 3 letras (ex.: 1234abc).
                </p>
              ) : (
                <p className="text-[11px] text-slate-500">
                  Obrigatório. Formato: <strong>1111aaa</strong> (4 números + 3 letras). Letras
                  minúsculas são convertidas para maiúsculas automaticamente.
                </p>
              )}
            </div>

            {/* E-mail do destinatário (pré-preenchido com o e-mail da Empresa Parceira) */}
            {(selectedEmployee || isEditMode) && (
              <div className="space-y-2">
                <Label htmlFor="heCompanyEmail" className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5 text-brand-vividBlue" />
                  <span>E-mail da Empresa (destinatário da aprovação)</span>
                </Label>
                <Input
                  id="heCompanyEmail"
                  type="email"
                  placeholder="email@empresa.com.br"
                  value={companyEmail}
                  onChange={(e) => setCompanyEmail(e.target.value)}
                  autoComplete="off"
                />
                <p className="text-[11px] text-slate-500">
                  Pré-preenchido com o e-mail cadastrado na empresa parceira. Pode ser ajustado
                  pontualmente nesta solicitação. Sem e-mail, nada é enviado na aprovação.
                </p>
              </div>
            )}

            {/* Informações da empresa do colaborador */}
            {(selectedEmployee || isEditMode) && (
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs space-y-1.5 text-slate-700">
                <div className="flex items-center gap-1.5">
                  <UserCheck className="h-3.5 w-3.5 text-brand-vividBlue" />
                  <span>
                    <strong>Colaborador:</strong>{' '}
                    {selectedEmployee?.name || editingSolicitacao?.employee_name || '—'}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-slate-500" />
                  <span>
                    <strong>Empresa Contratada:</strong>{' '}
                    {selectedEmployee?.company_name ||
                      editingSolicitacao?.company_name ||
                      'Não informada'}
                  </span>
                </div>
                {selectedPlantId && (
                  <div className="flex items-center gap-1.5">
                    <MapPin className="h-3.5 w-3.5 text-slate-500" />
                    <span>
                      <strong>Planta Selecionada:</strong>{' '}
                      {displayPlants.find((p) => p.id === selectedPlantId)?.name || selectedPlantId}
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
                <Label htmlFor="heHours">Quantidade de Horas previstas</Label>
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

            {/* Anexo (opcional): PDF, e-mail (.eml/.msg), JPEG ou PNG — máx. 10 MB */}
            <div className="space-y-2">
              <Label htmlFor="heAttachment" className="flex items-center gap-1.5">
                <Paperclip className="h-3.5 w-3.5 text-brand-vividBlue" />
                <span>Anexo (opcional)</span>
              </Label>
              <Input
                id="heAttachment"
                type="file"
                accept={HE_ATTACHMENT_ACCEPT}
                onChange={(e) => {
                  const file = e.target.files?.[0] || null
                  if (!file) {
                    setAttachment(null)
                    setAttachmentError(null)
                    return
                  }
                  const err = validateHeAttachment(file)
                  if (err) {
                    setAttachmentError(err)
                    setAttachment(null)
                    e.target.value = ''
                    return
                  }
                  setAttachmentError(null)
                  setAttachment(file)
                  if (selectedFileRef) selectedFileRef.current = file
                }}
                disabled={isSubmitting}
                className="file:mr-3 file:rounded-md file:border-0 file:bg-brand-vividBlue/10 file:px-3 file:py-1 file:text-xs file:font-medium file:text-brand-deepBlue"
              />
              {attachmentError ? (
                <p className="text-[11px] text-rose-600">{attachmentError}</p>
              ) : (
                <p className="text-[11px] text-slate-500">{HE_ATTACHMENT_LABEL}</p>
              )}
              {attachment && (
                <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2">
                  <div className="flex min-w-0 items-center gap-2">
                    <Paperclip className="h-3.5 w-3.5 shrink-0 text-brand-vividBlue" />
                    <span className="truncate text-xs text-slate-700" title={attachment.name}>
                      {attachment.name}
                    </span>
                    <span className="shrink-0 text-[11px] text-slate-500">
                      ({formatAttachmentSize(attachment.size)})
                    </span>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 shrink-0 p-0 text-slate-400 hover:text-rose-600"
                    aria-label="Remover anexo"
                    disabled={isSubmitting}
                    onClick={() => {
                      setAttachment(null)
                      setAttachmentError(null)
                      if (selectedFileRef) selectedFileRef.current = null
                      const input = document.getElementById(
                        'heAttachment',
                      ) as HTMLInputElement | null
                      if (input) input.value = ''
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
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
              disabled={isSubmitting || !selectedEmployeeId || isCostCenterInvalid}
            >
              {isEditMode
                ? isSubmitting
                  ? 'Salvando...'
                  : 'Salvar Alterações'
                : isSubmitting
                  ? 'Registrando...'
                  : 'Registrar Solicitação'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
