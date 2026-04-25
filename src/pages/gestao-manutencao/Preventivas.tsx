import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { RefreshCcw, Plus, Settings2, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { supabase } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { useAuth } from '@/hooks/use-auth'

export default function PreventivasManutencao() {
  const [plans, setPlans] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)
  const { user } = useAuth()

  const [form, setForm] = useState({
    title: '',
    frequency: 'Mensal',
    start_date: '',
    description: '',
  })

  useEffect(() => {
    loadPlans()
  }, [])

  const loadPlans = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('maintenance_preventive_plans')
      .select('*, maintenance_assets(name)')
      .order('created_at', { ascending: false })
    setPlans(data || [])
    setLoading(false)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('client_id')
        .eq('id', user?.id)
        .single()
      if (!profile?.client_id) throw new Error('Cliente não encontrado')

      const { data: plant } = await supabase
        .from('plants')
        .select('id')
        .eq('client_id', profile.client_id)
        .limit(1)
        .single()
      if (!plant?.id) throw new Error('Planta não encontrada')

      const { error } = await supabase.from('maintenance_preventive_plans').insert({
        client_id: profile.client_id,
        plant_id: plant.id,
        title: form.title,
        frequency: form.frequency,
        start_date: form.start_date || new Date().toISOString().split('T')[0],
        description: form.description,
        is_active: true,
      })

      if (error) throw error
      toast.success('Plano criado com sucesso!')
      setOpen(false)
      loadPlans()
    } catch (err: any) {
      toast.error(err.message)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in-up">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <RefreshCcw className="h-8 w-8 text-brand-vividBlue" />
            Planos de Preventiva
          </h1>
          <p className="text-gray-500 mt-1">Configure o robô gerador automático de OS.</p>
        </div>

        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger asChild>
            <Button className="bg-brand-vividBlue">
              <Plus className="h-4 w-4 mr-2" />
              Novo Plano
            </Button>
          </SheetTrigger>
          <SheetContent className="w-[400px] sm:w-[540px]">
            <SheetHeader>
              <SheetTitle>Novo Plano Preventivo</SheetTitle>
            </SheetHeader>
            <form onSubmit={handleSubmit} className="space-y-4 mt-6">
              <div className="space-y-2">
                <Label>Título do Plano</Label>
                <Input
                  required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex: Revisão Mensal HVAC"
                />
              </div>
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Diária">Diária</SelectItem>
                    <SelectItem value="Semanal">Semanal</SelectItem>
                    <SelectItem value="Mensal">Mensal</SelectItem>
                    <SelectItem value="Semestral">Semestral</SelectItem>
                    <SelectItem value="Anual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Data de Início</Label>
                <Input
                  type="date"
                  required
                  value={form.start_date}
                  onChange={(e) => setForm({ ...form, start_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Escopo / Descrição</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Descreva as atividades..."
                />
              </div>
              <Button type="submit" className="w-full bg-brand-vividBlue">
                Salvar Plano
              </Button>
            </form>
          </SheetContent>
        </Sheet>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-10">Carregando planos...</div>
      ) : plans.length === 0 ? (
        <div className="text-center text-gray-500 py-10 border-2 border-dashed rounded-lg">
          Nenhum plano preventivo cadastrado.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <Card key={plan.id} className="shadow-sm hover:shadow-md transition-all">
              <CardHeader className="pb-3 border-b flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-lg font-bold truncate pr-2" title={plan.title}>
                  {plan.title}
                </CardTitle>
                <Badge
                  className={
                    plan.is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }
                  variant="secondary"
                >
                  {plan.is_active ? 'Ativo' : 'Inativo'}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Periodicidade:</span>
                  <span className="font-medium">{plan.frequency}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Ativo:</span>
                  <span className="font-medium truncate max-w-[120px]">
                    {plan.maintenance_assets?.name || 'Todos/Geral'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Início:</span>
                  <span className="font-medium flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    {new Date(plan.start_date).toLocaleDateString()}
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full mt-2"
                  onClick={() => toast.info('Funcionalidade em desenvolvimento')}
                >
                  <Settings2 className="h-4 w-4 mr-2" />
                  Configurar Escopo
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
