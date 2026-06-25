import { useState, forwardRef, useImperativeHandle } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, FileText, Loader2 } from 'lucide-react'

export interface DocumentViewerRef {
  open: (url: string) => void
}

export const DocumentViewer = forwardRef<DocumentViewerRef>((props, ref) => {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [type, setType] = useState<'image' | 'pdf' | 'other' | null>(null)

  useImperativeHandle(ref, () => ({
    open: async (docUrl: string) => {
      setOpen(true)
      setLoading(true)
      setError(false)
      setUrl(null)
      setType(null)

      try {
        const res = await fetch(docUrl, { method: 'HEAD' })
        if (!res.ok) {
          setError(true)
          setLoading(false)
          return
        }

        const contentType = res.headers.get('Content-Type') || ''
        if (contentType.includes('pdf') || docUrl.toLowerCase().includes('.pdf')) {
          setType('pdf')
        } else if (contentType.includes('image') || docUrl.match(/\.(jpeg|jpg|gif|png)/i)) {
          setType('image')
        } else {
          setType('other')
        }
        setUrl(docUrl)
      } catch (err) {
        console.warn('HEAD request failed, falling back to extension matching', err)
        if (docUrl.toLowerCase().includes('.pdf')) {
          setType('pdf')
          setUrl(docUrl)
        } else if (docUrl.match(/\.(jpeg|jpg|gif|png)/i)) {
          setType('image')
          setUrl(docUrl)
        } else {
          setError(true)
        }
      } finally {
        setLoading(false)
      }
    },
  }))

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white z-10 shrink-0">
          <DialogTitle>Visualizador de Documento</DialogTitle>
        </DialogHeader>

        <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center min-h-[500px] overflow-auto">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-10 h-10 animate-spin text-brand-vividBlue mb-4" />
              <p className="text-muted-foreground text-sm font-medium">Carregando documento...</p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Documento não encontrado no servidor
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                O documento solicitado não pôde ser localizado em nossos servidores, ou você não tem
                permissão para acessá-lo. Verifique se o arquivo foi enviado corretamente.
              </p>
              <Button variant="outline" onClick={() => setOpen(false)}>
                Fechar Visualizador
              </Button>
            </div>
          )}

          {!loading && !error && url && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {type === 'pdf' ? (
                <iframe
                  src={`${url}#toolbar=0`}
                  className="w-full h-full min-h-[60vh] border-0 flex-1"
                  title="Documento PDF"
                />
              ) : type === 'image' ? (
                <div className="p-4 w-full h-full flex items-center justify-center">
                  <img
                    src={url}
                    alt="Documento"
                    className="max-w-full max-h-full object-contain rounded shadow-sm bg-white"
                    onError={() => setError(true)}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center p-8 bg-white rounded-lg shadow-sm m-4">
                  <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                    <FileText className="w-8 h-8 text-brand-vividBlue" />
                  </div>
                  <h3 className="text-lg font-semibold mb-2">Formato não suportado</h3>
                  <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
                    O formato deste arquivo não pode ser visualizado diretamente no navegador.
                  </p>
                  <Button asChild>
                    <a href={url} target="_blank" rel="noopener noreferrer">
                      Fazer Download do Arquivo
                    </a>
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
})
DocumentViewer.displayName = 'DocumentViewer'
