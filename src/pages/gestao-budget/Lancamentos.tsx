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
import { cn } from '@/lib/utils'

export default function Lancamentos() {
  const { profile } = useAppStore()
  const { toast } = useToast()

  const isReadOnlyProfile = profile?.role !== 'Master' && profile?.role !== 'Administrador'

  const [costCenters, setCostCenters] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])

  const [selectedMonths, setSelectedMonths] = useState<string[]>([
    new Date().toISOString().substring(0, 7),
  ])
  const [tempMonth, setTempMonth] = useState('')

  const [selectedCCs, setSelectedCCs] = useState<string[]>([])
  const [ccPopoverOpen, setCcPopoverOpen] = useState(false)

  const [entries, setEntries] = useState<Record<string, { budgeted: string; realized: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Desabilita edição quando seleciona mais de 1 centro de custo ou mais de 1 mês
  const isMultiSelection = selectedCCs.length > 1 || selectedMonths.length > 1
  const isReadOnly = isReadOnlyProfile || isMultiSelection

  useEffect(() => {
    if (!profile?.client_id) return

    // Lista suspensa em ordem crescente
    supabase
      .from('budget_cost_centers')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('name', { ascending: true })
      .then(({ data }) => setCostCenters(data || []))

    supabase
      .from('budget_accounts')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('name')
      .then(({ data }) => setAccounts(data || []))
  }, [profile?.client_id])

  useEffect(() => {
    if (!profile?.client_id || selectedCCs.length === 0 || selectedMonths.length === 0) {
      setEntries({})
      return
    }
    loadEntries()
  }, [selectedCCs, selectedMonths, profile?.client_id])

  const loadEntries = async () => {
    setLoading(true)
    const referenceDates = selectedMonths.map((m) => `${m}-01`)

    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('client_id', profile!.client_id)
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
    if (
      isReadOnly ||
      !profile?.client_id ||
      selectedCCs.length !== 1 ||
      selectedMonths.length !== 1
    )
      return
    setSaving(true)

    const singleCC = selectedCCs[0]
    const referenceDate = `${selectedMonths[0]}-01`

    const payload = accounts.map((acc) => {
      const vals = entries[acc.id] || { budgeted: '0', realized: '0' }
      return {
        client_id: profile.client_id,
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

  const totals = useMemo(() => {
    return accounts.reduce(
      (acc, curr) => {
        const vals = entries[curr.id]
        acc.budgeted += parseFloat(vals?.budgeted || '0')
        acc.realized += parseFloat(vals?.realized || '0')
        return acc
      },
      { budgeted: 0, realized: 0 },
    )
  }, [accounts, entries])

  const totalDifference = totals.budgeted - totals.realized

  const removeMonth = (m: string) => setSelectedMonths((prev) => prev.filter((x) => x !== m))
  const addMonth = () => {
    if (tempMonth && !selectedMonths.includes(tempMonth)) {
      setSelectedMonths([...selectedMonths, tempMonth])
      setTempMonth('')
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-vividBlue" />
            {isReadOnlyProfile ? 'Painel de Lançamentos' : 'Lançamentos (Orçado vs Realizado)'}
          </h1>
          <p className="text-slate-500 mt-1">
            {isReadOnlyProfile
              ? 'Visualize os valores previstos e executados por conta em cada centro de custo.'
              : 'Insira os valores previstos e executados ou visualize o consolidado.'}
          </p>
        </div>
      </div>

      <Card className="shadow-sm border-slate-200">
        <CardHeader className="pb-4 border-b bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Mês(es) de Referência</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="month"
                  value={tempMonth}
                  onChange={(e) => setTempMonth(e.target.value)}
                  className="w-[160px] bg-white"
                />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={addMonth}
                  disabled={!tempMonth || selectedMonths.includes(tempMonth)}
                  className="bg-white border hover:bg-slate-100 text-slate-700"
                >
                  Adicionar
                </Button>
              </div>
              {selectedMonths.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3 p-3 rounded-md bg-white border shadow-sm min-h-12 items-center">
                  {selectedMonths.map((m) => {
                    const [year, month] = m.split('-')
                    return (
                      <Badge
                        key={m}
                        variant="default"
                        className="flex items-center gap-1.5 bg-brand-vividBlue text-white hover:bg-brand-vividBlue/90 py-1.5 px-3"
                      >
                        <CalendarIcon className="h-3 w-3" />
                        <span className="text-sm">{`${month}/${year}`}</span>
                        <button
                          onClick={() => removeMonth(m)}
                          className="ml-1 rounded-full p-0.5 hover:bg-white/20 transition-colors"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </Badge>
                    )
                  })}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-700 font-semibold">Centros de Custo</Label>
              <Popover open={ccPopoverOpen} onOpenChange={setCcPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={ccPopoverOpen}
                    className="w-full justify-between bg-white h-auto min-h-[42px] py-2"
                  >
                    <div className="flex flex-wrap gap-1 items-center text-left flex-1">
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
                              className="mr-1 mb-1 font-normal bg-slate-100 text-slate-800 hover:bg-slate-200"
                            >
                              {c.code ? `${c.code} - ` : ''}
                              {c.name}
                            </Badge>
                          ) : null
                        })
                      ) : (
                        <Badge
                          variant="secondary"
                          className="font-normal bg-slate-100 text-slate-800"
                        >
                          {selectedCCs.length} centros selecionados
                        </Badge>
                      )}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="start">
                  <Command>
                    <CommandInput placeholder="Buscar centro de custo..." className="h-10" />
                    <CommandList className="max-h-[300px]">
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
                              className="cursor-pointer py-2"
                            >
                              <div
                                className={cn(
                                  'mr-3 flex h-4 w-4 items-center justify-center rounded-sm border',
                                  isSelected
                                    ? 'bg-brand-vividBlue border-brand-vividBlue text-white'
                                    : 'border-slate-300 opacity-50 [&_svg]:invisible',
                                )}
                              >
                                <Check className="h-3 w-3" />
                              </div>
                              <span className="font-medium text-slate-700">
                                {cc.code ? `${cc.code} - ` : ''}
                              </span>
                              <span className="text-slate-600">{cc.name}</span>
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
          {selectedCCs.length === 0 || selectedMonths.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-50/30">
              <FileText className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p>
                Selecione ao menos um Mês e um Centro de Custo
                <br />
                para visualizar os lançamentos.
              </p>
            </div>
          ) : loading ? (
            <div className="py-16 text-center flex justify-center bg-slate-50/30">
              <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-16 text-center text-slate-500 bg-slate-50/30">
              Nenhuma conta contábil cadastrada.
            </div>
          ) : (
            <div className="flex flex-col">
              {isMultiSelection && !isReadOnlyProfile && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-4 m-4 rounded-md flex items-start shadow-sm animate-fade-in">
                  <AlertTriangle className="h-5 w-5 text-blue-600 mr-3 mt-0.5 shrink-0" />
                  <div>
                    <h3 className="text-blue-900 font-semibold">
                      Modo de Visualização Consolidada
                    </h3>
                    <p className="text-blue-800/90 text-sm mt-1">
                      Você selecionou múltiplos centros de custo ou meses. A edição de valores está
                      desabilitada para exibir a soma dos valores agregados.
                    </p>
                  </div>
                </div>
              )}

              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-100 border-b-2 border-slate-200">
                    <TableHead className="pl-6 font-bold text-slate-800 py-4">
                      Conta Contábil
                    </TableHead>
                    <TableHead className="w-[180px] text-right font-semibold">
                      <div className="text-slate-800 mb-1.5 text-sm uppercase tracking-wider">
                        Orçado
                      </div>
                      <div className="text-xs font-bold text-slate-700 bg-white px-2.5 py-1 rounded-md shadow-sm border border-slate-200/60 inline-block">
                        {formatCurrency(totals.budgeted)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px] text-right font-semibold">
                      <div className="text-slate-800 mb-1.5 text-sm uppercase tracking-wider">
                        Realizado
                      </div>
                      <div
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border inline-block',
                          totals.realized > totals.budgeted
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : 'text-slate-700 bg-white border-slate-200/60',
                        )}
                      >
                        {formatCurrency(totals.realized)}
                      </div>
                    </TableHead>
                    <TableHead className="w-[180px] pr-6 text-right font-semibold">
                      <div className="text-slate-800 mb-1.5 text-sm uppercase tracking-wider">
                        Diferença
                      </div>
                      <div
                        className={cn(
                          'text-xs font-bold px-2.5 py-1 rounded-md shadow-sm border inline-block',
                          totalDifference < 0
                            ? 'text-red-700 bg-red-50 border-red-200'
                            : 'text-emerald-700 bg-emerald-50 border-emerald-200',
                        )}
                      >
                        {formatCurrency(totalDifference)}
                      </div>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((acc, idx) => {
                    const budgeted = parseFloat(entries[acc.id]?.budgeted || '0')
                    const realized = parseFloat(entries[acc.id]?.realized || '0')
                    const difference = budgeted - realized
                    const isNegative = difference < 0 // Realizado > Orçado (Diferença negativa)

                    return (
                      <TableRow
                        key={acc.id}
                        className={cn(
                          'transition-colors border-b border-slate-100',
                          isNegative
                            ? 'bg-red-50/80 hover:bg-red-100' // Destacando em vermelho a linha
                            : idx % 2 === 0
                              ? 'bg-white hover:bg-slate-50' // Zebra clara
                              : 'bg-slate-50/60 hover:bg-slate-100', // Zebra escura
                        )}
                      >
                        <TableCell
                          className={cn(
                            'pl-6 font-medium',
                            isNegative ? 'text-red-900 font-bold' : 'text-slate-700',
                          )}
                        >
                          {acc.code && (
                            <span className="text-slate-400 mr-2 font-normal">{acc.code}</span>
                          )}
                          {acc.name}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-[15px] block py-2',
                                isNegative ? 'text-red-900/80 font-medium' : 'text-slate-600',
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
                              className="text-right font-mono h-9 bg-white/70 focus:bg-white shadow-none border-slate-200"
                            />
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {isReadOnly ? (
                            <span
                              className={cn(
                                'font-mono text-[15px] block py-2',
                                isNegative ? 'text-red-700 font-bold' : 'text-slate-600',
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
                                'text-right font-mono h-9 shadow-none',
                                isNegative
                                  ? 'bg-red-100 border-red-300 text-red-900 font-bold placeholder:text-red-400 focus:bg-red-50 focus:border-red-400'
                                  : 'bg-white/70 border-slate-200 focus:bg-white',
                              )}
                            />
                          )}
                        </TableCell>
                        <TableCell className="pr-6 text-right">
                          <span
                            className={cn(
                              'font-mono text-[15px] block py-2',
                              isNegative
                                ? 'text-red-700 font-bold'
                                : 'text-emerald-600 font-semibold',
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
          accounts.length > 0 &&
          !isReadOnly && (
            <div className="p-5 bg-slate-50 border-t flex justify-end rounded-b-xl">
              <Button
                onClick={handleSave}
                disabled={saving}
                className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 w-44 shadow-sm"
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Salvar Grade
              </Button>
            </div>
          )}
      </Card>
    </div>
  )
}
