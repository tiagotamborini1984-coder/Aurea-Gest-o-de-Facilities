import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function StatusChamado() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Gestão de Tarefas')

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        title="Status de Chamados"
        singularName="Status"
        tableName="task_statuses"
        icon={Tag as any}
        fields={
          [
            { name: 'name', label: 'Nome do Status', type: 'text', required: true },
            {
              name: 'color',
              label: 'Cor (Hex ou nome, ex: #10b981)',
              type: 'text',
              required: true,
            },
            { name: 'is_terminal', label: 'Finaliza SLA?', type: 'toggle', required: false },
          ] as FieldDef[]
        }
        columns={
          [
            { header: 'Nome', accessor: 'name' },
            {
              header: 'Cor',
              accessor: 'color',
              render: (item: any) => (
                <span className="flex items-center gap-2">
                  <span
                    className="w-4 h-4 rounded-full border border-gray-200"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  {item.color}
                </span>
              ),
            },
            {
              header: 'Finaliza SLA',
              accessor: 'is_terminal',
              render: (item: any) => (item.is_terminal ? 'Sim' : 'Não'),
            },
          ] as ColumnDef[]
        }
        fetchQuery={async () => {
          const { data } = await supabase
            .from('task_statuses')
            .select('*')
            .eq('client_id', profile.client_id)
            .order('created_at', { ascending: false })
          return data
        }}
        onAdd={async (record: any) => {
          const payload = { ...record, client_id: profile.client_id }
          if (payload.is_terminal === undefined) payload.is_terminal = false
          const { error } = await supabase.from('task_statuses').insert(payload)
          return { success: !error, error }
        }}
        onUpdate={async (id: string, record: any) => {
          const { error } = await supabase.from('task_statuses').update(record).eq('id', id)
          return { success: !error, error }
        }}
        onRemove={async (id: string) => {
          const { error } = await supabase.from('task_statuses').delete().eq('id', id)
          return { success: !error, error }
        }}
      />
    </div>
  )
}
