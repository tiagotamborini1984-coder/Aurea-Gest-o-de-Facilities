import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Target, Loader2, Info } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import {
  getCleaningGoals,
  upsertCleaningGoal,
  CleaningGardeningGoal,
} from '@/services/cleaning-goals'

interface GoalSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  clientId: string
  currentPlantId?: string
  plantName?: string
  onSaved?: () => void
}

export function GoalSettingsDialog({
  open,
  onOpenChange,
  clientId,
  currentPlantId = 'all',
  plantName,
  onSaved,
}: GoalSettingsDialogProps) {
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  // Metas do cliente
  const [globalGoal, setGlobalGoal] = useState<string>('')
  const [plantGoal, setPlantGoal] = useState<string>('')
  const [existingGoals, setExistingGoals] = useState<CleaningGardeningGoal[]>([])

  const isSpecificPlant = currentPlantId !== 'all' && Boolean(currentPlantId)

  useEffect(() => {
    if (!open || !clientId) return

    const load = async () => {
      setLoading(true)
      const data = await getCleaningGoals(clientId)
      setExistingGoals(data)

      const global = data.find((g) => !g.plant_id && !g.area_id)
      setGlobalGoal(
        global && global.target_percentage !== null && global.target_percentage !== undefined
          ? String(global.target_percentage)
          : '',
      )

      if (isSpecificPlant) {
        const plant = data.find((g) => g.plant_id === currentPlantId && !g.area_id)
        setPlantGoal(
          plant && plant.target_percentage !== null && plant.target_percentage !== undefined
            ? String(plant.target_percentage)
            : '',
        )
      } else {
        setPlantGoal('')
      }
      setLoading(false)
    }

    load()
  }, [open, clientId, currentPlantId, isSpecificPlant])

  const handleSave = async () => {
    if (!clientId) return
    setSaving(true)

    try {
      // Salva meta global
      const parsedGlobal = globalGoal.trim() === '' ? null : parseFloat(globalGoal)
      if (
        parsedGlobal !== null &&
        (isNaN(parsedGlobal) || parsedGlobal < 0 || parsedGlobal > 100)
      ) {
        toast({
          title: 'Valor inválido',
          description: 'A meta deve ser um número entre 0% e 100%.',
          variant: 'destructive',
        })
        setSaving(false)
        return
      }

      const resGlobal = await upsertCleaningGoal({
        clientId,
        targetPercentage: parsedGlobal,
        plantId: null,
        areaId: null,
        description: 'Meta geral do módulo Limpeza e Jardinagem',
      })

      if (!resGlobal.success) throw resGlobal.error

      // Se estiver visualizando uma planta específica, também pode salvar meta da planta
      if (isSpecificPlant) {
        const parsedPlant = plantGoal.trim() === '' ? null : parseFloat(plantGoal)
        if (parsedPlant !== null && (isNaN(parsedPlant) || parsedPlant < 0 || parsedPlant > 100)) {
          toast({
            title: 'Valor inválido',
            description: 'A meta da planta deve ser um número entre 0% e 100%.',
            variant: 'destructive',
          })
          setSaving(false)
          return
        }

        const resPlant = await upsertCleaningGoal({
          clientId,
          targetPercentage: parsedPlant,
          plantId: currentPlantId,
          areaId: null,
          description: `Meta para a planta ${plantName || ''}`,
        })

        if (!resPlant.success) throw resPlant.error
      }

      toast({
        title: 'Meta configurada com sucesso',
        description: 'A linha da meta desejada foi atualizada no gráfico.',
      })
      onOpenChange(false)
      onSaved?.()
    } catch (e: any) {
      toast({
        title: 'Erro ao salvar meta',
        description: e?.message || 'Tente novamente.',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Target className="h-5 w-5 text-brand-deepBlue" />
            Configurar Meta Desejada (%)
          </DialogTitle>
          <DialogDescription>
            Defina o percentual de atingimento esperado para as atividades programadas de Limpeza e
            Jardinagem.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="global-goal" className="font-semibold text-sm">
                Meta Geral do Módulo (%)
              </Label>
              <div className="relative">
                <Input
                  id="global-goal"
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  placeholder="Ex: 95 (deixe vazio para remover a linha)"
                  value={globalGoal}
                  onChange={(e) => setGlobalGoal(e.target.value)}
                  className="pr-8"
                />
                <span className="absolute right-3 top-2.5 text-muted-foreground text-sm font-medium">
                  %
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                Aplica-se como referência padrão a todas as áreas quando não houver meta específica.
              </p>
            </div>

            {isSpecificPlant && (
              <div className="space-y-2 pt-2 border-t">
                <Label htmlFor="plant-goal" className="font-semibold text-sm">
                  Meta Específica para {plantName || 'Planta Selecionada'} (%)
                </Label>
                <div className="relative">
                  <Input
                    id="plant-goal"
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    placeholder="Opcional: sobrepõe a meta geral nesta planta"
                    value={plantGoal}
                    onChange={(e) => setPlantGoal(e.target.value)}
                    className="pr-8"
                  />
                  <span className="absolute right-3 top-2.5 text-muted-foreground text-sm font-medium">
                    %
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quando preenchida, substitui a meta geral ao filtrar esta planta no dashboard.
                </p>
              </div>
            )}

            <div className="rounded-lg bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 p-3 flex gap-2.5 items-start text-xs text-blue-900 dark:text-blue-200">
              <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-600 dark:text-blue-400" />
              <span>
                Sem meta configurada (campo em branco), o gráfico segue sem a linha de meta, sem
                inventar valores fictícios.
              </span>
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading || saving}
            className="bg-brand-deepBlue hover:bg-brand-deepBlue/90 text-white"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Meta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
