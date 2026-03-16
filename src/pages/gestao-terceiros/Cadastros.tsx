import { useParams, Navigate } from 'react-router-dom'
import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useCadastrosConfig } from './useCadastrosConfig'
import QuadroContratado from './QuadroContratado'

export default function Cadastros() {
  const { type } = useParams()
  const { plants, locations, functions, equipment, refetch } = useMasterData()
  const { profile } = useAppStore()

  const config = useCadastrosConfig(type, plants, locations, functions, equipment)

  if (!profile?.client_id) return null

  if (type === 'quadro-contratado') {
    return <QuadroContratado />
  }

  if (!config) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        key={type}
        title={config.title}
        singularName={config.singularName}
        subtitle={config.subtitle}
        tableName={config.tableName}
        icon={config.icon}
        fields={config.fields as FieldDef[]}
        columns={config.columns as ColumnDef[]}
        searchFields={config.searchFields}
        plantField={config.plantField}
        plants={plants}
        fetchQuery={async () => {
          if (config.tableName === 'locations') {
            const pIds = plants.map((p) => p.id)
            if (pIds.length === 0) return []
            const { data } = await supabase
              .from('locations')
              .select('*')
              .in('plant_id', pIds)
              .order('created_at', { ascending: false })
            return data
          }

          const { data } = await supabase
            .from(config.tableName)
            .select('*')
            .eq('client_id', profile.client_id)
            .order('created_at', { ascending: false })
          return data
        }}
        onAdd={async (record: any) => {
          const payload = { ...record }
          if (config.tableName !== 'locations') {
            payload.client_id = profile.client_id
          }
          if (payload.is_active === undefined && config.tableName === 'goals_book') {
            payload.is_active = false
          }
          const { error } = await supabase.from(config.tableName).insert(payload)
          if (!error) {
            refetch()
            return true
          }
          console.error(`Erro ao salvar em ${config.tableName}:`, error)
          return false
        }}
        onUpdate={async (id: string, record: any) => {
          const payload = { ...record }
          const { error } = await supabase.from(config.tableName).update(payload).eq('id', id)
          if (!error) {
            refetch()
            return true
          }
          console.error(`Erro ao atualizar em ${config.tableName}:`, error)
          return false
        }}
        onRemove={async () => {
          refetch()
        }}
      />
    </div>
  )
}
