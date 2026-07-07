import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
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
import {
  Plus,
  Loader2,
  Undo2,
  AlertCircle,
  RefreshCw,
  HandCoins,
  Trash2,
  CalendarDays,
} from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { ppeService } from '@/services/ppe'
import { toast } from 'sonner'

const LOAD_TIMEOUT = 10000

export function PpeLoansTab() {
  const { activeClient, profile } = useAppStore()
  const [loans, setLoans] = useState<any[]>([])
  const [plants, setPlants] = useState<any[]>([])
  const [formItems, setFormItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleteId, setDeleteId] = useState<string | null>(null)
  const [formPlantId, setFormPlantId] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [formData, setFormData] = useState({
    ppe_id: '',
    person_type: 'collaborator',
    person_name: '',
    quantity: '1',
  })

  const clientId = activeClient?.id || profile?.client_id
  const isAdmin = profile?.role === 'Master' || profile?.role === 'Administrador'

  useEffect(() => {
    const end = new Date()
    const start = new Date()
    start.setDate(start.getDate() - 30)
    setEndDate(end.toISOString().split('T')[0])
    setStartDate(start.toISOString().split('T')[0])
  }, [])

  useEffect(() => {
    if (!clientId) {
      if (profile) {
        setError('Não foi possível identificar o cliente.')
        setLoading(false)
      }
      return
    }
    let cancelled = false
    setError(null)
    setLoading(true)
    const timeoutId = setTimeout(() => {
      if (!cancelled) {
        setError('Tempo limite excedido. Verifique sua conexão.')
        setLoading(false)
      }
    }, LOAD_TIMEOUT)

    ppeService
      .getLoans(clientId, startDate, endDate)
      .then((data) => {
        if (!cancelled) {
          setLoans(data)
          setLoading(false)
        }
      })
      .catch((e) => {
        if (!cancelled) {
          setError(e.message || 'Erro ao carregar empréstimos')
          toast.error('Erro ao carregar empréstimos')
          setLoading(false)
        }
      })
      .finally(() => {
        if (!cancelled) clearTimeout(timeoutId)
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [clientId, profile, startDate, endDate])

  useEffect(() => {
    if (!clientId)
      return supabase
        .from('plants')
        .select('id, name')
        .eq('client_id', clientId)
        .then(({ data }) => {
          if (!data) return
          let filtered = data
          if (profile && profile.role !== 'Master' && profile.role !== 'Administrador') {
            const auth = profile.authorized_plants || []
            filtered = data.filter((p) => auth.includes(p.id))
          }
          setPlants(filtered)
        })
  }, [clientId, profile])

  useEffect(() => {
    if (!clientId || !formPlantId) {
      setFormItems([])
      return
    }
    ppeService
      .getItems(clientId, formPlantId)
      .then((data) => setFormItems(data.filter((i: any) => i.current_stock > 0)))
      .catch(() => setFormItems([]))
  }, [formPlantId, clientId])

  const openForm = () => {
    setFormPlantId('')
    setFormData({ ppe_id: '', person_type: 'collaborator', person_name: '', quantity: '1' })
    setIsOpen(true)
  }

  const handleSave = async () => {
    if (!clientId) return
    if (!formPlantId) return toast.error('Selecione uma planta')
    if (!formData.ppe_id) return toast.error('Selecione um EPI')
    if (!formData.person_name.trim()) return toast.error('Informe o nome da pessoa')
    const qty = Number(formData.quantity) || 1
    if (qty < 1) return toast.error('Quantidade inválida')

    setSaving(true)
    try {
      const selectedItem = formItems.find((i) => i.id === formData.ppe_id)
      if (selectedItem && qty > selectedItem.current_stock) {
        toast.error('Quantidade maior que estoque disponível')
        setSaving(false)
        return
      }
      await ppeService.createLoan({
        client_id: clientId,
        plant_id: formPlantId,
        ppe_id: formData.ppe_id,
        person_type: formData.person_type,
        person_name: formData.person_name.trim(),
        quantity: qty,
        status: 'Emprestado',
      })
      toast.success('Empréstimo registrado!')
      setIsOpen(false)
      setLoans(await ppeService.getLoans(clientId, startDate, endDate))
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar empréstimo')
    }
    setSaving(false)
  }

  const handleReturn = async (loanId: string) => {
    try {
      await ppeService.returnLoan(loanId)
      toast.success('Item devolvido com sucesso!')
      setLoans(await ppeService.getLoans(clientId, startDate, endDate))
    } catch (e: any) {
      toast.error(e.message || 'Erro ao devolver')
    }
  }

  const handleDelete = async () => {
    if (!deleteId) return
    try {
      await ppeService.deleteLoan(deleteId)
      toast.success('Registro de empréstimo excluído')
      setLoans(await ppeService.getLoans(clientId, startDate, endDate))
    } catch (e: any) {
      toast.error(e.message || 'Erro ao excluir')
    }
    setDeleteId(null)
  }

  if (loading)
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    )

  if (error)
    return (
      <div className="flex flex-col items-center justify-center py-16 gap-4">
        <AlertCircle className="h-12 w-12 text-red-500" />
        <p className="text-slate-600 text-center max-w-sm">{error}</p>
        <Button variant="outline" onClick={() => window.location.reload()}>
          <RefreshCw className="h-4 w-4 mr-2" /> Tentar novamente
        </Button>
      </div>
    )

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-slate-400 shrink-0" />
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 leading-none">Data Inicial</span>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="text-xs text-slate-500 leading-none">Data Final</span>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[150px]"
            />
          </div>
        </div>
        <Button onClick={openForm} disabled={plants.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Novo Empréstimo
        </Button>
      </div>
      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <HandCoins className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium">
              Nenhum empréstimo encontrado para este período/planta
            </p>
            <p className="text-slate-400 text-sm">
              Ajuste os filtros ou registre um novo empréstimo.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>EPI</TableHead>
                  <TableHead>CA</TableHead>
                  <TableHead>Pessoa</TableHead>
                  <TableHead className="text-center">Qtd</TableHead>
                  <TableHead>Data Empréstimo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loans.map((loan) => (
                  <TableRow key={loan.id}>
                    <TableCell className="font-medium">{loan.ppe?.name || '-'}</TableCell>
                    <TableCell>{loan.ppe?.ca_number || '-'}</TableCell>
                    <TableCell>
                      {loan.person_name || loan.visitor_name || loan.collaborator?.name || '-'}
                    </TableCell>
                    <TableCell className="text-center">{loan.quantity}</TableCell>
                    <TableCell>{new Date(loan.loan_date).toLocaleDateString('pt-BR')}</TableCell>
                    <TableCell>
                      <span
                        className={`px-2 py-1 rounded-full text-xs font-medium ${loan.status === 'Emprestado' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}
                      >
                        {loan.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        {loan.status === 'Emprestado' && (
                          <Button variant="outline" size="sm" onClick={() => handleReturn(loan.id)}>
                            <Undo2 className="h-4 w-4 mr-1" /> Devolver
                          </Button>
                        )}
                        {isAdmin && (
                          <Button variant="ghost" size="icon" onClick={() => setDeleteId(loan.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Novo Empréstimo</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Planta *</Label>
              <Select
                value={formPlantId}
                onValueChange={(v) => {
                  setFormPlantId(v)
                  setFormData({ ...formData, ppe_id: '' })
                }}
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
              <Label>EPI *</Label>
              <Select
                value={formData.ppe_id}
                onValueChange={(v) => setFormData({ ...formData, ppe_id: v })}
                disabled={!formPlantId}
              >
                <SelectTrigger>
                  <SelectValue
                    placeholder={formPlantId ? 'Selecione o EPI' : 'Selecione uma planta primeiro'}
                  />
                </SelectTrigger>
                <SelectContent>
                  {formItems.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} (Estoque: {i.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {formPlantId && formItems.length === 0 && (
                <p className="text-xs text-amber-600">
                  Não há EPIs com estoque disponível para esta planta.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <Select
                value={formData.person_type}
                onValueChange={(v) => setFormData({ ...formData, person_type: v, person_name: '' })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="collaborator">Colaborador</SelectItem>
                  <SelectItem value="visitor">Visitante</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>
                {formData.person_type === 'collaborator'
                  ? 'Nome do Colaborador *'
                  : 'Nome do Visitante *'}
              </Label>
              <Input
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                placeholder="Digite o nome"
              />
            </div>
            <div className="space-y-2">
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Salvando...' : 'Registrar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir registro de empréstimo?</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza de que deseja excluir este registro de empréstimo? Esta ação não pode ser
              desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
