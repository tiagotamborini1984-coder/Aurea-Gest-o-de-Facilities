import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { Leaf } from 'lucide-react'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'

export default function AreasLJ() {
  const { plants } = useMasterData()
  const { profile } = useAppStore()

  if (!profile) return null

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        title="Áreas de Limpeza e Jardinagem"
        singularName="Área"
        tableName="cleaning_gardening_areas"
        icon={Leaf as any}
        fields={
          [
            { name: 'name', label: 'Nome da Área', type: 'text', required: true },
            { name: 'description', label: 'Descrição', type: 'text' },
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
            { accessorKey: 'name', header: 'Nome' },
            {
              accessorKey: 'type',
              header: 'Tipo',
              render: (val: string) => (val === 'cleaning' ? 'Limpeza' : 'Jardinagem'),
            },
            { accessorKey: 'description', header: 'Descrição' },
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
          const payload = { ...record, client_id: profile.client_id }
          const { error } = await supabase.from('cleaning_gardening_areas').insert(payload)
          return { success: !error, error }
        }}
        onUpdate={async (id: string, record: any) => {
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
