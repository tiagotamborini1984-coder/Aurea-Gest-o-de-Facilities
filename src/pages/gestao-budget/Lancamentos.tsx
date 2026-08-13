import { useState, useEffect, useMemo } from 'react'
import {
  FileText,
  Save,
  Loader2,
  Check,
  ChevronsUpDown,
  X,
  AlertTriangle,
  CalendarIcon,
  Building2,
  Sparkles,
  Lock,
} from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Command,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from '@/components/ui/command'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader as OriginalTableHeader,
  TableRow,
} from '@/components/ui/table'
import { useSyncExternalStore } from 'react'

let globalLastUpdated: string | null | undefined = undefined
const listeners = new Set<() => void>()

function setGlobalLastUpdated(val: string | null | undefined) {
  globalLastUpdated = val
  listeners.forEach((l) => l())
}

function useGlobalLastUpdated() {
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    () => globalLastUpdated,
  )
}

const TableHeader = ({ children, className, ...props }: any) => {
  const lastUpdated = useGlobalLastUpdated()
  return (
    <OriginalTableHeader className={className} {...props}>
      {lastUpdated !== undefined && (
        <TableRow className="hover:bg-transparent border-b-0">
          <TableHead
            colSpan={100}
            className="text-right h-auto py-2 text-xs text-muted-foreground font-medium bg-muted/20"
          >
            {lastUpdated
              ? `Última atualização: ${new Date(lastUpdated).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}`
              : 'Sem atualizações'}
          </TableHead>
        </TableRow>
      )}
      {children}
    </OriginalTableHeader>
  )
}
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'
import { ForecastAgentDialog } from '@/components/gestao-budget/ForecastAgentDialog'

