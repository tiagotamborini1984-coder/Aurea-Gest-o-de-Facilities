import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase/client'
import { FileCheck, FileX, Percent, Plus } from 'lucide-react'
import { startOfDay, parseISO, isBefore } from 'date-fns'
import { DocumentosTable } from './DocumentosTable'
import { DocumentoForm } from './DocumentoForm'

export default function Documentos() {
  const [documents, setDocuments] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)

  const fetchData = async () => {
    setLoading(true)
    const { data: userData } = await supabase.auth.getUser()
    if (!userData.user) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('client_id, role, authorized_plants')
      .eq('id', userData.user.id)
      .single()

    let query = supabase
      .from('sector_documents')
      .select('*')
      .order('expiration_date', { ascending: true })
    let plantsQuery = supabase.from('plants').select('id, name')

    if (profile?.role !== 'Master') {
      query = query.eq('client_id', profile?.client_id)
      plantsQuery = plantsQuery.eq('client_id', profile?.client_id)

      if (
        profile?.authorized_plants &&
        Array.isArray(profile.authorized_plants) &&
        profile.authorized_plants.length > 0
      ) {
        query = query.in('plant_id', profile.authorized_plants)
        plantsQuery = plantsQuery.in('id', profile.authorized_plants)
      }
    }

    const [docsRes, plantsRes] = await Promise.all([query, plantsQuery])
    if (docsRes.data) setDocuments(docsRes.data)
    if (plantsRes.data) setPlants(plantsRes.data)
    setLoading(false)
  }

  useEffect(() => {
    fetchData()
  }, [])

  const handleDelete = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este documento?')) {
      await supabase.from('sector_documents').delete().eq('id', id)
      fetchData()
    }
  }

  const today = startOfDay(new Date())
  let onTime = 0
  let expired = 0

  documents.forEach((doc) => {
    const expDate = startOfDay(parseISO(doc.expiration_date))
    if (isBefore(expDate, today)) expired++
    else onTime++
  })

  const adherence = documents.length > 0 ? ((onTime / documents.length) * 100).toFixed(1) : 0

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto animate-fade-in">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">
            Gestão de Documentos
          </h1>
          <p className="text-muted-foreground text-sm">
            Acompanhe o vencimento e status dos documentos.
          </p>
        </div>
        <button
          onClick={() => {
            setEditingDoc(null)
            setIsFormOpen(true)
          }}
          className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors shadow-sm"
        >
          <Plus className="mr-2 h-4 w-4" /> Novo Documento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Documentos em Dia</h3>
            <FileCheck className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">{loading ? '-' : onTime}</div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Documentos Vencidos</h3>
            <FileX className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold">{loading ? '-' : expired}</div>
        </div>

        <div className="rounded-xl border bg-card text-card-foreground shadow-sm p-6 flex flex-col justify-between">
          <div className="flex flex-row items-center justify-between pb-2">
            <h3 className="tracking-tight text-sm font-medium">Aderência de Documentação</h3>
            <Percent className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold">{loading ? '-' : `${adherence}%`}</div>
        </div>
      </div>

      <div className="bg-card rounded-xl border shadow-sm overflow-hidden">
        <DocumentosTable
          documents={documents}
          onEdit={(doc: any) => {
            setEditingDoc(doc)
            setIsFormOpen(true)
          }}
          onDelete={handleDelete}
        />
      </div>

      <DocumentoForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        doc={editingDoc}
        plants={plants}
        onSave={() => {
          setIsFormOpen(false)
          fetchData()
        }}
      />
    </div>
  )
}
