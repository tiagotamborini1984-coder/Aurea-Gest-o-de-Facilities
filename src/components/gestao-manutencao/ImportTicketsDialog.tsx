import { useState, useEffect, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Progress } from '@/components/ui/progress'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
import { toast } from 'sonner'
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
} from 'lucide-react'
import {
  parseExcelFile,
  autoDetectMapping,
  validateRows,
  bulkInsertTickets,
  SYSTEM_FIELDS,
  ImportFieldMapping,
  ReferenceData,
  ValidationSummary,
  ParsedExcelData,
  FieldKey,
} from '@/services/maintenance-tickets'
import { cn } from '@/lib/utils'

type Step = 'upload' | 'mapping' | 'validation' | 'importing' | 'result'

export function ImportTicketsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  onImportComplete: () => void
}) {
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [parsing, setParsing] = useState(false)
  const [parsed, setParsed] = useState<ParsedExcelData | null>(null)
  const [mapping, setMapping] = useState<ImportFieldMapping>({})
  const [refData, setRefData] = useState<ReferenceData | null>(null)
  const [clientId, setClientId] = useState<string | null>(null)
  const [existingNumbers, setExistingNumbers] = useState<Set<string>>(new Set())
  const [validation, setValidation] = useState<ValidationSummary | null>(null)
  const [validating, setValidating] = useState(false)
  const [importedCount, setImportedCount] = useState(0)
  const [importError, setImportError] = useState<string | null>(null)

  const reset = useCallback(() => {
    setStep('upload')
    setFile(null)
    setParsed(null)
    setMapping({})
    setValidation(null)
    setImportedCount(0)
    setImportError(null)
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    ;(async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) return
      setClientId(profile.client_id)
      const [p, pr, t, s, a, as, asg, loc, sub, tk] = await Promise.all([
        supabase.from('plants').select('id, name, code'),
        supabase.from('maintenance_priorities').select('id, name'),
        supabase.from('maintenance_types').select('id, name'),
        supabase.from('maintenance_statuses').select('id, name, step, order_index'),
        supabase.from('maintenance_areas').select('id, name'),
        supabase.from('maintenance_assets').select('id, name'),
        supabase.from('profiles').select('id, name'),
        supabase.from('locations').select('id, name'),
        supabase.from('maintenance_sublocations').select('id, name'),
        supabase
          .from('maintenance_tickets')
          .select('ticket_number')
          .eq('client_id', profile.client_id),
      ])
      setRefData({
        plants: p.data || [],
        priorities: pr.data || [],
        types: t.data || [],
        statuses: s.data || [],
        areas: a.data || [],
        assets: as.data || [],
        assignees: asg.data || [],
        locations: loc.data || [],
        sublocations: sub.data || [],
      })
      const nums = new Set<string>()
      ;(tk.data || []).forEach((t: any) => nums.add(String(t.ticket_number ?? '').toLowerCase()))
      setExistingNumbers(nums)
    })()
  }, [open, user?.id])

  const handleFileSelect = async (f: File | undefined) => {
    if (!f) return
    if (!f.name.toLowerCase().endsWith('.xlsx')) {
      toast.error('Apenas arquivos .xlsx são aceitos')
      return
    }
    setFile(f)
    setParsing(true)
    try {
      const data = await parseExcelFile(f)
      if (!data.headers.length) throw new Error('Nenhuma coluna encontrada')
      setParsed(data)
      setMapping(autoDetectMapping(data.headers))
      setStep('mapping')
    } catch (err: any) {
      toast.error(err.message)
      setFile(null)
    } finally {
      setParsing(false)
    }
  }

  const handleValidate = () => {
    if (!parsed || !refData || !clientId) return
    setValidating(true)
    try {
      const r = validateRows(parsed.rows, mapping, refData, existingNumbers)
      setValidation(r)
      setStep('validation')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setValidating(false)
    }
  }

  const handleImport = async () => {
    if (!validation || !clientId || !refData) return
    setStep('importing')
    try {
      const ds = refData.statuses.find((s) => s.step === 'Aberto') || refData.statuses[0]
      const count = await bulkInsertTickets(validation.validRows, clientId, ds?.id || null)
      setImportedCount(count)
      setStep('result')
      toast.success(`${count} chamados importados com sucesso.`)
      onImportComplete()
    } catch (err: any) {
      setImportError(err.message)
      setStep('result')
      toast.error(err.message)
    }
  }

  const previewRows = parsed?.rows.slice(0, 5) || []

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Importar Chamados (OS)</DialogTitle>
        </DialogHeader>

        {step === 'upload' && (
          <div className="py-4">
            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all',
                parsing
                  ? 'opacity-50 pointer-events-none'
                  : 'hover:bg-muted/50 border-border hover:border-brand-vividBlue/50',
              )}
              onClick={() => !parsing && document.getElementById('import-tickets-input')?.click()}
            >
              {parsing ? (
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="w-10 h-10 animate-spin text-brand-vividBlue" />
                  <p className="text-sm text-muted-foreground">Processando arquivo...</p>
                </div>
              ) : file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="w-10 h-10 text-green-600" />
                  <p className="text-sm font-medium">{file.name}</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm font-medium">Clique para selecionar um arquivo .xlsx</p>
                  <p className="text-xs text-muted-foreground">
                    Apenas arquivos Excel (.xlsx) são aceitos
                  </p>
                </div>
              )}
              <input
                id="import-tickets-input"
                type="file"
                accept=".xlsx"
                className="hidden"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
              />
            </div>
          </div>
        )}

        {step === 'mapping' && parsed && (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              Mapeie as colunas do Excel aos campos do sistema. {parsed.rows.length} linhas
              encontradas.
            </p>
            <div className="border rounded-lg overflow-auto max-h-40">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    {parsed.headers.map((h, i) => (
                      <th key={i} className="px-2 py-1 text-left font-medium whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((row, ri) => (
                    <tr key={ri} className="border-t">
                      {parsed.headers.map((h, ci) => (
                        <td key={ci} className="px-2 py-1 truncate max-w-[120px]">
                          {String(row[h] ?? '')}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {SYSTEM_FIELDS.map((field) => (
                <div key={field.key} className="flex items-center gap-2">
                  <span className="text-xs font-medium w-32 shrink-0">
                    {field.label}
                    {field.required && <span className="text-red-500"> *</span>}
                  </span>
                  <Select
                    value={mapping[field.key] || '__none__'}
                    onValueChange={(v) =>
                      setMapping({ ...mapping, [field.key]: v === '__none__' ? '' : v })
                    }
                  >
                    <SelectTrigger className="h-8 text-xs flex-1">
                      <SelectValue placeholder="—" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">Não mapear</SelectItem>
                      {parsed.headers.map((h) => (
                        <SelectItem key={h} value={h}>
                          {h}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {step === 'validation' && validation && (
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-blue-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-blue-700">{validation.total}</p>
                <p className="text-xs text-blue-600">Total</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-green-700">{validation.valid}</p>
                <p className="text-xs text-green-600">Válidos</p>
              </div>
              <div className="bg-red-50 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold text-red-700">{validation.invalid}</p>
                <p className="text-xs text-red-600">Inválidos</p>
              </div>
            </div>
            {validation.errors.length > 0 && (
              <div className="max-h-60 overflow-auto border rounded-lg">
                {validation.errors.slice(0, 100).map((e, i) => (
                  <div key={i} className="px-3 py-2 border-b text-xs last:border-0">
                    <span className="font-semibold text-red-700">
                      Linha {e.rowIndex}
                      {e.ticketNumber && ` (${e.ticketNumber})`}:
                    </span>
                    <span className="text-red-600"> {e.messages.join(', ')}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {step === 'importing' && (
          <div className="py-10 flex flex-col items-center gap-4">
            <Loader2 className="w-10 h-10 animate-spin text-brand-vividBlue" />
            <p className="text-sm text-muted-foreground">Importando chamados...</p>
            <Progress value={50} className="h-2 w-full max-w-xs" />
          </div>
        )}

        {step === 'result' && (
          <div className="py-10 flex flex-col items-center gap-3">
            {importError ? (
              <>
                <AlertCircle className="w-12 h-12 text-red-500" />
                <p className="text-lg font-semibold">Falha na importação</p>
                <p className="text-sm text-muted-foreground text-center max-w-md">{importError}</p>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-12 h-12 text-green-500" />
                <p className="text-lg font-semibold">Importação concluída!</p>
                <p className="text-sm text-muted-foreground">
                  {importedCount} chamado(s) importado(s) com sucesso.
                </p>
              </>
            )}
          </div>
        )}

        <DialogFooter>
          {step === 'mapping' && (
            <>
              <Button
                variant="outline"
                onClick={() => {
                  setStep('upload')
                  setFile(null)
                }}
              >
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleValidate} disabled={validating}>
                {validating && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                Validar Dados
              </Button>
            </>
          )}
          {step === 'validation' && (
            <>
              <Button variant="outline" onClick={() => setStep('mapping')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Voltar
              </Button>
              <Button onClick={handleImport} disabled={validation.valid === 0}>
                Importar {validation.valid} Chamado(s)
              </Button>
            </>
          )}
          {step === 'result' && (
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
