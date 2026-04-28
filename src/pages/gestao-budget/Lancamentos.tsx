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
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { cn } from '@/lib/utils'

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

  const [entries, setEntries] = useState<Record<string, { budgeted: string; realized: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

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
      return
    }
    loadEntries()
  }, [selectedCCs, selectedMonths, activeClientId])

  const loadEntries = async () => {
    setLoading(true)
    const referenceDates = selectedMonths.map((m) => `${m}-01`)

    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('client_id', activeClientId)
      .in('cost_center_id', selectedCCs)
      .in('reference_month', referenceDates)

    const map: Record<string, { budgeted: number; realized: number }> = {}
    if (data) {
      data.forEach((e) => {
        if (!map[e.account_id]) {
          map[e.account_id] = { budgeted: 0, realized: 0 }
        }
        map[e.account_id].budgeted += Number(e.budgeted_amount) || 0
        map[e.account_id].realized += Number(e.realized_amount) || 0
      })
    }

    const stringMap: Record<string, { budgeted: string; realized: string }> = {}
    for (const [key, val] of Object.entries(map)) {
      stringMap[key] = { budgeted: val.budgeted.toString(), realized: val.realized.toString() }
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
      const vals = entries[acc.id] || { budgeted: '0', realized: '0' }
      return {
        client_id: activeClientId,
        cost_center_id: singleCC,
        account_id: acc.id,
        reference_month: referenceDate,
        budgeted_amount: parseFloat(vals.budgeted) || 0,
        realized_amount: parseFloat(vals.realized) || 0,
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

  const updateEntry = (accId: string, field: 'budgeted' | 'realized', val: string) => {
    if (isReadOnly) return
    setEntries((prev) => ({
      ...prev,
      [accId]: {
        budgeted: prev[accId]?.budgeted ?? '',
        realized: prev[accId]?.realized ?? '',
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

  const totals = useMemo(() => {
    return filteredAccounts.reduce(
      (acc, curr) => {
        const vals = entries[curr.id]
        acc.budgeted += parseFloat(vals?.budgeted || '0')
        acc.realized += parseFloat(vals?.realized || '0')
        return acc
      },
      { budgeted: 0, realized: 0 },
    )
  }, [filteredAccounts, entries])

  const totalDifference = totals.budgeted - totals.realized

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
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
            <FileText className="h-8 w-8 text-brand-vividBlue" />
            {isReadOnlyProfile ? 'Painel de Lançamentos' : 'Lançamentos (Orçado vs Realizado)'}
          </h1>
          <p className="text-slate-500 mt-2 text-base">
            {isReadOnlyProfile
              ? 'Visualize os valores previstos e executados por conta em cada centro de custo.'
              : 'Insira os valores previstos e executados ou visualize o consolidado.'}
          </p>
        </div>

        {profile?.role === 'Master' && (
          <div className="flex items-center gap-3 bg-white p-2 rounded-lg border border-slate-200 shadow-sm w-full md:w-auto">
            <Building2 className="h-5 w-5 text-slate-400 ml-2 shrink-0" />
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
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-5 border-b bg-slate-50/50">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="space-y-3">
              <Label className="text-slate-700 font-bold text-base">Mês(es) de Referência</Label>
              <div className="flex items-center gap-3">
                <Input
                  type="month"
                  value={tempMonth}
                  onChange={(e) => setTempMonth(e.target.value)}
                  className="w-[180px] bg-white h-11 text-base border-slate-300"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addMonth}
                  disabled={!tempMonth || selectedMonths.includes(tempMonth)}
                  className="bg-white border-slate-300 hover:bg-slate-100 text-slate-700 h-11 px-5"
                >
                  Adicionar
                </Button>
              </div>
              {selectedMonths.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-4 p-4 rounded-lg bg-white border border-slate-200 shadow-sm min-h-[60px] items-center">
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
              <Label className="text-slate-700 font-bold text-base">Centros de Custo</Label>
              <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ccPopoverOpen}
                    className="w-full justify-between bg-white h-auto min-h-[60px] py-3 px-4 border-slate-300 text-base"
                  >
                    <div className="flex flex-wrap gap-2 items-center text-left flex-1">
                      {selectedCCs.length === 0 ? (
                        <span className="text-slate-500 font-normal">
                          Selecione os centros de custo...
                        </span>
                      ) : selectedCCs.length <= 3 ? (
                        selectedCCs.map((id) => {
                          const c = costCenters.find((x) => x.id === id)
                          return c ? (
                            <Badge
                              variant="secondary"
                              key={id}
                              className="font-normal bg-slate-100 text-slate-800 hover:bg-slate-200 py-1.5 px-3 text-[15px]"
                            >
                              {c.code ? `${c.code} - ` : ''}
                              {c.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-normal bg-slate-100 text-slate-800 py-1.5 px-3 text-[15px]"
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
                                    : 'border-slate-300 opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-slate-800">
                                {cc.code ? `${cc.code} - ` : ''}
                              </span>
                              <span className="text-slate-600 ml-1">{cc.name}</span>
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
              <Label className="text-slate-700 font-bold text-base">Contas Contábeis</Label>
              <Popover open={accPopoverOpen} onOpenChange={setAccPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={accPopoverOpen}
                    className="w-full justify-between bg-white h-auto min-h-[60px] py-3 px-4 border-slate-300 text-base"
                  >
                    <div className="flex flex-wrap gap-2 items-center text-left flex-1">
                      {selectedAccounts.length === 0 ? (
                        <span className="text-slate-500 font-normal">Todas as contas...</span>
                      ) : selectedAccounts.length <= 3 ? (
                        selectedAccounts.map((id) => {
                          const a = accounts.find((x) => x.id === id)
                          return a ? (
                            <Badge
                              variant="secondary"
                              key={id}
                              className="font-normal bg-slate-100 text-slate-800 hover:bg-slate-200 py-1.5 px-3 text-[15px]"
                            >
                              {a.code ? `${a.code} - ` : ''}
                              {a.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-normal bg-slate-100 text-slate-800 py-1.5 px-3 text-[15px]"
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
                                    : 'border-slate-300 opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className="h-4 w-4" />
                              </div>
                              <span className="font-medium text-slate-800">
                                {acc.code ? `${acc.code} - ` : ''}
                              </span>
                              <span className="text-slate-600 ml-1">{acc.name}</span>
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
            <div className="py-20 text-center text-slate-500 bg-slate-50/30">
              <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg">Selecione um cliente para visualizar os lançamentos.</p>
            </div>
          ) : selectedCCs.length === 0 || selectedMonths.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-slate-50/30">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-lg">
                Selecione ao menos um Mês e um Centro de Custo
                <br />
                para visualizar os lançamentos.
              </p>
            </div>
          ) : loading ? (
            <div className="py-20 text-center flex justify-center bg-slate-50/30">
              <Loader2 className="h-10 w-10 animate-spin text-brand-vividBlue" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-20 text-center text-slate-500 bg-slate-50/30">
              <p className="text-lg">Nenhuma conta contábil cadastrada.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              {isMultiSelection && !isReadOnlyProfile && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-5 m-5 rounded-md flex items-start shadow-sm animate-fade-in">
                  <AlertTriangle className="h-6 w-6 text-blue-600 mr-4 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-blue-900 font-bold text-[17px]">
                      Modo de Visualização Consolidada
                    </h3>
                    <p className="text-blue-800/90 text-[15px] mt-1.5">
                      Você selecionou múltiplos centros de custo ou meses. A edição de valores está
                      desabilitada para exibir a soma dos valores agregados.
                    </p>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-200/60 border-b-2 border-slate-300">
                    <TableHead className="pl-6 font-bold text-slate-800 py-5 text-[15px]">
                      Conta Contábil
                    </TableHead>
                    <TableHead className="w-[200px] text-right font-semibold py-5">
                      <div className="text-slate-800 mb-2 text-[15px] uppercase tracking-wider">
                        Orçado
                      </div>
                      <div className="text-[15px] font-bold text-slate-800 bg-white px-3 py-1.5 rounded-md shadow-sm border border-slate-300 inline-block">
                        {formatCurrency(totals.budgeted)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px] text-right font-semibold py-5">
                      <div className="text-slate-800 mb-2 text-[15px] uppercase tracking-wider">
                        Realizado
                      </div>
                      <div
                        className={cn(
                          'text-[15px] font-bold px-3 py-1.5 rounded-md shadow-sm border inline-block',
                          totals.realized > totals.budgeted
                            ? 'text-red-800 bg-red-100 border-red-300'
                            : 'text-slate-800 bg-white border-slate-300',
                        )}
                      >
                        {formatCurrency(totals.realized)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[200px] pr-6 text-right font-semibold py-5">
                      <div className="text-slate-800 mb-2 text-[15px] uppercase tracking-wider">
                        Diferença
                      </div>
                      <div
                        className={cn(
                          'text-[15px] font-bold px-3 py-1.5 rounded-md shadow-sm border inline-block',
                          totalDifference < 0
                            ? 'text-red-800 bg-red-100 border-red-300'
                            : 'text-emerald-800 bg-emerald-100 border-emerald-300',
                        )}
                      >
                        {formatCurrency(totalDifference)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAccounts.map((acc, idx) => {
                    const budgeted = parseFloat(entries[acc.id]?.budgeted || '0')
                    const realized = parseFloat(entries[acc.id]?.realized || '0')
                    const difference = budgeted - realized
                    const isNegative = difference < 0 // Realizado > Orçado (Diferença negativa)

                    return (
                      <TableRow
                        key={acc.id}
                        className={cn(
                          'transition-colors border-b border-slate-200',
                          isNegative
                            ? 'bg-red-50 hover:bg-red-100' // Destacando em vermelho a linha
                            : idx % 2 === 0
                              ? 'bg-white hover:bg-slate-50' // Zebra clara
                              : 'bg-slate-100 hover:bg-slate-200', // Zebra escura
                        )}
                      >
                        <TableCell
                          className={cn(
                            'pl-6 font-medium text-[15px] py-4',
                            isNegative ? 'text-red-900 font-bold' : 'text-slate-800',
                          )}
                        >
                          {acc.code && (
                            <span className="text-slate-500 mr-2 font-normal">{acc.code}</span>
                          )}
                          {acc.name}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-base block py-2',
                                isNegative ? 'text-red-900/80 font-medium' : 'text-slate-700',
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
                              className="text-right font-mono text-base h-11 bg-white/70 focus:bg-white shadow-none border-slate-300"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right py-4">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-base block py-2',
                                isNegative ? 'text-red-700 font-bold' : 'text-slate-700',
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
                                  ? 'bg-red-100 border-red-300 text-red-900 font-bold placeholder:text-red-400 focus:bg-red-50 focus:border-red-400'
                                  : 'bg-white/70 border-slate-300 focus:bg-white',
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right py-4">
                          <span
                            className={cn(
                              'font-mono text-base block py-2',
                              isNegative
                                ? 'text-red-700 font-bold'
                                : 'text-emerald-700 font-semibold',
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
            <div className="p-6 bg-slate-50 border-t flex justify-end rounded-b-xl">
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
    </div>
  )
}
