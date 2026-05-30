import { useEffect, useState, useMemo } from 'react'
import { format, parseISO } from 'date-fns'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Search, Edit2, Trash2, FileText, Plus } from 'lucide-react'
import { toast } from 'sonner'

import { supabase } from '@/lib/supabase/client'
import { useAppStore } from '@/store/AppContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const PERIODICIDADE_OPCOES = [
  'Diário',
  'Semanal',
  'Quinzenal',
  'Mensal',
  'Trimestral',
  'Semestral',
  'Anual',
]

const formSchema = z.object({
  name: z.string().min(1, 'Obrigatório'),
  document_type: z.string().min(1, 'Obrigatório'),
  plant_id: z.string().min(1, 'Obrigatório'),
  frequency: z.string().min(1, 'Obrigatório'),
  expiration_date: z.string().min(1, 'Obrigatório'),
  alert_lead_days: z.coerce.number().min(1, 'Obrigatório'),
})

export default function Documentos() {
  const { activeClient, profile } = useAppStore()
  const [documents, setDocuments] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      document_type: '',
      plant_id: '',
      frequency: '',
      expiration_date: '',
      alert_lead_days: 30,
    },
  })

  useEffect(() => {
    if (activeClient?.id) {
      fetchDocuments()
      fetchPlants()
    }
  }, [activeClient?.id])

  const fetchDocuments = async () => {
    const { data, error } = await supabase
      .from('sector_documents')
      .select('*, plants(name)')
      .eq('client_id', activeClient!.id)
      .order('created_at', { ascending: false })
    if (!error && data) setDocuments(data)
  }

  const fetchPlants = async () => {
    const { data, error } = await supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient!.id)

    if (!error && data) {
      if (profile?.role === 'Operacional' || profile?.role === 'Gestor') {
        const authPlants = profile?.authorized_plants || []
        setPlants(data.filter((p) => authPlants.includes(p.id)))
      } else {
        setPlants(data)
      }
    }
  }

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    try {
      if (editingId) {
        const { error } = await supabase.from('sector_documents').update(values).eq('id', editingId)
        if (error) throw error
        toast.success('Documento atualizado com sucesso!')
      } else {
        const { error } = await supabase
          .from('sector_documents')
          .insert({ ...values, client_id: activeClient!.id })
        if (error) throw error
        toast.success('Documento criado com sucesso!')
      }
      setIsOpen(false)
      fetchDocuments()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao salvar documento')
    }
  }

  const handleAdd = () => {
    setEditingId(null)
    form.reset({
      name: '',
      document_type: '',
      plant_id: '',
      frequency: '',
      expiration_date: '',
      alert_lead_days: 30,
    })
    setIsOpen(true)
  }

  const handleEdit = (doc: any) => {
    setEditingId(doc.id)
    form.reset({
      name: doc.name,
      document_type: doc.document_type,
      plant_id: doc.plant_id,
      frequency: doc.frequency || '',
      expiration_date: doc.expiration_date ? doc.expiration_date.split('T')[0] : '',
      alert_lead_days: doc.alert_lead_days,
    })
    setIsOpen(true)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este documento?')) return
    const { error } = await supabase.from('sector_documents').delete().eq('id', id)
    if (error) {
      toast.error('Erro ao excluir documento')
    } else {
      toast.success('Documento excluído com sucesso')
      fetchDocuments()
    }
  }

  const filteredDocs = useMemo(() => {
    return documents.filter((d) => d.name.toLowerCase().includes(search.toLowerCase()))
  }, [documents, search])

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-'
    try {
      return format(parseISO(dateStr), 'dd/MM/yyyy')
    } catch {
      return dateStr
    }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-fade-in">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight flex items-center gap-3">
          <FileText className="h-8 w-8 text-brand-vividBlue" />
          Gestão de Documentos
        </h1>
        <Button
          onClick={handleAdd}
          className="bg-brand-vividBlue hover:bg-brand-deepBlue w-full sm:w-auto shadow-md"
        >
          <Plus className="h-4 w-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      <div className="bg-white border rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b bg-gray-50/50">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar documentos..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-white"
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50/50">
                <TableHead className="font-semibold text-gray-700">Nome</TableHead>
                <TableHead className="font-semibold text-gray-700">Tipo</TableHead>
                <TableHead className="font-semibold text-gray-700">Planta</TableHead>
                <TableHead className="font-semibold text-gray-700">Periodicidade</TableHead>
                <TableHead className="font-semibold text-gray-700">Vencimento</TableHead>
                <TableHead className="font-semibold text-gray-700 w-24">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredDocs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Nenhum documento encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                filteredDocs.map((doc) => (
                  <TableRow key={doc.id} className="hover:bg-gray-50 transition-colors">
                    <TableCell className="font-medium text-gray-900">{doc.name}</TableCell>
                    <TableCell className="text-gray-600">{doc.document_type}</TableCell>
                    <TableCell className="text-gray-600">{doc.plants?.name}</TableCell>
                    <TableCell>
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {doc.frequency || '-'}
                      </span>
                    </TableCell>
                    <TableCell className="text-gray-600">
                      {formatDate(doc.expiration_date)}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(doc)}
                          className="h-8 w-8 text-brand-vividBlue hover:text-brand-deepBlue hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(doc.id)}
                          className="h-8 w-8 text-red-600 hover:text-red-700 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 mt-2">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Nome do Documento</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: PPRA 2026" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="document_type"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Tipo</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Ex: Segurança" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="plant_id"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Planta</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {plants.map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="frequency"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Periodicidade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {PERIODICIDADE_OPCOES.map((op) => (
                            <SelectItem key={op} value={op}>
                              {op}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="expiration_date"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Data de Vencimento</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="alert_lead_days"
                  render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Dias para Alerta</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t mt-6">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" className="bg-brand-vividBlue hover:bg-brand-deepBlue">
                  Salvar Documento
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
