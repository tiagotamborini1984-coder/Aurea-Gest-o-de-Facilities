import { useState, useMemo } from 'react'
import { useCrud } from '@/hooks/use-crud'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Plus, Loader2 } from 'lucide-react'
import { Database } from '@/lib/supabase/types'
import { DocumentosDashboard } from './components/DocumentosDashboard'
import { DocumentosTable } from './components/DocumentosTable'
import { DocumentosForm } from './components/DocumentosForm'

type SectorDocument = Database['public']['Tables']['sector_documents']['Row']

export default function Documentos() {
  const { selectedPlant } = useAppStore()
  const { data, loading, fetchAll } = useCrud<SectorDocument>('sector_documents')
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<SectorDocument | null>(null)

  const filteredData = useMemo(() => {
    if (selectedPlant === 'all') return data
    return data.filter((d) => d.plant_id === selectedPlant)
  }, [data, selectedPlant])

  const handleEdit = (doc: SectorDocument) => {
    setEditingDoc(doc)
    setIsFormOpen(true)
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingDoc(null)
    fetchAll()
  }

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestão de Documentos</h2>
          <p className="text-muted-foreground mt-1">
            Gerencie alvarás, licenças e laudos com controle de SLA e vencimento.
          </p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Novo Documento
        </Button>
      </div>

      <DocumentosDashboard data={filteredData} />

      {loading ? (
        <div className="flex justify-center p-8">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <DocumentosTable data={filteredData} onEdit={handleEdit} onRefresh={fetchAll} />
      )}

      {isFormOpen && (
        <DocumentosForm open={isFormOpen} onOpenChange={handleCloseForm} initialData={editingDoc} />
      )}
    </div>
  )
}
