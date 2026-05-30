import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/use-auth'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'
import { Plus, Search, Pencil, Trash2 } from 'lucide-react'
import { format, differenceInDays, isBefore, startOfDay } from 'date-fns'

export default function Documentos() {
  const { user } = useAuth()
  const { toast } = useToast()

  const [documents, setDocuments] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [plantFilter, setPlantFilter] = useState('all')

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingDoc, setEditingDoc] = useState<any>(null)
  const [formData, setFormData] = useState({
    name: '',
    plant_id: '',
    document_type: '',
    frequency: 'Anual',
    expiration_date: '',
    alert_lead_days: 30,
  })

  const fetchData = async () => {
    if (!user) return
    setLoading(true)
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id, authorized_plants, role')
        .eq('id', user.id)
        .single()
      if (!profile?.client_id) return

      let plantQuery = supabase.from('plants').select('id, name').eq('client_id', profile.client_id)
      if (
        profile.role !== 'Master' &&
        profile.role !== 'Administrador' &&
        profile.authorized_plants?.length
      ) {
        plantQuery = plantQuery.in('id', profile.authorized_plants)
      }
      const { data: plantsData } = await plantQuery
      setPlants(plantsData || [])

      let docQuery = supabase
        .from('sector_documents')
        .select('*, plants(name)')
        .eq('client_id', profile.client_id)
        .order('expiration_date', { ascending: true })
      if (
        profile.role !== 'Master' &&
        profile.role !== 'Administrador' &&
        profile.authorized_plants?.length
      ) {
        docQuery = docQuery.in('plant_id', profile.authorized_plants)
      }
      const { data: docsData } = await docQuery
      setDocuments(docsData || [])
    } catch (error: any) {
      toast({ title: 'Erro', description: 'Erro ao carregar documentos.', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [user])

  const handleOpenModal = (doc?: any) => {
    if (doc) {
      setEditingDoc(doc)
      setFormData({
        name: doc.name,
        plant_id: doc.plant_id,
        document_type: doc.document_type,
        frequency: doc.frequency || 'Anual',
        expiration_date: doc.expiration_date,
        alert_lead_days: doc.alert_lead_days,
      })
    } else {
      setEditingDoc(null)
      setFormData({
        name: '',
        plant_id: plants.length === 1 ? plants[0].id : '',
        document_type: '',
        frequency: 'Anual',
        expiration_date: '',
        alert_lead_days: 30,
      })
    }
    setIsModalOpen(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()

      const payload = {
        name: formData.name,
        plant_id: formData.plant_id,
        document_type: formData.document_type,
        frequency: formData.frequency,
        expiration_date: formData.expiration_date,
        alert_lead_days: formData.alert_lead_days,
      }

      if (editingDoc) {
        const { error } = await supabase
          .from('sector_documents')
          .update(payload)
          .eq('id', editingDoc.id)
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Documento atualizado com sucesso.' })
      } else {
        const { error } = await supabase.from('sector_documents').insert({
          ...payload,
          client_id: profile?.client_id,
        })
        if (error) throw error
        toast({ title: 'Sucesso', description: 'Documento cadastrado com sucesso.' })
      }
      setIsModalOpen(false)
      fetchData()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este documento?')) return
    try {
      const { error } = await supabase.from('sector_documents').delete().eq('id', id)
      if (error) throw error
      toast({ title: 'Sucesso', description: 'Documento excluído com sucesso.' })
      fetchData()
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    }
  }

  const filteredDocs = documents.filter((doc) => {
    const matchSearch =
      doc.name.toLowerCase().includes(search.toLowerCase()) ||
      doc.document_type.toLowerCase().includes(search.toLowerCase())
    const matchPlant = plantFilter === 'all' || doc.plant_id === plantFilter
    return matchSearch && matchPlant
  })

  const getStatus = (expirationDate: string, alertDays: number) => {
    if (!expirationDate) return { label: 'Indefinido', color: 'bg-slate-100 text-slate-800' }
    const today = startOfDay(new Date())
    const expDate = startOfDay(new Date(expirationDate + 'T00:00:00'))

    if (isBefore(expDate, today)) {
      return { label: 'Vencido', color: 'bg-red-100 text-red-800 border-red-300' }
    }

    const daysUntilExp = differenceInDays(expDate, today)
    if (daysUntilExp <= alertDays) {
      return { label: 'Alerta', color: 'bg-amber-100 text-amber-800 border-amber-300' }
    }

    return { label: 'Regular', color: 'bg-green-100 text-green-800 border-green-300' }
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gestão de Documentos</h1>
          <p className="text-muted-foreground">
            Gerencie os documentos, certidões e licenças da operação
          </p>
        </div>
        <Button onClick={() => handleOpenModal()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Documento
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-4 items-center">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 absolute left-3 top-3 text-muted-foreground" />
          <Input
            placeholder="Buscar documentos..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={plantFilter} onValueChange={setPlantFilter}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Todas as Plantas" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as Plantas</SelectItem>
            {plants.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Documento</TableHead>
              <TableHead>Planta</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead>Periodicidade</TableHead>
              <TableHead>Vencimento</TableHead>
              <TableHead>SLA (Alerta)</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px] text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8">
                  Carregando...
                </TableCell>
              </TableRow>
            ) : filteredDocs.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                  Nenhum documento encontrado.
                </TableCell>
              </TableRow>
            ) : (
              filteredDocs.map((doc) => {
                const status = getStatus(doc.expiration_date, doc.alert_lead_days)
                return (
                  <TableRow key={doc.id}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell>{doc.plants?.name}</TableCell>
                    <TableCell>{doc.document_type}</TableCell>
                    <TableCell>{doc.frequency || '-'}</TableCell>
                    <TableCell>
                      {doc.expiration_date
                        ? format(new Date(doc.expiration_date + 'T00:00:00'), 'dd/MM/yyyy')
                        : '-'}
                    </TableCell>
                    <TableCell>{doc.alert_lead_days} dias</TableCell>
                    <TableCell>
                      <Badge className={status.color} variant="outline">
                        {status.label}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenModal(doc)}>
                          <Pencil className="w-4 h-4 text-muted-foreground" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(doc.id)}>
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>{editingDoc ? 'Editar Documento' : 'Novo Documento'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 mt-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label>Nome do Documento</Label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Planta</Label>
                <Select
                  value={formData.plant_id}
                  onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a planta" />
                  </SelectTrigger>
                  <SelectContent>
                    {plants.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Tipo de Documento</Label>
                <Input
                  value={formData.document_type}
                  onChange={(e) => setFormData({ ...formData, document_type: e.target.value })}
                  required
                  placeholder="Ex: Alvará, Certidão, etc."
                />
              </div>
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select
                  value={formData.frequency}
                  onValueChange={(v) => setFormData({ ...formData, frequency: v })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Única">Única</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Trimestral">Trimestral</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Data de Vencimento</Label>
                  <Input
                    type="date"
                    value={formData.expiration_date}
                    onChange={(e) => setFormData({ ...formData, expiration_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>SLA (Dias de Alerta)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.alert_lead_days}
                    onChange={(e) =>
                      setFormData({ ...formData, alert_lead_days: parseInt(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>
            </div>
            <DialogFooter className="mt-6">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
