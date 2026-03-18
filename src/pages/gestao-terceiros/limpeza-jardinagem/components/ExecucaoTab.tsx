import { useState, useEffect } from 'react'
import { format, subDays, isAfter, startOfDay } from 'date-fns'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import { Loader2, CheckCircle2, XCircle, FileText, Download, Printer, FileDown } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'
import { exportToCSV } from '@/lib/export'

export function ExecucaoTab() {
  const { profile } = useAppStore()
  const { plants } = useMasterData()
  const { toast } = useToast()

  const [plantId, setPlantId] = useState('')
  const [serviceType, setServiceType] = useState('all')
  const [dateFrom, setDateFrom] = useState(format(subDays(new Date(), 7), 'yyyy-MM-dd'))
  const [dateTo, setDateTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [schedules, setSchedules] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  const [modalOpen, setModalOpen] = useState(false)
  const [selectedSched, setSelectedSched] = useState<any>(null)
  const [execStatus, setExecStatus] = useState('Realizado')
  const [justification, setJustification] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (plants.length > 0 && !plantId) setPlantId(plants[0].id)
  }, [plants, plantId])

  const fetchSchedules = async () => {
    if (!profile || !plantId) return
    setLoading(true)
    let q = supabase
      .from('cleaning_gardening_schedules')
      .select('*, areas:area_id(name, type)')
      .eq('plant_id', plantId)
      .gte('activity_date', dateFrom)
      .lte('activity_date', dateTo)
      .order('activity_date', { ascending: false })
      .order('start_time', { ascending: true })

    const { data } = await q
    let filtered = data || []
    if (serviceType !== 'all') filtered = filtered.filter((s) => s.areas?.type === serviceType)
    setSchedules(filtered)
    setLoading(false)
  }

  useEffect(() => {
    fetchSchedules()
  }, [plantId, dateFrom, dateTo, serviceType, profile])

  const handleSave = async () => {
    if (!selectedSched) return
    if (execStatus === 'Não Realizado' && !justification)
      return toast({ variant: 'destructive', title: 'Justificativa obrigatória' })
    if (execStatus === 'Realizado' && !file && !selectedSched.evidence_url)
      return toast({ variant: 'destructive', title: 'Evidência (Anexo) obrigatória' })

    setIsSaving(true)
    try {
      let evidence_url = selectedSched.evidence_url
      if (file && execStatus === 'Realizado') {
        const fileExt = file.name.split('.').pop()
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`
        const filePath = `${profile!.client_id}/${fileName}`
        const { error: upErr } = await supabase.storage
          .from('cleaning-evidence')
          .upload(filePath, file)
        if (upErr) throw upErr
        const { data } = supabase.storage.from('cleaning-evidence').getPublicUrl(filePath)
        evidence_url = data.publicUrl
      }

      const { error } = await supabase
        .from('cleaning_gardening_schedules')
        .update({
          status: execStatus,
          justification: execStatus === 'Não Realizado' ? justification : null,
          evidence_url: execStatus === 'Realizado' ? evidence_url : null,
        })
        .eq('id', selectedSched.id)

      if (error) throw error
      toast({
        title: 'Status atualizado!',
        className:
          execStatus === 'Realizado'
            ? 'bg-green-50 text-green-900 border-green-200'
            : 'bg-red-50 text-red-900 border-red-200',
      })
      setModalOpen(false)
      fetchSchedules()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setIsSaving(false)
    }
  }

  const handleExportCSV = () => {
    const data = schedules.map((s) => ({
      Data: s.activity_date.split('-').reverse().join('/'),
      Início: s.start_time.substring(0, 5),
      Fim: s.end_time ? s.end_time.substring(0, 5) : '-',
      Área: s.areas?.name || '-',
      Tipo: s.areas?.type === 'cleaning' ? 'Limpeza' : 'Jardinagem',
      Descrição: s.description,
      Status: s.status,
      Justificativa: s.justification || '-',
    }))
    exportToCSV(`execucoes_${dateFrom}_${dateTo}.csv`, data)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-end gap-6 bg-white p-5 rounded-2xl border-2 border-gray-200 shadow-sm print:hidden">
        <div className="flex flex-wrap gap-4 items-end">
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">Data Inicial</Label>
            <Input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="h-11 w-40 text-base font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">Data Final</Label>
            <Input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="h-11 w-40 text-base font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">Planta Operacional</Label>
            <Select value={plantId} onValueChange={setPlantId}>
              <SelectTrigger className="h-11 w-[200px] text-base font-semibold">
                <SelectValue placeholder="Planta" />
              </SelectTrigger>
              <SelectContent>
                {plants.map((p) => (
                  <SelectItem key={p.id} value={p.id} className="text-base">
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-bold text-slate-700">Tipo de Serviço</Label>
            <Select value={serviceType} onValueChange={setServiceType}>
              <SelectTrigger className="h-11 w-[180px] text-base font-semibold">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-base">
                  Todos
                </SelectItem>
                <SelectItem value="cleaning" className="text-base">
                  Limpeza
                </SelectItem>
                <SelectItem value="gardening" className="text-base">
                  Jardinagem
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            onClick={() => window.print()}
            className="gap-2 h-11 px-6 font-bold text-base"
          >
            <Printer className="h-5 w-5" /> PDF
          </Button>
          <Button
            variant="outline"
            onClick={handleExportCSV}
            className="gap-2 h-11 px-6 font-bold text-base"
          >
            <FileDown className="h-5 w-5" /> Excel
          </Button>
        </div>
      </div>

      <div className="bg-white border-2 border-gray-300 rounded-2xl overflow-hidden shadow-md print:border-none print:shadow-none">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="bg-slate-200 hover:bg-slate-200">
              <TableHead className="font-extrabold text-base text-slate-900 py-4 border-b-2 border-gray-300">
                Data e Hora
              </TableHead>
              <TableHead className="font-extrabold text-base text-slate-900 py-4 border-b-2 border-gray-300">
                Local / Serviço
              </TableHead>
              <TableHead className="font-extrabold text-base text-slate-900 py-4 border-b-2 border-gray-300">
                Atividade
              </TableHead>
              <TableHead className="font-extrabold text-base text-slate-900 py-4 border-b-2 border-gray-300">
                Status
              </TableHead>
              <TableHead className="font-extrabold text-base text-slate-900 py-4 border-b-2 border-gray-300 text-right print:hidden">
                Ação
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <Loader2 className="h-10 w-10 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="text-center py-12 text-slate-500 font-semibold text-lg"
                >
                  Nenhum registro encontrado no período.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((s) => {
                const isFuture = isAfter(
                  new Date(s.activity_date + 'T00:00:00'),
                  startOfDay(new Date()),
                )
                return (
                  <TableRow
                    key={s.id}
                    className={cn(
                      'transition-colors border-b-2 border-gray-200 cursor-pointer print-break-inside-avoid',
                      s.status === 'Realizado'
                        ? 'bg-[#f0fdf4] hover:bg-[#dcfce7]'
                        : s.status === 'Não Realizado'
                          ? 'bg-[#fef2f2] hover:bg-[#fee2e2]'
                          : 'bg-[#fefce8] hover:bg-[#fef9c3]',
                    )}
                    onClick={() => {
                      if (isFuture && s.status === 'Pendente')
                        return toast({
                          title: 'Atividade Futura',
                          description: 'Aguarde a data para confirmar.',
                        })
                      setSelectedSched(s)
                      setExecStatus(s.status === 'Pendente' ? 'Realizado' : s.status)
                      setJustification(s.justification || '')
                      setFile(null)
                      setModalOpen(true)
                    }}
                  >
                    <TableCell className="py-4">
                      <div className="font-bold text-base text-slate-900">
                        {s.activity_date.split('-').reverse().join('/')}
                      </div>
                      <div className="text-sm font-semibold text-slate-600 mt-0.5">
                        {s.start_time.substring(0, 5)}{' '}
                        {s.end_time ? `- ${s.end_time.substring(0, 5)}` : ''}
                      </div>
                    </TableCell>
                    <TableCell className="py-4">
                      <div className="font-extrabold text-base text-slate-900">{s.areas?.name}</div>
                      <div className="text-sm font-bold text-slate-500 mt-0.5">
                        {s.areas?.type === 'cleaning' ? 'Limpeza' : 'Jardinagem'}
                      </div>
                    </TableCell>
                    <TableCell className="text-base font-semibold text-slate-800 py-4 max-w-[300px]">
                      {s.description}
                    </TableCell>
                    <TableCell className="py-4">
                      <Badge
                        className={cn(
                          'text-sm px-3 py-1 font-bold border-2',
                          s.status === 'Realizado'
                            ? 'bg-[#dcfce7] text-[#166534] border-[#86efac]'
                            : s.status === 'Não Realizado'
                              ? 'bg-[#fee2e2] text-[#991b1b] border-[#fca5a5]'
                              : 'bg-[#fef9c3] text-[#854d0e] border-[#fde047]',
                        )}
                      >
                        {s.status}
                      </Badge>
                      {s.justification && (
                        <p className="text-sm font-semibold text-red-700 mt-2 max-w-[250px] italic">
                          "{s.justification}"
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-4 print:hidden">
                      {s.status === 'Pendente' ? (
                        <Button
                          size="sm"
                          variant="tech"
                          disabled={isFuture}
                          className="h-10 px-4 font-bold"
                          onClick={(e) => {
                            e.stopPropagation()
                            document.getElementById(`row-${s.id}`)?.click()
                          }}
                        >
                          Confirmar
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-10 px-4 font-bold bg-white/50"
                        >
                          Editar Status
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-slate-800">
              Situação da Atividade
            </DialogTitle>
          </DialogHeader>
          {selectedSched && (
            <div className="space-y-6 py-2">
              <div className="bg-slate-100 p-4 rounded-xl border-2 border-slate-200">
                <p className="text-base text-slate-800">
                  <span className="font-extrabold">Atividade:</span> {selectedSched.description}
                </p>
                <p className="text-base text-slate-800 mt-2">
                  <span className="font-extrabold">Data:</span>{' '}
                  {selectedSched.activity_date.split('-').reverse().join('/')} (
                  {selectedSched.start_time.substring(0, 5)} -{' '}
                  {selectedSched.end_time?.substring(0, 5)})
                </p>
                <p className="text-base text-slate-800 mt-2">
                  <span className="font-extrabold">Local:</span> {selectedSched.areas?.name}
                </p>
              </div>

              <div className="space-y-4">
                <Label className="text-lg font-bold text-slate-800">Status da Execução</Label>
                <RadioGroup
                  value={execStatus}
                  onValueChange={setExecStatus}
                  className="grid grid-cols-2 gap-4"
                >
                  <div
                    className={cn(
                      'flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all',
                      execStatus === 'Realizado'
                        ? 'bg-[#f0fdf4] border-[#86efac] shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200',
                    )}
                    onClick={() => setExecStatus('Realizado')}
                  >
                    <RadioGroupItem value="Realizado" id="r1" />
                    <Label
                      htmlFor="r1"
                      className="cursor-pointer text-[#166534] font-extrabold text-lg flex items-center"
                    >
                      <CheckCircle2 className="h-6 w-6 mr-2" /> Realizado
                    </Label>
                  </div>
                  <div
                    className={cn(
                      'flex items-center space-x-3 border-2 p-4 rounded-xl cursor-pointer transition-all',
                      execStatus === 'Não Realizado'
                        ? 'bg-[#fef2f2] border-[#fca5a5] shadow-sm'
                        : 'bg-white hover:bg-slate-50 border-slate-200',
                    )}
                    onClick={() => setExecStatus('Não Realizado')}
                  >
                    <RadioGroupItem value="Não Realizado" id="r2" />
                    <Label
                      htmlFor="r2"
                      className="cursor-pointer text-[#991b1b] font-extrabold text-lg flex items-center"
                    >
                      <XCircle className="h-6 w-6 mr-2" /> Não Realizado
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {execStatus === 'Realizado' && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 bg-[#f0fdf4] p-4 rounded-xl border border-[#86efac]">
                  <Label className="text-base font-bold text-[#166534]">
                    Anexar Evidência (Obrigatório)
                  </Label>
                  <div className="border-2 border-dashed border-[#86efac] bg-white rounded-xl p-6 text-center hover:bg-[#f8fafc] transition-colors">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="max-w-[300px] mx-auto text-base"
                    />
                    <p className="text-sm font-semibold text-slate-500 mt-3">
                      Formatos aceitos: JPG, PNG, PDF
                    </p>
                  </div>
                  {selectedSched.evidence_url && !file && (
                    <div className="mt-4 p-3 bg-white border border-[#86efac] rounded-lg">
                      <p className="text-sm font-bold text-slate-600 mb-2">Evidência Atual:</p>
                      <a
                        href={selectedSched.evidence_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center text-base font-bold text-brand-deepBlue hover:underline bg-brand-deepBlue/5 px-3 py-2 rounded-md"
                      >
                        <FileText className="h-5 w-5 mr-2" /> Visualizar Arquivo
                      </a>
                    </div>
                  )}
                </div>
              )}

              {execStatus === 'Não Realizado' && (
                <div className="space-y-3 animate-in fade-in zoom-in-95 bg-[#fef2f2] p-4 rounded-xl border border-[#fca5a5]">
                  <Label className="text-base font-bold text-[#991b1b]">
                    Justificativa (Obrigatório)
                  </Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Descreva detalhadamente por que a atividade não foi realizada..."
                    className="resize-none h-28 text-base bg-white border-2 border-[#fca5a5] focus-visible:ring-[#991b1b]"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="mt-4">
            <Button
              variant="outline"
              onClick={() => setModalOpen(false)}
              className="h-12 px-6 font-bold text-base"
            >
              Cancelar
            </Button>
            <Button
              variant="tech"
              onClick={handleSave}
              disabled={
                isSaving ||
                (execStatus === 'Realizado' && !file && !selectedSched?.evidence_url) ||
                (execStatus === 'Não Realizado' && !justification)
              }
              className="h-12 px-8 font-bold text-base"
            >
              {isSaving && <Loader2 className="h-5 w-5 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
