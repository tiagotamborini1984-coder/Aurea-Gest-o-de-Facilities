import { useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'
import { Trash2, Plus } from 'lucide-react'

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
    const { error } = await supabase
      .from('accidents')
      .update({ photos: updatedPhotos })
      .eq('id', accident.id)
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
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const base64 = ev.target?.result as string
      const updated = [...photos, { url: base64, name: file.name }]
      await savePhotos(updated)
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card>
      <CardContent className="pt-6 space-y-6">
        <div className="flex items-end gap-4">
          <div className="flex-1 space-y-2">
            <label className="text-sm font-medium">Adicionar Imagem</label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="cursor-pointer max-w-sm"
              />
              <div className="text-sm text-gray-500 self-center mx-2">ou</div>
              <Input
                placeholder="URL da imagem (opcional)"
                value={newUrl}
                onChange={(e) => setNewUrl(e.target.value)}
              />
              <Button onClick={handleAdd}>
                <Plus className="w-4 h-4 mr-2" /> Adicionar
              </Button>
            </div>
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
                className="relative group border rounded-lg overflow-hidden bg-gray-50 aspect-square"
              >
                <img src={p.url} alt={p.name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Button variant="destructive" size="icon" onClick={() => handleRemove(i)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
                <div className="absolute bottom-0 left-0 right-0 bg-black/70 text-white text-xs p-1 truncate text-center">
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
