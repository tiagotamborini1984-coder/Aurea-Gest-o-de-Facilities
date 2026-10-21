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
import { resolveActiveEmployees } from '@/lib/employee-vigencia'
import { EmployeeTrainingsForm, FunctionTrainingsForm } from './TreinamentosVinculo'
import { logAudit } from '@/services/audit'

// Lista está validada pelo agente (e o documento não mudou desde a validação)?
// A conferência acontece NO MOMENTO DO ANEXO (TreinamentosVinculo); aqui é só o portão.
function isListValidated(tr?: any): boolean {
  return (
    !!tr && tr.verification_status === 'verified' && tr.verified_document_url === tr.document_url
  )
}

export default function Cadastros() {
  const { type } = useParams()
  const { plants, locations, functions, equipment, refetch } = useMasterData()
  const { profile, selectedMasterClient, selectedPlant: globalSelectedPlant } = useAppStore()
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
  const typeMenuMap: Record<string, string> = {
    colaboradores: 'Cadastros:Colaboradores',
    funcoes: 'Cadastros:Funções',
    'quadro-contratado': 'Cadastros:Quadro Contratado',
    empresas: 'Cadastros:Empresas',
    plantas: 'Cadastros:Plantas',
    locais: 'Cadastros:Locais',
    equipamentos: 'Cadastros:Equipamentos',
    treinamentos: 'Cadastros:Treinamentos',
    'book-metas': 'Cadastros:Book de Metas',
  }

  if (type && typeMenuMap[type]) {
    menuName = typeMenuMap[type]
  } else if (config) {
    menuName = `Cadastros:${config.title}`
  }

  const hasAccess = useHasAccess(menuName)

  if (!profile) return null
  if (profile.role !== 'Master' && !profile.client_id) return null

  // Para componentes customizados, delegamos a renderização passando as permissões e dados necessários
  if (type === 'quadro-contratado') return <QuadroContratado />

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
          const selectFields = config.tableName === 'employees' ? '*, functions(name)' : '*'

          let q = supabase
            .from(config.tableName)
            .select(selectFields)
            .order('created_at', { ascending: false })

          if (config.hasMonthFilter) {
            if (type !== 'colaboradores') {
              q = q.eq('reference_month', `${selectedMonth}-01`)
            }
          }
          if (type === 'equipamentos') {
            q = q.eq('status', 'Ativo')
          }

          if (profile.role === 'Master') {
            if (selectedMasterClient !== 'all') {
              q = q.eq('client_id', selectedMasterClient)
            }
          } else {
            q = q.eq('client_id', profile.client_id)
          }

          if (config.plantField && globalSelectedPlant && globalSelectedPlant !== 'all') {
            q = q.eq(config.plantField, globalSelectedPlant)
          }

          const { data } = await q

          if (type === 'colaboradores' && data) {
            // Regra unificada de vigência: versão mais recente vence (reference_month DESC, created_at DESC).
            // Se a versão mais recente estiver 'Inativo', a pessoa não aparece na listagem de colaboradores.
            return resolveActiveEmployees(data as any[])
          }

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

          const { training_records, updated_at, created_at, functions, org_functions, ...rest } =
            record
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

          const { data, error } = await (supabase.from(config.tableName) as any)
            .insert(payload)
            .select()
            .single()
          if (!error && data) {
            if (training_records && config.tableName === 'employees') {
              const trPayload = training_records
                .filter((tr: any) => tr.training_id)
                .map((tr: any) => ({
                  client_id: targetClientId,
                  employee_id: data.id,
                  training_id: tr.training_id,
                  document_url: tr.document_url || '',
                  completion_date: tr.completion_date || new Date().toISOString().split('T')[0],
                  verification_status: tr.verification_status || 'pending',
                  verification_notes: tr.verification_notes || null,
                  verification_signed_name: tr.verification_signed_name || null,
                  verification_confidence: tr.verification_confidence ?? null,
                  verified_at: tr.verified_at || null,
                }))
              if (trPayload.length > 0) {
                const { error: trError, data: trRows } = await supabase
                  .from('employee_training_records')
                  .insert(trPayload)
                  .select('id, document_url')
                if (trError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao salvar treinamentos do colaborador: ${trError.message}`,
                    },
                  }
                }
                await logAudit(
                  targetClientId,
                  profile.id,
                  'training_record_created',
                  `Colaborador: ${data.name || data.id}`,
                )
                // Portão: todas as listas anexadas devem ter sido validadas no anexo
                const formRecs = training_records.filter((tr: any) => tr.training_id)
                const invalid = (trRows || []).filter((r: any, i: number) => {
                  return r.document_url && !isListValidated(formRecs[i])
                })
                if (invalid.length > 0) {
                  await supabase.from('employees').delete().eq('id', data.id)
                  return {
                    success: false,
                    error: {
                      message:
                        `Cadastro não salvo: lista de presença não validada pelo agente. ${invalid[0] ? '' : ''}(anexe uma lista válida e aguarde a conferência)`.replace(
                          '  ',
                          ' ',
                        ),
                    },
                  }
                }
              }
            }
            if (training_records && config.tableName === 'functions') {
              const frPayload = training_records
                .filter((tr: any) => tr.training_id)
                .map((tr: any) => ({
                  client_id: targetClientId,
                  function_id: data.id,
                  training_id: tr.training_id,
                }))
              if (frPayload.length > 0) {
                const { error: frError } = await supabase
                  .from('function_required_trainings')
                  .insert(frPayload)
                if (frError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao salvar treinamentos da função: ${frError.message}`,
                    },
                  }
                }
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

          const { training_records, updated_at, created_at, functions, org_functions, ...rest } =
            record
          const payload = { ...rest }

          const updateClientId =
            payload.client_id ||
            (profile.role === 'Master' && selectedMasterClient !== 'all'
              ? selectedMasterClient
              : profile.client_id)

          if (type === 'colaboradores' && payload.company_id) {
            const comp = companies.find((c: any) => c.id === payload.company_id)
            if (comp) {
              payload.company_name = comp.name
            }
          }

          const { error } = await supabase.from(config.tableName).update(payload).eq('id', id)
          if (!error) {
            if (training_records && config.tableName === 'employees') {
              const { data: oldRows } = await supabase
                .from('employee_training_records')
                .select('*')
                .eq('employee_id', id)
              const { error: delError } = await supabase
                .from('employee_training_records')
                .delete()
                .eq('employee_id', id)
              if (delError) {
                return {
                  success: false,
                  error: {
                    message: `Erro ao atualizar treinamentos: ${delError.message}`,
                  },
                }
              }
              const oldByTraining = new Map<string, any>(
                (oldRows || []).map((o: any) => [o.training_id, o]),
              )
              const trPayload = training_records
                .filter((tr: any) => tr.training_id)
                .map((tr: any) => {
                  // Lista não reanexada = preserva o estado MAIS RECENTE do banco
                  // (evita que formulário desatualizado sobrescreva verificação nova)
                  const old = oldByTraining.get(tr.training_id)
                  const unchanged = !!old && (old.document_url || '') === (tr.document_url || '')
                  const src = unchanged ? old : tr
                  return {
                    client_id: updateClientId,
                    employee_id: id,
                    training_id: tr.training_id,
                    document_url: src.document_url || '',
                    completion_date: tr.completion_date || new Date().toISOString().split('T')[0],
                    verification_status: src.verification_status || 'pending',
                    verification_notes: src.verification_notes || null,
                    verification_signed_name: src.verification_signed_name || null,
                    verification_confidence: src.verification_confidence ?? null,
                    verified_at: src.verified_at || null,
                  }
                })
              if (trPayload.length > 0) {
                const { error: trError, data: trRows } = await supabase
                  .from('employee_training_records')
                  .insert(trPayload)
                  .select('id, document_url')
                if (trError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao salvar treinamentos do colaborador: ${trError.message}`,
                    },
                  }
                }
                await logAudit(
                  updateClientId,
                  profile.id,
                  'training_record_created',
                  `Colaborador ID: ${id}`,
                )
                // Portão: SÓ lista NOVA/TROCADA precisa estar validada — listas já
                // anexadas (iguais às do banco) NÃO são reanalisadas.
                const formRecs = training_records.filter((tr: any) => tr.training_id)
                const invalid = (trRows || []).filter((r: any, i: number) => {
                  const tr = formRecs[i]
                  if (!r.document_url) return false
                  const old = oldByTraining.get(tr.training_id)
                  const isUnchanged = !!old && (old.document_url || '') === (tr.document_url || '')
                  return !isUnchanged && !isListValidated(tr)
                })
                if (invalid.length > 0) {
                  // desfaz: restaura os registros anteriores
                  await supabase.from('employee_training_records').delete().eq('employee_id', id)
                  if (oldRows && oldRows.length > 0) {
                    await supabase.from('employee_training_records').insert(oldRows)
                  }
                  return {
                    success: false,
                    error: {
                      message:
                        'Alteração não salva: há lista de presença não validada pelo agente (anexe uma lista válida e aguarde a conferência no momento do anexo).',
                    },
                  }
                }
              }
            }
            if (training_records && config.tableName === 'functions') {
              await supabase.from('function_required_trainings').delete().eq('function_id', id)
              const frPayload = training_records
                .filter((tr: any) => tr.training_id)
                .map((tr: any) => ({
                  client_id: updateClientId,
                  function_id: id,
                  training_id: tr.training_id,
                }))
              if (frPayload.length > 0) {
                const { error: frError } = await supabase
                  .from('function_required_trainings')
                  .insert(frPayload)
                if (frError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao salvar treinamentos da função: ${frError.message}`,
                    },
                  }
                }
              }
            }
            refetch()
            return { success: true }
          }
          return { success: false, error }
        }}
        onRemove={async (id: string) => {
          if (type === 'colaboradores') {
            const { data: emp } = await supabase
              .from('employees')
              .select(
                'name, registration_number, plant_id, company_name, client_id, company_id, function_id, location_id',
              )
              .eq('id', id)
              .single()

            if (emp) {
              const refMonth = `${selectedMonth}-01`

              let monthQuery = supabase
                .from('employees')
                .select('id')
                .eq('plant_id', emp.plant_id)
                .eq('reference_month', refMonth)

              if (emp.registration_number) {
                monthQuery = monthQuery.eq('registration_number', emp.registration_number)
              } else {
                monthQuery = monthQuery.eq('name', emp.name)
              }

              const { data: monthRecords } = await monthQuery

              if (monthRecords && monthRecords.length > 0) {
                let updateQuery = supabase
                  .from('employees')
                  .update({ status: 'Inativo', updated_at: new Date().toISOString() })
                  .eq('plant_id', emp.plant_id)
                  .eq('reference_month', refMonth)

                if (emp.registration_number) {
                  updateQuery = updateQuery.eq('registration_number', emp.registration_number)
                } else {
                  updateQuery = updateQuery.eq('name', emp.name)
                  if (emp.company_name) {
                    updateQuery = updateQuery.eq('company_name', emp.company_name)
                  }
                }

                const { error: updateError } = await updateQuery
                if (updateError) return { success: false, error: updateError }
              } else {
                const { error: insertError } = await supabase.from('employees').insert({
                  client_id: emp.client_id,
                  plant_id: emp.plant_id,
                  name: emp.name,
                  registration_number: emp.registration_number || null,
                  company_name: emp.company_name || '',
                  company_id: emp.company_id || null,
                  function_id: emp.function_id || null,
                  location_id: emp.location_id || null,
                  reference_month: refMonth,
                  status: 'Inativo',
                })
                if (insertError) return { success: false, error: insertError }
              }

              refetch()
              return { success: true }
            }
            return { success: false, error: { message: 'Colaborador não encontrado.' } }
          }

          if (type === 'equipamentos') {
            const { error } = await supabase
              .from(config.tableName)
              .update({ status: 'Inativo' })
              .eq('id', id)
            if (error) return { success: false, error }
            refetch()
            return { success: true }
          }

          const { error } = await supabase.from(config.tableName).delete().eq('id', id)
          if (
            error &&
            (error.message?.includes('lançamentos') ||
              error.code === 'P0001' ||
              error.code === '23503')
          ) {
            if (config.tableName === 'employees' || config.tableName === 'equipment') {
              await supabase.from(config.tableName).update({ status: 'Inativo' }).eq('id', id)
              refetch()
              return {
                success: false,
                error: {
                  message:
                    'Não é possível excluir este registro pois ele possui histórico de uso. O registro foi inativado automaticamente.',
                },
              }
            }
          }
          if (error) return { success: false, error }
          refetch()
          return { success: true }
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
