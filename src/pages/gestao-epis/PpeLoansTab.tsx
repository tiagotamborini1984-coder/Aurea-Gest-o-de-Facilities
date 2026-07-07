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
import { Plus, Loader2, Undo2, AlertCircle, RefreshCw, HandCoins } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { ppeService } from '@/services/ppe'
import { toast } from 'sonner'

const LOAD_TIMEOUT = 10000

export function PpeLoansTab() {
  const { activeClient, profile, selectedPlant } = useAppStore()
  const [loans, setLoans] = useState<any[]>([])
  const [items, setItems] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOpen, setIsOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState({
    ppe_id: '',
    person_type: 'collaborator',
    collaborator_id: '',
    visitor_name: '',
    quantity: '1',
  })

  const clientId = activeClient?.id || profile?.client_id

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
      .getLoans(clientId, selectedPlant)
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

    ppeService
      .getItems(clientId, selectedPlant)
      .then((data) => {
        if (!cancelled) setItems(data.filter((i: any) => i.current_stock > 0))
      })
      .catch(() => {
        if (!cancelled) toast.warning('Não foi possível carregar a lista de EPIs disponíveis.')
      })

    ppeService
      .getCollaborators(clientId)
      .then((data) => {
        if (!cancelled) setCollaborators(data)
      })
      .catch(() => {
        if (!cancelled) toast.warning('Não foi possível carregar a lista de colaboradores.')
      })

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [clientId, selectedPlant, profile])

  const handleSave = async () => {
    if (!clientId || !activeClient) return
    if (!formData.ppe_id) return toast.error('Selecione um EPI')
    if (formData.person_type === 'collaborator' && !formData.collaborator_id)
      return toast.error('Selecione um colaborador')
    if (formData.person_type === 'visitor' && !formData.visitor_name.trim())
      return toast.error('Informe o nome do visitante')
    const qty = Number(formData.quantity) || 1
    if (qty < 1) return toast.error('Quantidade inválida')

    setSaving(true)
    try {
      const selectedItem = items.find((i) => i.id === formData.ppe_id)
      if (selectedItem && qty > selectedItem.current_stock) {
        toast.error('Quantidade maior que estoque disponível')
        setSaving(false)
        return
      }
      await ppeService.createLoan({
        client_id: clientId,
        plant_id: selectedItem.plant_id,
        ppe_id: formData.ppe_id,
        person_type: formData.person_type,
        collaborator_id: formData.person_type === 'collaborator' ? formData.collaborator_id : null,
        visitor_name: formData.person_type === 'visitor' ? formData.visitor_name : null,
        quantity: qty,
        status: 'Emprestado',
      })
      toast.success('Empréstimo registrado!')
      setIsOpen(false)
      setFormData({
        ppe_id: '',
        person_type: 'collaborator',
        collaborator_id: '',
        visitor_name: '',
        quantity: '1',
      })
      setLoans(await ppeService.getLoans(clientId, selectedPlant))
      setItems(
        (await ppeService.getItems(clientId, selectedPlant)).filter(
          (i: any) => i.current_stock > 0,
        ),
      )
    } catch (e: any) {
      toast.error(e.message || 'Erro ao registrar empréstimo')
    }
    setSaving(false)
  }

  const handleReturn = async (loanId: string) => {
    try {
      await ppeService.returnLoan(loanId)
      toast.success('Item devolvido com sucesso!')
      setLoans(await ppeService.getLoans(clientId, selectedPlant))
      setItems(
        (await ppeService.getItems(clientId, selectedPlant)).filter(
          (i: any) => i.current_stock > 0,
        ),
      )
    } catch (e: any) {
      toast.error(e.message || 'Erro ao devolver')
    }
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
      <div className="flex justify-end">
        <Button onClick={() => setIsOpen(true)} disabled={items.length === 0}>
          <Plus className="h-4 w-4 mr-2" /> Novo Empréstimo
        </Button>
      </div>
      {items.length === 0 && (
        <p className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded-md p-3">
          Não há EPIs com estoque disponível para empréstimo.
        </p>
      )}
      {loans.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 gap-3">
            <HandCoins className="h-12 w-12 text-slate-300" />
            <p className="text-slate-500 font-medium">Nenhum empréstimo registrado</p>
            <p className="text-slate-400 text-sm">
              Os empréstimos aparecerão aqui quando forem criados.
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
                      {loan.person_type === 'collaborator'
                        ? loan.collaborator?.name || '-'
                        : loan.visitor_name}
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
                      {loan.status === 'Emprestado' && (
                        <Button variant="outline" size="sm" onClick={() => handleReturn(loan.id)}>
                          <Undo2 className="h-4 w-4 mr-1" /> Devolver
                        </Button>
                      )}
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
              <Label>EPI *</Label>
              <Select
                value={formData.ppe_id}
                onValueChange={(v) => setFormData({ ...formData, ppe_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o EPI" />
                </SelectTrigger>
                <SelectContent>
                  {items.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      {i.name} (Estoque: {i.current_stock})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Tipo de Pessoa *</Label>
              <Select
                value={formData.person_type}
                onValueChange={(v) =>
                  setFormData({
                    ...formData,
                    person_type: v,
                    collaborator_id: '',
                    visitor_name: '',
                  })
                }
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
            {formData.person_type === 'collaborator' ? (
              <div className="space-y-2">
                <Label>Colaborador *</Label>
                <Select
                  value={formData.collaborator_id}
                  onValueChange={(v) => setFormData({ ...formData, collaborator_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o colaborador" />
                  </SelectTrigger>
                  <SelectContent>
                    {collaborators.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Nome do Visitante *</Label>
                <Input
                  value={formData.visitor_name}
                  onChange={(e) => setFormData({ ...formData, visitor_name: e.target.value })}
                />
              </div>
            )}
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
    </div>
  )
}
