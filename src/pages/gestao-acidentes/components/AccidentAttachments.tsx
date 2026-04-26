import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Plus, FileText, Download, ExternalLink, Loader2 } from 'lucide-react'

export function AccidentAttachments({
  accident,
  onUpdate,
}: {
  accident: any
  onUpdate: (acc: any) => void
}) {
  const { toast } = useToast()
  const [photos, setPhotos] = useState<any[]>(accident?.photos || [])
  const [newUrl, setNewUrl] = useState('')
  const [isUploading, setIsUploading] = useState(false)

  const handleAdd = async () => {
    if (!newUrl) return
    const updated = [...photos, { url: newUrl, name: `Anexo ${photos.length + 1}` }]
    await savePhotos(updated)
    setNewUrl('')
  }

  const handleRemove = async (index: number) => {
    const updated = photos.filter((_, i) => i !== index)
    await savePhotos(updated)
  }

  const savePhotos = async (updatedPhotos: any[]) => {
    setIsUploading(true)
    const { error } = await supabase
      .from('accidents')
      .update({ photos: updatedPhotos })
      .eq('id', accident.id)

    setIsUploading(false)
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } else {
      setPhotos(updatedPhotos)
      onUpdate({ ...accident, photos: updatedPhotos })
      toast({ title: 'Sucesso', description: 'Anexos atualizados.' })
    }
  }

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Limit file size to 5MB to prevent payload too large errors
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'Arquivo muito grande',
        description: 'O arquivo não pode ter mais que 5MB.',
        variant: 'destructive',
      })
      e.target.value = ''
      return
    }

    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const updated = [...photos, { url: base64, name: file.name, type: file.type }]
      await savePhotos(updated)
    }
    reader.readAsDataURL(file)
  }

  const isPdf = (p: any) => {
    return (
      p.type === 'application/pdf' || p.url?.includes('application/pdf') || p.url?.endsWith('.pdf')
    )
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Adicionar Anexo</label>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
              <Input
                type="file"
                accept="image/*,application/pdf"
                onChange={handleFileUpload}
                className="cursor-pointer max-w-sm"
                disabled={isUploading}
              />
              <div className="text-sm text-gray-500 self-center mx-2">ou</div>
              <Input
                placeholder="URL da imagem ou PDF (opcional)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
                disabled={isUploading}
                className="max-w-sm"
              />
              <Button onClick={handleAdd} disabled={isUploading || !newUrl}>
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Plus className="w-4 h-4 mr-2" />
                )}
                Adicionar
              </Button>
            </div>
            <p className="text-xs text-gray-500">Formatos aceitos: Imagens e PDF (Max: 5MB)</p>
          </div>
        </div>

        {photos.length === 0 ? (
          <div className="text-center py-8 text-gray-500 border border-dashed rounded-lg">
            Nenhum anexo inserido.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {photos.map((p, i) => (
              <div
                key={i}
                className="relative group border rounded-lg overflow-hidden bg-gray-50 aspect-square flex flex-col items-center justify-center"
              >
                {isPdf(p) ? (
                  <FileText className="w-12 h-12 text-blue-500 mb-4" />
                ) : (
                  <img
                    src={p.url}
                    alt={p.name}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}

                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                  {isPdf(p) ? (
                    <Button variant="secondary" size="icon" asChild>
                      <a href={p.url} download={p.name || 'documento.pdf'}>
                        <Download className="w-4 h-4" />
                      </a>
                    </Button>
                  ) : (
                    <Button variant="secondary" size="icon" asChild>
                      <a href={p.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    </Button>
                  )}
                  <Button variant="destructive" size="icon" onClick={() => handleRemove(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/80 text-white text-xs p-1.5 truncate text-center z-10">
                  {p.name}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
