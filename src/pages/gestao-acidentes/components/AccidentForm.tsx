import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAppStore } from '@/store/AppContext'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent } from '@/components/ui/card'
import { useToast } from '@/components/ui/use-toast'

export function AccidentForm({ initialData }: { initialData?: any }) {
  const { activeClient, activePlant, profile } = useAppStore()
  const { toast } = useToast()
  const navigate = useNavigate()
  const [plants, setPlants] = useState<any[]>([])
  const [companies, setCompanies] = useState<any[]>([])
  const [formData, setFormData] = useState({
    plant_id: initialData?.plant_id || (activePlant !== 'all' ? activePlant : ''),
    company_id: initialData?.company_id || 'none',
    event_date: initialData?.event_date
      ? new Date(initialData.event_date).toISOString().slice(0, 16)
      : '',
    location: initialData?.location || '',
    department: initialData?.department || '',
    severity: initialData?.severity || 'Leve',
    description: initialData?.description || '',
  })

  useEffect(() => {
    if (!activeClient) return
    supabase
      .from('plants')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .then(({ data }) => setPlants(data || []))
    supabase
      .from('companies')
      .select('id, name')
      .eq('client_id', activeClient.id)
      .then(({ data }) => setCompanies(data || []))
  }, [activeClient])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!activeClient || !profile) return

    const payload = {
      ...formData,
      client_id: activeClient.id,
      company_id: formData.company_id === 'none' ? null : formData.company_id,
      event_date: new Date(formData.event_date).toISOString(),
    }

    if (initialData?.id) {
      const { error } = await supabase.from('accidents').update(payload).eq('id', initialData.id)
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else toast({ title: 'Sucesso', description: 'Acidente atualizado.' })
    } else {
      const { data, error } = await supabase
        .from('accidents')
        .insert({ ...payload, created_by: profile.id })
        .select()
        .single()
      if (error) toast({ title: 'Erro', description: error.message, variant: 'destructive' })
      else {
        toast({ title: 'Sucesso', description: 'Acidente registrado.' })
        navigate(`/gestao-acidentes/registro/${data.id}`)
      }
    }
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Planta</Label>
              <Select
                value={formData.plant_id}
                onValueChange={(v) => setFormData({ ...formData, plant_id: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
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
              <Label>Empresa Envolvida</Label>
              <Select
                value={formData.company_id}
                onValueChange={(v) => setFormData({ ...formData, company_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Própria (Nenhuma)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Própria (Nenhuma)</SelectItem>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data e Hora do Evento</Label>
              <Input
                type="datetime-local"
                value={formData.event_date}
                onChange={(e) => setFormData({ ...formData, event_date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Gravidade</Label>
              <Select
                value={formData.severity}
                onValueChange={(v) => setFormData({ ...formData, severity: v })}
                required
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Leve">Leve</SelectItem>
                  <SelectItem value="Moderado">Moderado</SelectItem>
                  <SelectItem value="Grave">Grave</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Local / Setor</Label>
              <Input
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Departamento</Label>
              <Input
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição do Ocorrido</Label>
            <Textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
            />
          </div>
          <Button type="submit">Salvar Dados</Button>
        </form>
      </CardContent>
    </Card>
  )
}
