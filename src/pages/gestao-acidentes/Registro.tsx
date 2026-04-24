import { useState, useEffect, FormEvent } from 'react'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { useNavigate } from 'react-router-dom'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Plus, Trash, Save } from 'lucide-react'

interface ActionItem {
  id: string
  plant_id: string
  assignee_id: string
  due_date: string
  description: string
}

export default function RegistroAcidente() {
  const { activeClient, plants, profile } = useAppStore()
  const { toast } = useToast()
  const navigate = useNavigate()

  const [profiles, setProfiles] = useState<any[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    plant_id: '',
    event_date: '',
    location: '',
    department: '',
    severity: '',
    description: '',
  })
  const [actions, setActions] = useState<ActionItem[]>([])

  useEffect(() => {
    if (activeClient) {
      supabase
        .from('profiles')
        .select('*')
        .eq('client_id', activeClient.id)
        .then(({ data }) => {
          if (data) setProfiles(data)
        })
    }
  }, [activeClient])

  const handleAddAction = () => {
    setActions([
      ...actions,
      { id: Date.now().toString(), plant_id: '', assignee_id: '', due_date: '', description: '' },
    ])
  }

  const handleRemoveAction = (id: string) => {
    setActions(actions.filter((a) => a.id !== id))
  }

  const handleActionChange = (id: string, field: keyof ActionItem, value: string) => {
    setActions(actions.map((a) => (a.id === id ? { ...a, [field]: value } : a)))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (!activeClient || !profile) return
    setSubmitting(true)

    try {
      const { error: accError } = await supabase
        .from('accidents')
        .insert({
          client_id: activeClient.id,
          plant_id: formData.plant_id,
          event_date: formData.event_date,
          location: formData.location,
          department: formData.department,
          severity: formData.severity,
          description: formData.description,
          created_by: profile.id,
        })
        .select('id')
        .single()

      if (accError) throw accError

      if (actions.length > 0) {
        let typeId = ''
        const { data: tType } = await supabase
          .from('task_types')
          .select('id')
          .eq('client_id', activeClient.id)
          .ilike('name', 'Gestão de Acidentes')
          .limit(1)
          .maybeSingle()
        if (tType) typeId = tType.id
        else {
          const { data: nType } = await supabase
            .from('task_types')
            .insert({
              client_id: activeClient.id,
              name: 'Gestão de Acidentes',
              sla_hours: 48,
            } as any)
            .select('id')
            .single()
          if (nType) typeId = nType.id
        }

        let statusId = ''
        const { data: tStatus } = await supabase
          .from('task_statuses')
          .select('id')
          .eq('client_id', activeClient.id)
          .eq('is_terminal', false)
          .order('created_at', { ascending: true })
          .limit(1)
          .maybeSingle()
        if (tStatus) statusId = tStatus.id
        else {
          const { data: nStatus } = await supabase
            .from('task_statuses')
            .insert({
              client_id: activeClient.id,
              name: 'Pendente',
              color: '#eab308',
              is_terminal: false,
            } as any)
            .select('id')
            .single()
          if (nStatus) statusId = nStatus.id
        }

        if (typeId && statusId) {
          const tasksToInsert = actions.map((act) => ({
            client_id: activeClient.id,
            plant_id: act.plant_id,
            type_id: typeId,
            status_id: statusId,
            requester_id: profile.id,
            assignee_id: act.assignee_id,
            task_number: `ACT-${new Date().getFullYear()}-${Math.floor(Math.random() * 1000000)}`,
            title: `Ação Preventiva: Acidente em ${formData.department}`,
            description:
              act.description +
              `\n\nReferência: Acidente reportado em ${new Date(formData.event_date).toLocaleDateString()}`,
            due_date: new Date(act.due_date).toISOString(),
            status_updated_at: new Date().toISOString(),
          }))

          const { error: tError } = await supabase.from('tasks').insert(tasksToInsert)
          if (tError) throw tError
        }
      }

      toast({ title: 'Sucesso', description: 'Acidente e ações registrados com sucesso!' })
      navigate('/gestao-acidentes/historico')
    } catch (error: any) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto animate-fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Registrar Acidente
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          Preencha os detalhes do evento e estenda ações preventivas.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Evento</CardTitle>
            <CardDescription>Informações básicas do acidente ocorrido.</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planta do Ocorrido</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(val) => setFormData({ ...formData, plant_id: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a planta" />
                </SelectTrigger>
                <SelectContent>
                  {plants?.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Data e Hora</Label>
              <Input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento / Área</Label>
              <Input
                placeholder="Ex: Produção"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Local Específico</Label>
              <Input
                placeholder="Ex: Galpão 2"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Classificação de Gravidade</Label>
              <Select
                value={formData.severity}
                onValueChange={(val) => setFormData({ ...formData, severity: val })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a gravidade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve (Primeiros socorros, sem afastamento)</SelectItem>
                  <SelectItem value="Moderado">
                    Moderado (Com necessidade de atendimento médico)
                  </SelectItem>
                  <SelectItem value="Grave">
                    Grave (Afastamento prolongado ou risco de vida)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label>Descrição do Ocorrido</Label>
              <Textarea
                placeholder="Descreva os detalhes do acidente..."
                className="h-24"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                required
              />
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium">Ações Preventivas</h3>
              <p className="text-sm text-gray-500">
                Estenda ações para esta ou outras plantas que gerarão chamados.
              </p>
            </div>
            <Button type="button" variant="outline" onClick={handleAddAction}>
              <Plus className="w-4 h-4 mr-2" /> Adicionar Ação
            </Button>
          </div>

          {actions.length === 0 ? (
            <Card className="border-dashed shadow-none">
              <CardContent className="pt-6 text-center text-gray-500 text-sm">
                Nenhuma ação preventiva adicionada.
              </CardContent>
            </Card>
          ) : (
            actions.map((action, index) => (
              <Card key={action.id} className="relative">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                  onClick={() => handleRemoveAction(action.id)}
                >
                  <Trash className="w-4 h-4" />
                </Button>
                <CardContent className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>Planta Destino</Label>
                    <Select
                      value={action.plant_id}
                      onValueChange={(val) => handleActionChange(action.id, 'plant_id', val)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a planta" />
                      </SelectTrigger>
                      <SelectContent>
                        {plants?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Responsável</Label>
                    <Select
                      value={action.assignee_id}
                      onValueChange={(val) => handleActionChange(action.id, 'assignee_id', val)}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {profiles?.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Prazo (SLA)</Label>
                    <Input
                      type="date"
                      value={action.due_date}
                      onChange={(e) => handleActionChange(action.id, 'due_date', e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2 md:col-span-3">
                    <Label>Descrição da Ação</Label>
                    <Textarea
                      placeholder="Descreva a ação a ser realizada..."
                      value={action.description}
                      onChange={(e) => handleActionChange(action.id, 'description', e.target.value)}
                      required
                    />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>

        <div className="flex justify-end gap-4">
          <Button type="button" variant="outline" onClick={() => navigate(-1)}>
            Cancelar
          </Button>
          <Button type="submit" disabled={submitting}>
            <Save className="w-4 h-4 mr-2" />
            {submitting ? 'Salvando...' : 'Registrar Acidente'}
          </Button>
        </div>
      </form>
    </div>
  )
}
