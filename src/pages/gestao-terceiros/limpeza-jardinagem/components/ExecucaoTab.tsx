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
import { Loader2, CheckCircle2, XCircle, FileText, Download } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { useToast } from '@/hooks/use-toast'
import { cn } from '@/lib/utils'

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
    if (execStatus === 'Realizado' && !file)
      return toast({ variant: 'destructive', title: 'Evidência (Anexo) obrigatória' })

    setIsSaving(true)
    try {
      let evidence_url = null
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
          evidence_url,
        })
        .eq('id', selectedSched.id)

      if (error) throw error
      toast({
        title: 'Execução registrada!',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
      setModalOpen(false)
      fetchSchedules()
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro', description: e.message })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4 bg-white p-3 rounded-xl border border-gray-200 shadow-sm items-end">
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">De</Label>
          <Input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Até</Label>
          <Input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="h-9 w-36"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Planta</Label>
          <Select value={plantId} onValueChange={setPlantId}>
            <SelectTrigger className="h-9 w-[180px]">
              <SelectValue placeholder="Planta" />
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
        <div className="space-y-1">
          <Label className="text-xs text-slate-500">Serviço</Label>
          <Select value={serviceType} onValueChange={setServiceType}>
            <SelectTrigger className="h-9 w-[150px]">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="cleaning">Limpeza</SelectItem>
              <SelectItem value="gardening">Jardinagem</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
        <Table>
          <TableHeader className="bg-slate-50 border-b border-gray-200">
            <TableRow>
              <TableHead className="font-semibold text-slate-800">Data e Hora</TableHead>
              <TableHead className="font-semibold text-slate-800">Área / Serviço</TableHead>
              <TableHead className="font-semibold text-slate-800">Atividade</TableHead>
              <TableHead className="font-semibold text-slate-800">Status</TableHead>
              <TableHead className="font-semibold text-slate-800 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin mx-auto text-brand-deepBlue" />
                </TableCell>
              </TableRow>
            ) : schedules.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                  Nenhum registro no período.
                </TableCell>
              </TableRow>
            ) : (
              schedules.map((s) => {
                const isFuture = isAfter(
                  new Date(s.activity_date + 'T00:00:00'),
                  startOfDay(new Date()),
                )
                return (
                  <TableRow key={s.id} className="hover:bg-slate-50">
                    <TableCell className="text-slate-700 whitespace-nowrap font-medium">
                      {s.activity_date.split('-').reverse().join('/')}{' '}
                      <span className="text-slate-400 font-normal ml-1">
                        {s.start_time.substring(0, 5)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="font-semibold text-slate-800">{s.areas?.name}</div>
                      <div className="text-xs text-slate-500">
                        {s.areas?.type === 'cleaning' ? 'Limpeza' : 'Jardinagem'}
                      </div>
                    </TableCell>
                    <TableCell className="text-slate-700">{s.description}</TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          s.status === 'Realizado'
                            ? 'bg-green-100 text-green-800 border-green-200'
                            : s.status === 'Não Realizado'
                              ? 'bg-red-100 text-red-800 border-red-200'
                              : 'bg-amber-100 text-amber-800 border-amber-200',
                        )}
                      >
                        {s.status}
                      </Badge>
                      {s.justification && (
                        <p
                          className="text-[10px] text-red-600 mt-1 max-w-[200px] truncate"
                          title={s.justification}
                        >
                          {s.justification}
                        </p>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {s.status === 'Pendente' ? (
                        <Button
                          size="sm"
                          variant="tech"
                          disabled={isFuture}
                          onClick={() => {
                            setSelectedSched(s)
                            setExecStatus('Realizado')
                            setFile(null)
                            setJustification('')
                            setModalOpen(true)
                          }}
                          className="h-8"
                        >
                          Confirmar Execução
                        </Button>
                      ) : s.evidence_url ? (
                        <a
                          href={s.evidence_url}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center text-xs text-brand-deepBlue hover:underline bg-brand-deepBlue/5 px-2 py-1 rounded"
                        >
                          <Download className="h-3 w-3 mr-1" /> Evidência
                        </a>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
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
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Registrar Execução</DialogTitle>
          </DialogHeader>
          {selectedSched && (
            <div className="space-y-5 py-2">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-sm">
                <p>
                  <span className="font-semibold">Atividade:</span> {selectedSched.description}
                </p>
                <p className="mt-1">
                  <span className="font-semibold">Data/Hora:</span>{' '}
                  {selectedSched.activity_date.split('-').reverse().join('/')} às{' '}
                  {selectedSched.start_time.substring(0, 5)}
                </p>
              </div>
              <div className="space-y-3">
                <Label className="text-base">Situação da Atividade</Label>
                <RadioGroup value={execStatus} onValueChange={setExecStatus} className="flex gap-4">
                  <div
                    className="flex items-center space-x-2 border p-3 rounded-lg flex-1 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExecStatus('Realizado')}
                  >
                    <RadioGroupItem value="Realizado" id="r1" />
                    <Label
                      htmlFor="r1"
                      className="cursor-pointer text-green-700 font-semibold flex items-center"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Realizado
                    </Label>
                  </div>
                  <div
                    className="flex items-center space-x-2 border p-3 rounded-lg flex-1 cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => setExecStatus('Não Realizado')}
                  >
                    <RadioGroupItem value="Não Realizado" id="r2" />
                    <Label
                      htmlFor="r2"
                      className="cursor-pointer text-red-700 font-semibold flex items-center"
                    >
                      <XCircle className="h-4 w-4 mr-1" /> Não Realizado
                    </Label>
                  </div>
                </RadioGroup>
              </div>

              {execStatus === 'Realizado' && (
                <div className="space-y-2 animate-in fade-in zoom-in-95">
                  <Label>Anexar Evidência (Obrigatório)</Label>
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-4 text-center hover:bg-slate-50 transition-colors">
                    <Input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={(e) => setFile(e.target.files?.[0] || null)}
                      className="max-w-[250px] mx-auto"
                    />
                    <p className="text-xs text-slate-500 mt-2">Formatos aceitos: JPG, PNG, PDF</p>
                  </div>
                </div>
              )}
              {execStatus === 'Não Realizado' && (
                <div className="space-y-2 animate-in fade-in zoom-in-95">
                  <Label>Justificativa (Obrigatório)</Label>
                  <Textarea
                    value={justification}
                    onChange={(e) => setJustification(e.target.value)}
                    placeholder="Por que a atividade não foi realizada?"
                    className="resize-none"
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>
              Cancelar
            </Button>
            <Button variant="tech" onClick={handleSave} disabled={isSaving}>
              {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
