import { useParams, Navigate } from 'react-router-dom'
import { CrudGeneric, FieldDef, ColumnDef } from '@/components/gestao-terceiros/CrudGeneric'
import { useMasterData } from '@/hooks/use-master-data'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useHasAccess } from '@/hooks/use-has-access'
import { useState, useMemo, useEffect } from 'react'
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
import { DuplicateHeadcountDialog } from '@/components/gestao-terceiros/DuplicateHeadcountDialog'
import { EmployeeTrainingsForm, FunctionTrainingsForm } from './TreinamentosVinculo'

export default function Cadastros() {
  const { type } = useParams()
  const { plants, locations, functions, equipment, refetch } = useMasterData()
  const { profile, selectedMasterClient } = useAppStore()
  const [companies, setCompanies] = useState<any[]>([])

  useEffect(() => {
    async function fetchCompanies() {
      if (!profile) return
      let q = supabase.from('companies').select('*').order('name')
      if (profile.role === 'Master' && selectedMasterClient !== 'all') {
        q = q.eq('client_id', selectedMasterClient)
      } else if (profile.role !== 'Master') {
        q = q.eq('client_id', profile.client_id)
      }
      const { data } = await q
      if (data) setCompanies(data)
    }
    fetchCompanies()
  }, [profile, selectedMasterClient])

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

  const config = useCadastrosConfig(type, plants, locations, functions, equipment, companies)

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

  // Para o CRUD genérico, validamos o acesso na rota
  if (!config) return <Navigate to="/gestao-terceiros" replace />
  if (!hasAccess) return <Navigate to="/gestao-terceiros" replace />

  const renderExtraFormContent = (form: any, setForm: any) => {
    if (type === 'colaboradores') {
      return <EmployeeTrainingsForm form={form} setForm={setForm} />
    }
    if (type === 'funcoes') {
      return <FunctionTrainingsForm form={form} setForm={setForm} />
    }
    return null
  }

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
        extraFormContent={renderExtraFormContent}
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
          if (type === 'colaboradores' && record.training_records) {
            const missingRequired = record.training_records.some(
              (tr: any) => tr.is_required && (!tr.document_url || !tr.completion_date),
            )
            if (missingRequired) {
              return {
                success: false,
                error: {
                  message:
                    'É obrigatório informar a data de conclusão e anexar o comprovante para os treinamentos exigidos pela função.',
                },
              }
            }
          }

          const targetClientId =
            config.plantField && record.plant_id
              ? plants.find((p: any) => p.id === record.plant_id)?.client_id || profile.client_id
              : profile.role === 'Master' && selectedMasterClient !== 'all'
                ? selectedMasterClient
                : profile.client_id

          const { training_records, ...rest } = record
          const payload = { ...rest, client_id: targetClientId }

          if (type === 'colaboradores' && payload.company_id) {
            const comp = companies.find((c: any) => c.id === payload.company_id)
            if (comp) {
              payload.company_name = comp.name
            }
          }

          if (config.hasMonthFilter) {
            payload.reference_month = `${selectedMonth}-01`
          }

          if (payload.is_active === undefined && config.tableName === 'goals_book') {
            payload.is_active = false
          }

          const { data, error } = await supabase
            .from(config.tableName)
            .insert(payload)
            .select()
            .single()
          if (!error && data) {
            if (training_records && config.tableName === 'employees') {
              const trPayload = training_records.map((tr: any) => ({
                client_id: targetClientId,
                employee_id: data.id,
                training_id: tr.training_id,
                document_url: tr.document_url || '',
                completion_date: tr.completion_date || new Date().toISOString().split('T')[0],
              }))
              if (trPayload.length > 0) {
                await supabase.from('employee_training_records').insert(trPayload)
              }
            }
            if (training_records && config.tableName === 'functions') {
              const trPayload = training_records.map((tr: any) => ({
                client_id: targetClientId,
                function_id: data.id,
                training_id: tr.training_id,
              }))
              if (trPayload.length > 0) {
                await supabase.from('function_required_trainings').insert(trPayload)
              }
            }
            refetch()
            return { success: true }
          }
          return { success: false, error }
        }}
        onUpdate={async (id: string, record: any) => {
          if (type === 'colaboradores' && record.training_records) {
            const missingRequired = record.training_records.some(
              (tr: any) => tr.is_required && (!tr.document_url || !tr.completion_date),
            )
            if (missingRequired) {
              return {
                success: false,
                error: {
                  message:
                    'É obrigatório informar a data de conclusão e anexar o comprovante para os treinamentos exigidos pela função.',
                },
              }
            }
          }

          const { training_records, ...rest } = record
          const payload = { ...rest }

          if (type === 'colaboradores' && payload.company_id) {
            const comp = companies.find((c: any) => c.id === payload.company_id)
            if (comp) {
              payload.company_name = comp.name
            }
          }

          const { error } = await supabase.from(config.tableName).update(payload).eq('id', id)
          if (!error) {
            if (training_records && config.tableName === 'employees') {
              await supabase.from('employee_training_records').delete().eq('employee_id', id)
              const trPayload = training_records.map((tr: any) => ({
                client_id: payload.client_id || record.client_id,
                employee_id: id,
                training_id: tr.training_id,
                document_url: tr.document_url || '',
                completion_date: tr.completion_date || new Date().toISOString().split('T')[0],
              }))
              if (trPayload.length > 0) {
                await supabase.from('employee_training_records').insert(trPayload)
              }
            }
            if (training_records && config.tableName === 'functions') {
              await supabase.from('function_required_trainings').delete().eq('function_id', id)
              const trPayload = training_records.map((tr: any) => ({
                client_id: payload.client_id || record.client_id,
                function_id: id,
                training_id: tr.training_id,
              }))
              if (trPayload.length > 0) {
                await supabase.from('function_required_trainings').insert(trPayload)
              }
            }
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
