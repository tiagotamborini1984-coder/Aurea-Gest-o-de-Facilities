import { useParams, Navigate } from 'react-router-dom'
import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useHasAccess } from '@/hooks/use-has-access'
import { useState, useMemo } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Copy } from 'lucide-react'
import { useCadastrosConfig } from './useCadastrosConfig'
import QuadroContratado from './QuadroContratado'
import CadastrosFuncoes from './CadastrosFuncoes'
import CadastrosColaboradores from './CadastrosColaboradores'
import { DuplicateHeadcountDialog } from '@/components/gestao-terceiros/DuplicateHeadcountDialog'

export default function Cadastros() {
  const { type } = useParams()
  const { plants, locations, functions, equipment, refetch } = useMasterData()
  const { profile, selectedMasterClient } = useAppStore()

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const today = new Date()
    return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`
  })
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)

  const monthOptions = useMemo(() => {
    const options = []
    const today = new Date()
    for (let i = -12; i <= 12; i++) {
      const d = new Date(today.getFullYear(), today.getMonth() + i, 1)
      const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
      const label = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      options.push({ value: val, label: label.charAt(0).toUpperCase() + label.slice(1) })
    }
    return options
  }, [])

  const config = useCadastrosConfig(type, plants, locations, functions, equipment)

  // Assegura que o menuName seja avaliado corretamente mesmo para componentes customizados
  let menuName = ''
  if (config) {
    menuName = `Cadastros:${config.title}`
  } else if (type === 'colaboradores') {
    menuName = 'Cadastros:Colaboradores'
  } else if (type === 'funcoes') {
    menuName = 'Cadastros:Funções'
  } else if (type === 'quadro-contratado') {
    menuName = 'Cadastros:Quadro Contratado'
  } else if (type === 'empresas') {
    menuName = 'Cadastros:Empresas Parceiras'
  }

  const hasAccess = useHasAccess(menuName)

  if (!profile) return null
  if (profile.role !== 'Master' && !profile.client_id) return null

  // Para componentes customizados, delegamos a renderização passando as permissões e dados necessários
  if (type === 'quadro-contratado')
    return (
      <QuadroContratado canAdd={true} hasAccess={hasAccess} plants={plants} locations={locations} />
    )
  if (type === 'funcoes') return <CadastrosFuncoes canAdd={true} hasAccess={hasAccess} />
  if (type === 'colaboradores')
    return (
      <CadastrosColaboradores
        canAdd={true}
        hasAccess={hasAccess}
        plants={plants}
        locations={locations}
        functions={functions}
      />
    )

  // Para o CRUD genérico, validamos o acesso na rota
  if (!config) return <Navigate to="/gestao-terceiros" replace />
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  return (
    <div className="max-w-7xl mx-auto pb-12 animate-in fade-in duration-500">
      <CrudGeneric
        key={`${type}-${selectedMasterClient}-${selectedMonth}`}
        canAdd={true}
        hasAccess={hasAccess}
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
        extraActions={
          config.hasMonthFilter ? (
            <>
              <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                <SelectTrigger className="w-[180px] bg-white">
                  <SelectValue placeholder="Mês" />
                </SelectTrigger>
                <SelectContent>
                  {monthOptions.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={() => setIsDuplicateOpen(true)}>
                <Copy className="w-4 h-4 mr-2" /> Duplicar Mês
              </Button>
            </>
          ) : null
        }
        fetchQuery={async () => {
          let q = supabase
            .from(config.tableName)
            .select('*')
            .order('created_at', { ascending: false })

          if (config.hasMonthFilter) {
            q = q.eq('reference_month', `${selectedMonth}-01`)
          }

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

          if (config.hasMonthFilter) {
            payload.reference_month = `${selectedMonth}-01`
          }

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

      {config.hasMonthFilter && (
        <DuplicateHeadcountDialog
          open={isDuplicateOpen}
          onOpenChange={setIsDuplicateOpen}
          clientId={
            profile.role === 'Master' && selectedMasterClient !== 'all'
              ? selectedMasterClient
              : profile.client_id
          }
          monthOptions={monthOptions}
          defaultSource={selectedMonth}
          defaultTarget={selectedMonth}
          tableName={config.tableName}
          onSuccess={(targetMonth: string) => {
            setSelectedMonth(targetMonth)
            refetch()
          }}
        />
      )}
    </div>
  )
}
