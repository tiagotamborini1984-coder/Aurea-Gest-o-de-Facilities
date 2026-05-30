import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { X } from 'lucide-react'

export function DocumentoForm({ open, onClose, doc, plants, onSave }: any) {
  const [formData, setFormData] = useState({
    name: '',
    document_type: '',
    expiration_date: '',
    frequency: 'Anual',
    alert_lead_days: 30,
    plant_id: '',
    file_url: '',
  })
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      setFormData(
        doc
          ? { ...doc }
          : {
              name: '',
              document_type: '',
              expiration_date: new Date().toISOString().split('T')[0],
              frequency: 'Anual',
              alert_lead_days: 30,
              plant_id: plants[0]?.id || '',
              file_url: '',
            },
      )
    }
  }, [open, doc, plants])

  if (!open) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { data: userData } = await supabase.auth.getUser()
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', userData.user?.id)
        .single()

      const payload: any = {
        name: formData.name,
        document_type: formData.document_type,
        expiration_date: formData.expiration_date,
        frequency: formData.frequency,
        alert_lead_days: formData.alert_lead_days,
        plant_id: formData.plant_id,
        file_url: formData.file_url || null,
        client_id: doc?.client_id || profile?.client_id,
      }

      if (doc?.id) payload.id = doc.id

      const { error } = await supabase.from('sector_documents').upsert(payload)
      if (error) throw error

      onSave()
    } catch (error) {
      console.error('Error saving document:', error)
      alert('Erro ao salvar documento. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-lg overflow-hidden relative flex flex-col max-h-[90vh]">
        <div className="p-6 border-b flex items-center justify-between bg-muted/30">
          <h2 className="text-lg font-semibold text-foreground">
            {doc ? 'Editar Documento' : 'Novo Documento'}
          </h2>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors p-1 rounded-md hover:bg-muted"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          <form id="doc-form" onSubmit={handleSubmit} className="grid grid-cols-2 gap-5">
            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">Nome do Documento</label>
              <input
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: AVCB"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium mb-1.5 block">Tipo</label>
              <input
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.document_type}
                onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                placeholder="Ex: Bombeiros"
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium mb-1.5 block">Planta</label>
              <select
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.plant_id}
                onChange={(e) => setFormData({ ...formData, plant_id: e.target.value })}
              >
                <option value="">Selecione...</option>
                {plants.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium mb-1.5 block">Vencimento</label>
              <input
                type="date"
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.expiration_date}
                onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
              />
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium mb-1.5 block">Periodicidade</label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.frequency}
                onChange={(e) => setFormData({ ...formData, frequency: e.target.value })}
              >
                <option value="Mensal">Mensal</option>
                <option value="Trimestral">Trimestral</option>
                <option value="Semestral">Semestral</option>
                <option value="Anual">Anual</option>
              </select>
            </div>

            <div className="col-span-2 sm:col-span-1">
              <label className="text-sm font-medium mb-1.5 block">Alerta (Dias antes)</label>
              <input
                type="number"
                min="0"
                required
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.alert_lead_days}
                onChange={(e) =>
                  setFormData({ ...formData, alert_lead_days: parseInt(e.target.value) || 0 })
                }
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-medium mb-1.5 block">URL do Arquivo (Download)</label>
              <input
                type="url"
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                value={formData.file_url}
                onChange={(e) => setFormData({ ...formData, file_url: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </form>
        </div>

        <div className="p-6 border-t bg-muted/30 flex justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md text-sm font-medium transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="doc-form"
            disabled={loading}
            className="px-4 py-2 bg-primary text-primary-foreground hover:bg-primary/90 rounded-md text-sm font-medium shadow transition-colors disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Documento'}
          </button>
        </div>
      </div>
    </div>
  )
}
