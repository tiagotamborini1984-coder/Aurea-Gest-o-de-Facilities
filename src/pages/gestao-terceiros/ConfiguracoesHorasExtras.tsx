import { useState, useEffect, useMemo, useRef } from 'react'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { usePersistentScreenFilters } from '@/hooks/use-persistent-screen-filters'
import { supabase } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import {
  Settings,
  Building2,
  Users,
  Save,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  Info,
  ShieldCheck,
} from 'lucide-react'
import { Link, Navigate } from 'react-router-dom'

interface ApproverProfile {
  id: string
  name: string
  email: string | null
  role: string
  authorized_plants: string[] | string | null
}

type HeConfigFilterState = Record<string, unknown> & {
  searchPlant: string
}

export default function ConfiguracoesHorasExtras() {
  const { profile, activeClient, selectedMasterClient } = useAppStore()
  const { plants, loading: loadingPlants } = useMasterData()
  const { toast } = useToast()

  const isMaster = profile?.role === 'Master'
  const isAdmin = profile?.role === 'Administrador'
  const isGestor = profile?.role === 'Gestor'
  const canAccess = isMaster || isAdmin || isGestor

  // Filtros persistidos por tela (regra permanente do projeto)
  const filterStore = usePersistentScreenFilters<HeConfigFilterState>(
    'gestao-terceiros:horas-extras:config',
    { searchPlant: '' },
  )

  const effectiveClientId = useMemo(() => {
    if (isMaster) {
      return selectedMasterClient === 'all'
        ? activeClient?.id || null
        : selectedMasterClient || activeClient?.id || null
    }
    return profile?.client_id || activeClient?.id || null
  }, [isMaster, selectedMasterClient, profile?.client_id, activeClient?.id])

  // Guard de reset de filtro ao trocar cliente
  const prevClientRef = useRef<string | null>(null)
  useEffect(() => {
    if (prevClientRef.current !== null && prevClientRef.current !== effectiveClientId) {
      filterStore.reset()
    }
    prevClientRef.current = effectiveClientId
  }, [effectiveClientId, filterStore])

  const [mode, setMode] = useState<'all' | 'per_plant'>('all')
  const [defaultApproverId, setDefaultApproverId] = useState<string>('')
  const [plantApprovers, setPlantApprovers] = useState<Record<string, string>>({})
  const [approvers, setApprovers] = useState<ApproverProfile[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [saving, setSaving] = useState(false)

  // Carrega lista de aprovadores elegíveis (Administrador e Gestor)
  useEffect(() => {
    async function loadData() {
      if (!effectiveClientId) {
        setLoadingData(false)
        return
      }

      setLoadingData(true)
      try {
        // 1. Busca usuários Gestor e Administrador do cliente
        const { data: profilesData, error: profilesErr } = await supabase
          .from('profiles')
          .select('id, name, email, role, authorized_plants')
          .eq('client_id', effectiveClientId)
          .in('role', ['Administrador', 'Gestor'])
          .order('name')

        if (profilesErr) {
          console.error('Erro ao carregar perfis de aprovadores:', profilesErr)
        } else {
          setApprovers((profilesData as ApproverProfile[]) || [])
        }

        // 2. Busca configuração existente (horas_extras_config)
        const { data: configRow, error: configErr } = await supabase
          .from('horas_extras_config')
          .select('id, mode, default_approver_id')
          .eq('client_id', effectiveClientId)
          .maybeSingle()

        if (configErr) {
          console.error('Erro ao carregar configuração de HE:', configErr)
        } else if (configRow) {
          setMode((configRow.mode as 'all' | 'per_plant') || 'all')
          setDefaultApproverId(configRow.default_approver_id || '')
        }

        // 3. Busca aprovadores por planta (horas_extras_plant_approvers)
        const { data: plantRows, error: plantErr } = await supabase
          .from('horas_extras_plant_approvers')
          .select('plant_id, approver_id')
          .eq('client_id', effectiveClientId)

        if (plantErr) {
          console.error('Erro ao carregar aprovadores por planta:', plantErr)
        } else if (plantRows) {
          const map: Record<string, string> = {}
          for (const row of plantRows) {
            if (row.plant_id && row.approver_id) {
              map[row.plant_id] = row.approver_id
            }
          }
          setPlantApprovers(map)
        }
      } catch (err) {
        console.error('Falha geral ao carregar dados de configuração:', err)
      } finally {
        setLoadingData(false)
      }
    }

    loadData()
  }, [effectiveClientId])

  // Plantas filtradas do cliente atual
  const clientPlants = useMemo(() => {
    if (!effectiveClientId) return plants
    return plants.filter((p) => !p.clientId || p.clientId === effectiveClientId)
  }, [plants, effectiveClientId])

  const filteredPlants = useMemo(() => {
    const term = (filterStore.values.searchPlant || '').toLowerCase().trim()
    if (!term) return clientPlants
    return clientPlants.filter(
      (p) => p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term)),
    )
  }, [clientPlants, filterStore.values.searchPlant])

  if (!canAccess) {
    return <Navigate to="/gestao-terceiros/horas-extras" replace />
  }

  const handlePlantApproverChange = (plantId: string, approverId: string) => {
    setPlantApprovers((prev) => {
      const next = { ...prev }
      if (!approverId || approverId === 'none') {
        delete next[plantId]
      } else {
        next[plantId] = approverId
      }
      return next
    })
  }

  const handleSave = async () => {
    if (!effectiveClientId) {
      toast({
        title: 'Selecione um cliente',
        description: 'É necessário ter um cliente ativo para salvar a configuração.',
        variant: 'destructive',
      })
      return
    }

    setSaving(true)
    try {
      // 1. Salva ou atualiza horas_extras_config
      const { error: cfgErr } = await supabase.from('horas_extras_config').upsert(
        {
          client_id: effectiveClientId,
          mode,
          default_approver_id: defaultApproverId || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'client_id' },
      )

      if (cfgErr) throw cfgErr

      // 2. Se modo for per_plant, sincroniza aprovadores por planta
      if (mode === 'per_plant') {
        // Remove mappings que foram desselecionados
        const plantIdsToKeep = Object.keys(plantApprovers).filter(
          (pId) => !!plantApprovers[pId] && plantApprovers[pId] !== 'none',
        )

        // Busca registros atuais do cliente
        const { data: existingRows } = await supabase
          .from('horas_extras_plant_approvers')
          .select('id, plant_id')
          .eq('client_id', effectiveClientId)

        const toDeleteIds = (existingRows || [])
          .filter((r) => !plantIdsToKeep.includes(r.plant_id))
          .map((r) => r.id)

        if (toDeleteIds.length > 0) {
          await supabase.from('horas_extras_plant_approvers').delete().in('id', toDeleteIds)
        }

        // Upsert dos que têm aprovador definido
        const upsertPayload = plantIdsToKeep.map((plantId) => ({
          client_id: effectiveClientId,
          plant_id: plantId,
          approver_id: plantApprovers[plantId],
          updated_at: new Date().toISOString(),
        }))

        if (upsertPayload.length > 0) {
          const { error: upsertErr } = await supabase
            .from('horas_extras_plant_approvers')
            .upsert(upsertPayload, { onConflict: 'client_id,plant_id' })
          if (upsertErr) throw upsertErr
        }
      }

      toast({
        title: 'Configuração salva com sucesso!',
        description:
          mode === 'all'
            ? 'O aprovador padrão receberá os e-mails de criação de HE de todas as plantas.'
            : 'Os aprovadores específicos por planta receberão os e-mails de criação de HE.',
        className: 'bg-green-50 text-green-900 border-green-200',
      })
    } catch (err: any) {
      console.error('Erro ao salvar configurações de HE:', err)
      toast({
        title: 'Erro ao salvar',
        description: err.message || 'Não foi possível salvar as configurações de HE.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  const getApproverLabel = (app: ApproverProfile) => {
    const roleBadge = app.role === 'Administrador' ? 'Admin' : 'Gestor'
    return `${app.name} (${roleBadge}) — ${app.email || 'sem e-mail'}`
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="bg-brand-deepBlue/10 p-2.5 rounded-xl border border-brand-deepBlue/20 shadow-sm text-brand-deepBlue">
            <Settings className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                Configurações de Horas Extras
              </h1>
              <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700">
                Aprovadores por Planta
              </Badge>
            </div>
            <p className="text-muted-foreground mt-1 text-xs sm:text-sm">
              Defina quem receberá o e-mail de notificação para aprovação na criação de cada HE.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" asChild className="border-slate-300">
            <Link to="/gestao-terceiros/horas-extras">
              <ArrowLeft className="h-4 w-4 mr-1.5" />
              Voltar para Horas Extras
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={handleSave}
            disabled={saving || loadingData}
            className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white shadow-sm"
          >
            {saving ? (
              <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1.5" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </div>

      {/* Info banner */}
      <div className="bg-blue-50/80 border border-blue-200 rounded-xl p-4 flex items-start gap-3 text-sm text-blue-900">
        <Info className="h-5 w-5 text-brand-vividBlue shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-blue-950">
            Como funciona a notificação de nova solicitação de Horas Extras?
          </p>
          <p className="text-xs text-blue-800 leading-relaxed">
            Ao cadastrar uma nova HE, o sistema dispara automaticamente um e-mail de aviso para o{' '}
            <strong>aprovador configurado</strong> (usuário Gestor ou Administrador), contendo o
            link direto{' '}
            <code className="bg-blue-100 text-blue-900 px-1.5 py-0.5 rounded text-[11px]">
              https://www.aureafacilities.com/gestao-terceiros/horas-extras
            </code>
            . Você pode unificar o mesmo aprovador para todas as plantas ou designar um aprovador
            por unidade.
          </p>
        </div>
      </div>

      {loadingData || loadingPlants ? (
        <Card className="p-12 text-center text-slate-500">
          <Loader2 className="h-8 w-8 animate-spin mx-auto text-brand-vividBlue mb-3" />
          <p className="text-sm">Carregando configurações e aprovadores...</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {/* Card de Modalidade */}
          <Card className="shadow-sm border-slate-200">
            <CardHeader className="bg-slate-50/60 border-b border-slate-200">
              <CardTitle className="text-base sm:text-lg text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-brand-vividBlue" />
                Modalidade de Aprovação
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm text-slate-600">
                Escolha se o aprovador será o mesmo para todas as unidades ou se cada planta terá um
                gestor/administrador específico.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <RadioGroup
                value={mode}
                onValueChange={(val) => setMode(val as 'all' | 'per_plant')}
                className="grid grid-cols-1 md:grid-cols-2 gap-4"
              >
                {/* Opção A: Todas as plantas */}
                <div
                  onClick={() => setMode('all')}
                  className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    mode === 'all'
                      ? 'border-brand-vividBlue bg-blue-50/50 shadow-sm ring-1 ring-brand-vividBlue'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <RadioGroupItem value="all" id="mode-all" className="mt-1" />
                  <div className="space-y-1">
                    <Label
                      htmlFor="mode-all"
                      className="font-semibold text-slate-900 cursor-pointer"
                    >
                      Todas as plantas com o mesmo aprovador
                    </Label>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Centraliza o recebimento de e-mails de nova HE em um único usuário (Gestor ou
                      Administrador) para toda a operação do cliente.
                    </p>
                  </div>
                </div>

                {/* Opção B: Cada planta um aprovador */}
                <div
                  onClick={() => setMode('per_plant')}
                  className={`flex items-start space-x-3 rounded-xl border p-4 cursor-pointer transition-all ${
                    mode === 'per_plant'
                      ? 'border-brand-vividBlue bg-blue-50/50 shadow-sm ring-1 ring-brand-vividBlue'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <RadioGroupItem value="per_plant" id="mode-per-plant" className="mt-1" />
                  <div className="space-y-1">
                    <Label
                      htmlFor="mode-per-plant"
                      className="font-semibold text-slate-900 cursor-pointer"
                    >
                      Cada planta um aprovador diferente
                    </Label>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Permite configurar um gestor ou administrador específico para cada planta da
                      sua operação.
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </CardContent>
          </Card>

          {/* Modalidade 1: Todas as plantas com o mesmo aprovador */}
          {mode === 'all' && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/60 border-b border-slate-200">
                <CardTitle className="text-base sm:text-lg text-slate-900 flex items-center gap-2">
                  <Users className="h-5 w-5 text-brand-vividBlue" />
                  Aprovador Central (Todas as Plantas)
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm text-slate-600">
                  Selecione o usuário Gestor ou Administrador que receberá os e-mails de solicitação
                  de HE criadas em qualquer unidade.
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="max-w-xl space-y-3">
                  <Label className="text-sm font-semibold text-slate-800">
                    Aprovador Responsável
                  </Label>
                  <Select
                    value={defaultApproverId || 'none'}
                    onValueChange={(val) => setDefaultApproverId(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="w-full bg-white border-slate-300 text-slate-800">
                      <SelectValue placeholder="Selecione um Gestor ou Administrador..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-slate-400">
                          Nenhum (usar fallback de Administradores)
                        </span>
                      </SelectItem>
                      {approvers.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {getApproverLabel(app)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <p className="text-xs text-slate-500">
                    Usuários listados: perfis <strong>Gestor</strong> e{' '}
                    <strong>Administrador</strong> vinculados ao cliente atual.
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Modalidade 2: Cada planta com seu aprovador */}
          {mode === 'per_plant' && (
            <Card className="shadow-sm border-slate-200">
              <CardHeader className="bg-slate-50/60 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <CardTitle className="text-base sm:text-lg text-slate-900 flex items-center gap-2">
                      <Building2 className="h-5 w-5 text-brand-vividBlue" />
                      Aprovador por Planta
                    </CardTitle>
                    <CardDescription className="text-xs sm:text-sm text-slate-600">
                      Defina individualmente qual gestor/administrador aprovará as HEs de cada
                      unidade.
                    </CardDescription>
                  </div>
                  <div className="text-xs text-slate-500">
                    Total: <strong>{clientPlants.length}</strong> plantas cadastradas
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                {/* Fallback opcional caso uma planta não tenha aprovador específico */}
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <Label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Aprovador Padrão (Fallback para plantas sem responsável específico)
                  </Label>
                  <Select
                    value={defaultApproverId || 'none'}
                    onValueChange={(val) => setDefaultApproverId(val === 'none' ? '' : val)}
                  >
                    <SelectTrigger className="w-full sm:max-w-md bg-white border-slate-300 text-slate-800 text-xs">
                      <SelectValue placeholder="Selecione um aprovador padrão opcional..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        <span className="text-slate-400">
                          Nenhum (usar fallback de Administradores)
                        </span>
                      </SelectItem>
                      {approvers.map((app) => (
                        <SelectItem key={app.id} value={app.id}>
                          {getApproverLabel(app)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Tabela de Plantas */}
                <div className="border border-slate-200 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-100/70 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                      <tr>
                        <th className="py-3 px-4">Planta / Unidade</th>
                        <th className="py-3 px-4">Código</th>
                        <th className="py-3 px-4">Aprovador Designado (Gestor ou Admin)</th>
                        <th className="py-3 px-4 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 bg-white">
                      {filteredPlants.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-slate-400 text-xs">
                            Nenhuma planta encontrada.
                          </td>
                        </tr>
                      ) : (
                        filteredPlants.map((plant) => {
                          const assignedApproverId = plantApprovers[plant.id] || ''
                          const assignedApprover = approvers.find(
                            (a) => a.id === assignedApproverId,
                          )
                          const hasAssignment = !!assignedApprover

                          return (
                            <tr key={plant.id} className="hover:bg-slate-50/60 transition-colors">
                              <td className="py-3 px-4 font-medium text-slate-900">{plant.name}</td>
                              <td className="py-3 px-4 text-xs text-slate-500">
                                {plant.code || '—'}
                              </td>
                              <td className="py-2.5 px-4 min-w-[280px]">
                                <Select
                                  value={assignedApproverId || 'none'}
                                  onValueChange={(val) => handlePlantApproverChange(plant.id, val)}
                                >
                                  <SelectTrigger className="w-full bg-white border-slate-300 text-xs h-9">
                                    <SelectValue placeholder="Selecione o aprovador..." />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">
                                      <span className="text-slate-400">
                                        Nenhum (usar padrão/fallback)
                                      </span>
                                    </SelectItem>
                                    {approvers.map((app) => (
                                      <SelectItem key={app.id} value={app.id}>
                                        {getApproverLabel(app)}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </td>
                              <td className="py-3 px-4 text-center">
                                {hasAssignment ? (
                                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[11px] font-medium">
                                    <CheckCircle2 className="h-3 w-3 mr-1" />
                                    Configurado
                                  </Badge>
                                ) : defaultApproverId ? (
                                  <Badge
                                    variant="outline"
                                    className="border-slate-300 text-slate-600 text-[11px]"
                                  >
                                    Usando Padrão
                                  </Badge>
                                ) : (
                                  <Badge
                                    variant="outline"
                                    className="border-amber-300 text-amber-700 bg-amber-50 text-[11px]"
                                  >
                                    Fallback Admin
                                  </Badge>
                                )}
                              </td>
                            </tr>
                          )
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Botão inferior de salvar */}
          <div className="flex justify-end pt-2">
            <Button
              onClick={handleSave}
              disabled={saving || loadingData}
              className="bg-brand-vividBlue hover:bg-brand-deepBlue text-white shadow-sm px-6"
            >
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Salvar Configurações
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
