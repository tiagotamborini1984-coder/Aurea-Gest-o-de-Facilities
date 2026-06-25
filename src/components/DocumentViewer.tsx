import { useState, forwardRef, useImperativeHandle, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { AlertCircle, FileText, Loader2, Download, ExternalLink } from 'lucide-react'

export interface DocumentViewerRef {
  open: (url: string) => void
}

export const DocumentViewer = forwardRef<DocumentViewerRef>((props, ref) => {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState<string | null>(null)
  const [originalUrl, setOriginalUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)
  const [type, setType] = useState<'image' | 'pdf' | 'other' | null>(null)

  useEffect(() => {
    if (!open && url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url)
      setUrl(null)
    }
  }, [open, url])

  useImperativeHandle(ref, () => ({
    open: async (docUrl: string) => {
      setOpen(true)
      setLoading(true)
      setError(false)
      setUrl(null)
      setOriginalUrl(null)
      setType(null)

      let finalUrl = docUrl
      if (
        docUrl &&
        !docUrl.startsWith('http') &&
        !docUrl.startsWith('blob:') &&
        !docUrl.startsWith('data:')
      ) {
        let cleanPath = docUrl.replace(/^documents\//, '').replace(/^training-documents\//, '')
        cleanPath = cleanPath.startsWith('/') ? cleanPath.slice(1) : cleanPath

        try {
          const { supabase } = await import('@/lib/supabase/client')
          const isTrainingBucket = cleanPath.match(
            /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\//i,
          )

          if (isTrainingBucket) {
            const { data } = supabase.storage.from('training-documents').getPublicUrl(cleanPath)
            finalUrl = data.publicUrl
          } else {
            if (
              !cleanPath.startsWith('trainings/') &&
              !cleanPath.startsWith('training-documents/')
            ) {
              cleanPath = `trainings/${cleanPath}`
            }
            const { data } = supabase.storage.from('documents').getPublicUrl(cleanPath)
            finalUrl = data.publicUrl
          }
        } catch (e) {
          console.error('Failed to resolve URL via supabase client', e)
        }
      }

      setOriginalUrl(finalUrl)

      try {
        const res = await fetch(finalUrl)
        if (!res.ok) {
          setError(true)
          setLoading(false)
          import('sonner').then(({ toast }) => {
            toast.error(
              'O arquivo físico não foi encontrado no servidor ou o acesso foi bloqueado.',
            )
          })
          return
        }

        const blob = await res.blob()
        const contentType = blob.type || res.headers.get('Content-Type') || ''

        if (contentType.includes('application/json')) {
          setError(true)
          setLoading(false)
          import('sonner').then(({ toast }) => {
            toast.error('O arquivo não foi encontrado ou não está acessível no servidor.')
          })
          return
        }

        const objectUrl = URL.createObjectURL(blob)
        setUrl(objectUrl)

        if (contentType.includes('pdf') || finalUrl.toLowerCase().includes('.pdf')) {
          setType('pdf')
        } else if (contentType.includes('image') || finalUrl.match(/\.(jpeg|jpg|gif|png)/i)) {
          setType('image')
        } else {
          setType('other')
        }
      } catch (err) {
        console.warn('Fetch request failed, falling back to extension matching and direct URL', err)
        if (finalUrl.toLowerCase().includes('.pdf')) {
          setType('pdf')
          setUrl(finalUrl)
        } else if (finalUrl.match(/\.(jpeg|jpg|gif|png)/i)) {
          setType('image')
          setUrl(finalUrl)
        } else {
          setError(true)
        }
      } finally {
        setLoading(false)
      }
    },
  }))

  const getFileName = () => {
    if (!originalUrl) return 'documento'
    try {
      const urlObj = new URL(originalUrl)
      return urlObj.pathname.split('/').pop() || 'documento'
    } catch {
      return originalUrl.split('/').pop() || 'documento'
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-4 border-b bg-white z-10 shrink-0 flex flex-row items-center justify-between">
          <DialogTitle>Visualizador de Documento</DialogTitle>
          {url && !loading && !error && (
            <div className="flex items-center gap-2 pr-6">
              <Button asChild variant="outline" size="sm" className="h-8 text-xs">
                <a href={originalUrl || url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="w-3.5 h-3.5 mr-1.5" /> Nova aba
                </a>
              </Button>
              <Button asChild variant="secondary" size="sm" className="h-8 text-xs">
                <a href={url} download={getFileName()}>
                  <Download className="w-3.5 h-3.5 mr-1.5" /> Baixar
                </a>
              </Button>
            </div>
          )}
        </DialogHeader>

        <div className="flex-1 bg-slate-100 relative flex flex-col items-center justify-center min-h-[500px] overflow-auto">
          {loading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 z-10">
              <Loader2 className="w-10 h-10 animate-spin text-brand-vividBlue mb-4" />
              <p className="text-muted-foreground text-sm font-medium">
                Carregando documento seguro...
              </p>
            </div>
          )}

          {error && !loading && (
            <div className="flex flex-col items-center justify-center text-center p-8 max-w-md mx-auto">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                Documento não encontrado ou bloqueado
              </h3>
              <p className="text-gray-500 mb-6 text-sm">
                O arquivo físico não foi encontrado no servidor ou o acesso foi bloqueado pelas
                políticas de segurança.
              </p>
              <div className="flex gap-3 justify-center">
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Fechar Visualizador
                </Button>
                {originalUrl && (
                  <Button asChild>
                    <a href={originalUrl} target="_blank" rel="noopener noreferrer">
                      Tentar Acesso Direto
                    </a>
                  </Button>
                )}
              </div>
            </div>
          )}

          {!loading && !error && url && (
            <div className="w-full h-full flex flex-col items-center justify-center">
              {type === 'pdf' ? (
                <iframe
                  src={`${url}#toolbar=0`}
                  className="w-full h-full min-h-[60vh] border-0 flex-1"
                  title="Documento PDF"
                  sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
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
                  <h3 className="text-lg font-semibold mb-2">Formato protegido</h3>
                  <p className="text-sm text-gray-500 mb-6 text-center max-w-xs">
                    O formato deste arquivo não pode ser visualizado diretamente no navegador por
                    segurança.
                  </p>
                  <Button asChild>
                    <a href={url} download={getFileName()}>
                      Fazer Download Seguro
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
