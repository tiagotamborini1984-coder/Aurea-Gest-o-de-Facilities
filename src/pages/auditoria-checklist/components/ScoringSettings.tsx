import { useFormContext, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Trash2, Plus } from 'lucide-react'
import { type AuditConfigForm } from '../schema'

export function ScoringSettings() {
  const { control, register, setValue, watch } = useFormContext<AuditConfigForm>()
  const { fields, append, remove } = useFieldArray({ control, name: 'scoring_settings' })

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Critérios de Notas</h3>
          <p className="text-sm text-muted-foreground">
            Defina a escala de avaliação e configure ações corretivas automáticas.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => append({ score: fields.length + 1, description: '', trigger_task: false })}
        >
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Nota
        </Button>
      </div>

      <div className="space-y-3 mt-4">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground mb-2 px-2">
          <div className="col-span-2">Valor Numérico</div>
          <div className="col-span-5">Descrição / Rótulo</div>
          <div className="col-span-4 text-center">Gerar Ação Corretiva?</div>
          <div className="col-span-1"></div>
        </div>
        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-md border border-slate-100"
          >
            <div className="col-span-2">
              <Input
                type="number"
                {...register(`scoring_settings.${index}.score`)}
                className="bg-white"
              />
            </div>
            <div className="col-span-5">
              <Input
                {...register(`scoring_settings.${index}.description`)}
                placeholder="Ex: Não Conformidade"
                className="bg-white"
              />
            </div>
            <div className="col-span-4 flex justify-center">
              <Switch
                checked={watch(`scoring_settings.${index}.trigger_task`)}
                onCheckedChange={(v) => setValue(`scoring_settings.${index}.trigger_task`, v)}
              />
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
        {fields.length === 0 && (
          <div className="text-center p-4 border border-dashed rounded-md text-sm text-slate-500">
            Nenhuma escala de nota configurada. Adicione os valores permitidos para as avaliações.
          </div>
        )}
      </div>
    </div>
  )
}
