import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Archive, KeyRound, CalendarDays, User, UploadCloud, Edit2 } from 'lucide-react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

export default function OcupacaoLockers() {
  const { activeClient } = useAppStore()
  const [plants, setPlants] = useState<any[]>([])
  const [locations, setLocations] = useState<string[]>([])
  const [lockers, setLockers] = useState<any[]>([])
  const [occupations, setOccupations] = useState<any[]>([])
  const [collaborators, setCollaborators] = useState<any[]>([])

  const [selectedPlant, setSelectedPlant] = useState<string>('all')
  const [selectedLocation, setSelectedLocation] = useState<string>('all')

  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [detailsModalOpen, setDetailsModalOpen] = useState(false)

  const [selectedLocker, setSelectedLocker] = useState<any>(null)
  const [selectedOccupation, setSelectedOccupation] = useState<any>(null)

  const [selectedCollab, setSelectedCollab] = useState('')
  const [deliveryDate, setDeliveryDate] = useState('')
  const [termUrl, setTermUrl] = useState('')
  const [loading, setLoading] = useState(false)

  const [isEditingTermUrl, setIsEditingTermUrl] = useState(false)
  const [editTermUrl, setEditTermUrl] = useState('')

  useEffect(() => {
    if (activeClient) {
      fetchPlants()
      fetchCollaborators()
    }
  }, [activeClient])

  useEffect(() => {
    if (activeClient) {
      fetchLocations()
      fetchData()
    }
  }, [activeClient, selectedPlant, selectedLocation])

  const fetchPlants = async () => {
    const { data } = await supabase.from('plants').select('*').eq('client_id', activeClient!.id)
    if (data) {
      setPlants(data)
      if (data.length === 1) {
        setSelectedPlant(data[0].id)
      }
    }
  }

  const fetchCollaborators = async () => {
    const { data } = await supabase
      .from('locker_collaborators')
      .select('*')
      .eq('client_id', activeClient!.id)
      .order('name')
    setCollaborators(data || [])
  }

  const fetchLocations = async () => {
    let query = supabase.from('lockers').select('location').eq('client_id', activeClient!.id)
    if (selectedPlant !== 'all') query = query.eq('plant_id', selectedPlant)
    const { data } = await query
    if (data) {
      const locs = Array.from(new Set(data.map((d) => d.location)))
      setLocations(locs)
    }
  }

  const fetchData = async () => {
    let lockersQuery = supabase
      .from('lockers')
      .select('*')
      .eq('client_id', activeClient!.id)
      .order('identification', { ascending: true })

    if (selectedPlant !== 'all') lockersQuery = lockersQuery.eq('plant_id', selectedPlant)
    if (selectedLocation !== 'all') lockersQuery = lockersQuery.eq('location', selectedLocation)

    const { data: lockersData } = await lockersQuery
    setLockers(lockersData || [])

    if (lockersData && lockersData.length > 0) {
      const lockerIds = lockersData.map((l) => l.id)
      const { data: occData } = await supabase
        .from('locker_occupations')
        .select('*, locker_collaborators(name)')
        .eq('client_id', activeClient!.id)
        .eq('status', 'Ativo')
        .in('locker_id', lockerIds)

      setOccupations(occData || [])
    } else {
      setOccupations([])
    }
  }

  const handleAssign = async () => {
    if (!selectedCollab || !deliveryDate) {
      toast.error('Selecione o colaborador e a data de entrega')
      return
    }
    setLoading(true)
    try {
      const { error } = await supabase.from('locker_occupations').insert({
        client_id: activeClient!.id,
        locker_id: selectedLocker.id,
        collaborator_id: selectedCollab,
        key_delivery_date: deliveryDate,
        term_url: termUrl || null,
        status: 'Ativo',
      })

      if (error) {
        if (error.message.includes('one_active_locker_per_collab')) {
          throw new Error('Este colaborador já possui um locker ativo!')
        }
        throw error
      }

      toast.success('Locker ocupado com sucesso!')
      setAssignModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error(err.message || 'Erro ao ocupar locker')
    } finally {
      setLoading(false)
    }
  }

  const handleReturn = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('locker_occupations')
        .update({
          status: 'Devolvido',
          return_date: new Date().toISOString().split('T')[0],
        })
        .eq('id', selectedOccupation.id)

      if (error) throw error
      toast.success('Locker desocupado com sucesso!')
      setDetailsModalOpen(false)
      fetchData()
    } catch (err: any) {
      toast.error('Erro ao desocupar locker')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveTermUrl = async () => {
    setLoading(true)
    try {
      const { error } = await supabase
        .from('locker_occupations')
        .update({ term_url: editTermUrl || null })
        .eq('id', selectedOccupation.id)

      if (error) throw error
      toast.success('Anexo atualizado com sucesso!')
      setIsEditingTermUrl(false)
      setSelectedOccupation({ ...selectedOccupation, term_url: editTermUrl || null })
      fetchData()
    } catch (err: any) {
      toast.error('Erro ao atualizar anexo')
    } finally {
      setLoading(false)
    }
  }

  const openAssign = (locker: any) => {
    setSelectedLocker(locker)
    setSelectedCollab('')
    setDeliveryDate(new Date().toISOString().split('T')[0])
    setTermUrl('')
    setAssignModalOpen(true)
  }

  const openDetails = (locker: any, occupation: any) => {
    setSelectedLocker(locker)
    setSelectedOccupation(occupation)
    setEditTermUrl(occupation.term_url || '')
    setIsEditingTermUrl(false)
    setDetailsModalOpen(true)
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Mapa de Ocupação</h1>
        <div className="flex items-center gap-3">
          <Select value={selectedPlant} onValueChange={setSelectedPlant}>
            <SelectTrigger className="w-[200px] bg-white">
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
          <Select value={selectedLocation} onValueChange={setSelectedLocation}>
            <SelectTrigger className="w-[200px] bg-white">
              <SelectValue placeholder="Todos os Locais" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Locais</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l} value={l}>
                  {l}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-4">
        {lockers.map((locker) => {
          const occupation = occupations.find((o) => o.locker_id === locker.id)
          const isOccupied = !!occupation

          return (
            <div
              key={locker.id}
              onClick={() => (isOccupied ? openDetails(locker, occupation) : openAssign(locker))}
              className={cn(
                'p-4 rounded-xl border flex flex-col items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105 shadow-sm min-h-[120px]',
                isOccupied
                  ? 'bg-red-50 border-red-200 hover:border-red-300'
                  : 'bg-green-50 border-green-200 hover:border-green-300',
              )}
            >
              <Archive className={cn('h-8 w-8', isOccupied ? 'text-red-500' : 'text-green-500')} />
              <span className="font-bold text-slate-700">{locker.identification}</span>
              {isOccupied ? (
                <span className="text-[10px] font-medium text-red-700 truncate w-full text-center bg-red-100 px-1 rounded">
                  {occupation.locker_collaborators?.name}
                </span>
              ) : (
                <span className="text-[10px] font-medium text-green-700 uppercase tracking-wider">
                  Disponível
                </span>
              )}
            </div>
          )
        })}
        {lockers.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500">
            Nenhum locker encontrado com os filtros selecionados.
          </div>
        )}
      </div>

      <Dialog open={assignModalOpen} onOpenChange={setAssignModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ocupar Locker: {selectedLocker?.identification}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Colaborador *</Label>
              <Select value={selectedCollab} onValueChange={setSelectedCollab}>
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
            <div className="space-y-2">
              <Label>Data de Entrega da Chave *</Label>
              <Input
                type="date"
                value={deliveryDate}
                onChange={(e) => setDeliveryDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Anexo do Termo de Responsabilidade (URL ou Link)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://..."
                  value={termUrl}
                  onChange={(e) => setTermUrl(e.target.value)}
                />
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setTermUrl('https://img.usecurling.com/p/200/300?q=document')}
                  title="Simular Upload"
                >
                  <UploadCloud className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAssignModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleAssign} disabled={loading}>
              Confirmar Ocupação
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsModalOpen} onOpenChange={setDetailsModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Detalhes da Ocupação</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <Archive className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  Locker {selectedLocker?.identification}
                </p>
                <p className="text-xs text-slate-500">{selectedLocker?.location}</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <User className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {selectedOccupation?.locker_collaborators?.name}
                </p>
                <p className="text-xs text-slate-500">Colaborador Vinculado</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <CalendarDays className="h-5 w-5 text-slate-500" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {selectedOccupation?.key_delivery_date?.split('-').reverse().join('/')}
                </p>
                <p className="text-xs text-slate-500">Data de Entrega da Chave</p>
              </div>
            </div>

            <div className="space-y-2 p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-900">
                  Termo de Responsabilidade
                </span>
                {!isEditingTermUrl && (
                  <Button variant="ghost" size="sm" onClick={() => setIsEditingTermUrl(true)}>
                    <Edit2 className="h-4 w-4 mr-1" /> Editar
                  </Button>
                )}
              </div>

              {isEditingTermUrl ? (
                <div className="flex flex-col sm:flex-row gap-2 mt-2">
                  <Input
                    placeholder="URL do termo..."
                    value={editTermUrl}
                    onChange={(e) => setEditTermUrl(e.target.value)}
                    className="flex-1"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() =>
                        setEditTermUrl('https://img.usecurling.com/p/200/300?q=document')
                      }
                      title="Simular Upload"
                    >
                      <UploadCloud className="h-4 w-4" />
                    </Button>
                    <Button size="sm" onClick={handleSaveTermUrl} disabled={loading}>
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : selectedOccupation?.term_url ? (
                <div className="flex items-center justify-between mt-2 pl-1">
                  <span
                    className="text-xs text-slate-500 truncate max-w-[200px]"
                    title={selectedOccupation.term_url}
                  >
                    Anexo Disponível
                  </span>
                  <Button variant="outline" size="sm" asChild>
                    <a href={selectedOccupation.term_url} target="_blank" rel="noreferrer">
                      Visualizar
                    </a>
                  </Button>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-2 pl-1">Nenhum termo anexado.</p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsModalOpen(false)}>
              Fechar
            </Button>
            <Button variant="destructive" onClick={handleReturn} disabled={loading}>
              Desocupar Locker
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
