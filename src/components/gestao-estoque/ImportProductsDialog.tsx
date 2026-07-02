import { useState, useRef, useCallback } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  UploadCloud,
  FileSpreadsheet,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Download,
  X,
} from 'lucide-react'
import { inventoryService } from '@/services/inventory'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface ImportResult {
  success: boolean
  inserted: number
  updated: number
  skipped: number
  total: number
  errors: string[]
  error?: string
}

interface ImportProductsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onImportComplete: () => void
}

const TEMPLATE_CSV =
  'name,category,description,unit_of_measure,item_value,fs_code,supply_code\n' +
  'Detergente Multiuso,Limpeza,Detergente neutro para limpeza geral,UN,15.50,FS-001,SUP-001\n' +
  'Lampada LED 10W,Manutencao,Lampada LED branca 10W E27,UN,8.90,FS-002,SUP-002\n' +
  'Martelo,Ferramentas,Martelo cabo de madeira 27mm,UN,25.00,FS-003,SUP-003'

export function ImportProductsDialog({
  open,
  onOpenChange,
  onImportComplete,
}: ImportProductsDialogProps) {
  const [file, setFile] = useState<File | null>(null)
  const [isProcessing, setIsProcessing] = useState(false)
  const [result, setResult] = useState<ImportResult | null>(null)
  const [dragActive, setDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const reset = useCallback(() => {
    setFile(null)
    setIsProcessing(false)
    setResult(null)
  }, [])

  const handleFileSelect = (selectedFile: File | undefined) => {
    if (!selectedFile) return
    const validTypes = ['.csv', '.xlsx', '.xls']
    const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf('.')).toLowerCase()
    if (!validTypes.includes(ext)) {
      toast.error('Formato inválido. Use .csv, .xlsx ou .xls')
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

  const downloadTemplate = () => {
    const blob = new Blob(['\uFEFF' + TEMPLATE_CSV], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = 'template_produtos.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = async () => {
    if (!file) return
    setIsProcessing(true)
    setResult(null)
    try {
      const res = await inventoryService.importProducts(file)
      setResult(res)
      if (res.success && (res.inserted > 0 || res.updated > 0)) {
        const parts: string[] = []
        if (res.inserted > 0) parts.push(`${res.inserted} importado(s)`)
        if (res.updated > 0) parts.push(`${res.updated} atualizado(s)`)
        if (res.skipped > 0) parts.push(`${res.skipped} ignorado(s)`)
        toast.success(
          parts.join(', ') + (res.errors.length > 0 ? ` (${res.errors.length} erro(s))` : ''),
        )
        onImportComplete()
      } else if (res.success && res.inserted === 0 && res.updated === 0) {
        toast.info('Nenhum produto novo para importar. Todos já existem no catálogo.')
      } else {
        toast.error(res.error || 'Erro ao importar produtos')
      }
    } catch (err: any) {
      setResult({
        success: false,
        inserted: 0,
        updated: 0,
        skipped: 0,
        total: 0,
        errors: [],
        error: err.message,
      })

      toast.error(err.message || 'Erro ao importar produtos')
    } finally {
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
          <DialogTitle>Importar Produtos</DialogTitle>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4 py-2">
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
                  <p className="text-xs text-slate-500">Formatos: .csv, .xlsx, .xls (máx. 10MB)</p>
                </div>
              )}
              <input
                ref={inputRef}
                type="file"
                className="hidden"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileSelect(e.target.files?.[0])}
                disabled={isProcessing}
              />
            </div>

            {isProcessing && (
              <div className="flex items-center justify-center gap-2 text-sm text-slate-600 bg-blue-50 rounded-lg p-3">
                <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                <span>
                  Processando importação... Isso pode levar alguns instantes para arquivos grandes.
                </span>
              </div>
            )}

            <div className="flex items-center justify-between">
              <Button
                variant="link"
                size="sm"
                onClick={downloadTemplate}
                className="text-brand-vividBlue p-0 h-auto"
              >
                <Download className="w-3.5 h-3.5 mr-1" />
                Baixar template
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
                <span className="font-mono">name</span> (obrigatório),{' '}
                <span className="font-mono">category</span>,{' '}
                <span className="font-mono">description</span>,{' '}
                <span className="font-mono">unit_of_measure</span>,{' '}
                <span className="font-mono">item_value</span>,{' '}
                <span className="font-mono">fs_code</span>,{' '}
                <span className="font-mono">supply_code</span>
              </p>
              <p className="mt-2 text-slate-500">
                Produtos com o mesmo <span className="font-mono">supply_code</span> ou{' '}
                <span className="font-mono">name</span> serão ignorados automaticamente.
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
                    <p className="text-2xl font-bold text-green-700">{result.inserted}</p>
                    <p className="text-xs text-green-600">Importados</p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-blue-700">{result.updated}</p>
                    <p className="text-xs text-blue-600">Atualizados</p>
                  </div>
                  <div className="bg-amber-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{result.skipped}</p>
                    <p className="text-xs text-amber-600">Ignorados</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-red-700">{result.errors.length}</p>
                    <p className="text-xs text-red-600">Erros</p>
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="mt-4 w-full max-h-40 overflow-auto bg-red-50 rounded-lg p-3 text-left border border-red-100">
                    <p className="text-xs font-semibold text-red-700 mb-2">
                      Detalhes dos erros ({result.errors.length}):
                    </p>
                    {result.errors.slice(0, 50).map((err, i) => (
                      <p key={i} className="text-xs text-red-600 mb-1">
                        • {err}
                      </p>
                    ))}
                    {result.errors.length > 50 && (
                      <p className="text-xs text-red-500 mt-1">
                        ... e mais {result.errors.length - 50} erro(s)
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center text-center py-4">
                <AlertCircle className="w-14 h-14 text-red-500 mb-3" />
                <p className="text-lg font-semibold text-slate-800">Falha na importação</p>
                <p className="text-sm text-slate-500 mt-1">{result.error}</p>
                {result.errors.length > 0 && (
                  <div className="mt-4 w-full max-h-32 overflow-auto bg-red-50 rounded-lg p-3 text-left">
                    {result.errors.slice(0, 20).map((err, i) => (
                      <p key={i} className="text-xs text-red-600 mb-1">
                        • {err}
                      </p>
                    ))}
                  </div>
                )}
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
            <Button onClick={handleImport} disabled={!file || isProcessing} className="w-full">
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <UploadCloud className="w-4 h-4 mr-2" />
                  Importar Produtos
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
