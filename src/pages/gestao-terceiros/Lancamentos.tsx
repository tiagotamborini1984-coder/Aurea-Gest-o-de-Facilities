import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { useToast } from '@/hooks/use-toast'

export default function Lancamentos() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const { toast } = useToast()

  const handleSave = () => {
    toast({ title: 'Salvo com sucesso', description: 'Os lançamentos foram registrados.' })
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Lançamentos Diários</h2>
          <p className="text-muted-foreground mt-1">Registre a presença e metas operacionais.</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-lg border shadow-sm">
          <Label htmlFor="date">Data de Referência:</Label>
          <Input
            type="date"
            id="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-auto h-8"
          />
        </div>
      </div>

      <Tabs defaultValue="staff" className="w-full">
        <TabsList className="bg-white border mb-4">
          <TabsTrigger value="staff">Colaboradores</TabsTrigger>
          <TabsTrigger value="equip">Equipamentos</TabsTrigger>
          <TabsTrigger value="goals">Metas Mensais</TabsTrigger>
        </TabsList>

        <TabsContent value="staff">
          <Card className="shadow-sm">
            <CardContent className="p-0">
              <div className="divide-y">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 hover:bg-muted/30">
                    <div>
                      <p className="font-medium">João Silva {i}</p>
                      <p className="text-sm text-muted-foreground">
                        Auxiliar de Limpeza - Planta SP
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">Ausente</span>
                      <Switch defaultChecked={i === 1} />
                      <span className="text-sm font-medium">Presente</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-4 bg-muted/20 border-t">
                <Button onClick={handleSave} className="w-full sm:w-auto">
                  Salvar Lançamentos
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="equip">
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center text-muted-foreground">
              Selecione equipamentos para registrar disponibilidade.
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="goals">
          <Card className="shadow-sm">
            <CardContent className="p-6 text-center text-muted-foreground">
              Apenas preenchido no último dia do mês.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
