import { useParams, Navigate } from 'react-router-dom'
import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useHasAccess } from '@/hooks/use-has-access'
import { useCadastrosConfig } from './useCadastrosConfig'
import QuadroContratado from './QuadroContratado'
import CadastrosFuncoes from './CadastrosFuncoes'
import CadastrosColaboradores from './CadastrosColaboradores'

export default function Cadastros() {
  const { type } = useParams()
  const { plants, locations, functions, equipment, refetch } = useMasterData()
  const { profile, selectedMasterClient } = useAppStore()

  const config = useCadastrosConfig(type, plants, locations, functions, equipment)

  const menuName = config ? `Cadastros:${config.title}` : ''
  const hasAccess = useHasAccess(menuName)

  if (!profile) return null
  if (profile.role !== 'Master' && !profile.client_id) return null

  if (type === 'quadro-contratado') return <QuadroContratado />
  if (type === 'funcoes') return <CadastrosFuncoes />
  if (type === 'colaboradores') return <CadastrosColaboradores />

  if (!config) return <Navigate to="/gestao-terceiros" replace />

  // We need to fetch the access right here for dynamic CRUDs
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        key={`${type}-${selectedMasterClient}`}
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
          let q = supabase
            .from(config.tableName)
            .select('*')
            .order('created_at', { ascending: false })

          if (profile.role === 'Master') {
            if (selectedMasterClient !== 'all') {
              q = q.eq('client_id', selectedMasterClient)
            }
          } else {
            q = q.eq('client_id', profile.client_id)
          }

          const { data } = await q
          return data
        }}
        onAdd={async (record: any) => {
          const targetClientId =
            config.plantField && record.plant_id
              ? plants.find((p: any) => p.id === record.plant_id)?.client_id || profile.client_id
              : profile.role === 'Master' && selectedMasterClient !== 'all'
                ? selectedMasterClient
                : profile.client_id

          const payload = { ...record, client_id: targetClientId }

          if (payload.is_active === undefined && config.tableName === 'goals_book') {
            payload.is_active = false
          }

          const { error } = await supabase.from(config.tableName).insert(payload)
          if (!error) {
            refetch()
            return { success: true }
          }
          return { success: false, error }
        }}
        onUpdate={async (id: string, record: any) => {
          const payload = { ...record }
          const { error } = await supabase.from(config.tableName).update(payload).eq('id', id)
          if (!error) {
            refetch()
            return { success: true }
          }
          return { success: false, error }
        }}
        onRemove={async () => {
          refetch()
        }}
      />
    </div>
  )
}
