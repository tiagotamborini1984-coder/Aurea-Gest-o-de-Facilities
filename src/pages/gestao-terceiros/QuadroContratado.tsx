import { useState, useEffect, useMemo, useCallback } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { useMasterData } from '@/hooks/use-master-data'
import { Plus, Copy, Trash2, Edit2, Loader2, Calendar, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { DuplicateHeadcountDialog } from '@/components/gestao-terceiros/DuplicateHeadcountDialog'
import { HeadcountFormDialog } from '@/components/gestao-terceiros/HeadcountFormDialog'

export default function QuadroContratado() {
  const { profile, selectedMasterClient } = useAppStore()
  const { plants, locations, functions, equipment } = useMasterData()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState('colaborador')
  const [data, setData] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')

  const getCurrentMonth = () => {
    const d = new Date()
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const [selectedMonth, setSelectedMonth] = useState(getCurrentMonth())

  const getClientId = useCallback(() => {
    if (profile?.role === 'Master' && selectedMasterClient !== 'all') return selectedMasterClient
    return profile?.client_id
  }, [profile, selectedMasterClient])

  const fetchCompanies = useCallback(async () => {
    const clientId = getClientId()
    if (!clientId) return
    const { data } = await supabase.from('companies').select('*').eq('client_id', clientId)
    setCompanies(data || [])
  }, [getClientId])

  const fetchData = useCallback(async () => {
    const clientId = getClientId()
    if (!clientId) return
    setLoading(true)
    const { data: res, error } = await supabase
      .from('contracted_headcount')
      .select('*')
      .eq('client_id', clientId)
      .eq('reference_month', `${selectedMonth}-01`)
      .order('created_at', { ascending: false })
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else setData(res || [])
    setLoading(false)
  }, [getClientId, selectedMonth, toast])

  useEffect(() => {
    fetchCompanies()
    fetchData()
  }, [fetchData, fetchCompanies])

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<any>(null)
  const [form, setForm] = useState<any>({})
  const [isDuplicateOpen, setIsDuplicateOpen] = useState(false)

  const handleSave = async () => {
    const clientId = getClientId()
    if (!clientId) return
    if (!form.plant_id || !form.quantity || !form.reference_month) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    const payload = {
      client_id: clientId,
      type: form.type,
      plant_id: form.plant_id,
      location_id: form.location_id || null,
      company_id: form.company_id || null,
      function_id: form.type === 'colaborador' ? form.function_id : null,
      equipment_id: form.type === 'equipamento' ? form.equipment_id : null,
      quantity: Number(form.quantity),
      reference_month: `${form.reference_month}-01`,
    }

    const res = editingItem
      ? await supabase.from('contracted_headcount').update(payload).eq('id', editingItem.id)
      : await supabase.from('contracted_headcount').insert(payload)

    if (res.error) toast({ title: 'Erro', description: res.error.message, variant: 'destructive' })
    else {
      toast({ title: 'Salvo com sucesso' })
      setIsModalOpen(false)
      fetchData()
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza?')) return
    const { error } = await supabase.from('contracted_headcount').delete().eq('id', id)
    if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    else {
      toast({ title: 'Removido com sucesso' })
      fetchData()
    }
  }

  const filteredData = data
    .filter((d) => d.type === activeTab)
    .filter((d) => {
      if (!searchTerm) return true
      const searchLow = searchTerm.toLowerCase()
      const match =
        activeTab === 'colaborador'
          ? functions?.find((f: any) => f.id === d.function_id)?.name
          : equipment?.find((e: any) => e.id === d.equipment_id)?.name
      return match?.toLowerCase().includes(searchLow)
    })

  const monthOptions = useMemo(() => {
    const opts = []
    const d = new Date()
    d.setDate(1)
    for (let i = -12; i <= 6; i++) {
      const nd = new Date(d)
      nd.setMonth(d.getMonth() + i)
      const label = nd.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      opts.push({
        value: `${nd.getFullYear()}-${String(nd.getMonth() + 1).padStart(2, '0')}`,
        label: label.charAt(0).toUpperCase() + label.slice(1),
      })
    }
    return opts.sort((a, b) => b.value.localeCompare(a.value))
  }, [])

  const nextMonth = useMemo(() => {
    const nd = new Date(selectedMonth + '-01T00:00:00Z')
    nd.setUTCMonth(nd.getUTCMonth() + 1)
    return `${nd.getUTCFullYear()}-${String(nd.getUTCMonth() + 1).padStart(2, '0')}`
  }, [selectedMonth])

  return (
    <div className="space-y-6 animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-brand-graphite">
            Quadro Contratado
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Gerencie o headcount de colaboradores e equipamentos por mês
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsDuplicateOpen(true)}>
            <Copy className="w-4 h-4 mr-2" /> Duplicar Mês
          </Button>
          <Button
            onClick={() => {
              setEditingItem(null)
              setForm({ type: activeTab, quantity: 1, reference_month: selectedMonth })
              setIsModalOpen(true)
            }}
            variant="tech"
            className="shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Novo Registro
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-4 bg-white p-2 rounded-xl shadow-sm border border-gray-100">
        <div className="flex-1 w-full flex items-center px-3 gap-2 sm:border-r border-gray-100">
          <Search className="w-5 h-5 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="border-0 shadow-none focus-visible:ring-0 px-0 h-10 text-base"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-64 flex items-center px-3 gap-2">
          <Calendar className="w-5 h-5 text-muted-foreground" />
          <Select value={selectedMonth} onValueChange={setSelectedMonth}>
            <SelectTrigger className="border-0 shadow-none focus:ring-0 bg-transparent h-10">
              <SelectValue placeholder="Mês Referência" />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="colaborador">Colaboradores</TabsTrigger>
          <TabsTrigger value="equipamento">Equipamentos</TabsTrigger>
        </TabsList>
        {['colaborador', 'equipamento'].map((tab) => (
          <TabsContent key={tab} value={tab} className="m-0">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-20">
                  <Loader2 className="h-8 w-8 animate-spin text-brand-deepBlue" />
                </div>
              ) : filteredData.length === 0 ? (
                <div className="text-center py-20 text-muted-foreground">
                  Nenhum registro encontrado.
                </div>
              ) : (
                <Table>
                  <TableHeader className="bg-slate-50/80 border-b border-gray-100">
                    <TableRow>
                      <TableHead>Planta</TableHead>
                      <TableHead>Local</TableHead>
                      <TableHead>Empresa</TableHead>
                      <TableHead>{tab === 'colaborador' ? 'Função' : 'Equipamento'}</TableHead>
                      <TableHead className="text-right">Qtd.</TableHead>
                      <TableHead className="text-right pr-6">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredData.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          {plants?.find((p: any) => p.id === item.plant_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {locations?.find((l: any) => l.id === item.location_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {companies?.find((c: any) => c.id === item.company_id)?.name || '-'}
                        </TableCell>
                        <TableCell>
                          {tab === 'colaborador'
                            ? functions?.find((f: any) => f.id === item.function_id)?.name
                            : equipment?.find((e: any) => e.id === item.equipment_id)?.name}
                        </TableCell>
                        <TableCell className="text-right font-medium">{item.quantity}</TableCell>
                        <TableCell className="text-right pr-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                setEditingItem(item)
                                setForm({
                                  ...item,
                                  reference_month: item.reference_month.substring(0, 7),
                                })
                                setIsModalOpen(true)
                              }}
                              className="p-1.5 text-slate-600 hover:text-brand-deepBlue bg-white hover:bg-slate-100 rounded-md transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id)}
                              className="p-1.5 text-slate-600 hover:text-red-600 bg-white hover:bg-red-50 rounded-md transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      <HeadcountFormDialog
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        form={form}
        setForm={setForm}
        onSave={handleSave}
        editingItem={editingItem}
        plants={plants}
        locations={locations}
        companies={companies}
        functions={functions}
        equipment={equipment}
      />
      <DuplicateHeadcountDialog
        open={isDuplicateOpen}
        onOpenChange={setIsDuplicateOpen}
        clientId={getClientId()}
        monthOptions={monthOptions}
        defaultSource={selectedMonth}
        defaultTarget={nextMonth}
        onSuccess={(m: string) => {
          setSelectedMonth(m)
          fetchData()
        }}
      />
    </div>
  )
}
