import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { CheckSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function TiposChamado() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Gestão de Tarefas')

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        title="Tipos de Chamado"
        singularName="Tipo de Chamado"
        tableName="task_types"
        icon={CheckSquare as any}
        fields={
          [
            { name: 'name', label: 'Nome do Tipo', type: 'text', required: true },
            { name: 'sla_hours', label: 'SLA (Horas)', type: 'number', required: true },
          ] as FieldDef[]
        }
        columns={
          [
            { accessor: 'name', header: 'Nome' },
            { accessor: 'sla_hours', header: 'SLA (Horas)' },
          ] as ColumnDef[]
        }
        fetchQuery={async () => {
          const { data } = await supabase
            .from('task_types')
            .select('*')
            .eq('client_id', profile.client_id)
            .order('created_at', { ascending: false })
          return data
        }}
        onAdd={async (record: any) => {
          const payload = { ...record, client_id: profile.client_id }
          const { error } = await supabase.from('task_types').insert(payload)
          return { success: !error, error }
        }}
        onUpdate={async (id: string, record: any) => {
          const { error } = await supabase.from('task_types').update(record).eq('id', id)
          return { success: !error, error }
        }}
        onRemove={async (id: string) => {
          const { error } = await supabase.from('task_types').delete().eq('id', id)
          return { success: !error, error }
        }}
      />
    </div>
  )
}