export default function Lancamentos() {
  const { profile } = useAppStore()
  const { toast } = useToast()

  const isReadOnlyProfile = profile?.role !== 'Master' && profile?.role !== 'Administrador'

  const [clients, setClients] = useState<any[]>([])
  const [selectedClient, setSelectedClient] = useState<string>('')

  const [costCenters, setCostCenters] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])

  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    new Date().toISOString().substring(0, 7),
  ])
  const [tempMonth, setTempMonth] = useState('')

  const [selectedCCs, setSelectedCCs] = useState<string[]>([])
  const [ccPopoverOpen, setCcPopoverOpen] = useState(false)

  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([])
  const [accPopoverOpen, setAccPopoverOpen] = useState(false)

  const [entries, setEntries] = useState<
    Record<string, { budgeted: string; realized: string; forecast: string }>
  >({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [forecastAgentOpen, setForecastAgentOpen] = useState(false)

  const activeClientId = profile?.role === 'Master' ? selectedClient : profile?.client_id

  // Desabilita edição quando seleciona mais de 1 centro de custo ou mais de 1 mês
  const isMultiSelection = selectedCCs.length > 1 || selectedMonths.length > 1
  const isReadOnly = isReadOnlyProfile || isMultiSelection

  useEffect(() => {
    if (profile?.role === 'Master') {
      supabase
        .from('clients')
        .select('id, name')
        .eq('status', 'Ativo')
        .order('name')
        .then(({ data }) => {
          if (data) {
            setClients(data)
            if (data.length > 0 && !selectedClient) {
              setSelectedClient(data[0].id)
            }
          }
        })
    } else if (profile?.client_id) {
      setSelectedClient(profile.client_id)
    }
  }, [profile, selectedClient])

  useEffect(() => {
    if (!activeClientId) {
      setCostCenters([])
      setAccounts([])
      setSelectedCCs([])
      return
    }

    supabase
      .from('budget_cost_centers')
      .select('*')
      .eq('client_id', activeClientId)
      .order('name', { ascending: true })
      .then(({ data }) => setCostCenters(data || []))

    supabase
      .from('budget_accounts')
      .select('*')
      .eq('client_id', activeClientId)
      .order('name')
      .then(({ data }) => setAccounts(data || []))

    setSelectedCCs([])
    setSelectedAccounts([])
    setEntries({})
  }, [activeClientId])

  useEffect(() => {
    if (!activeClientId || selectedCCs.length === 0 || selectedMonths.length === 0) {
      setEntries({})
      setGlobalLastUpdated(undefined)
      return
    }
    loadEntries()

    const channel = supabase
      .channel('budget_entries_updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'budget_entries',
          filter: `client_id=eq.${activeClientId}`,
        },
        async () => {
          const { data } = await supabase
            .from('budget_entries')
            // @ts-expect-error
            .select('updated_at')
            .eq('client_id', activeClientId)
            .in('cost_center_id', selectedCCs)
            // @ts-expect-error
            .order('updated_at', { ascending: false })
            .limit(1)

          if (data && data.length > 0) {
            setGlobalLastUpdated(data[0].updated_at)
          } else {
            setGlobalLastUpdated(null)
          }
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [selectedCCs, selectedMonths, activeClientId])

  const loadEntries = async () => {
    setLoading(true)
    const referenceDates = selectedMonths.map((m) => `${m}-01`)

    let allEntries: any[] = []
    let page = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
      const { data, error } = await supabase
        .from('budget_entries')
        .select('*')
        .eq('client_id', activeClientId)
        .in('cost_center_id', selectedCCs)
        .in('reference_month', referenceDates)
        // Ordenação determinística pela PK é obrigatória ao paginar com .range()
        // para evitar duplicação/omissão de registros entre páginas.
        .order('id')
        .range(page * pageSize, (page + 1) * pageSize - 1)

      if (error || !data || data.length === 0) {
        hasMore = false
      } else {
        allEntries = allEntries.concat(data)
        if (data.length < pageSize) {
          hasMore = false
        } else {
          page++
        }
      }
    }

    const { data: lastUpdatedData } = await supabase
      .from('budget_entries')
      // @ts-expect-error
      .select('updated_at')
      .eq('client_id', activeClientId)
      .in('cost_center_id', selectedCCs)
      // @ts-expect-error
      .order('updated_at', { ascending: false })
      .limit(1)

    if (lastUpdatedData && lastUpdatedData.length > 0) {
      setGlobalLastUpdated(lastUpdatedData[0].updated_at)
    } else {
      setGlobalLastUpdated(null)
    }

    const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

    const map: Record<string, { budgeted: number; realized: number; forecast: number }> = {}
    allEntries.forEach((e) => {
      if (!map[e.account_id]) {
        map[e.account_id] = { budgeted: 0, realized: 0, forecast: 0 }
      }
      map[e.account_id].budgeted = round2(
        map[e.account_id].budgeted + (Number(e.budgeted_amount) || 0),
      )
      map[e.account_id].realized = round2(
        map[e.account_id].realized + (Number(e.realized_amount) || 0),
      )
      map[e.account_id].forecast = round2(
        map[e.account_id].forecast + (Number(e.forecast_amount) || 0),
      )
    })

    const stringMap: Record<string, { budgeted: string; realized: string; forecast: string }> = {}
    for (const [key, val] of Object.entries(map)) {
      stringMap[key] = {
        budgeted: val.budgeted.toFixed(2),
        realized: val.realized.toFixed(2),
        forecast: val.forecast.toFixed(2),
      }
    }

    setEntries(stringMap)
    setLoading(false)
  }

  const handleSave = async () => {
    if (isReadOnly || !activeClientId || selectedCCs.length !== 1 || selectedMonths.length !== 1)
      return
    setSaving(true)

    const singleCC = selectedCCs[0]
    const referenceDate = `${selectedMonths[0]}-01`

    const payload = accounts.map((acc) => {
      const vals = entries[acc.id] || { budgeted: '0', realized: '0', forecast: '0' }
      return {
        client_id: activeClientId,
        cost_center_id: singleCC,
        account_id: acc.id,
        reference_month: referenceDate,
        budgeted_amount: parseFloat(vals.budgeted) || 0,
        realized_amount: parseFloat(vals.realized) || 0,
        forecast_amount: parseFloat(vals.forecast) || 0,
      }
    })

    const { error } = await supabase.from('budget_entries').upsert(payload, {
      onConflict: 'client_id, cost_center_id, account_id, reference_month',
    })

    if (error)
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: error.message })
    else
      toast({
        title: 'Lançamentos salvos com sucesso',
        className: 'bg-emerald-50 text-emerald-900 border-emerald-200',
      })

    setSaving(false)
  }

  const updateEntry = (accId: string, field: 'budgeted' | 'realized' | 'forecast', val: string) => {
    if (isReadOnly) return
    setEntries((prev) => ({
      ...prev,
      [accId]: {
        budgeted: prev[accId]?.budgeted ?? '',
        realized: prev[accId]?.realized ?? '',
        forecast: prev[accId]?.forecast ?? '',
        [field]: val,
      },
    }))
  }

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val)

  const filteredAccounts = useMemo(() => {
    if (selectedAccounts.length === 0) return accounts
    return accounts.filter((a) => selectedAccounts.includes(a.id))
  }, [accounts, selectedAccounts])

  const round2 = (num: number) => Math.round((num + Number.EPSILON) * 100) / 100

  const totals = useMemo(() => {
    const raw = filteredAccounts.reduce(
      (acc, curr) => {
        const vals = entries[curr.id]
        acc.budgeted += parseFloat(vals?.budgeted || '0') || 0
        acc.realized += parseFloat(vals?.realized || '0') || 0
        acc.forecast += parseFloat(vals?.forecast || '0') || 0
        return acc
      },
      { budgeted: 0, realized: 0, forecast: 0 },
    )
    return {
      budgeted: round2(raw.budgeted),
      realized: round2(raw.realized),
      forecast: round2(raw.forecast),
    }
  }, [filteredAccounts, entries])

  const totalDifference = round2(totals.forecast - totals.realized)

  const removeMonth = (m: string) => setSelectedMonths((prev) => prev.filter((x) => x !== m))
  const addMonth = () => {
    if (tempMonth && !selectedMonths.includes(tempMonth)) {
      setSelectedMonths([...selectedMonths, tempMonth])
      setTempMonth('')
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground flex items-center gap-3">
            <FileText className="h-8 w-8 text-brand-vividBlue" />
            {isReadOnlyProfile ? 'Painel de Lançamentos' : 'Lançamentos (Orçado vs Realizado)'}
          </h1>
          <p className="text-muted-foreground mt-2 text-base">
            {isReadOnlyProfile
              ? 'Visualize os valores previstos e executados por conta em cada centro de custo.'
              : 'Insira os valores previstos e executados ou visualize o consolidado.'}
          </p>
        </div>

        <div className="flex flex-col md:flex-row items-start md:items-center gap-3">
          {profile?.role === 'Master' && (
            <div className="flex items-center gap-3 bg-card p-2 rounded-lg border border-border shadow-sm w-full md:w-auto">
              <Building2 className="h-5 w-5 text-muted-foreground ml-2 shrink-0" />
              <Select value={selectedClient} onValueChange={setSelectedClient}>
                <SelectTrigger className="w-full md:w-[280px] border-0 shadow-none focus:ring-0 text-base h-10 bg-transparent">
                  <SelectValue placeholder="Selecione um cliente..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-base py-2">
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button
            variant="outline"
            onClick={() => setForecastAgentOpen(true)}
            disabled={isReadOnlyProfile || selectedCCs.length === 0 || selectedMonths.length === 0}
            title={
              isReadOnlyProfile
                ? 'Apenas administradores podem acionar o Agente de Previsão'
                : selectedCCs.length === 0
                  ? 'Selecione ao menos um centro de custo'
                  : ''
            }
            className="bg-brand-vividBlue/5 border-brand-vividBlue/30 text-brand-vividBlue hover:bg-brand-vividBlue/10 h-11 px-5 whitespace-nowrap"
          >
            <Sparkles className="h-5 w-5 mr-2" />
            Agente de Previsão
            {isReadOnlyProfile && <Lock className="h-4 w-4 ml-2" />}
          </Button>
        </div>
      </div>

      <Card className="shadow-sm">
        <CardHeader className="pb-5 border-b bg-muted/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label className="text-foreground font-bold text-base">Mês(es) de Referência</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="month"
                  value={tempMonth}
                  onChange={(e) => setTempMonth(e.target.value)}
                  className="w-[180px] bg-background h-11 text-base border-input"
                />
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMonth}
                  disabled={!tempMonth || selectedMonths.includes(tempMonth)}
                  className="bg-background border-input hover:bg-accent hover:text-accent-foreground h-11 px-5"
                >
                  Adicionar
                </Button>
              </div>
              {selectedMonths.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 p-4 rounded-lg bg-background border border-border shadow-sm min-h-[60px] items-center">
                  {selectedMonths.map((m) => {
                    const [year, month] = m.split('-')
                    return (
                      <Badge
                        key={m}
                        variant="default"
                        className="flex items-center gap-2 bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90 py-2 px-4 text-[15px]"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        <span>{`${month}/${year}`}</span>
                        <button
                          onClick={() => removeMonth(m)}
                          className="ml-1.5 rounded-full p-1 hover:bg-white/20 transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-3">
              <Label className="text-foreground font-bold text-base">Centros de Custo</Label>
              <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ccPopoverOpen}
                    className="w-full justify-between bg-background h-auto min-h-[60px] py-3 px-4 border-input text-base"
                  >
                    <div className="flex flex-wrap gap-2 items-center text-left flex-1">
                      {selectedCCs.length === 0 ? (
                        <span className="text-muted-foreground font-normal">
                          Selecione os centros de custo...
                        </span>
                      ) : selectedCCs.length <= 3 ? (
                        selectedCCs.map((id) => {
                          const c = costCenters.find((x) => x.id === id)
                          return c ? (
                            <Badge
                              variant="secondary"
                              key={id}
                              className="font-normal bg-secondary text-secondary-foreground hover:bg-secondary/80 py-1.5 px-3 text-[15px]"
                            >
                              {c.code ? `${c.code} - ` : ''}
                              {c.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-normal bg-secondary text-secondary-foreground py-1.5 px-3 text-[15px]"
                        >
                          {selectedCCs.length} centros selecionados
                        </Badge>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-3 h-5 w-5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar centro de custo..."
                      className="h-11 text-base"
                    />
                    <CommandList className="max-h-[350px]">
                      <CommandEmpty>Nenhum centro de custo encontrado.</CommandEmpty>
                      <CommandGroup>
                        {costCenters.map((cc) => {
                          const isSelected = selectedCCs.includes(cc.id)
                          return (
                            <CommandItem
                              key={cc.id}
                              onSelect={() => {
                                setSelectedCCs((prev) =>
                                  isSelected ? prev.filter((id) => id !== cc.id) : [...prev, cc.id],
                                )
                              }}
                              className="cursor-pointer py-3 text-base"
                            >
                              <div
                                className={cn(
                                  'mr-4 flex h-5 w-5 items-center justify-center rounded-sm border',
                                  isSelected
                                    ? 'bg-brand-vividBlue border-brand-vividBlue text-white'
                                    : 'border-input opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-foreground">
                                {cc.code ? `${cc.code} - ` : ''}
                              </span>
                              <span className="text-muted-foreground ml-1">{cc.name}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-3">
              <Label className="text-foreground font-bold text-base">Contas Contábeis</Label>
              <Popover open={accPopoverOpen} onOpenChange={setAccPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={accPopoverOpen}
                    className="w-full justify-between bg-background h-auto min-h-[60px] py-3 px-4 border-input text-base"
                  >
                    <div className="flex flex-wrap gap-2 items-center text-left flex-1">
                      {selectedAccounts.length === 0 ? (
                        <span className="text-muted-foreground font-normal">
                          Todas as contas...
                        </span>
                      ) : selectedAccounts.length <= 3 ? (
                        selectedAccounts.map((id) => {
                          const a = accounts.find((x) => x.id === id)
                          return a ? (
                            <Badge
                              variant="secondary"
                              key={id}
                              className="font-normal bg-secondary text-secondary-foreground hover:bg-secondary/80 py-1.5 px-3 text-[15px]"
                            >
                              {a.code ? `${a.code} - ` : ''}
                              {a.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-normal bg-secondary text-secondary-foreground py-1.5 px-3 text-[15px]"
                        >
                          {selectedAccounts.length} contas selecionadas
                        </Badge>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-3 h-5 w-5 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[450px] p-0" align="start">
                  <Command>
                    <CommandInput
                      placeholder="Buscar conta contábil..."
                      className="h-11 text-base"
                    />
                    <CommandList className="max-h-[350px]">
                      <CommandEmpty>Nenhuma conta contábil encontrada.</CommandEmpty>
                      <CommandGroup>
                        {accounts.map((acc) => {
                          const isSelected = selectedAccounts.includes(acc.id)
                          return (
                            <CommandItem
                              key={acc.id}
                              onSelect={() => {
                                setSelectedAccounts((prev) =>
                                  isSelected
                                    ? prev.filter((id) => id !== acc.id)
                                    : [...prev, acc.id],
                                )
                              }}
                              className="cursor-pointer py-3 text-base"
                            >
                              <div
                                className={cn(
                                  'mr-4 flex h-5 w-5 items-center justify-center rounded-sm border',
                                  isSelected
                                    ? 'bg-brand-vividBlue border-brand-vividBlue text-white'
                                    : 'border-input opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-foreground">
                                {acc.code ? `${acc.code} - ` : ''}
                              </span>
                              <span className="text-muted-foreground ml-1">{acc.name}</span>
                            </CommandItem>
                          )
                        })}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {!activeClientId ? (
            <div className="py-20 text-center text-muted-foreground bg-muted/30">
              <Building2 className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg">Selecione um cliente para visualizar os lançamentos.</p>
            </div>
          ) : selectedCCs.length === 0 || selectedMonths.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground bg-muted/30">
              <FileText className="h-12 w-12 text-muted-foreground/50 mx-auto mb-4" />
              <p className="text-lg">
                Selecione ao menos um Mês e um Centro de Custo
                <br />
                para visualizar os lançamentos.
              </p>
            </div>
          ) : loading ? (
            <div className="py-20 text-center flex justify-center bg-muted/30">
              <Loader2 className="h-10 w-10 animate-spin text-brand-vividBlue" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-20 text-center text-muted-foreground bg-muted/30">
              <p className="text-lg">Nenhuma conta contábil cadastrada.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {isMultiSelection && !isReadOnlyProfile && (
                <div className="bg-blue-50 dark:bg-blue-950/50 border-l-4 border-blue-500 p-5 m-5 rounded-md flex items-start shadow-sm animate-fade-in">
                  <AlertTriangle className="h-6 w-6 text-blue-600 mr-4 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-blue-900 dark:text-blue-200 font-bold text-[17px]">
                      Modo de Visualização Consolidada
                    </h3>
                    <p className="text-blue-800/90 dark:text-blue-300 text-[15px] mt-1.5">
                      Você selecionou múltiplos centros de custo ou meses. A edição de valores está
                      desabilitada para exibir a soma dos valores agregados.
                    </p>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/60 border-b-2 border-border">
                    <TableHead className="pl-6 font-bold text-foreground py-5 text-[15px]">
                      Conta Contábil
                    </TableHead>
                    <TableHead className="w-[200px] text-right font-semibold py-5">
                      <div className="text-foreground mb-2 text-[15px] uppercase tracking-wider">
                        Orçado
                      </div>
                      <div className="text-[15px] font-bold text-foreground bg-background px-3 py-1.5 rounded-md shadow-sm border border-border inline-block">
                        {formatCurrency(totals.budgeted)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px] text-right font-semibold py-5">
                      <div className="text-foreground mb-2 text-[15px] uppercase tracking-wider">
                        Forecast
                      </div>
                      <div
                        className={cn(
                          'text-[15px] font-bold px-3 py-1.5 rounded-md shadow-sm border inline-block',
                          totals.realized > totals.forecast
                            ? 'text-red-800 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/30 dark:border-red-800'
                            : 'text-foreground bg-background border-border',
                        )}
                      >
                        {formatCurrency(totals.forecast)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px] text-right font-semibold py-5">
                      <div className="text-foreground mb-2 text-[15px] uppercase tracking-wider">
                        Realizado
                      </div>
                      <div
                        className={cn(
                          'text-[15px] font-bold px-3 py-1.5 rounded-md shadow-sm border inline-block',
                          totals.realized > totals.budgeted
                            ? 'text-red-800 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/30 dark:border-red-800'
                            : 'text-foreground bg-background border-border',
                        )}
                      >
                        {formatCurrency(totals.realized)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px] pr-6 text-right font-semibold py-5">
                      <div className="text-foreground mb-2 text-[15px] uppercase tracking-wider">
                        Diferença
                      </div>
                      <div
                        className={cn(
                          'text-[15px] font-bold px-3 py-1.5 rounded-md shadow-sm border inline-block',
                          totalDifference < 0
                            ? 'text-red-800 bg-red-100 border-red-300 dark:text-red-200 dark:bg-red-900/30 dark:border-red-800'
                            : 'text-emerald-800 bg-emerald-100 border-emerald-300 dark:text-emerald-200 dark:bg-emerald-900/30 dark:border-emerald-800',
                        )}
                      >
                        {formatCurrency(totalDifference)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((acc, idx) => {
                    const budgeted = round2(parseFloat(entries[acc.id]?.budgeted || '0') || 0)
                    const realized = round2(parseFloat(entries[acc.id]?.realized || '0') || 0)
                    const forecast = round2(parseFloat(entries[acc.id]?.forecast || '0') || 0)
                    const difference = round2(forecast - realized)
                    const isNegative = difference < 0 // Realizado > Forecast (Diferença negativa)

                    return (
                      <TableRow
                        key={acc.id}
                        className={cn(
                          'transition-colors border-b border-border',
                          isNegative
                            ? 'bg-red-50 hover:bg-red-100 dark:bg-red-950/20 dark:hover:bg-red-900/30' // Destacando em vermelho a linha
                            : idx % 2 === 0
                              ? 'bg-background hover:bg-muted/50' // Zebra clara
                              : 'bg-muted/30 hover:bg-muted/70', // Zebra escura
                        )}
                      >
                        <TableCell
                          className={cn(
                            'pl-6 font-medium text-[15px] py-4',
                            isNegative
                              ? 'text-red-900 dark:text-red-400 font-bold'
                              : 'text-foreground',
                          )}
                        >
                          {acc.code && (
                            <span className="text-muted-foreground mr-2 font-normal">
                              {acc.code}
                            </span>
                          )}
                          {acc.name}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-base block py-2',
                                isNegative
                                  ? 'text-red-900/80 dark:text-red-400/80 font-medium'
                                  : 'text-muted-foreground',
                              )}
                            >
                              {formatCurrency(budgeted)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={entries[acc.id]?.budgeted ?? ''}
                              onChange={(e) => updateEntry(acc.id, 'budgeted', e.target.value)}
                              placeholder="0.00"
                              className="text-right font-mono text-base h-11 bg-background/70 focus:bg-background shadow-none border-input"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-base block py-2',
                                isNegative
                                  ? 'text-red-700 dark:text-red-400 font-bold'
                                  : 'text-foreground',
                              )}
                            >
                              {formatCurrency(forecast)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={entries[acc.id]?.forecast ?? ''}
                              onChange={(e) => updateEntry(acc.id, 'forecast', e.target.value)}
                              placeholder="0.00"
                              className={cn(
                                'text-right font-mono text-base h-11 shadow-none',
                                isNegative
                                  ? 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-900 dark:text-red-400 font-bold placeholder:text-red-400 dark:placeholder:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/40 focus:border-red-400 dark:focus:border-red-600'
                                  : 'bg-background/70 border-input focus:bg-background',
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-base block py-2',
                                isNegative
                                  ? 'text-red-700 dark:text-red-400 font-bold'
                                  : 'text-foreground',
                              )}
                            >
                              {formatCurrency(realized)}
                            </span>
                          ) : (
                            <Input
                              type="number"
                              step="0.01"
                              value={entries[acc.id]?.realized ?? ''}
                              onChange={(e) => updateEntry(acc.id, 'realized', e.target.value)}
                              placeholder="0.00"
                              className={cn(
                                'text-right font-mono text-base h-11 shadow-none',
                                isNegative
                                  ? 'bg-red-100 dark:bg-red-900/20 border-red-300 dark:border-red-800 text-red-900 dark:text-red-400 font-bold placeholder:text-red-400 dark:placeholder:text-red-600 focus:bg-red-50 dark:focus:bg-red-900/40 focus:border-red-400 dark:focus:border-red-600'
                                  : 'bg-background/70 border-input focus:bg-background',
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right py-4">
                          <span
                            className={cn(
                              'font-mono text-base block py-2',
                              isNegative
                                ? 'text-red-700 dark:text-red-400 font-bold'
                                : 'text-emerald-700 dark:text-emerald-400 font-semibold',
                            )}
                          >
                            {formatCurrency(difference)}
                          </span>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
        {selectedCCs.length > 0 &&
          selectedMonths.length > 0 &&
          filteredAccounts.length > 0 &&
          !isReadOnly && (
            <div className="p-6 bg-muted/50 border-t border-border flex justify-end rounded-b-xl">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 w-52 h-11 text-base shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Save className="h-5 w-5 mr-2" />
                )}
                Salvar Grade
              </Button>
            </div>
          )}
      </Card>

      <ForecastAgentDialog
        open={forecastAgentOpen}
        onOpenChange={setForecastAgentOpen}
        clientId={activeClientId}
        costCenterIds={selectedCCs}
        accounts={accounts}
        costCenters={costCenters}
        selectedMonths={selectedMonths}
        isAdmin={!isReadOnlyProfile}
        onApplied={loadEntries}
      />
    </div>
  )
}
