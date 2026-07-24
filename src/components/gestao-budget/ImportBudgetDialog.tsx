import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { downloadBudgetTemplate } from '@/lib/xlsx-template'

interface ImportResult {
  success: boolean
  inserted: number
  updated: number
  skipped: number
  notFound: number
  total: number
  errors: string[]
  notFoundAccounts: string[]
  error?: string
}

interface ImportBudgetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  referenceMonth: string
  costCenterId: string
  clientId: string | undefined
  onImportComplete: () => void
}

export function ImportBudgetDialog({
  open,
  onOpenChange,
  referenceMonth,
  costCenterId,
  clientId,
  onImportComplete,
}: ImportBudgetDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const [progress, setProgress] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    return () => {
      if (progressTimer.current) clearInterval(progressTimer.current)
    }
  }, [])

  const reset = useCallback(() => {
    setFile(null)
    setIsProcessing(false)
    setResult(null)
    setProgress(0)
    if (progressTimer.current) {
      clearInterval(progressTimer.current)
      progressTimer.current = null
    }
  }, [])

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    if (!['.xlsx', '.xls'].includes(ext)) {
      toast.error('Formato inválido. Use .xlsx ou .xls')
      return
    }
    if (selectedFile.size > 10 * 1024 * 1024) {
      toast.error('Arquivo muito grande. Máximo 10MB')
      return
    }
    setFile(selectedFile)
    setResult(null)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setDragActive(false)
    handleFileSelect(e.dataTransfer.files[0])
  }

  const handleImport = async () => {
    if (!file || !clientId || !referenceMonth || !costCenterId) return
    setIsProcessing(true)
    setResult(null)
    setProgress(0)

    progressTimer.current = setInterval(() => {
      setProgress((prev) => Math.min(prev + Math.random() * 8, 90))
    }, 400)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('reference_month', referenceMonth)
      formData.append('cost_center_id', costCenterId)

      const { data, error } = await supabase.functions.invoke('import-budget-entries', {
        body: formData,
      })
      setProgress(100)
      if (error) throw error
      const res = data as ImportResult
      setResult(res)
      if (res.success && (res.inserted > 0 || res.updated > 0)) {
        const parts: string[] = []
        if (res.updated > 0) parts.push(`${res.updated} atualizado(s)`)
        if (res.inserted > 0) parts.push(`${res.inserted} inserido(s)`)
        if (res.notFound > 0) parts.push(`${res.notFound} não encontrado(s)`)
        if (res.skipped > 0) parts.push(`${res.skipped} ignorado(s)`)
        toast.success(parts.join(', '))
        onImportComplete()
      } else if (res.success && res.inserted === 0 && res.updated === 0) {
        toast.info('Nenhuma conta foi atualizada. Verifique o resumo para detalhes.')
      } else {
        toast.error(res.error || 'Erro ao importar lançamentos')
      }
    } catch (err: any) {
      setResult({
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        notFound: 0,
        total: 0,
        errors: [],
        notFoundAccounts: [],
        error: err.message,
      })
      toast.error(err.message || 'Erro ao importar lançamentos')
    } finally {
      if (progressTimer.current) {
        clearInterval(progressTimer.current)
        progressTimer.current = null
      }
      setIsProcessing(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar Lançamentos (Excel)</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
            <div className="text-sm text-muted-foreground bg-muted/50 rounded-lg p-3">
              <p>
                Mês de referência:{' '}
                <span className="font-semibold text-foreground">
                  {referenceMonth || 'Não selecionado'}
                </span>
              </p>
              <p>
                Centro de custo:{' '}
                <span className="font-semibold text-foreground">
                  {costCenterId ? 'Selecionado' : 'Não selecionado'}
                </span>
              </p>
            </div>

            <div
              className={cn(
                'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all cursor-pointer',
                dragActive
                  ? 'border-brand-vividBlue bg-brand-vividBlue/5'
                  : 'border-slate-300 hover:border-brand-vividBlue/50 hover:bg-slate-50',
                isProcessing && 'opacity-50 pointer-events-none',
              )}
              onClick={() => !isProcessing && inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={(e) => {
                e.preventDefault()
                setDragActive(false)
              }}
              onDrop={handleDrop}
            >
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileSpreadsheet className="w-12 h-12 text-green-600" />
                  <p className="text-sm font-medium text-slate-700">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <UploadCloud className="w-12 h-12 text-slate-400" />
                  <p className="text-sm font-medium text-slate-700">
                    Arraste um arquivo ou clique para selecionar
                  </p>
                  <p className="text-xs text-slate-500">Formatos: .xlsx, .xls (máx. 10MB)</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                disabled={isProcessing}
              />
            </div>

            {isProcessing && (
              <div className="space-y-2 bg-blue-50 rounded-lg p-4">
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                  <span>Processando importação... {progress.toFixed(0)}%</span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="link"
                size="sm"
                onClick={downloadBudgetTemplate}
                className="text-brand-vividBlue p-0 h-auto"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Baixar modelo
              </Button>
              {file && !isProcessing && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFile(null)}
                  className="text-slate-500"
                >
                  <X className="w-3.5 h-3.5 mr-1" />
                  Remover
                </Button>
              )}
            </div>

            <div className="bg-slate-50 rounded-lg p-3 text-xs text-slate-600">
              <p className="font-semibold text-slate-700 mb-1">Colunas esperadas:</p>
              <p>
                <span className="font-mono">Código da Conta</span> (preferencial),{' '}
                <span className="font-mono">Nome da Conta</span>,{' '}
                <span className="font-mono">Valor Realizado</span>
              </p>
              <p className="mt-2 text-slate-500">
                O sistema irá buscar contas pelo código (exato) ou nome (case-insensitive). Apenas o
                valor realizado será atualizado — o valor orçado existente é preservado.
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-2">
            {result.success ? (
              <div className="flex flex-col items-center text-center py-4">
                <CheckCircle2 className="w-14 h-14 text-green-500 mb-3" />
                <p className="text-lg font-semibold text-slate-800">Importação concluída!</p>
                <div className="mt-4 grid grid-cols-4 gap-3 w-full">
                  <div className="bg-green-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-green-700">{result.updated}</p>
                    <p className="text-xs text-green-600">Atualizados</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{result.inserted}</p>
                    <p className="text-xs text-blue-600">Inseridos</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{result.notFound}</p>
                    <p className="text-xs text-amber-600">Não encontrados</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{result.skipped}</p>
                    <p className="text-xs text-red-600">Ignorados</p>
                  </div>
                </div>
                <p className="mt-3 text-sm text-slate-500">{result.total} linha(s) processada(s)</p>

                {result.notFoundAccounts.length > 0 && (
                  <div className="mt-4 w-full max-h-40 overflow-auto bg-amber-50 rounded-lg p-3 text-left border border-amber-100">
                    <p className="text-xs font-semibold text-amber-700 mb-2">
                      Contas não encontradas ({result.notFoundAccounts.length}):
                    </p>
                    {result.notFoundAccounts.map((acc, i) => (
                      <p key={i} className="text-xs text-amber-600 mb-1">
                        • {acc}
                      </p>
                    ))}
                  </div>
                )}
                {result.errors.length > 0 && (
                  <div className="mt-4 w-full max-h-32 overflow-auto bg-red-50 rounded-lg p-3 text-left border border-red-100">
                    <p className="text-xs font-semibold text-red-700 mb-2">
                      Erros ({result.errors.length}):
                    </p>
                    {result.errors.slice(0, 30).map((err, i) => (
                      <p key={i} className="text-xs text-red-600 mb-1">
                        • {err}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                <AlertCircle className="w-14 h-14 text-red-500 mb-3" />
                <p className="text-lg font-semibold text-slate-800">Falha na importação</p>
                <p className="text-sm text-slate-500 mt-1">{result.error}</p>
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          {result ? (
            <Button variant="outline" onClick={reset} className="w-full">
              Importar outro arquivo
            </Button>
          ) : (
            <Button
              onClick={handleImport}
              disabled={!file || isProcessing || !referenceMonth || !costCenterId}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Importar Lançamentos
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
