import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { Leaf } from 'lucide-react'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Navigate } from 'react-router-dom'
import { useHasAccess } from '@/hooks/use-has-access'

export default function AreasLJ() {
  const { plants } = useMasterData()
  const { profile } = useAppStore()
  const hasAccess = useHasAccess('Limpeza e Jardinagem')

  if (!profile) return null
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        title="Áreas de Limpeza e Jardinagem"
        singularName="Área"
        tableName="cleaning_gardening_areas"
        icon={Leaf as any}
        fields={
          [
            {
              name: 'plant_id',
              label: 'Planta',
              type: 'select',
              required: true,
              options: plants.map((p) => ({ value: p.id, label: p.name })),
            },
            { name: 'name', label: 'Nome da Área', type: 'text', required: true },
            { name: 'description', label: 'Descrição', type: 'text', required: false },
            {
              name: 'type',
              label: 'Tipo de Serviço',
              type: 'select',
              required: true,
              options: [
                { value: 'cleaning', label: 'Limpeza' },
                { value: 'gardening', label: 'Jardinagem' },
              ],
            },
          ] as FieldDef[]
        }
        columns={
          [
            { accessor: 'name', header: 'Nome' },
            {
              accessor: 'plant_id',
              header: 'Planta',
              render: (item: any) => plants.find((p) => p.id === item.plant_id)?.name || '-',
            },
            {
              accessor: 'type',
              header: 'Tipo',
              render: (item: any) => (item.type === 'cleaning' ? 'Limpeza' : 'Jardinagem'),
            },
            {
              accessor: 'description',
              header: 'Descrição',
              render: (item: any) => item.description || '-',
            },
          ] as ColumnDef[]
        }
        plantField="plant_id"
        plants={plants}
        fetchQuery={async () => {
          const { data } = await supabase
            .from('cleaning_gardening_areas')
            .select('*')
            .eq('client_id', profile.client_id)
            .order('created_at', { ascending: false })
          return data
        }}
        onAdd={async (record: any) => {
          if (!record.plant_id)
            return { success: false, error: { message: 'A Planta é obrigatória.' } }
          const payload = { ...record, client_id: profile.client_id }
          const { error } = await supabase.from('cleaning_gardening_areas').insert(payload)
          return { success: !error, error }
        }}
        onUpdate={async (id: string, record: any) => {
          if (!record.plant_id)
            return { success: false, error: { message: 'A Planta é obrigatória.' } }
          const { error } = await supabase
            .from('cleaning_gardening_areas')
            .update(record)
            .eq('id', id)
          return { success: !error, error }
        }}
        onRemove={async (id: string) => {
          const { error } = await supabase.from('cleaning_gardening_areas').delete().eq('id', id)
          return { success: !error, error }
        }}
      />
    </div>
  )
}
