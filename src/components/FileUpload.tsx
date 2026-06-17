import { useState, useRef } from 'react'
import { UploadCloud, X, Loader2, File as FileIcon, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/components/ui/use-toast'
import { cn } from '@/lib/utils'

interface FileUploadProps {
  onUploadComplete: (urls: string[]) => void
  existingUrls?: string[]
  bucket?: string
  multiple?: boolean
}

export function FileUpload({
  onUploadComplete,
  existingUrls = [],
  bucket = 'documents',
  multiple = true,
  showThumbnails = false,
}: FileUploadProps & { showThumbnails?: boolean }) {
  const [urls, setUrls] = useState<string[]>(existingUrls)
  const [uploading, setUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const { toast } = useToast()

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    if (files.length === 0) return

    setUploading(true)
    setProgress(0)

    const newUrls: string[] = []
    let hasError = false

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      setProgress(Math.round((i / files.length) * 100))

      const { error: uploadError } = await supabase.storage.from(bucket).upload(filePath, file)

      if (uploadError) {
        hasError = true
        toast({
          title: 'Erro no upload',
          description: `Falha ao fazer upload de ${file.name}: ${uploadError.message}`,
          variant: 'destructive',
        })
        continue
      }

      const { data } = supabase.storage.from(bucket).getPublicUrl(filePath)
      newUrls.push(data.publicUrl)
    }

    if (!hasError && files.length > 0) {
      toast({
        title: 'Upload concluído',
        description: 'Os arquivos foram anexados com sucesso.',
      })
    }

    const updatedUrls = multiple ? [...urls, ...newUrls] : newUrls
    setUrls(updatedUrls)
    onUploadComplete(updatedUrls)
    setUploading(false)
    setProgress(100)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removeUrl = (urlToRemove: string) => {
    const updatedUrls = urls.filter((u) => u !== urlToRemove)
    setUrls(updatedUrls)
    onUploadComplete(updatedUrls)
  }

  const formatFileName = (url: string) => {
    try {
      const parts = url.split('/')
      const lastPart = parts[parts.length - 1]
      if (lastPart.includes('_')) {
        return lastPart.split('_').slice(1).join('_')
      }
      return lastPart
    } catch {
      return 'Documento Anexado'
    }
  }

  return (
    <div className="space-y-4 w-full">
      <div
        className={cn(
          'border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-all duration-200 bg-card',
          uploading
            ? 'bg-muted/50 border-muted-foreground/30'
            : 'hover:bg-muted/50 cursor-pointer border-border hover:border-brand-vividBlue/50',
        )}
        onClick={() => !uploading && fileInputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault()
          e.currentTarget.classList.add('bg-muted/50', 'border-brand-vividBlue')
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('bg-muted/50', 'border-brand-vividBlue')
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.currentTarget.classList.remove('bg-muted/50', 'border-brand-vividBlue')
          if (!uploading && fileInputRef.current) {
            fileInputRef.current.files = e.dataTransfer.files
            const event = new Event('change', { bubbles: true })
            fileInputRef.current.dispatchEvent(event)
          }
        }}
      >
        <div className="bg-brand-vividBlue/10 p-3 rounded-full mb-4">
          <UploadCloud className="h-8 w-8 text-brand-vividBlue" />
        </div>
        <p className="text-sm font-semibold tracking-wide text-foreground">
          {uploading ? 'Enviando arquivos...' : 'Clique ou arraste para fazer upload'}
        </p>
        <p className="text-xs text-muted-foreground mt-2 max-w-xs mx-auto">
          Suporta PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (Tamanho máx. 50MB)
        </p>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple={multiple}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>

      {uploading && (
        <div className="bg-muted/50 rounded-lg p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin text-brand-vividBlue" />
              Processando arquivos...
            </span>
            <span>{progress}%</span>
          </div>
          <div className="h-1.5 w-full bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-vividBlue transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {urls.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium text-foreground mb-2 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            Anexos enviados ({urls.length})
          </p>
          {showThumbnails ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mt-4">
              {urls.map((url, i) => (
                <div
                  key={i}
                  className="relative group aspect-square rounded-lg border bg-muted overflow-hidden"
                >
                  {url.match(/\.(jpeg|jpg|gif|png)$/i) ? (
                    <img src={url} alt="Evidência" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center p-2 text-center">
                      <FileIcon className="h-8 w-8 text-muted-foreground mb-2" />
                      <span className="text-xs truncate w-full px-2" title={formatFileName(url)}>
                        {formatFileName(url)}
                      </span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <Button
                      variant="destructive"
                      size="sm"
                      type="button"
                      className="h-8 shadow-lg gap-2"
                      onClick={(e) => {
                        e.stopPropagation()
                        removeUrl(url)
                      }}
                    >
                      <X className="h-4 w-4" />
                      Remover
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {urls.map((url, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 border border-border rounded-lg bg-card text-sm group hover:border-border/80 transition-colors"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-muted p-2 rounded-md shrink-0 group-hover:bg-brand-vividBlue/10 transition-colors">
                      <FileIcon className="h-4 w-4 text-muted-foreground group-hover:text-brand-vividBlue transition-colors" />
                    </div>
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="truncate hover:underline font-medium text-foreground/90"
                      translate="no"
                      title={url}
                    >
                      {formatFileName(url)}
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    type="button"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeUrl(url)
                    }}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
