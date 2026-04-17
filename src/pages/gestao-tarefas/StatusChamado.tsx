import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { Tag } from 'lucide-react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function StatusChamado() {
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Gestão de Tarefas:Status')

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
            { name: 'sla_days', label: 'SLA (Dias)', type: 'number', required: true },
            { name: 'is_terminal', label: 'Finaliza SLA?', type: 'toggle', required: false },
            {
              name: 'freeze_sla',
              label: 'Congelar SLA (Pausar tempo)?',
              type: 'toggle',
              required: false,
            },
            {
              name: 'ignore_sla',
              label: 'Ignorar SLA (Não contabilizar tempo)?',
              type: 'toggle',
              required: false,
            },
            {
              name: 'return_to_requester',
              label: 'Devolver para Requisitante ao entrar no status?',
              type: 'toggle',
              required: false,
            },
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
                    className="w-4 h-4 rounded-full border border-gray-200 shadow-sm"
                    style={{ backgroundColor: item.color }}
                  ></span>
                  {item.color}
                </span>
              ),
            },
            {
              header: 'SLA (Dias)',
              accessor: 'sla_days',
            },
            {
              header: 'Finaliza SLA',
              accessor: 'is_terminal',
              render: (item: any) => (item.is_terminal ? 'Sim' : 'Não'),
            },
            {
              header: 'Pausa SLA',
              accessor: 'freeze_sla',
              render: (item: any) => (item.freeze_sla ? 'Sim' : 'Não'),
            },
            {
              header: 'Ignora SLA',
              accessor: 'ignore_sla',
              render: (item: any) => (item.ignore_sla ? 'Sim' : 'Não'),
            },
            {
              header: 'Devolve p/ Req.',
              accessor: 'return_to_requester',
              render: (item: any) => (item.return_to_requester ? 'Sim' : 'Não'),
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
          if (payload.freeze_sla === undefined) payload.freeze_sla = false
          if (payload.ignore_sla === undefined) payload.ignore_sla = false
          if (payload.return_to_requester === undefined) payload.return_to_requester = false
          if (payload.sla_days === undefined) payload.sla_days = 1
          const { error } = await supabase.from('task_statuses').insert(payload)
          return { success: !error, error }
        }}
        onUpdate={async (id: string, record: any) => {
          if (record.is_terminal === undefined) record.is_terminal = false
          if (record.freeze_sla === undefined) record.freeze_sla = false
          if (record.ignore_sla === undefined) record.ignore_sla = false
          if (record.return_to_requester === undefined) record.return_to_requester = false
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
