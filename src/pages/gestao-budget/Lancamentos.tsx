import { useState, useEffect, useMemo } from 'react'
import { FileText, Save, Loader2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
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

  const isReadOnly = profile?.role !== 'Master' && profile?.role !== 'Administrador'

  const [costCenters, setCostCenters] = useState<any[]>([])
  const [accounts, setAccounts] = useState<any[]>([])
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7)) // YYYY-MM
  const [selectedCC, setSelectedCC] = useState<string>('')
  const [entries, setEntries] = useState<Record<string, { budgeted: string; realized: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (!profile?.client_id) return
    supabase
      .from('budget_cost_centers')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('name')
      .then(({ data }) => setCostCenters(data || []))

    supabase
      .from('budget_accounts')
      .select('*')
      .eq('client_id', profile.client_id)
      .order('name')
      .then(({ data }) => setAccounts(data || []))
  }, [profile?.client_id])

  useEffect(() => {
    if (!profile?.client_id || !selectedCC || !selectedMonth) {
      setEntries({})
      return
    }
    loadEntries()
  }, [selectedCC, selectedMonth])

  const loadEntries = async () => {
    setLoading(true)
    const referenceDate = `${selectedMonth}-01`
    const { data } = await supabase
      .from('budget_entries')
      .select('*')
      .eq('client_id', profile!.client_id)
      .eq('cost_center_id', selectedCC)
      .eq('reference_month', referenceDate)

    const map: Record<string, { budgeted: string; realized: string }> = {}
    if (data) {
      data.forEach((e) => {
        map[e.account_id] = {
          budgeted: e.budgeted_amount.toString(),
          realized: e.realized_amount.toString(),
        }
      })
    }
    setEntries(map)
    setLoading(false)
  }

  const handleSave = async () => {
    if (isReadOnly || !profile?.client_id || !selectedCC || !selectedMonth) return
    setSaving(true)
    const referenceDate = `${selectedMonth}-01`

    const payload = accounts.map((acc) => {
      const vals = entries[acc.id] || { budgeted: '0', realized: '0' }
      return {
        client_id: profile.client_id,
        cost_center_id: selectedCC,
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
        className: 'bg-green-50 text-green-900 border-green-200',
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

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="h-6 w-6 text-brand-vividBlue" />
            {isReadOnly ? 'Painel de Lançamentos' : 'Lançamentos (Orçado vs Realizado)'}
          </h1>
          <p className="text-gray-500 mt-1">
            {isReadOnly
              ? 'Visualize os valores previstos e gastos por conta em cada centro de custo.'
              : 'Insira os valores previstos e gastos por conta em cada centro de custo.'}
          </p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4 border-b">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Mês de Referência</Label>
              <Input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Centro de Custo</Label>
              <Select value={selectedCC} onValueChange={setSelectedCC}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  {costCenters.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.code ? `${c.code} - ` : ''}
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {!selectedCC ? (
            <div className="py-12 text-center text-gray-500">
              Selecione um Centro de Custo para visualizar os lançamentos.
            </div>
          ) : loading ? (
            <div className="py-12 text-center flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-brand-vividBlue" />
            </div>
          ) : accounts.length === 0 ? (
            <div className="py-12 text-center text-gray-500">
              Nenhuma conta contábil cadastrada.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50/80">
                  <TableHead className="pl-6 font-semibold">Conta Contábil</TableHead>
                  <TableHead className="w-[200px] text-right font-semibold">
                    <div className="mb-1 text-gray-800">Orçado (R$)</div>
                    <div className="text-sm font-bold text-gray-600">
                      {formatCurrency(totals.budgeted)}
                    </div>
                  </TableHead>
                  <TableHead className="w-[200px] pr-6 text-right font-semibold">
                    <div className="mb-1 text-gray-800">Realizado (R$)</div>
                    <div className="text-sm font-bold text-gray-600">
                      {formatCurrency(totals.realized)}
                    </div>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {accounts.map((acc, idx) => {
                  const budgeted = parseFloat(entries[acc.id]?.budgeted || '0')
                  const realized = parseFloat(entries[acc.id]?.realized || '0')
                  const isOverBudget = realized > budgeted

                  return (
                    <TableRow
                      key={acc.id}
                      className={cn(
                        idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50',
                        isOverBudget && 'bg-red-50/60 hover:bg-red-50/80',
                      )}
                    >
                      <TableCell className="pl-6 font-medium text-gray-700">
                        {acc.code ? `${acc.code} - ` : ''}
                        {acc.name}
                      </TableCell>
                      <TableCell className="text-right">
                        {isReadOnly ? (
                          <span className="font-mono text-gray-600 block py-2">
                            {formatCurrency(budgeted)}
                          </span>
                        ) : (
                          <Input
                            type="number"
                            step="0.01"
                            value={entries[acc.id]?.budgeted ?? ''}
                            onChange={(e) => updateEntry(acc.id, 'budgeted', e.target.value)}
                            placeholder="0.00"
                            className="text-right font-mono h-9 bg-white/50 focus:bg-white"
                          />
                        )}
                      </TableCell>
                      <TableCell className="pr-6 text-right">
                        {isReadOnly ? (
                          <span
                            className={cn(
                              'font-mono block py-2',
                              isOverBudget ? 'text-red-700 font-bold' : 'text-gray-600',
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
                              'text-right font-mono h-9 focus:bg-white',
                              isOverBudget
                                ? 'bg-red-100/50 border-red-200 text-red-900'
                                : 'bg-white/50',
                            )}
                          />
                        )}
                      </TableCell>
                    </TableRow>
                  )
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
        {selectedCC && accounts.length > 0 && !isReadOnly && (
          <div className="p-6 bg-gray-50 border-t flex justify-end">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-brand-vividBlue hover:bg-brand-vividBlue/90 w-40"
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
