import { useFormContext, useFieldArray } from 'react-hook-form'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { Trash2, Plus, GripVertical } from 'lucide-react'
import { type AuditConfigForm } from '../schema'

export function ChecklistSettings() {
  const {
    control,
    register,
    setValue,
    watch,
    formState: { errors },
  } = useFormContext<AuditConfigForm>()
  const { fields, append, remove } = useFieldArray({ control, name: 'actions' })

  return (
    <div className="space-y-4 p-6 border rounded-lg bg-white shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Itens do Checklist</h3>
          <p className="text-sm text-muted-foreground">
            Adicione os pontos de verificação e defina seus pesos e exigências.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            append({ title: '', weight: 1, evidence_required: false, comments_required: false })
          }
        >
          <Plus className="w-4 h-4 mr-2" />
          Novo Item
        </Button>
      </div>
      {errors.actions?.root && (
        <p className="text-sm text-red-500">{errors.actions.root.message}</p>
      )}

      <div className="space-y-3 mt-4">
        <div className="grid grid-cols-12 gap-4 text-sm font-medium text-muted-foreground mb-2 px-2">
          <div className="col-span-1"></div>
          <div className="col-span-5">Título / Pergunta</div>
          <div className="col-span-2 text-center">Peso</div>
          <div className="col-span-3 text-center">Obrigatórios</div>
          <div className="col-span-1"></div>
        </div>

        {fields.map((field, index) => (
          <div
            key={field.id}
            className="grid grid-cols-12 gap-4 items-center bg-slate-50 p-2 rounded-md border border-slate-100 group"
          >
            <div className="col-span-1 flex justify-center text-slate-400">
              <GripVertical className="w-4 h-4" />
            </div>
            <div className="col-span-5">
              <Input
                {...register(`actions.${index}.title`)}
                placeholder="O que deve ser avaliado?"
                className="bg-white"
              />
            </div>
            <div className="col-span-2">
              <Input
                type="number"
                min="0.1"
                step="0.1"
                {...register(`actions.${index}.weight`)}
                className="bg-white text-center"
              />
            </div>
            <div className="col-span-3 flex flex-col items-center justify-center gap-2">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch(`actions.${index}.evidence_required`)}
                  onCheckedChange={(v) => setValue(`actions.${index}.evidence_required`, v)}
                />
                <span className="text-xs">Foto Evidência</span>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  checked={watch(`actions.${index}.comments_required`)}
                  onCheckedChange={(v) => setValue(`actions.${index}.comments_required`, v)}
                />
                <span className="text-xs">Comentários</span>
              </div>
            </div>
            <div className="col-span-1 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => remove(index)}
                className="text-red-500 hover:text-red-700 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
