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

import {
  isListValidated,
  awaitPendingVerification,
  getVerificationConfig,
} from '@/lib/training-verification'

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
  // Modo da conferência de listas do cliente: 'auto' trava o salvamento até o
  // veredito; 'manual' e 'off' não disparam nem bloqueiam nada.
  const [verificationMode, setVerificationMode] = useState<'auto' | 'manual' | 'off'>('auto')

  useEffect(() => {
    const cid =
      profile?.role === 'Master' && selectedMasterClient !== 'all'
        ? selectedMasterClient
        : profile?.client_id
    getVerificationConfig(cid).then((c) => setVerificationMode(c.mode))
  }, [profile, selectedMasterClient])

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

          if (type === 'empresas') {
            // Normaliza múltiplos e-mails no array emails text[] e mantém email sincronizado
            const raw = String(payload.email || '')
            const list = raw
              .split(/[,;\n\r]+/)
              .map((s: string) => s.trim())
              .filter(Boolean)
            payload.emails = list
            payload.email = list[0] || null
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
                // Insere em lotes pequenos (máx. 5 por comando), mantendo cada
                // comando dentro do limite aceito pelo guard de operações em massa.
                const newTrBatchSize = 5
                let trRows: any[] = []
                let trError: any = null
                for (let b = 0; b < trPayload.length; b += newTrBatchSize) {
                  const r = await supabase
                    .from('employee_training_records')
                    .insert(trPayload.slice(b, b + newTrBatchSize))
                    .select('id, document_url')
                  if (r.error) {
                    trError = r.error
                    break
                  }
                  trRows = trRows.concat(r.data || [])
                }
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
                // Portão: todas as listas anexadas devem estar validadas pelo agente
                // (critério idêntico ao da UI da VerificationBadge).
                // Mapeia diretamente por training_id (ou document_url como fallback).
                const formRecs = training_records.filter((tr: any) => tr.training_id)
                const formRecsByTraining = new Map<string, any>(
                  formRecs.map((f: any) => [f.training_id, f]),
                )
                // Se alguma lista ainda está em análise, ESPERA o veredito em vez de
                // recusar o cadastro (antes o usuário via "tempo esgotado" com a
                // lista correta e o cadastro era bloqueado sem motivo real).
                // Modo do cliente: só 'auto' espera/bloqueia por validação.
                const pendentes =
                  verificationMode === 'auto'
                    ? (trPayload || []).filter((p: any) => {
                        if (!p.document_url) return false
                        const tr = formRecsByTraining.get(p.training_id) || p
                        return !isListValidated(tr)
                      })
                    : []
                for (const p of pendentes) {
                  const r = await awaitPendingVerification(p.document_url)
                  if (r?.status === 'verified') {
                    const tr = formRecsByTraining.get(p.training_id)
                    if (tr) {
                      tr.verification_status = 'verified'
                      tr.verification_notes = r.notes || null
                      tr.verification_signed_name = r.signed_name || null
                      tr.verification_confidence = r.confidence ?? null
                      tr.verified_document_url = tr.document_url
                      if (r.completion_date && !tr.completion_date)
                        tr.completion_date = r.completion_date
                    }
                  }
                }
                const invalid =
                  verificationMode === 'auto'
                    ? (trPayload || []).filter((p: any) => {
                        if (!p.document_url) return false
                        const tr = formRecsByTraining.get(p.training_id) || p
                        return !isListValidated(tr)
                      })
                    : []
                if (invalid.length > 0) {
                  const motivo =
                    formRecsByTraining.get(invalid[0].training_id)?.verification_notes || ''
                  // Desfaz o cadastro parcial: apaga os treinamentos inseridos (um
                  // comando por registro, respeitando o guard) e depois o colaborador.
                  for (const row of trRows || []) {
                    await supabase.from('employee_training_records').delete().eq('id', row.id)
                  }
                  await supabase.from('employees').delete().eq('id', data.id)
                  return {
                    success: false,
                    error: {
                      message: `Cadastro não salvo: lista de presença não validada pelo agente.${motivo ? ` Motivo: ${motivo}` : ' (anexe uma lista válida)'}`,
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
                // Lotes pequenos (máx. 5 por comando), padrão consistente com o
                // restante do módulo (guard de operações em massa).
                const frBatchSize = 5
                let frError: any = null
                for (let b = 0; b < frPayload.length; b += frBatchSize) {
                  const r = await supabase
                    .from('function_required_trainings')
                    .insert(frPayload.slice(b, b + frBatchSize))
                  if (r.error) {
                    frError = r.error
                    break
                  }
                }
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

          if (type === 'empresas') {
            // Normaliza múltiplos e-mails no array emails text[] e mantém email sincronizado
            const raw = String(payload.email || '')
            const list = raw
              .split(/[,;\n\r]+/)
              .map((s: string) => s.trim())
              .filter(Boolean)
            payload.emails = list
            payload.email = list[0] || null
          }

          const { error } = await supabase.from(config.tableName).update(payload).eq('id', id)
          if (!error) {
            if (training_records && config.tableName === 'employees') {
              // SALVAMENTO POR DIFERENÇA (delta): o guard do banco bloqueia DELETE de
              // mais de 5 registros no mesmo comando, portanto NUNCA apagamos a lista
              // inteira para reinseri-la. Comparamos o formulário com o que existe no
              // banco e aplicamos apenas: UPDATE nos alterados, DELETE só dos removidos
              // (um comando por registro) e INSERT dos novos.
              const { data: oldRows } = await supabase
                .from('employee_training_records')
                .select('*')
                .eq('employee_id', id)
              const oldByTraining = new Map<string, any>(
                (oldRows || []).map((o: any) => [o.training_id, o]),
              )

              const formRecs = training_records.filter((tr: any) => tr.training_id)
              const formRecsByTraining = new Map<string, any>(
                formRecs.map((f: any) => [f.training_id, f]),
              )

              // Portão (ANTES de gravar): listas novas ou trocadas precisam estar
              // validadas (isListValidated) — MAS só no modo 'auto'. Em 'manual' e
              // 'off' o anexo não bloqueia o salvamento (no 'off' o anexo novo fica
              // com status null no momento do upload, e era exatamente ele que era
              // barrado aqui indevidamente). Listas pré-existentes não modificadas
              // preservam o status do banco e não bloqueiam o salvamento.
              // Mapeamento SEMPRE por training_id — NUNCA por índice posicional.
              const invalid =
                verificationMode === 'auto'
                  ? formRecs.filter((tr: any) => {
                      if (!tr.document_url) return false
                      const old = oldByTraining.get(tr.training_id)
                      const isUnchanged =
                        !!old && (old.document_url || '') === (tr.document_url || '')
                      // Se o usuário na UI vê a lista validada (verification_status
                      // 'verified') OU a lista pré-existente não teve o documento
                      // trocado, permite.
                      if (isListValidated(tr)) return false
                      if (isUnchanged) return false
                      return true
                    })
                  : []
              if (invalid.length > 0) {
                return {
                  success: false,
                  error: {
                    message:
                      'Alteração não salva: há lista de presença não validada pelo agente (anexe uma lista válida e aguarde a conferência no momento do anexo).',
                  },
                }
              }

              // 1) ALTERAR: registros existentes cujos dados mudaram no formulário.
              //    O status de verificação NUNCA é reescrito aqui: quem muda o anexo
              //    já recebe o novo status na hora do anexo (TreinamentosVinculo);
              //    quem não tocou no anexo mantém o status gravado no banco.
              for (const tr of formRecs) {
                const old = oldByTraining.get(tr.training_id)
                if (!old) continue
                const changed =
                  (old.document_url || '') !== (tr.document_url || '') ||
                  (old.completion_date || '') !== (tr.completion_date || '') ||
                  (old.verification_status || null) !== (tr.verification_status || null)
                if (!changed) continue
                const { error: updError } = await supabase
                  .from('employee_training_records')
                  .update({
                    document_url: tr.document_url || '',
                    completion_date: tr.completion_date || new Date().toISOString().split('T')[0],
                    verification_status: tr.verification_status || 'pending',
                    verification_notes: tr.verification_notes || null,
                    verification_signed_name: tr.verification_signed_name || null,
                    verification_confidence: tr.verification_confidence ?? null,
                    verified_at: tr.verified_at || null,
                  })
                  .eq('id', old.id)
                if (updError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao atualizar treinamentos: ${updError.message}`,
                    },
                  }
                }
              }

              // 2) EXCLUIR: apenas os itens que o usuário removeu no formulário,
              //    UM comando por registro (nunca em lote acima do guard).
              const removedRows = (oldRows || []).filter(
                (o: any) => !formRecsByTraining.has(o.training_id),
              )
              for (const row of removedRows) {
                const { error: delError } = await supabase
                  .from('employee_training_records')
                  .delete()
                  .eq('id', row.id)
                if (delError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao atualizar treinamentos: ${delError.message}`,
                    },
                  }
                }
              }

              // 3) INSERIR: somente os treinamentos que não existiam para o colaborador.
              const newPayload = formRecs
                .filter((tr: any) => !oldByTraining.has(tr.training_id))
                .map((tr: any) => ({
                  client_id: updateClientId,
                  employee_id: id,
                  training_id: tr.training_id,
                  document_url: tr.document_url || '',
                  completion_date: tr.completion_date || new Date().toISOString().split('T')[0],
                  verification_status: tr.verification_status || 'pending',
                  verification_notes: tr.verification_notes || null,
                  verification_signed_name: tr.verification_signed_name || null,
                  verification_confidence: tr.verification_confidence ?? null,
                  verified_at: tr.verified_at || null,
                }))
              if (newPayload.length > 0) {
                // Lotes pequenos (máx. 5 por comando), padrão consistente com o
                // restante do módulo (guard de operações em massa).
                const insertBatchSize = 5
                let trError: any = null
                for (let b = 0; b < newPayload.length; b += insertBatchSize) {
                  const r = await supabase
                    .from('employee_training_records')
                    .insert(newPayload.slice(b, b + insertBatchSize))
                  if (r.error) {
                    trError = r.error
                    break
                  }
                }
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
              }
            }
            if (training_records && config.tableName === 'functions') {
              // SALVAMENTO POR DIFERENÇA (delta): o guard do banco bloqueia DELETE de
              // mais de 5 registros no mesmo comando, portanto não apagamos a lista
              // inteira. Removemos apenas o que o usuário tirou (um comando por
              // registro), atualizamos nada (a tabela só guarda vínculo) e inserimos
              // somente os novos vínculos.
              const { data: oldFrRows } = await supabase
                .from('function_required_trainings')
                .select('id, training_id')
                .eq('function_id', id)
              const formFrIds = new Set<string>(
                training_records
                  .filter((tr: any) => tr.training_id)
                  .map((tr: any) => tr.training_id),
              )
              const removedFr = (oldFrRows || []).filter((o: any) => !formFrIds.has(o.training_id))
              for (const row of removedFr) {
                const { error: frDelError } = await supabase
                  .from('function_required_trainings')
                  .delete()
                  .eq('id', row.id)
                if (frDelError) {
                  return {
                    success: false,
                    error: {
                      message: `Erro ao atualizar treinamentos da função: ${frDelError.message}`,
                    },
                  }
                }
              }
              const existingFrIds = new Set<string>(
                (oldFrRows || []).map((o: any) => o.training_id),
              )
              const frPayload = training_records
                .filter((tr: any) => tr.training_id && !existingFrIds.has(tr.training_id))
                .map((tr: any) => ({
                  client_id: updateClientId,
                  function_id: id,
                  training_id: tr.training_id,
                }))
              if (frPayload.length > 0) {
                // Lotes pequenos (máx. 5 por comando), padrão consistente com o
                // restante do módulo (guard de operações em massa).
                const frBatchSize = 5
                let frError: any = null
                for (let b = 0; b < frPayload.length; b += frBatchSize) {
                  const r = await supabase
                    .from('function_required_trainings')
                    .insert(frPayload.slice(b, b + frBatchSize))
                  if (r.error) {
                    frError = r.error
                    break
                  }
                }
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
